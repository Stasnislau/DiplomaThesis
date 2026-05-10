import os
import random
import re
from typing import List, Tuple

from google.api_core.client_options import ClientOptions
from google.cloud import texttospeech


# Multi-speaker transcripts come in tagged like:
#   [Speaker 1]: Hello there.
#   [Speaker 2]: Hi! How are you?
# This regex matches a speaker tag at the start of a logical line.
# We tolerate variable whitespace and either ASCII or Cyrillic
# "Speaker"/"Спикер" labels — the LLM tends to localise.
_SPEAKER_TAG_RE = re.compile(
    r"^\s*\[\s*([^\]]+?)\s*\]\s*:\s*",
    flags=re.MULTILINE,
)


LANGUAGE_VOICE_POOLS = {
    "english": {
        "code": "en-US",
        "voices": [
            "en-US-Neural2-A",
            "en-US-Neural2-C",
            "en-US-Neural2-D",
            "en-US-Neural2-F",
            "en-US-Neural2-I",
            "en-US-Neural2-J",
        ],
    },
    "polish": {
        "code": "pl-PL",
        "voices": [
            "pl-PL-Wavenet-A",
            "pl-PL-Wavenet-B",
            "pl-PL-Wavenet-C",
            "pl-PL-Wavenet-D",
            "pl-PL-Wavenet-E",
        ],
    },
    "spanish": {
        "code": "es-ES",
        "voices": [
            "es-ES-Neural2-A",
            "es-ES-Neural2-B",
            "es-ES-Neural2-C",
            "es-ES-Neural2-D",
            "es-ES-Neural2-E",
            "es-ES-Neural2-F",
        ],
    },
    "french": {
        "code": "fr-FR",
        "voices": [
            "fr-FR-Neural2-A",
            "fr-FR-Neural2-B",
            "fr-FR-Neural2-C",
            "fr-FR-Neural2-D",
            "fr-FR-Neural2-E",
        ],
    },
    "german": {
        "code": "de-DE",
        "voices": [
            "de-DE-Neural2-A",
            "de-DE-Neural2-B",
            "de-DE-Neural2-C",
            "de-DE-Neural2-D",
            "de-DE-Neural2-F",
        ],
    },
    "italian": {
        "code": "it-IT",
        "voices": [
            "it-IT-Neural2-A",
            "it-IT-Neural2-C",
            "it-IT-Neural2-E",
        ],
    },
    "russian": {
        "code": "ru-RU",
        "voices": [
            "ru-RU-Wavenet-A",
            "ru-RU-Wavenet-B",
            "ru-RU-Wavenet-C",
            "ru-RU-Wavenet-D",
            "ru-RU-Wavenet-E",
        ],
    },
}

FALLBACK_LANGUAGE = "english"


# Per-level speaking-rate multipliers for Google TTS. 1.0 = native pace.
# Sub-1.0 stretches the audio without pitching it (speaking_rate is
# duration-based, not pitch-shift), which is exactly what beginners need.
_LEVEL_RATE = {
    "A0": 0.70,
    "A1": 0.80,
    "A2": 0.85,
    "B1": 0.92,
    "B2": 1.00,
    "C1": 1.05,
    "C2": 1.05,
}


def _speaking_rate_for_level(level: str | None) -> float:
    if not level:
        return 1.0
    return _LEVEL_RATE.get(level.upper().strip(), 1.0)


class TTSService:
    def __init__(self) -> None:
        api_key = os.getenv("GOOGLE_TTS_API_KEY")
        if api_key:
            self.client = texttospeech.TextToSpeechClient(
                client_options=ClientOptions(api_key=api_key)
            )
        else:
            self.client = texttospeech.TextToSpeechClient()

    def synthesize(
        self, text: str, language: str, level: str | None = None
    ) -> bytes:
        """Synthesize speech for a listening exercise.

        `level` is the CEFR level of the listener. Lower levels get a
        slower speaking rate so beginners can actually parse the audio
        — the previous fixed 1.0 rate produced ~180 wpm Polish, which
        is unintelligible at A1/A2. Mapping is conservative; native-
        speed listening only kicks in at C1+.
        """
        language_key = language.lower()
        pool = LANGUAGE_VOICE_POOLS.get(language_key) or LANGUAGE_VOICE_POOLS[FALLBACK_LANGUAGE]

        voice_name = random.choice(pool["voices"])
        language_code = pool["code"]

        rate = _speaking_rate_for_level(level)

        synthesis_input = texttospeech.SynthesisInput(text=text)
        voice = texttospeech.VoiceSelectionParams(
            language_code=language_code,
            name=voice_name,
        )
        audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.MP3,
            speaking_rate=rate,
            pitch=0.0,
        )

        response = self.client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )
        return response.audio_content

    def synthesize_multispeaker(
        self, text: str, language: str, level: str | None = None
    ) -> Tuple[bytes, List[str]]:
        """Synthesize a multi-speaker dialogue into a single MP3.

        The transcript is expected to contain `[Speaker N]:` style
        tags at the start of each turn. Each unique speaker label is
        assigned a distinct voice from the language's pool and that
        voice is reused for every line attributed to that speaker.

        MP3 frames produced by Google TTS at identical config are
        byte-concatenable; we exploit that to stitch the per-turn
        clips into a single playable file. Tiny seam artefacts are
        possible at frame boundaries but are inaudible at the
        speaking rates we use for learners.

        Returns (audio_bytes, speaker_labels_in_order_of_appearance).
        Falls back to single-voice synthesis when the text contains
        no speaker tags.
        """
        # Pull speaker tags + segments. If none found, this is a
        # plain monologue and we can defer to the single-voice path.
        segments = _split_by_speaker_tags(text)
        if not segments:
            return self.synthesize(text, language, level), []

        language_key = language.lower()
        pool = LANGUAGE_VOICE_POOLS.get(language_key) or LANGUAGE_VOICE_POOLS[FALLBACK_LANGUAGE]
        voices = list(pool["voices"])
        random.shuffle(voices)
        language_code = pool["code"]
        rate = _speaking_rate_for_level(level)

        # Stable speaker → voice mapping. Walking insertion order so
        # the first speaker who shows up gets voice[0], second gets
        # voice[1], etc. Wraps around when pool is smaller than the
        # speaker count (rare — pools have 3-6 voices).
        speaker_to_voice: dict[str, str] = {}
        speakers_in_order: list[str] = []
        for label, _ in segments:
            if label not in speaker_to_voice:
                speaker_to_voice[label] = voices[
                    len(speaker_to_voice) % len(voices)
                ]
                speakers_in_order.append(label)

        audio_chunks: List[bytes] = []
        for label, line in segments:
            if not line.strip():
                continue
            voice = texttospeech.VoiceSelectionParams(
                language_code=language_code,
                name=speaker_to_voice[label],
            )
            audio_config = texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
                speaking_rate=rate,
                pitch=0.0,
            )
            response = self.client.synthesize_speech(
                input=texttospeech.SynthesisInput(text=line),
                voice=voice,
                audio_config=audio_config,
            )
            audio_chunks.append(response.audio_content)

        return b"".join(audio_chunks), speakers_in_order

    @staticmethod
    def available_languages() -> List[str]:
        return list(LANGUAGE_VOICE_POOLS.keys())


def _split_by_speaker_tags(text: str) -> List[Tuple[str, str]]:
    """Return [(speaker_label, line), ...] in transcript order.

    Empty list when the text contains no `[Speaker N]:` style tags —
    callers treat that as "monologue, use single-voice synthesis".
    """
    matches = list(_SPEAKER_TAG_RE.finditer(text))
    if not matches:
        return []

    segments: List[Tuple[str, str]] = []
    for i, m in enumerate(matches):
        label = m.group(1).strip()
        body_start = m.end()
        body_end = matches[i + 1].start() if i + 1 < len(matches) else len(text)
        line = text[body_start:body_end].strip()
        segments.append((label, line))
    return segments

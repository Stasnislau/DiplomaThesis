"""Normalise the language field on TaskHistoryEntry to ISO 639-1.

Bridge receives the language as either a full English name
("English", "Polish") from the curriculum/UI or a two-letter code
("en", "pl") from the locale dropdown. The history table previously
stored `name.lower()[:5]`, which produced ugly truncations like
"polis", "russi", "germa". This helper hands every caller a stable
two-letter code (or None for unknown input).
"""
from typing import Optional


_LANG_TO_ISO = {
    # Common full names — keys are lowercased before lookup.
    "english": "en",
    "polish": "pl",
    "spanish": "es",
    "russian": "ru",
    "french": "fr",
    "german": "de",
    "italian": "it",
    "portuguese": "pt",
    "dutch": "nl",
    "ukrainian": "uk",
    "japanese": "ja",
    "korean": "ko",
    "chinese": "zh",
    # Already-iso identifiers we accept passthrough.
    "en": "en",
    "pl": "pl",
    "es": "es",
    "ru": "ru",
    "fr": "fr",
    "de": "de",
    "it": "it",
    "pt": "pt",
    "nl": "nl",
    "uk": "uk",
    "ja": "ja",
    "ko": "ko",
    "zh": "zh",
}


def to_iso_language(value: Optional[str]) -> Optional[str]:
    """Return the canonical two-letter ISO code, or None for unknowns."""
    if not value:
        return None
    key = value.strip().lower()
    if not key:
        return None
    # Locale-tagged form: "en-US" → "en".
    if "-" in key:
        key = key.split("-", 1)[0]
    return _LANG_TO_ISO.get(key)

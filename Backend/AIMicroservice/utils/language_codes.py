from typing import Optional


_LANG_TO_ISO = {
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
    if not value:
        return None
    key = value.strip().lower()
    if not key:
        return None
    if "-" in key:
        key = key.split("-", 1)[0]
    return _LANG_TO_ISO.get(key)

from constants.constants import AVAILABLE_LANGUAGES_CODES


def convert_to_language_code(language: str) -> str:
    language = language.lower()
    if language in AVAILABLE_LANGUAGES_CODES:
        return AVAILABLE_LANGUAGES_CODES[language]
    else:
        raise ValueError(f"Language {language} not found in AVAILABLE_LANGUAGES_CODES")


def convert_to_language_name(language_code: str) -> str:
    for language, code in AVAILABLE_LANGUAGES_CODES.items():
        if code == language_code:
            return language
    raise ValueError(f"Language code {language_code} not found in AVAILABLE_LANGUAGES_CODES")

# i18n.py

import os
import json
import locale
from functools import lru_cache

I18N_DIR = os.path.join(os.path.dirname(__file__), 'i18n')
DEFAULT_LANG = 'en'

@lru_cache(maxsize=4)
def load_translations(lang_code):
    """Load translation dictionary for given lang_code from JSON file."""
    filename = os.path.join(I18N_DIR, f"{lang_code}.json")
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    # Try language only part like 'de' from 'de_DE'
    short = lang_code.split('_')[0]
    filename = os.path.join(I18N_DIR, f"{short}.json")
    if os.path.exists(filename):
        with open(filename, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {}


def detect_system_language():
    """Detect preferred language using environment and system settings. Returns a lang code like 'en' or 'de'."""
    # Respect LANG env if provided (works in containers when forwarded)
    lang_env = os.getenv('LANG') or os.getenv('LANGUAGE')
    if lang_env:
        # LANG may contain encoding; e.g. de_DE.UTF-8
        lang = lang_env.split('.')[0]
        return lang
    loc = locale.getdefaultlocale()[0]
    if loc:
        return loc
    return DEFAULT_LANG


# Additional helpers for frontend and normalized language handling
def normalize_lang_code(lang_code: str) -> str:
    """Normalize a language code to its short form (e.g. 'de_DE.UTF-8' -> 'de')."""
    if not lang_code:
        return DEFAULT_LANG
    lang = lang_code.split('.')[0]
    return (lang.split('_')[0]) if '_' in lang or '-' in lang else lang


def get_available_languages():
    """Return list of available language codes based on JSON files in i18n directory."""
    langs = []
    try:
        for fname in os.listdir(I18N_DIR):
            if fname.endswith('.json'):
                langs.append(os.path.splitext(fname)[0])
    except Exception:
        pass
    return langs


def get_translations(lang: str = None) -> dict:
    """Return the translation dictionary for given language (normalized); fallback to DEFAULT_LANG."""
    lang = lang or detect_system_language()
    lang = normalize_lang_code(lang)
    translations = load_translations(lang)
    if translations:
        return translations
    return load_translations(DEFAULT_LANG)


def translate(key: str, **kwargs):
    """Translate a key using normalized language detection. Safe formatting with kwargs."""
    translations = get_translations()
    text = translations.get(key, load_translations(DEFAULT_LANG).get(key, key))
    try:
        return text.format(**kwargs)
    except Exception:
        return text

# Re-export a simple module-level translator '_' for backward compatibility
_ = translate

__all__ = ['load_translations', 'detect_system_language', 'get_translations', 'get_available_languages', '_']

# Solumati Question Bank (Skeleton)
# Text and Options are now loaded from i18n/*.json


from app.services.i18n import get_translations

QUESTIONS_SKELETON = [
    # --- Value & Meaning (High Weight) ---
    {"id": 1, "category": "Values", "weight": 10, "option_count": 4},
    {"id": 2, "category": "Values", "weight": 5, "option_count": 4},
    {"id": 3, "category": "Life Goals", "weight": 20, "option_count": 4},
    {"id": 4, "category": "Values", "weight": 8, "option_count": 4},
    {"id": 5, "category": "Values", "weight": 6, "option_count": 3},
    {"id": 6, "category": "Values", "weight": 7, "option_count": 4},
    {"id": 7, "category": "Values", "weight": 5, "option_count": 3},
    {"id": 8, "category": "Family", "weight": 8, "option_count": 3},
    {"id": 9, "category": "Beliefs", "weight": 4, "option_count": 3},
    {"id": 10, "category": "Values", "weight": 5, "option_count": 3},

    # --- Personality & Temperament ---
    {"id": 11, "category": "Personality", "weight": 8, "option_count": 4},
    {"id": 12, "category": "Personality", "weight": 5, "option_count": 3},
    {"id": 13, "category": "Personality", "weight": 4, "option_count": 5},
    {"id": 14, "category": "Personality", "weight": 3, "option_count": 4},
    {"id": 15, "category": "Personality", "weight": 6, "option_count": 4},
    {"id": 16, "category": "Personality", "weight": 5, "option_count": 3},
    {"id": 17, "category": "Personality", "weight": 5, "option_count": 3},
    {"id": 18, "category": "Personality", "weight": 5, "option_count": 3},
    {"id": 19, "category": "Personality", "weight": 4, "option_count": 3},
    {"id": 20, "category": "Personality", "weight": 6, "option_count": 3},

    # --- Lifestyle & Habits ---
    {"id": 21, "category": "Lifestyle", "weight": 15, "option_count": 4},
    {"id": 22, "category": "Lifestyle", "weight": 5, "option_count": 3},
    {"id": 23, "category": "Lifestyle", "weight": 5, "option_count": 4},
    {"id": 24, "category": "Lifestyle", "weight": 2, "option_count": 3},
    {"id": 25, "category": "Lifestyle", "weight": 10, "option_count": 6},
    {"id": 26, "category": "Lifestyle", "weight": 5, "option_count": 5},
    {"id": 27, "category": "Lifestyle", "weight": 6, "option_count": 4},
    {"id": 28, "category": "Lifestyle", "weight": 5, "option_count": 3},
    {"id": 29, "category": "Lifestyle", "weight": 4, "option_count": 3},
    {"id": 30, "category": "Values", "weight": 6, "option_count": 3},

    # --- Interests & Hobbies ---
    {"id": 31, "category": "Interests", "weight": 5, "option_count": 5},
    {"id": 32, "category": "Interests", "weight": 3, "option_count": 3},
    {"id": 33, "category": "Interests", "weight": 3, "option_count": 4},
    {"id": 34, "category": "Interests", "weight": 2, "option_count": 6},
    {"id": 35, "category": "Interests", "weight": 3, "option_count": 4},
    {"id": 36, "category": "Interests", "weight": 3, "option_count": 4},
    {"id": 37, "category": "Lifestyle", "weight": 4, "option_count": 3},
    {"id": 38, "category": "Interests", "weight": 3, "option_count": 3},
    {"id": 39, "category": "Interests", "weight": 1, "option_count": 6},
    {"id": 40, "category": "Lifestyle", "weight": 4, "option_count": 3},

    # --- Relationships & Sex ---
    {"id": 41, "category": "Relationships", "weight": 8, "option_count": 5},
    {"id": 42, "category": "Relationships", "weight": 20, "option_count": 3},
    {"id": 43, "category": "Relationships", "weight": 3, "option_count": 4},
    {"id": 44, "category": "Relationships", "weight": 4, "option_count": 5},
    {"id": 45, "category": "Relationships", "weight": 8, "option_count": 4},
    {"id": 46, "category": "Relationships", "weight": 3, "option_count": 3},
    {"id": 47, "category": "Beliefs", "weight": 4, "option_count": 3},
    {"id": 48, "category": "Relationships", "weight": 6, "option_count": 4},
    {"id": 49, "category": "Relationships", "weight": 10, "option_count": 2},
    {"id": 50, "category": "Relationships", "weight": 8, "option_count": 2}
]

def get_questions(lang=None):
    """
    Returns the list of questions with text and options translated.
    """
    translations = get_translations(lang)
    q_data = translations.get("questions", {})

    final_questions = []
    for q_meta in QUESTIONS_SKELETON:
        qid = str(q_meta["id"])
        if qid in q_data:
            q_trans = q_data[qid]
            # Merge skeleton metadata with translation data (text, options)
            merged = q_meta.copy()
            merged.update(q_trans)
            final_questions.append(merged)
        else:
            # Fallback if translation missing? Just keep skeleton or skip?
            # Ideally we want to prevent crashes, so maybe skip or provide placeholder
            pass

    return final_questions

def get_question_by_id(qid: int, lang=None):
    questions = get_questions(lang)
    for q in questions:
        if q["id"] == qid:
            return q
    return None

# Export a default version (English) for import compatibility (e.g. tests, utils imports)
QUESTIONS = get_questions('en')

# Solumati Question Bank

QUESTIONS = [
    # --- Category: Values & Personality (Weight: High) ---
    {
        "id": 1,
        "text": "How important is religion or spirituality in your life?",
        "options": ["Not important", "Somewhat important", "Very important", "Essential"],
        "category": "Values",
        "weight": 10
    },
    {
        "id": 2,
        "text": "What is your stance on political discussions?",
        "options": ["I avoid them", "I'm open to them", "I enjoy them", "Use to screen people"],
        "category": "Values",
        "weight": 5
    },
    {
        "id": 3,
        "text": "Do you want children in the future?",
        "options": ["No", "Maybe", "Yes", "I already have them"],
        "category": "Life Goals",
        "weight": 20
    },
    {
        "id": 4,
        "text": "How do you handle conflict?",
        "options": ["Avoid it", "Compromise", "Win the argument", " Discuss calmly"],
        "category": "Personality",
        "weight": 8
    },
    {
        "id": 5,
        "text": "Introvert or Extrovert?",
        "options": ["Introvert", "Ambivert", "Extrovert"],
        "category": "Personality",
        "weight": 5
    },
    {
        "id": 6,
        "text": "Smoking?",
        "options": ["Never", "Socially", "Regularly", "Trying to quit"],
        "category": "Lifestyle",
        "weight": 15
    },
    {
        "id": 7,
        "text": "Drinking alcohol?",
        "options": ["Never", "Socially", "Often"],
        "category": "Lifestyle",
        "weight": 5
    },
    {
        "id": 8,
        "text": "How often do you exercise?",
        "options": ["Never", "Sometimes", "Often", "Daily"],
        "category": "Lifestyle",
        "weight": 5
    },
    {
        "id": 9,
        "text": "Are you a morning person or a night owl?",
        "options": ["Morning", "Night", "Both/Neither"],
        "category": "Lifestyle",
        "weight": 2
    },
     {
        "id": 10,
        "text": "How ambitious are you regarding your career?",
        "options": ["Not a priority", "Balanced", "Very ambitious", "Workaholic"],
        "category": "Values",
        "weight": 8
    },

    # --- Category: Interests & Preferences ---
    {
        "id": 11,
        "text": "Ideal weekend?",
        "options": ["Hiking/Outdoors", "Netflix & Chill", "Partying", "Reading/Relaxing", "Productive work"],
        "category": "Interests",
        "weight": 5
    },
    {
        "id": 12,
        "text": "Do you have pets?",
        "options": ["No", "Cats", "Dogs", "Other", "Want them", "Allergic"],
        "category": "Lifestyle",
        "weight": 10
    },
    {
        "id": 13,
        "text": "Dietary preference?",
        "options": ["Omnivore", "Vegetarian", "Vegan", "Keto/Paleo", "Other"],
        "category": "Lifestyle",
        "weight": 5
    },
    {
        "id": 14,
        "text": "How much do you value art and culture?",
        "options": ["Not really", "Somewhat", "Very much"],
        "category": "Interests",
        "weight": 3
    },
    {
        "id": 15,
        "text": "Do you enjoy traveling?",
        "options": ["Homebody", "Once a year", "Frequent traveler", "Digital Nomad"],
        "category": "Lifestyle",
        "weight": 6
    },
    {
        "id": 16,
        "text": "Spontaneity vs. Planning?",
        "options": ["100% Spontaneous", "Mostly Spontaneous", "Balanced", "Mostly Planner", "100% Planner"],
        "category": "Personality",
        "weight": 4
    },
    {
        "id": 17,
        "text": "Communication style?",
        "options": ["Texting all day", "Calls prefered", "Quality time in person", "Low frequency"],
        "category": "Values",
        "weight": 7
    },
    {
        "id": 18,
        "text": "Spending habits?",
        "options": ["Frugal", "Balanced", "Spender"],
        "category": "Values",
        "weight": 6
    },
    {
        "id": 19,
        "text": "Cleanliness level?",
        "options": ["Messy", "Average", "Neat freak"],
        "category": "Lifestyle",
        "weight": 5
    },
    {
        "id": 20,
        "text": "How satisfied are you with your life right now?",
        "options": ["Not at all", "Could be better", "Satisfied", "Very happy"],
        "category": "Personality",
        "weight": 3
    },

    # --- Category: Relationships ---
    {
        "id": 21,
        "text": "Love Language?",
        "options": ["Words of Affirmation", "Acts of Service", "Receiving Gifts", "Quality Time", "Physical Touch"],
        "category": "Relationships",
        "weight": 8
    },
    {
        "id": 22,
        "text": "Opinion on open relationships?",
        "options": ["Strictly Monogamous", "Open to it", "Polyamorous"],
        "category": "Relationships",
        "weight": 20
    },
    {
        "id": 23,
        "text": "First date preference?",
        "options": ["Coffee", "Dinner", "Activity/Walk", "Drinks"],
        "category": "Relationships",
        "weight": 3
    },
    {
        "id": 24,
        "text": "How long was your longest relationship?",
        "options": ["None", "< 1 year", "1-3 years", "3-5 years", "5+ years"],
        "category": "Relationships",
        "weight": 4
    },
    {
        "id": 25,
        "text": "Are you jealous?",
        "options": ["Never", "Rarely", "Sometimes", "Often"],
        "category": "Personality",
        "weight": 6
    }
]

def get_question_by_id(qid):
    return next((q for q in QUESTIONS if q["id"] == qid), None)

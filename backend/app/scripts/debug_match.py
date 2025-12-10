
import json
import random
import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from app.services.utils import calculate_compatibility
from app.services.questions_content import QUESTIONS_SKELETON

# Simulate Guest Data (from init_data.py)
guest_answers = json.dumps({str(i): 1 for i in range(1, 51)})
guest_intent = "casual"

# Simulate Dummy Data Generation (from init_data.py)
dummies = []
for i in range(5):
    dummy_answers = {}
    for q in QUESTIONS_SKELETON:
        cnt = q.get("option_count", 3)
        dummy_answers[str(q["id"])] = random.randint(0, cnt - 1)

    dummies.append({
        "answers": json.dumps(dummy_answers),
        "intent": random.choice(["casual", "longterm", "friendship"])
    })

print("Guest Answers:", guest_answers)
print("-" * 20)

for i, d in enumerate(dummies):
    score = calculate_compatibility(guest_answers, d["answers"], guest_intent, d["intent"])
    print(f"Dummy {i} ({d['intent']}): Score = {score['score']}%")

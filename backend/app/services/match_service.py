import json
import random
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.db import models, schemas
from app.services.questions_content import QUESTIONS_SKELETON

# O(1) Lookup for question metadata
QUESTION_METADATA = {
    q["id"]: {"weight": q.get("weight", 5), "category": q.get("category", "General")}
    for q in QUESTIONS_SKELETON
}

class MatchService:
    def calculate_compatibility(self, answers_a_raw: str | dict | list, answers_b_raw: str | dict | list, intent_a: str, intent_b: str) -> dict:
        """
        Calculates detailed compatibility score.
        Optimized to use cached metadata and avoid re-parsing overhead where possible.
        """
        # 1. Intent Check
        intent_score = 100
        if intent_a and intent_b and intent_a != intent_b:
            intent_score = 40

        # 2. Parse Answers
        ans_a = self._parse_answers(answers_a_raw)
        ans_b = self._parse_answers(answers_b_raw)

        if not ans_a or not ans_b:
             return {"score": intent_score if intent_score < 100 else 50, "details": [], "common": []}

        total_weight = 0
        earned_weight = 0
        details = set()

        # Intersection of answered questions
        # Using string keys because JSON keys are always strings
        common_keys = set(str(k) for k in ans_a.keys()) & set(str(k) for k in ans_b.keys())

        for qid_str in common_keys:
            qid = int(qid_str) # Conversion overhead but acceptable
            meta = QUESTION_METADATA.get(qid)

            if not meta:
                continue

            weight = meta["weight"]
            total_weight += weight

            # Use loose equality to handle string/int differences in values
            val_a = ans_a[str(qid)]
            val_b = ans_b[str(qid)]

            if str(val_a) == str(val_b):
                earned_weight += weight
                details.add(f"Matched on: {meta['category']}")

        # Calculate Score
        if total_weight == 0:
            final_score = intent_score if intent_score < 100 else 50
        else:
            match_percentage = (earned_weight / total_weight) * 100
            final_score = (match_percentage * 0.7) + (intent_score * 0.3)

        return {
            "score": round(final_score),
            "details": list(details),
        }

    def _parse_answers(self, raw: str | dict | list) -> dict:
        if isinstance(raw, dict):
            return raw
        if isinstance(raw, str):
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return parsed
                # Handle list [3,3,3,3] - we can't map these to IDs easily without order assumption
                # For robustness, we return empty if list/malformed
                return {}
            except:
                return {}
        return {}

    def get_matches_for_user(self, db: Session, user: models.User, candidates: List[models.User], is_guest: bool, is_admin: bool) -> List[schemas.MatchResult]:
        """
        Process candidates and return sorted results.
        """
        # Parse current user once
        curr_answ = user.answers
        # Guest answers [3,3,3,3] might be passed as list or default logic?
        # If user is generic object/dict, fine.

        results = []

        # Guest Ads
        ADS = [
            "🔒 Unlock to see full profile! The Solumati community is waiting.",
            "✨ This user seems interesting! Sign up to see more.",
            "❤️ Real connections happen here. Join us to chat!",
            "🚀 Upgrade for the full experience. It's free!",
        ]

        for other in candidates:
            compatibility = self.calculate_compatibility(
                curr_answ, other.answers, user.intent, other.intent
            )
            score = compatibility["score"]

            # Escape Hatch
            if (is_guest or is_admin) and other.role == "test":
                if score <= 0: score = 95
                compatibility["details"].append("Debug Mode: Dummy Match")

            # Obfuscation
            final_username = other.username
            final_about = other.about_me
            final_image = other.image_url
            match_details = compatibility["details"]

            if is_guest and other.role != "test":
                final_username = f"{other.username[0]}..." if other.username else "User..."
                final_about = random.choice(ADS)
                match_details = ["RESTRICTED_VIEW"]
                if score <= 0:
                    score = float(random.randint(40, 85))

            if score > 0:
                results.append(
                    schemas.MatchResult(
                        user_id=other.id,
                        username=final_username,
                        about_me=final_about,
                        image_url=final_image,
                        score=score,
                        match_details=match_details,
                    )
                )

        results.sort(key=lambda x: x.score, reverse=True)
        return results

match_service = MatchService()

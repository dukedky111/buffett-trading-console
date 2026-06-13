"""Minimal signal engine sketch for Buffett Transcript Trading.

This is intentionally small: it encodes the strategy rules before wiring in
real YouTube, market data, or financial statement providers.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class Action(str, Enum):
    BUY_CANDIDATE = "BUY_CANDIDATE"
    WATCH = "WATCH"
    WAIT = "WAIT"
    REJECT = "REJECT"
    TRIM = "TRIM"
    SELL = "SELL"


@dataclass(frozen=True)
class TranscriptEvent:
    ticker: str
    explicit_stock: bool
    explicit_price_level: bool
    clear_reasoning: bool
    risk_disclosure: bool
    fundamental_alignment: bool
    repeated_mentions: bool


@dataclass(frozen=True)
class BuffettAssessment:
    quality_score: int
    intrinsic_value: float
    current_price: float
    required_margin_of_safety: float
    management_integrity_problem: bool = False
    major_financial_red_flags: bool = False
    price_level_score: int = 0

    @property
    def margin_of_safety(self) -> float:
        if self.intrinsic_value <= 0:
            return -1.0
        return (self.intrinsic_value - self.current_price) / self.intrinsic_value


def score_transcript_event(event: TranscriptEvent) -> int:
    score = 0
    score += 20 if event.explicit_stock else 0
    score += 20 if event.explicit_price_level else 0
    score += 20 if event.clear_reasoning else 0
    score += 10 if event.risk_disclosure else 0
    score += 20 if event.fundamental_alignment else 0
    score += 10 if event.repeated_mentions else 0
    return score


def decide_action(event: TranscriptEvent, assessment: BuffettAssessment) -> Action:
    transcript_score = score_transcript_event(event)

    if assessment.management_integrity_problem:
        return Action.REJECT

    if assessment.major_financial_red_flags:
        return Action.REJECT

    if assessment.quality_score < 65:
        return Action.REJECT

    if transcript_score < 40:
        return Action.REJECT

    if assessment.margin_of_safety < assessment.required_margin_of_safety:
        return Action.WAIT

    if assessment.quality_score >= 75 and transcript_score >= 60 and assessment.price_level_score >= 60:
        return Action.BUY_CANDIDATE

    return Action.WATCH


def suggested_position_size(assessment: BuffettAssessment) -> float:
    """Return suggested portfolio weight as a decimal."""
    mos = assessment.margin_of_safety

    if assessment.management_integrity_problem or assessment.major_financial_red_flags:
        return 0.0

    if assessment.quality_score >= 85 and mos >= 0.40:
        return 0.06

    if assessment.quality_score >= 75 and mos >= 0.30:
        return 0.03

    if assessment.quality_score >= 65 and mos >= 0.40:
        return 0.02

    return 0.0


if __name__ == "__main__":
    event = TranscriptEvent(
        ticker="NVDA",
        explicit_stock=True,
        explicit_price_level=True,
        clear_reasoning=True,
        risk_disclosure=True,
        fundamental_alignment=True,
        repeated_mentions=False,
    )
    assessment = BuffettAssessment(
        quality_score=82,
        intrinsic_value=150.0,
        current_price=100.0,
        required_margin_of_safety=0.30,
        price_level_score=70,
    )
    print(
        {
            "ticker": event.ticker,
            "transcript_score": score_transcript_event(event),
            "margin_of_safety": round(assessment.margin_of_safety, 4),
            "action": decide_action(event, assessment).value,
            "position_size": suggested_position_size(assessment),
        }
    )

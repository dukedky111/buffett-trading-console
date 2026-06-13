"""Shared data models for the backtest lab."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class TranscriptSignal:
    event_date: date
    ticker: str
    direction: str
    support_level: float | None
    resistance_level: float | None
    buy_zone_low: float | None
    buy_zone_high: float | None
    target_price: float | None
    risk_level: float | None
    transcript_score: int
    raw_evidence: str


@dataclass(frozen=True)
class BuffettAssessment:
    date: date
    ticker: str
    quality_score: int
    intrinsic_value: float
    required_margin_of_safety: float
    management_integrity_problem: bool
    major_financial_red_flags: bool
    price_level_score: int


@dataclass
class Position:
    ticker: str
    shares: float
    entry_date: date
    entry_price: float
    stop_price: float | None
    target_price: float | None
    max_holding_days: int


@dataclass(frozen=True)
class Trade:
    ticker: str
    entry_date: date
    exit_date: date
    entry_price: float
    exit_price: float
    shares: float
    pnl: float
    pnl_pct: float
    reason: str


@dataclass(frozen=True)
class BacktestConfig:
    initial_cash: float = 100_000.0
    fee_rate: float = 0.0005
    slippage_rate: float = 0.001
    max_holding_days: int = 60
    min_transcript_score: int = 60
    min_quality_score: int = 75
    default_position_size: float = 0.03
    max_single_position: float = 0.12

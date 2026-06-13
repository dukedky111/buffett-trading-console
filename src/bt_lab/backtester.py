"""Long-only daily backtester for transcript and Buffett-filtered strategies."""

from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

import pandas as pd

from .io import ensure_dir, latest_assessment, load_assessments, load_events, load_price_files
from .models import BacktestConfig, Position, Trade


def bool_value(value: object) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().lower() in {"1", "true", "yes", "y"}


def execution_price(raw_price: float, side: str, slippage_rate: float) -> float:
    if side == "buy":
        return raw_price * (1 + slippage_rate)
    return raw_price * (1 - slippage_rate)


def next_trading_date(price_df: pd.DataFrame, event_date: date) -> date | None:
    future_dates = [idx for idx in price_df.index if idx > event_date]
    return future_dates[0] if future_dates else None


def should_enter_transcript_direct(event: pd.Series, config: BacktestConfig) -> bool:
    return (
        str(event.get("direction", "neutral")) != "bearish"
        and int(event["transcript_score"]) >= config.min_transcript_score
    )


def should_enter_buffett_transcript(
    event: pd.Series,
    assessment: pd.Series | None,
    current_price: float,
    config: BacktestConfig,
) -> bool:
    if assessment is None:
        return False
    if not should_enter_transcript_direct(event, config):
        return False
    if bool_value(assessment["management_integrity_problem"]):
        return False
    if bool_value(assessment["major_financial_red_flags"]):
        return False
    if int(assessment["quality_score"]) < config.min_quality_score:
        return False
    intrinsic_value = float(assessment["intrinsic_value"])
    if intrinsic_value <= 0:
        return False
    margin_of_safety = (intrinsic_value - current_price) / intrinsic_value
    if margin_of_safety < float(assessment["required_margin_of_safety"]):
        return False
    return int(assessment["price_level_score"]) >= 60


def position_weight_from_assessment(
    assessment: pd.Series | None,
    current_price: float,
    config: BacktestConfig,
) -> float:
    if assessment is None:
        return config.default_position_size
    intrinsic_value = float(assessment["intrinsic_value"])
    mos = (intrinsic_value - current_price) / intrinsic_value if intrinsic_value > 0 else 0.0
    quality = int(assessment["quality_score"])
    if quality >= 85 and mos >= 0.40:
        return min(0.06, config.max_single_position)
    if quality >= 75 and mos >= 0.30:
        return min(0.03, config.max_single_position)
    if quality >= 65 and mos >= 0.40:
        return min(0.02, config.max_single_position)
    return 0.0


class DailyBacktester:
    def __init__(
        self,
        prices: dict[str, pd.DataFrame],
        events: pd.DataFrame,
        assessments: pd.DataFrame,
        strategy: str,
        config: BacktestConfig,
    ) -> None:
        self.prices = prices
        self.events = events
        self.assessments = assessments
        self.strategy = strategy
        self.config = config
        self.cash = config.initial_cash
        self.positions: dict[str, Position] = {}
        self.trades: list[Trade] = []
        self.equity_rows: list[dict[str, object]] = []
        self.processed_events: set[int] = set()

    def run(self) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        calendar = sorted({idx for df in self.prices.values() for idx in df.index})
        events = self.events.reset_index(drop=True)
        events["_event_id"] = events.index

        for current_date in calendar:
            self._process_exits(current_date)
            due_events = events[
                (events["event_date"] < current_date)
                & (~events["_event_id"].isin(self.processed_events))
            ]
            if not due_events.empty:
                self._process_entries(current_date, due_events)
            self._record_equity(current_date)

        if calendar:
            self._liquidate(calendar[-1], "end_of_backtest")
            self._record_equity(calendar[-1])

        equity = pd.DataFrame(self.equity_rows).drop_duplicates("date", keep="last")
        trades = pd.DataFrame([trade.__dict__ for trade in self.trades])
        summary = summarize_performance(equity, trades, self.config.initial_cash)
        return equity, trades, summary

    def _process_entries(self, execution_date: date, daily_events: pd.DataFrame) -> None:
        for _, event in daily_events.iterrows():
            self.processed_events.add(int(event["_event_id"]))
            signal_date = event["event_date"]
            ticker = str(event["ticker"]).upper()
            if ticker in self.positions or ticker not in self.prices:
                continue
            price_df = self.prices[ticker]
            if execution_date not in price_df.index:
                continue
            bar = price_df.loc[execution_date]
            raw_price = float(bar["open"])
            assessment = latest_assessment(self.assessments, ticker, signal_date)

            if self.strategy == "transcript_direct":
                should_enter = should_enter_transcript_direct(event, self.config)
                weight = self.config.default_position_size
            elif self.strategy == "buffett_transcript":
                should_enter = should_enter_buffett_transcript(event, assessment, raw_price, self.config)
                weight = position_weight_from_assessment(assessment, raw_price, self.config)
            else:
                raise ValueError(f"Unknown strategy: {self.strategy}")

            if not should_enter or weight <= 0:
                continue

            buy_price = execution_price(raw_price, "buy", self.config.slippage_rate)
            budget = min(self.cash, self.config.initial_cash * weight)
            if budget <= 0:
                continue
            fee = budget * self.config.fee_rate
            shares = (budget - fee) / buy_price
            self.cash -= budget
            self.positions[ticker] = Position(
                ticker=ticker,
                shares=shares,
                entry_date=execution_date,
                entry_price=buy_price,
                stop_price=_float_or_none(event.get("risk_level")),
                target_price=_float_or_none(event.get("target_price")),
                max_holding_days=self.config.max_holding_days,
            )

    def _process_exits(self, current_date: date) -> None:
        for ticker in list(self.positions):
            position = self.positions[ticker]
            price_df = self.prices[ticker]
            if current_date not in price_df.index:
                continue
            bar = price_df.loc[current_date]
            reason = None
            raw_exit = float(bar["close"])

            if position.stop_price and float(bar["low"]) <= position.stop_price:
                raw_exit = position.stop_price
                reason = "stop"
            elif position.target_price and float(bar["high"]) >= position.target_price:
                raw_exit = position.target_price
                reason = "target"
            elif (current_date - position.entry_date).days >= position.max_holding_days:
                reason = "max_holding_days"

            if reason:
                self._close_position(ticker, current_date, raw_exit, reason)

    def _close_position(self, ticker: str, current_date: date, raw_exit: float, reason: str) -> None:
        position = self.positions.pop(ticker)
        sell_price = execution_price(raw_exit, "sell", self.config.slippage_rate)
        gross_value = position.shares * sell_price
        fee = gross_value * self.config.fee_rate
        net_value = gross_value - fee
        self.cash += net_value
        cost = position.shares * position.entry_price
        pnl = net_value - cost
        self.trades.append(
            Trade(
                ticker=ticker,
                entry_date=position.entry_date,
                exit_date=current_date,
                entry_price=position.entry_price,
                exit_price=sell_price,
                shares=position.shares,
                pnl=pnl,
                pnl_pct=pnl / cost if cost else 0.0,
                reason=reason,
            )
        )

    def _liquidate(self, current_date: date, reason: str) -> None:
        for ticker in list(self.positions):
            price_df = self.prices[ticker]
            if current_date in price_df.index:
                self._close_position(ticker, current_date, float(price_df.loc[current_date, "close"]), reason)

    def _record_equity(self, current_date: date) -> None:
        market_value = 0.0
        for ticker, position in self.positions.items():
            price_df = self.prices[ticker]
            if current_date in price_df.index:
                market_value += position.shares * float(price_df.loc[current_date, "close"])
        self.equity_rows.append(
            {
                "date": current_date,
                "cash": self.cash,
                "market_value": market_value,
                "equity": self.cash + market_value,
                "open_positions": len(self.positions),
            }
        )


def _float_or_none(value: object) -> float | None:
    if value is None or pd.isna(value) or value == "":
        return None
    return float(value)


def summarize_performance(equity: pd.DataFrame, trades: pd.DataFrame, initial_cash: float) -> pd.DataFrame:
    if equity.empty:
        return pd.DataFrame()
    values = equity["equity"].astype(float)
    returns = values.pct_change().dropna()
    total_return = values.iloc[-1] / initial_cash - 1
    days = max((pd.to_datetime(equity["date"].iloc[-1]) - pd.to_datetime(equity["date"].iloc[0])).days, 1)
    cagr = (values.iloc[-1] / initial_cash) ** (365.25 / days) - 1
    peak = values.cummax()
    drawdown = values / peak - 1
    max_drawdown = drawdown.min()
    sharpe = 0.0
    if len(returns) > 1 and returns.std() != 0:
        sharpe = (returns.mean() / returns.std()) * (252**0.5)
    win_rate = 0.0
    profit_factor = 0.0
    if not trades.empty:
        wins = trades[trades["pnl"] > 0]
        losses = trades[trades["pnl"] < 0]
        win_rate = len(wins) / len(trades)
        gross_profit = wins["pnl"].sum()
        gross_loss = abs(losses["pnl"].sum())
        profit_factor = gross_profit / gross_loss if gross_loss else float("inf")
    return pd.DataFrame(
        [
            {
                "total_return": total_return,
                "cagr": cagr,
                "max_drawdown": max_drawdown,
                "sharpe": sharpe,
                "trade_count": len(trades),
                "win_rate": win_rate,
                "profit_factor": profit_factor,
                "ending_equity": values.iloc[-1],
            }
        ]
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run transcript trading backtests.")
    parser.add_argument("--prices-dir", type=Path, default=Path("data/raw/ohlcv"))
    parser.add_argument("--events", type=Path, default=Path("data/processed/events.csv"))
    parser.add_argument("--assessments", type=Path)
    parser.add_argument("--strategy", choices=["transcript_direct", "buffett_transcript"], required=True)
    parser.add_argument("--initial-cash", type=float, default=100_000)
    parser.add_argument("--fee-rate", type=float, default=0.0005)
    parser.add_argument("--slippage-rate", type=float, default=0.001)
    parser.add_argument("--max-holding-days", type=int, default=60)
    parser.add_argument("--output-dir", type=Path, default=Path("data/reports"))
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    config = BacktestConfig(
        initial_cash=args.initial_cash,
        fee_rate=args.fee_rate,
        slippage_rate=args.slippage_rate,
        max_holding_days=args.max_holding_days,
    )
    prices = load_price_files(args.prices_dir)
    events = load_events(args.events)
    assessments = load_assessments(args.assessments)
    backtester = DailyBacktester(prices, events, assessments, args.strategy, config)
    equity, trades, summary = backtester.run()

    output_dir = ensure_dir(args.output_dir)
    equity.to_csv(output_dir / "equity_curve.csv", index=False)
    trades.to_csv(output_dir / "trades.csv", index=False)
    summary.to_csv(output_dir / "backtest_summary.csv", index=False)
    print(summary.to_string(index=False))
    print(f"wrote reports to {output_dir}")


if __name__ == "__main__":
    main()

# Trading Shark: plan for version one

Status: planning. Nothing built. Last edited 2026-09-10.

Companion files: [mandate-v1.md](mandate-v1.md) (what the model reads every day) and [research-checklist.md](research-checklist.md) (open questions with a finish line each).

Note on where this lives: this repo is the public GitHub Pages site with Jekyll active, so markdown merged to `main` becomes a public page. That is fine for a public experiment. If it should stay private, keep the branch unmerged or add a `.nojekyll` file before merging.

## 1. The experiment in one paragraph

Give an AI agent a fixed sum and a broker account for twelve weeks and let it trade US stocks on its own, once a day, inside hard limits that the agent cannot change. Run it on paper first, then with a small real stake. Measure whether it survives, whether it loses to the index, how it behaves, and write the whole thing up.

## 2. Decisions made

| Question | Decision |
|---|---|
| What is being tested | Four things, in order: (1) can it run unattended without breaking its limits, (2) does it lose to a dumb baseline, (3) is it a story worth telling, (4) how does an LLM reason about money |
| Money | Paper first. Real money only after the paper gates pass. |
| Assets | US-listed stocks and UCITS ETFs. No crypto, no leverage, no options, no shorting in v1. |
| Universe | S&P 500 constituents frozen at phase start, plus 5 to 10 UCITS ETFs |
| Autonomy | Fully autonomous inside code-enforced limits. No human approval per trade. |
| Cadence | One decision cycle per US trading day, after the close, orders placed for the next session |
| Length | 12 weeks per phase |
| Brain | Frontier model via the Anthropic API for the daily decision. The local LLM on the VPS only for cheap chores such as headline summaries. |
| Broker | Saxo (existing account): SIM for paper, LIVE for real money. Alpaca paper as fallback. |
| Runtime | Hermes Agent on the Frankfurt VPS owns scheduling, delivery and chat access. A Python pipeline owns the trading loop. |
| Reporting | Telegram daily, dashboard page on this site |
| Main worry | How much may it lose and when must it stop |

## 3. What the research says

Two public data points shaped the design more than anything else.

The ChatGPT micro-cap experiment (LuckyOne7777) ran six months on real money with daily prompts and full control handed to the model. It ended well below both the Russell 2000 and the S&P 500, with a maximum drawdown of 50%. The evaluation report names the failure modes: the portfolio sat in two or three tickers, the model re-bought tickers it had already lost money on, it raised stop-losses right before binary catalyst events, and its written reports described hedges and index shorts it never placed. Excluding one position flips the profit factor from 0.82 to 1.52. In other words, the stock picking was not the problem. The lack of enforced limits was.

The Agent Market Arena benchmark ran several agent frameworks across several models on live markets and found that the framework shapes behaviour far more than the model does. Risk style comes from the harness, not the brain.

Conclusion for Trading Shark: the guardrails, the logging and the reporting are the product. The model is a replaceable part.

## 4. Design

### 4.1 Principle: the model proposes, the code disposes

The LLM never touches the broker. Each day it receives a snapshot and returns a structured list of proposed orders plus a short journal entry. A deterministic risk engine, a pure function with unit tests, accepts, clips or rejects every proposed order against rules in a versioned YAML file the model cannot see or edit. Only accepted orders reach the broker.

Every report a human reads is rendered from the order log and the broker's own fills, never from the model's narrative. If the model writes "I hedged with puts", the report will show no such order, and a narrative-mismatch flag gets logged. That one rule removes the phantom-hedge failure from prior art.

### 4.2 Components

```
Hermes cron: weekdays 22:30 Europe/Copenhagen (after the 22:00 US close)
  └─ pre-run script: shark run --date today
       1. snapshot   broker positions, cash, fills since last run
       2. data       end-of-day prices for the universe, headlines for holdings and top movers
       3. decide     one Claude call, structured JSON output: proposed orders + journal entry
       4. risk       validate every order against risk-rules.yaml (pure function, tested)
       5. execute    place accepted orders as day limit orders for the next session
       6. journal    write decision, rejections, orders, equity, metrics to PocketBase
       7. report     render the Telegram summary from journal rows, not from the model text
  └─ Hermes delivers the script output to Telegram

Hermes MCP server "shark": read-only tools (portfolio, journal, metrics)
  └─ so "what did the shark do this week?" works from Telegram chat

Static dashboard page in this repo reading PocketBase, same pattern as /mor
```

Why the loop is a script and not a free-running Hermes agent session: the experiment needs identical behaviour every trading day for twelve weeks, replayable from logs, with the LLM call isolated as one step. An agent session with a terminal and a browser can wander, and a wandering agent makes the result unreadable. Hermes still does what it is good at: scheduling with natural-language cron, per-job toolsets, failure-streak alerts after three failed runs, Telegram delivery, and conversational access to the data.

### 4.3 Stack for the build (later, not now)

- Python 3.12, one package `shark` with a CLI: `shark run`, `shark status`, `shark drill-killswitch`
- `anthropic` SDK, model `claude-opus-5`, adaptive thinking, structured output for the decision JSON, prompt caching on the mandate and universe table
- Broker adapter interface: `positions()`, `cash()`, `quotes()`, `place_order()`, `open_orders()`, `cancel()`. First implementation Saxo OpenAPI over `httpx`. Second implementation Alpaca only if needed.
- PocketBase collections: `shark_runs`, `shark_orders`, `shark_positions`, `shark_metrics`
- `pytest` for the risk engine, with adversarial cases: oversized order, unknown ticker, buy during cooldown, buy during daily brake, anything during freeze
- Hermes: a `trading-shark` skill under `~/.hermes/skills/`, a cron job with the pre-run script and Telegram delivery, an MCP stdio server entry in `~/.hermes/config.yaml`

Cost estimate at daily cadence, roughly 40k input tokens and 4k output tokens per run: about 0.30 USD per run on Opus 5, under 25 USD for a 12-week phase, before caching. Re-check pricing at build time.

### 4.4 Broker decision

Saxo SIM for paper, Saxo LIVE for real money. Reasons: one integration for both phases, an account that already exists, and Saxo reports to SKAT automatically, so the real phase creates no manual tax-reporting job. Saxo's SIM is a copy of the live environment with 100,000 USD of simulated money.

Known friction: the developer portal's 24-hour token is for getting started only. An unattended app needs a registered OAuth app with refresh tokens, since access tokens expire after 20 minutes. LIVE credentials require being a direct Saxo client with a funded account and at least one SIM app already created.

Time-box: one day on the Saxo OAuth flow and a single SIM limit order on a US stock. If that fails, fall back to Alpaca paper for phases 1 and 2 behind the same adapter interface, and re-decide the real-money broker at the phase 3 gate. Alpaca for real money would need two extra things: confirmation that Denmark is a supported country (Alpaca does not publish the list), and manual reporting of a foreign depot to SKAT every year.

### 4.5 Universe

- S&P 500 constituents as of the phase start, frozen for the phase so results are reproducible
- 5 to 10 UCITS ETFs available on Saxo: S&P 500, Nasdaq 100, total world, US Treasuries, gold. UCITS because EU retail investors cannot buy US-domiciled ETFs such as SPY or QQQ; those funds publish no PRIIPs key information document.
- Long only, full shares, no margin
- Benchmark: buy-and-hold of the S&P 500 UCITS ETF, computed from its price series, not held

### 4.6 Risk rules v1

Code-enforced. The model cannot override, argue with, or see the YAML.

| Rule | Value | Why |
|---|---|---|
| Max position at entry | 10% of equity | Concentration was the killer in prior art |
| Max sector weight | 30% | Same |
| Min cash reserve | 5% | Room for fills and fees |
| Max daily turnover | 20% of equity | Caps churn and cost |
| Max orders per run | 6 | Keeps each day reviewable |
| Re-entry cooldown | No buying a ticker for 10 trading days after selling it at a loss | Targets the re-buying-losers pattern |
| Daily loss brake | Equity down more than 3% versus previous close: sells allowed, no buys that day | Slow the bleed |
| Drawdown freeze | 12% below equity peak: all trading frozen, Telegram alert, human restarts | Kill switch with a human in the loop |
| Hard stop, real phase only | 20% below peak: liquidate to cash, phase over | The number decided in advance as acceptable to lose |
| Order type | Day limit orders at last close plus or minus 1% | No market orders into an open |
| Universe check | Any ticker outside the frozen list is rejected | No wandering into micro-caps |

Rules live in `risk-rules.yaml` in git. They change only between phases, and every change gets a journal entry. Every rejection is logged with the rule that fired. The rejection log is itself phase 4 material.

### 4.7 Mandate

The mandate is the one page the model reads every day: role, horizon, universe, the risk rules restated in prose so the model knows what will bounce, the required output schema, and explicit anti-patterns drawn from prior art. See [mandate-v1.md](mandate-v1.md). Edited between phases only.

### 4.8 Measurement

Per run, stored in PocketBase: equity, cash, positions, proposed orders, accepted orders, rejected orders with the rule, fills, benchmark equity.

Derived weekly:

- Return versus benchmark, maximum drawdown, a rough Sharpe ratio
- Number of positions, largest position weight, sector concentration
- Turnover and estimated trading cost
- Rejected-order rate and which rules fire most
- Re-entry count (buys of tickers previously sold at a loss, even after cooldown)
- Narrative-mismatch flags: journal text mentions an action not present in the order log

Honest note: twelve weeks cannot separate skill from luck. Phase 2 is answered as "did it lose to the index by more than the tolerance set at the gate, and did it do so with lower drawdown", not "is it a good trader".

## 5. Phases and gates

| Phase | Purpose | Length | Passes when |
|---|---|---|---|
| 0 Dry run | Pipeline runs daily, decides, logs, places nothing | 1 week | 5 of 5 runs completed, valid JSON every day, risk engine tests green |
| 1 Paper, unattended | Runs inside limits with no human touch | 4 weeks | Zero rule breaches, at least 95% of scheduled runs completed, every fill traceable to an accepted order, kill-switch drill passed |
| 2 Paper, versus baseline | Same setup continues to 12 weeks total | 8 more weeks | Metrics computed and published weekly, result stated against the tolerance decided at the gate |
| 3 Real money | Small stake on Saxo LIVE | 12 weeks | Gate: phases 1 and 2 passed, LIVE OpenAPI app approved, kill switch tested with one tiny real order, tax note written |
| 4 Story and learning | Runs across all phases | Continuous | Journal from day one, newsletter can start during paper |

Real stake for phase 3: 5,000 to 15,000 DKK, set at the gate, never topped up during a phase.

## 6. Timeline (proposal, dates to confirm)

- Now to late September 2026: research checklist, Saxo spike, mandate argued and frozen
- October, evenings and weekends after the new job starts: build, risk engine tests, dry run
- Early November to late January: phases 1 and 2 on Saxo SIM
- February 2027: gate review. Phase 3 through April if the gates pass.

## 7. Things this plan deliberately does not do

- No intraday trading. Daily cadence is where LLM agents are cheapest and least noisy.
- No crypto in v1. Danish tax on crypto has been asymmetric (gains taxed as personal income, losses deducted at a lower rate), and 24/7 markets remove the natural daily rhythm.
- No leverage, options, or shorting. They shorten the time to zero.
- No self-modifying rules. The model can suggest rule changes in its journal. A human changes them between phases.
- No second model in v1. A two-brain comparison is a good phase 5 if phase 2 is boring.

## Sources

- Hermes cron: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/cron.md
- Hermes MCP config: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/mcp.md
- Hermes skills: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/skills.md
- Hermes README: https://github.com/NousResearch/hermes-agent
- Saxo OpenAPI, getting started: https://openapi.help.saxo/hc/en-us/articles/5231611647517-How-do-I-get-started-with-OpenAPI
- Saxo LIVE credentials: https://developer.saxobank.com/openapi/learn/direct-clients-request-for-openapi-application-credentials-for-the-live-environ
- Saxo tokens beyond 24 hours: https://openapi.help.saxo/hc/en-us/articles/4416637029649-How-do-I-get-an-access-token-that-lasts-longer-than-the-24H-token
- Saxo LIVE to SIM link requires funding: https://openapi.help.saxo/hc/en-us/articles/4416934146449-How-do-I-connect-a-Live-account-to-a-SIM-Demo-account
- Alpaca non-US accounts: https://alpaca.markets/learn/live-trading-account-non-us
- Alpaca paper trading: https://alpaca.markets/learn/start-paper-trading
- PRIIPs and US-domiciled ETFs: https://www.justetf.com/en/news/etf/us-domiciled-etfs.html
- Danish share income rates 2026 (27% to 79,400 DKK, 42% above): https://financer.dk/investering/skat-af-aktier/
- SKAT on foreign investments and the 1 July notice: https://skat.dk/borger/udlandsforhold/du-bor-i-danmark-og-har-indkomst-fra-udlandet/giv-os-besked-om-dine-udenlandske-investeringer-senest-1-juli
- ChatGPT micro-cap experiment, evaluation report: https://github.com/LuckyOne7777/LLM-Trading-Lab/blob/main/Experiments/chatgpt_micro-cap/evaluation/evaluation_report.md
- Agent Market Arena paper: https://arxiv.org/abs/2510.11695
- TradingAgents framework: https://github.com/tauricresearch/tradingagents
- Awesome trading agents list: https://github.com/LLMQuant/awesome-trading-agents
- Anthropic model pricing: verify at build time in the Anthropic console; the estimate above uses the June 2026 price list

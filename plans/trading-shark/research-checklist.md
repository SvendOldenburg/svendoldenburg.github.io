# Trading Shark research checklist

Each item says what "answered" looks like, so the research phase has an end. Tick them off in this file. Plan in [README.md](README.md), model text in [mandate-v1.md](mandate-v1.md).

## Broker

- [ ] **1. Saxo OpenAPI, unattended.** Create a SIM developer account, register an app, complete the OAuth flow with refresh tokens, place and cancel one SIM limit order on a US stock. Done when a script runs for 48 hours without a manual token. Time-box: one day. If it fails, item 7 becomes urgent.
  Start: https://openapi.help.saxo/hc/en-us/articles/5231611647517-How-do-I-get-started-with-OpenAPI and https://openapi.help.saxo/hc/en-us/articles/4416637029649-How-do-I-get-an-access-token-that-lasts-longer-than-the-24H-token
- [ ] **2. Saxo LIVE OpenAPI application.** What the approval asks for, how long it takes, and whether the current account tier qualifies. Done when the requirements are listed here.
  Start: https://developer.saxobank.com/openapi/learn/direct-clients-request-for-openapi-application-credentials-for-the-live-environ
- [ ] **3. UCITS ETF list.** The exact tickers, exchanges, ISINs and trading currency on Saxo for the benchmark and the ETF sleeve (S&P 500, Nasdaq 100, total world, US Treasuries, gold). Done when 5 to 10 rows are in a table here.
- [ ] **4. Trading costs.** Saxo commission and FX cost on US stocks for the account tier, converted into an assumed round-trip cost in basis points. Done when the number is written here and copied into the risk rules as an input for the turnover cap.
- [ ] **7. Alpaca eligibility for Denmark** (fallback only). Email support and ask. Done when the reply is pasted here.
  Start: https://alpaca.markets/learn/live-trading-account-non-us

## Data

- [ ] **5. End-of-day prices for about 500 tickers.** Candidates: Saxo chart endpoint, a free EOD API, `yfinance` as a last resort. Done when a source is chosen with rate limits, delay, and cost written here.
- [ ] **6. Headlines for held tickers and top movers.** A free or cheap news API with a ticker filter. Done when one is chosen and a sample pull for five tickers is saved.
- [ ] **8. S&P 500 constituent list.** Where to fetch it and how to freeze it at phase start (a CSV committed to git is enough). Done when the CSV exists.

## Tax and rules

- [ ] **9. Danish tax on the real phase.** Confirm: 2026 aktieindkomst rates and threshold for shares held at Saxo; whether the UCITS ETF sleeve is taxed under lagerbeskatning (mark to market) rather than on realisation, and whether that changes anything for a 12-week run; whether anything at all needs manual reporting when the broker is Saxo. Done when a half-page note is written here.
  Start: https://skat.dk/borger/udlandsforhold/du-bor-i-danmark-og-har-indkomst-fra-udlandet/giv-os-besked-om-dine-udenlandske-investeringer-senest-1-juli and https://financer.dk/investering/skat-af-aktier/
- [ ] **10. Real stake.** Pick the number between 5,000 and 15,000 DKK, write down why, and the total loss you would accept. Done when the number is here and the hard stop in the rules matches it.

## Runtime

- [ ] **11. Hermes on the VPS.** Confirm on the installed version: cron pre-run scripts, per-job toolset restriction, Telegram delivery target, MCP stdio server entry in `~/.hermes/config.yaml`, per-job model pin. Done when a hello-world cron job runs a script and delivers its output to Telegram.
  Start: https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/cron.md and https://github.com/NousResearch/hermes-agent/blob/main/website/docs/user-guide/features/mcp.md
- [ ] **12. Anthropic API.** Current price of `claude-opus-5`, structured-output support, prompt caching minimum prefix size. Done when the daily cost estimate in the README is refreshed with today's numbers.
- [ ] **13. PocketBase collections.** Draft the four collections (`shark_runs`, `shark_orders`, `shark_positions`, `shark_metrics`) with fields, and decide whether the dashboard is public like `/mor` or unlisted. Done when the schema is written here.

## Prior art

- [ ] **14. Read three things and steal from them.** The ChatGPT micro-cap evaluation report, the Agent Market Arena paper, and the TradingAgents README. Done when at least three lessons from each are either in the mandate or in the risk rules, with a note here saying which.
  https://github.com/LuckyOne7777/LLM-Trading-Lab/blob/main/Experiments/chatgpt_micro-cap/evaluation/evaluation_report.md
  https://arxiv.org/abs/2510.11695
  https://github.com/tauricresearch/tradingagents
  https://github.com/LLMQuant/awesome-trading-agents

## Decisions to make at the phase 2 gate

- [ ] The tolerance for "lost to the index": how many percentage points behind buy-and-hold over 12 weeks still counts as a pass, given lower drawdown.
- [ ] Whether the newsletter series starts during paper or waits for real money.
- [ ] Whether phase 3 runs on Saxo LIVE or the fallback broker.

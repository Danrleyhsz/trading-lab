# Bounded research jobs

`POST /research/jobs` accepts BTCUSDT and 100–1000 hourly candles (default 500). It returns 202 only after the QUEUED lifecycle event is durably acknowledged. One research admission or historical Quant task may occupy Euler at a time. The original synchronous research API remains available, with admission guards against concurrent jobs and shutdown.

The existing event journal retains QUEUED → RUNNING → COMPLETED/FAILED. RUNNING is persisted before invoking the existing deterministic ResearchEngine. A finished job links the unchanged original ResearchRun ID; rejected hypotheses are completed work, not successful strategies. A thrown task has no fabricated result. Research job events themselves create no experience, memory, order, risk approval or P&L.

Restart reconstructs jobs from the journal and records unfinished admissions as INTERRUPTED. It never repeats research automatically. Admission persistence failure makes further admission unavailable until restart; an uncertain acknowledgement may still have committed an event. Client request failure therefore must not automatically retry. This is not an exactly-once client request protocol or a distributed queue.

Shutdown closes admission, awaits owned admission/work promises and only then closes persistence. Source adapters retain their existing timeouts; the process retains its existing 30-second shutdown deadline. No second worker service, scheduler, new paid resource or autonomous activation is introduced.

`GET /research/jobs` returns the latest 20 admissions; `GET /research/jobs/:id` exposes a retained record. The normal authenticated runtime protects all routes. The office labels recorded lifecycle states, clears stale cards on read failure, and opens original result evidence without starting another task. No percentage or artificial animation/progress is generated.

PostgreSQL's existing full journal prefix guard protects lifecycle history. JSON QA persistence also rejects removing or rewriting previously retained research job events. Replay rejects invalid transitions and contradictory result/reason combinations. Durable restart, drain, source failure, concurrency and admission-failure behavior have isolated TEST_ONLY tests; actual hosted restart/drain and desktop/mobile browser acceptance still require observation.

This API/lifecycle extension is a draft requiring review before architectural merge. Current production execution/evaluation/autonomous flags and analytical AI remain disabled. Installing this increment does not enable paper orders or purchase services.

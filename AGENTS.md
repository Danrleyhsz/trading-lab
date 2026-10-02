# Agent Development Rules

1. Preserve paper-trading-only execution.
2. Never add credentials to source control.
3. Do not fabricate market events, fills, P&L or agent work in production paths.
4. Separate market data, reasoning, broker execution, persistence and UI with interfaces/events.
5. Every simulated trade must be auditable from proposal through outcome.
6. Historical failures and decisions remain traceable.
7. Prefer small testable changes through branches and pull requests.
8. Mobile usability is a first-class requirement.
9. Deterministic code watches markets continuously; AI is invoked for meaningful analytical work.
10. Do not automatically merge architectural changes.

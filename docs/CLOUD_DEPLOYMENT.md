# Cloud deployment handoff

First-publication preparation and exact ordered acceptance: [CLOUD_LAUNCH_READINESS.md](CLOUD_LAUNCH_READINESS.md), with proposed Render example and compiled checks. Import original history into an empty database **before** the first normal runtime starts; the order below is a topic list, not permission to seed a database before importing.

1. Review the stacked feature PRs; no architectural merge is automatic.
2. Choose a cloud container service and managed PostgreSQL. Use exactly one runtime replica; the database advisory lock rejects a second writer.
3. Configure verified database TLS. Set DATABASE_URL and a random APP_ACCESS_TOKEN (>=32 characters) through the cloud secret manager. Set PUBLIC_ORIGIN to the final HTTPS origin; never store real secrets in this repo.
4. Deploy the Dockerfile. Set NODE_ENV=production, PAPER_TRADING_ONLY=true, PORT supplied by the platform. Keep PERPETUAL_PAPER_ENABLED=false and AUTONOMOUS_PERPETUAL_ENABLED=false initially.
5. If original JSON history exists, import it once into the empty DB using the compiled import-state entry point and STATE_IMPORT_PATH pointing to the original snapshot. The importer refuses a nonempty DB. It preserves old IDs, capital and history without attributing unknown fills.
6. Validate /health, sign in from the office, verify actual market timestamps, run a historical study and inspect recorded failures/results. Confirm fund/evaluation identities before enabling new wallets.
7. To create new perpetual evaluation wallets, set PERPETUAL_PAPER_ENABLED=true and explicit EVALUATION_PAPER_CAPITAL. These are new independent endowments, never transfers from the fund or conversions of legacy wallets.
8. Enable autonomous evaluation only after reviewing an eligible completed study and setting its explicit AUTONOMOUS_STUDY_ID. AUTONOMOUS_PERPETUAL_ENABLED defaults false. The fund is outside this cycle.
9. Configure provider-managed daily database backups, retention and point-in-time recovery. Test restoration into a separate DB with execution disabled. Configure uptime/health/market-staleness alerts through the chosen provider. These resources are not provisioned by this PR.

The template deploy/cloud-service.example.json is provider-neutral preparation, not a deployed service or a promise of free hosting. No local computer needs to stay running for production.

## Single-writer deployment updates
Disable automatic deployments until architectural review. Updates must stop/drain the old runtime before starting the new one; the writer lock intentionally rejects overlapping replicas. Rolling deployments that keep the old writer running until the new replica is healthy will fail with this architecture. Use a recreate deployment with planned downtime, or a provider-supported persistent-volume strategy that prevents overlap. This is an operational boundary, not multi-replica availability.

## Health and graceful termination
Keep /health for existing compatibility. Configure process liveness with /health/live and control-plane readiness with /health/ready where the provider supports separate checks. Both are minimal public responses. Authenticate /runtime/readiness for actual source/funding/paper/job diagnostics and configure separate source-outage alerts. Healthy readiness does not imply exchange availability, order approval, backup verification or a provisioned cloud account.

Allow graceful SIGTERM termination: the runtime stops new admission, joins admitted historical work and queued writes, then closes PostgreSQL. Its signal grace deadline is 30 seconds; an unfinished durable study remains eligible for the existing INTERRUPTED restoration, never invented completion. The provider may force termination earlier; synchronous CPU work is not preempted by the JavaScript timer. Retain single-writer stop/drain/recreate updates and validate a restore drill before claiming uninterrupted operation. See RUNTIME_READINESS.md.

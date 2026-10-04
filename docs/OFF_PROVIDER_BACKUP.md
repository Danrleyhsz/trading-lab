# Off-provider encrypted backup and external alerts

Approved by the owner on 2026-10-04 (decision "B"). Nothing here weakens the PostgreSQL firewall: GitHub never connects to the database.

## Flow

1. The running service exposes `GET /ops/backup`. It returns the **last durably persisted snapshot** (the same object the event audit reads), encrypted. Authentication is required; the GET-only `READ_ONLY_ACCESS_TOKEN` is enough. The endpoint never returns plaintext. It answers 503 until a durable snapshot exists.
2. Encryption: a random AES-256-GCM key encrypts the gzipped JSON. That key is wrapped with RSA-OAEP-SHA256 using the owner's 4096-bit public key, bundled in `src/config/backup-public-key.ts` together with its fingerprint. The AAD is the format name `TRADING_LAB_ENCRYPTED_STATE_V1`, and `plaintextSha256` is checked on open.
3. A scheduled GitHub Actions workflow on `main` downloads the file daily with the read-only secret. It validates the envelope and the key fingerprint, then stores it as a 90-day artifact. It never holds the private key, so artifacts are ciphertext only.
4. A second scheduled workflow polls `/runtime/readiness` hourly. If storage, market, funding, halt or readiness checks fail, the run fails and GitHub emails the owner.

## Key custody

- The private key is `Documents/TradingLab-Backups/backup-private-key.pem` on the owner's PC. It is never in Git, Render, CI or chat. The owner should keep a second offline copy (for example a USB drive or a password manager). Losing it makes every encrypted backup unreadable.
- Rotation: generate a new pair, replace the public key module and its fingerprint, redeploy. Old artifacts still need the old private key.

## Restore drill (isolated, never production)

1. Download an artifact (`gh run download <run-id>`).
2. Decrypt it: `BACKUP_PRIVATE_KEY_PATH=... BACKUP_FILE=backup.json STATE_OUTPUT_PATH=state.json npm run decrypt-backup`.
3. Import it into an **empty** isolated PostgreSQL: `DATABASE_URL=<QA> STATE_IMPORT_PATH=state.json npm run import-state`. The tool refuses a non-empty database.
4. Verify accounts, ledger, studies and hashes as in the recovery drill reports.

## Limits

- The backup is the application snapshot, which is what the service restores from. It is not a byte-level `pg_dump`. Render's own exports and point-in-time recovery remain separate provider-side layers.
- GitHub retains artifacts for at most 90 days and stores them in the private repository's quota (~0.5 MB/day).
- Scheduled workflows can be delayed by GitHub, and they only run from the default branch.
- If they stop (for example the repository goes inactive for 60 days), GitHub emails a warning. A missing artifact must itself be treated as an incident.

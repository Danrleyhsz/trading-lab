// Launch configuration checks. They grant no execution, provisioning or risk authority; the runtime still
// enforces risk, eligibility and the release pin for the continuous pilot.
import {evaluationWalletCapital} from './evaluation-wallet-bootstrap.js';
import {MAX_DRAWDOWN_FRACTION} from '../domain/risk.js';
export type LaunchCheck = { id: string; ok: boolean };
export function validHttpsOrigin(value: string) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && url.origin === value && !url.username && !url.password;
    } catch { return false; }
}
export function checkCloudConfiguration(env: NodeJS.ProcessEnv): LaunchCheck[] {
    const checks: LaunchCheck[] = [];
    const add = (id: string, ok: boolean) => checks.push({ id, ok });
    add('PRODUCTION_REQUIRED', env.NODE_ENV === 'production');
    add('PAPER_ONLY_REQUIRED', env.PAPER_TRADING_ONLY === 'true');
    add('HTTPS_ORIGIN_REQUIRED', validHttpsOrigin(env.PUBLIC_ORIGIN ?? ''));
    add('ACCESS_SECRET_REQUIRED', (env.APP_ACCESS_TOKEN?.length ?? 0) >= 32);
    let databaseValid = false, tlsValid = false, directHost = false;
    try {
        const db = new URL(env.DATABASE_URL ?? '');
        databaseValid = ['postgres:', 'postgresql:'].includes(db.protocol) && !!db.hostname && !!db.username && !!db.password && db.pathname.length > 1 && !db.hash && [...db.searchParams.keys()].every(key => key === 'sslmode');
        tlsValid = !db.searchParams.has('sslmode') || db.searchParams.get('sslmode') === 'verify-full';
        // Render's internal self-signed endpoint cannot meet production verify-full.
        directHost = !/^dpg-[^.]+$/.test(db.hostname) && !db.hostname.endsWith('.internal');
    } catch { /* Only fixed check identifiers are returned, never a secret URL. */ }
    add('DIRECT_POSTGRESQL_REQUIRED', databaseValid && directHost);
    add('VERIFIED_TLS_REQUIRED', tlsValid && env.NODE_TLS_REJECT_UNAUTHORIZED !== '0');
    const pilot = env.CLOUD_LAUNCH_PHASE === 'CONTINUOUS_PAPER_PILOT';
    const controlled = env.CLOUD_LAUNCH_PHASE === 'CONTROLLED_PAPER' || pilot;
    add('VALID_LAUNCH_PHASE', env.CLOUD_LAUNCH_PHASE === undefined || env.CLOUD_LAUNCH_PHASE === 'FIRST_PUBLICATION' || controlled);
    for (const key of ['PAPER_EVALUATION_ENABLED', 'LEGACY_PAPER_EXECUTION_ENABLED'])
        add(key + '_MUST_BE_FALSE', env[key] === 'false');
    // Only the explicit pilot phase may enable the autonomous cycle, and only with an explicit study and a pinned release.
    if (pilot) add('AUTONOMOUS_PERPETUAL_ENABLED_MUST_BE_TRUE', env.AUTONOMOUS_PERPETUAL_ENABLED === 'true');
    else add('AUTONOMOUS_PERPETUAL_ENABLED_MUST_BE_FALSE', env.AUTONOMOUS_PERPETUAL_ENABLED === 'false');
    if (controlled) {
        add('CONTROLLED_PERPETUAL_ONLY', env.PERPETUAL_PAPER_ENABLED === 'true');
        add('INDEPENDENT_WALLETS_REQUIRED', env.EVALUATION_WALLETS_ENABLED === 'true');
    } else add('PERPETUAL_PAPER_ENABLED_MUST_BE_FALSE', env.PERPETUAL_PAPER_ENABLED === 'false');
    if (pilot) {
        add('EXPLICIT_PILOT_STUDY', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(env.AUTONOMOUS_STUDY_ID ?? ''));
        // Either an exact commit or an exact backend fingerprint (visual-only releases keep the fingerprint).
        add('PINNED_RELEASE_COMMIT', /^[0-9a-f]{40}$/.test(env.CONTINUOUS_RELEASE_COMMIT ?? '') || /^[0-9a-f]{64}$/.test(env.CONTINUOUS_RELEASE_BACKEND ?? ''));
        const loss = env.PILOT_MAX_LOSS === undefined ? 0.03 : Number(env.PILOT_MAX_LOSS);
        add('VALID_PILOT_LOSS_LIMIT', Number.isFinite(loss) && loss > 0 && loss < MAX_DRAWDOWN_FRACTION);
    } else add('NO_AUTONOMOUS_STUDY', !env.AUTONOMOUS_STUDY_ID);
    let walletsValid = true;
    try { evaluationWalletCapital(env); } catch { walletsValid = false; }
    add('VALID_INDEPENDENT_WALLET_ALLOCATION', walletsValid);
    add('NO_PAID_OR_PRIVATE_KEYS', ['AI_PROVIDER_API_KEY', 'MARKET_DATA_API_KEY', 'MARKET_DATA_API_SECRET', 'BINANCE_API_KEY', 'BINANCE_API_SECRET'].every(key => !env[key]));
    add('SUPPORTED_MARKET_REQUIRED', env.MARKET_SYMBOL === 'btcusdt');
    const capital = Number(env.INITIAL_PAPER_CAPITAL);
    add('VALID_INITIAL_VIRTUAL_CAPITAL', Number.isFinite(capital) && capital > 0);
    const port = Number(env.PORT);
    add('VALID_PLATFORM_PORT', env.PORT === undefined || Number.isInteger(port) && port > 0 && port <= 65535);
    return checks;
}

export function cloudConfigurationReport(env: NodeJS.ProcessEnv) {
    const checks = checkCloudConfiguration(env);
    const phase = env.CLOUD_LAUNCH_PHASE;
    return {scope:phase === 'CONTINUOUS_PAPER_PILOT' ? 'CONTINUOUS_PAPER_PILOT_CONFIG_ONLY' : phase === 'CONTROLLED_PAPER' ? 'CONTROLLED_PAPER_CONFIG_ONLY' : 'FIRST_PUBLICATION_CONFIG_ONLY',ready:checks.every(c=>c.ok),checks,
        unverified:['DATABASE_CONNECTION','CLOUD_HOST','HISTORY_IMPORT','BACKUPS_AND_RESTORE','RELEASE_REVIEW']};
}

// The runtime module must remain unloaded until every first-publication gate passes.
export async function launchConfiguredCloud(env: NodeJS.ProcessEnv, start: () => Promise<unknown>, report: (value: ReturnType<typeof cloudConfigurationReport>) => void) {
    const result = cloudConfigurationReport(env);
    report(result);
    if (!result.ready) return 1;
    await start();
    return 0;
}

const object = (value: unknown): Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, any> : {};
export function checkCloudRuntime(value: unknown, now = Date.now()): LaunchCheck[] {
    const d = object(value), storage = object(d.storage), access = object(d.access), paper = object(d.paper), market = object(d.market), ai = object(d.ai);
    const spot = object(market.spot), perpetual = object(market.perpetual);
    const reasons = (gate: unknown, reason: string) => Array.isArray(object(gate).reasons) && object(gate).reasons.includes(reason);
    const fresh = (time: unknown, maxAge: number) => typeof time === 'number' && Number.isFinite(time) && time <= now + 5000 && now - time <= maxAge;
    const observed = typeof d.observedAt === 'string' ? Date.parse(d.observedAt) : NaN;
    const persisted = typeof storage.lastPersistedAt === 'string' ? Date.parse(storage.lastPersistedAt) : NaN;
    return [
        { id: 'FRESH_DIAGNOSIS', ok: fresh(observed, 60000) },
        { id: 'PRODUCTION_CONTROL_READY', ok: d.environment === 'PRODUCTION' && d.mode === 'PAPER_TRADING' && d.phase === 'SERVING' && d.controlPlaneReady === true && d.clockHealthy === true },
        { id: 'DURABLE_POSTGRESQL_AVAILABLE', ok: storage.kind === 'POSTGRESQL' && storage.available === true && storage.persistenceFailed === false && Number.isFinite(persisted) && persisted <= now + 5000 },
        { id: 'PROTECTED_HTTPS_ACCESS', ok: access.protected === true && access.httpsOrigin === true },
        { id: 'SINGLE_WRITER_REQUIRED', ok: d.singleWriterRequired === true },
        { id: 'RISK_AND_FUND_ISOLATION', ok: paper.riskApprovalRequired === true && paper.evaluationCapitalIncludedInFund === false },
        { id: 'PAPER_EXECUTION_DISABLED', ok: reasons(paper.submission, 'PERPETUAL_EXECUTION_DISABLED') && reasons(paper.legacySubmission, 'LEGACY_EXECUTION_DISABLED') && paper.evaluationEnabled === false },
        { id: 'AUTONOMOUS_DISABLED', ok: reasons(paper.autonomous, 'AUTONOMOUS_DISABLED') },
        { id: 'AI_DISABLED', ok: ai.enabled === false && ai.providerConfigured === false && ai.executionAuthority === false },
        { id: 'SPOT_SOURCE_FRESH', ok: spot.status === 'HEALTHY' && fresh(spot.receivedAt, 60000) },
        { id: 'PERPETUAL_SOURCE_FRESH', ok: perpetual.status === 'HEALTHY' && perpetual.fresh === true && fresh(perpetual.receivedAt, 15000) },
    ];
}

async function boundedJson(response: Response): Promise<unknown> {
    if (!response.body) throw Error('empty response');
    const reader = response.body.getReader(), chunks: Uint8Array[] = [];
    let length = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.length;
            if (length > 131072) throw Error('response too large');
            chunks.push(value);
        }
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } finally { await reader.cancel().catch(() => {}); }
}
export async function verifyCloudService(origin: string, token: string, request: typeof fetch = fetch, now: () => number = Date.now): Promise<LaunchCheck[]> {
    if (!validHttpsOrigin(origin) || token.length < 32) return [{ id: 'VALID_ORIGIN_AND_ACCESS_REQUIRED', ok: false }];
    const checks: LaunchCheck[] = [];
    const get = (path: string, authenticated = false) => request(new URL(path, origin), {
        method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(8000), headers: authenticated ? { authorization: 'Bearer ' + token } : {},
    });
    try {
        for (const path of ['/health/live', '/health/ready']) {
            const response = await get(path);
            const data = response.status === 200 ? object(await boundedJson(response)) : {};
            checks.push({ id: path === '/health/live' ? 'PUBLIC_LIVENESS' : 'PUBLIC_READINESS', ok: response.status === 200 && data.ok === true && data.mode === 'PAPER_TRADING' });
            if (response.status !== 200) await response.body?.cancel();
        }
        const denied = await get('/runtime/readiness');
        checks.push({ id: 'PRIVATE_DIAGNOSIS_REQUIRES_ACCESS', ok: denied.status === 401 });
        await denied.body?.cancel();
        const office = await get('/office/index.html');
        checks.push({ id: 'OFFICE_AVAILABLE', ok: office.status === 200 && (office.headers.get('content-type') ?? '').includes('text/html') });
        await office.body?.cancel();
        const diagnostic = await get('/runtime/readiness', true);
        checks.push({ id: 'AUTHENTICATED_DIAGNOSIS_AVAILABLE', ok: diagnostic.status === 200 });
        if (diagnostic.status === 200) checks.push(...checkCloudRuntime(await boundedJson(diagnostic), now()));
        else await diagnostic.body?.cancel();
    } catch { checks.push({ id: 'SERVICE_VERIFICATION_FAILED', ok: false }); }
    return checks;
}

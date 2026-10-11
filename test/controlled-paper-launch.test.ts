import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudConfigurationReport, launchConfiguredCloud } from '../src/application/cloud-launch.js';
// TEST_ONLY: configuration fixtures, no network, broker or production writes.
const env = (): NodeJS.ProcessEnv => ({
  NODE_ENV: 'production',
  PAPER_TRADING_ONLY: 'true',
  PUBLIC_ORIGIN: 'https://fixture.example.test',
  APP_ACCESS_TOKEN: 'TEST_ONLY-access-secret-at-least-32-characters',
  DATABASE_URL: 'postgresql://fixture:fixture@db.example.test/lab',
  MARKET_SYMBOL: 'btcusdt',
  INITIAL_PAPER_CAPITAL: '10000',
  PAPER_EVALUATION_ENABLED: 'false',
  LEGACY_PAPER_EXECUTION_ENABLED: 'false',
  AUTONOMOUS_PERPETUAL_ENABLED: 'false',
  PERPETUAL_PAPER_ENABLED: 'true',
  EVALUATION_WALLETS_ENABLED: 'true',
  EVALUATION_PAPER_CAPITAL: '1000',
  CLOUD_LAUNCH_PHASE: 'CONTROLLED_PAPER',
});
test('controlled paper launch explicitly permits only independent perpetual orders and no autonomy', async () => {
  const cfg = env(),
    report = cloudConfigurationReport(cfg);
  assert.equal(report.ready, true);
  assert.equal(report.scope, 'CONTROLLED_PAPER_CONFIG_ONLY');
  assert.ok(report.unverified.includes('BACKUPS_AND_RESTORE'));
  let starts = 0;
  assert.equal(
    await launchConfiguredCloud(
      cfg,
      async () => {
        starts++;
      },
      () => {},
    ),
    0,
  );
  assert.equal(starts, 1);
  for (const change of [
    { CLOUD_LAUNCH_PHASE: undefined },
    { CLOUD_LAUNCH_PHASE: 'FIRST_PUBLICATION' },
    { CLOUD_LAUNCH_PHASE: 'typo' },
    { EVALUATION_WALLETS_ENABLED: 'false' },
    { EVALUATION_PAPER_CAPITAL: '0' },
    { PERPETUAL_PAPER_ENABLED: 'false' },
    { AUTONOMOUS_PERPETUAL_ENABLED: 'true' },
    { AUTONOMOUS_STUDY_ID: 'fixture-study' },
    { PAPER_EVALUATION_ENABLED: 'true' },
    { LEGACY_PAPER_EXECUTION_ENABLED: 'true' },
    { NODE_TLS_REJECT_UNAUTHORIZED: '0' },
    { AI_PROVIDER_API_KEY: 'TEST_ONLY-private-key' },
    { APP_ACCESS_TOKEN: 'short' },
  ]) {
    assert.equal(
      await launchConfiguredCloud(
        { ...cfg, ...change },
        async () => {
          starts++;
        },
        () => {},
      ),
      1,
    );
    assert.equal(starts, 1);
  }
  assert.equal(
    cloudConfigurationReport({ ...cfg, CLOUD_LAUNCH_PHASE: undefined, PERPETUAL_PAPER_ENABLED: 'false' }).ready,
    true,
  );
});

import { launchConfiguredCloud } from './application/cloud-launch.js';

// No shell parsing or child runtime: this process retains the existing signal handlers.
process.exitCode = await launchConfiguredCloud(
  process.env,
  () => import('./index.js'),
  (report) => console.log(JSON.stringify(report, null, 2)),
);

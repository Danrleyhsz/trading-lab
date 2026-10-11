import { cloudConfigurationReport } from './application/cloud-launch.js';
const report = cloudConfigurationReport(process.env);
console.log(JSON.stringify(report, null, 2));
process.exitCode = report.ready ? 0 : 1;

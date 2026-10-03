import {verifyCloudService} from './application/cloud-launch.js';
const checks = await verifyCloudService(process.env.PUBLIC_ORIGIN??'',process.env.APP_ACCESS_TOKEN??'');
console.log(JSON.stringify({scope:'READ_ONLY_FIRST_PUBLICATION_SMOKE',ready:checks.every(c=>c.ok),checks,unverified:['ORIGINAL_HISTORY_RECONCILIATION','RESTART_AND_RESTORE','CLOUD_ACCOUNT_AND_BILLING','BROWSER_INTERACTION','BACKUP_RETENTION']},null,2));
process.exitCode = checks.every(c=>c.ok) ? 0 : 1;

import {checkCloudConfiguration} from './application/cloud-launch.js';
const checks = checkCloudConfiguration(process.env);
console.log(JSON.stringify({scope:'FIRST_PUBLICATION_CONFIG_ONLY',ready:checks.every(c=>c.ok),checks,unverified:['DATABASE_CONNECTION','CLOUD_HOST','HISTORY_IMPORT','BACKUPS_AND_RESTORE','RELEASE_REVIEW']},null,2));
process.exitCode = checks.every(c=>c.ok) ? 0 : 1;

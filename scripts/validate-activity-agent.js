const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const index = read('cloudfunctions/activityAgent/index.js');
const config = read('cloudfunctions/activityAgent/config.json');
const readme = read('cloudfunctions/activityAgent/README.md');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(config.includes('"type": "timer"'), 'missing daily timer trigger');
assert(config.includes('0 0 9'), 'daily trigger is not configured for 09:00');
for (const collection of ['agent_sources', 'source_items', 'activity_candidates', 'agent_runs']) {
  assert(index.includes(`db.collection('${collection}')`), `missing ${collection} persistence`);
}
for (const marker of ['authorizationStatus', 'qualityScore', 'eventFingerprint', 'notifyAdmins', 'assertAdmin', 'isPublicHttpUrl', 'isBlockedHost']) {
  assert(index.includes(marker), `missing agent safety/quality marker: ${marker}`);
}
assert(readme.includes('AGENT_NOTIFY_TEMPLATE_ID'), 'missing notification deployment prerequisite');
assert(readme.includes('BING_SEARCH_KEY'), 'missing search deployment prerequisite');
assert(readme.includes('不会自动把候选写入已发布'), 'missing human-review boundary');

console.log('Activity agent contract OK');

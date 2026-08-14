const fs = require('fs');
const path = require('path');

const read = (file) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const js = read('pages/admin-review/admin-review.js');
const wxml = read('pages/admin-review/admin-review.wxml');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(js.includes('loadCloudData'), 'missing CloudBase operations loading');
assert(js.includes('isCloudReady'), 'missing local/cloud mode boundary');
assert(js.includes('toggleAgent'), 'missing daily agent enable/disable control');
assert(js.includes('saveSources'), 'missing monitored source persistence');
assert(js.includes('runAgent'), 'missing manual agent run entry');
assert(js.includes('approveActivityCandidate'), 'missing candidate approval action');
assert(js.includes('rejectActivityCandidate'), 'missing candidate rejection action');
assert(wxml.includes('PENDING REVIEW'), 'missing pending review summary');
assert(wxml.includes('AGENT DISCOVERY'), 'missing agent discovery panel');
assert(wxml.includes('saveSources'), 'missing source save button binding');
assert(wxml.includes('bindtap="approve"'), 'missing approve action binding');
assert(wxml.includes('bindtap="reject"'), 'missing reject action binding');

console.log('Operations contract OK');

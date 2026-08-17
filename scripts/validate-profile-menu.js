const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages/profile/profile.wxml'), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(!source.includes('class="menu-title">我的名片</text>'), 'profile menu still exposes the duplicate card entry');
assert(source.includes('class="card-edit-link" catchtap="goEdit"'), 'profile card edit action was removed');
assert(source.includes('class="setup-button" bindtap="goEdit"'), 'setup edit action was removed');

console.log('Profile menu contract OK');

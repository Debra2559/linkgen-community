const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages/profile/profile.wxss'), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(source.includes('.menu-list > .menu-item:nth-child(3) { display: none; }'), 'profile menu still exposes the duplicate card entry');
assert(source.includes('already exposes the edit action'), 'missing rationale comment for the hidden menu entry');

console.log('Profile menu contract OK');

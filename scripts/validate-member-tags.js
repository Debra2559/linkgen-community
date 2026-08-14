const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const wxml = read('pages/member-detail/member-detail.wxml');
const wxss = read('pages/member-detail/member-detail.wxss');

assert(wxml.includes('member-detail-tag'), '成员名片标签未使用专属视觉类');
assert(/\.member-detail-tags\s*\{[\s\S]*?display:\s*flex/.test(wxss), '成员名片标签容器未启用可视化布局');
assert(/\.member-detail-tag\s*\{[\s\S]*?border-radius:\s*999rpx/.test(wxss), '成员名片标签未使用胶囊形状');
assert(/\.member-detail-tag:nth-child\(3n\+1\)/.test(wxss), '成员名片标签缺少第一组强调色');
assert(/\.member-detail-tag:nth-child\(3n\+2\)/.test(wxss), '成员名片标签缺少第二组强调色');
assert(/\.member-detail-tag:nth-child\(3n\+3\)/.test(wxss), '成员名片标签缺少第三组强调色');

console.log('Member tag visual contract OK');

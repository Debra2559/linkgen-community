const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const surfaces = [
  {
    name: 'edit-profile',
    js: 'pages/edit-profile/edit-profile.js',
    wxml: 'pages/edit-profile/edit-profile.wxml',
    wxss: 'pages/edit-profile/edit-profile.wxss',
  },
  {
    name: 'create-post',
    js: 'pages/create-post/create-post.js',
    wxml: 'pages/create-post/create-post.wxml',
    wxss: 'pages/create-post/create-post.wxss',
  },
];

for (const surface of surfaces) {
  const js = read(surface.js);
  const wxml = read(surface.wxml);
  const wxss = read(surface.wxss);

  assert(/length\s*<\s*3/.test(js), `${surface.name} 未保留最多选择 3 个标签的约束`);
  assert(/class="choice \{\{[^}]*chosen/.test(wxml), `${surface.name} 未绑定持久化 chosen 状态`);
  assert(/\.choice\.chosen\s*\{[\s\S]*?background:\s*var\(--coral-soft\)/.test(wxss), `${surface.name} 缺少选中背景色`);
  assert(/\.choice\.chosen\s*\{[\s\S]*?box-shadow:/.test(wxss), `${surface.name} 缺少选中高光`);
  assert(/\.choice\.chosen\s*\{[\s\S]*?font-weight:\s*700/.test(wxss), `${surface.name} 缺少选中文字层级`);
}

console.log('Tag selection contract OK: edit-profile + create-post');

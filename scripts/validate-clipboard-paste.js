const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages/create-post/create-post.js'), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

assert(source.includes('function normalizeLink'), '缺少剪贴板链接标准化函数');
assert(/pasteLink\(\)[\s\S]*linkPanelOpen:\s*true/.test(source), '剪贴板读取失败后未打开手动粘贴面板');
assert(/saveLink\(\)[\s\S]*normalizeLink\(this\.data\.linkInput\)/.test(source), '手动粘贴未复用链接标准化逻辑');
assert(source.includes('请在下方输入或粘贴链接'), '剪贴板失败缺少可执行提示');

console.log('Clipboard paste contract OK');

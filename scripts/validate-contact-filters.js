const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'pages/contacts/contacts.js'), 'utf8');
const requiredTags = ['AI 产品', 'AI 工具', '设计', '独立开发', '内容创作', '用户研究', 'Agent', '找搭子', '线下活动', 'AI 应用', '开源'];

for (const tag of requiredTags) {
  if (!source.includes(`'${tag}'`)) throw new Error(`通讯录筛选缺少：${tag}`);
}

if (!source.includes("activeTag === '全部'")) throw new Error('通讯录缺少全部筛选入口');
console.log(`Contact filter contract OK: ${requiredTags.length} curated tags`);

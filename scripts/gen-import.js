// 从 menuList 云函数的 SEED 生成云数据库导入文件（JSONL：每行一条记录）
// 用法：node scripts/gen-import.js
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../cloudfunctions/menuList/index.js'), 'utf8');
const m = src.match(/const SEED = ([\s\S]*?\n\];)/);
if (!m) {
  console.error('未找到 SEED 数据');
  process.exit(1);
}
const SEED = eval(m[1]);

const outDir = path.join(__dirname, '../db-import');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

const catLines = [];
const dishLines = [];

SEED.forEach((c, i) => {
  const catId = 'cat_' + String(i + 1).padStart(3, '0');
  catLines.push(JSON.stringify({ _id: catId, name: c.name, sort: c.sort }));
  c.dishes.forEach((d) => {
    dishLines.push(
      JSON.stringify({
        name: d.name,
        price: d.price,
        desc: d.desc,
        emoji: d.emoji,
        categoryId: catId,
        soldOut: false,
        sort: d.price,
      })
    );
  });
});

fs.writeFileSync(path.join(outDir, 'categories.json'), catLines.join('\n') + '\n');
fs.writeFileSync(path.join(outDir, 'dishes.json'), dishLines.join('\n') + '\n');

console.log(`categories.json: ${catLines.length} 条`);
console.log(`dishes.json: ${dishLines.length} 条`);

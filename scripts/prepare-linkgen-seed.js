const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const seedFiles = ['agent-sources.json', 'library-resources.json'];

for (const fileName of seedFiles) {
  const sourcePath = path.join(root, 'db-import', fileName);
  const outputPath = path.join(root, 'db-import', fileName.replace(/\.json$/i, '.jsonl'));
  const records = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!Array.isArray(records)) throw new Error(`${fileName} 必须是 JSON 数组`);
  fs.writeFileSync(outputPath, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`);
  console.log(`${outputPath}: ${records.length} 条记录`);
}

const fs = require('fs');
const files = fs.readdirSync('drizzle/meta').filter(f => f.endsWith('.json') && f !== '_journal.json');
for (let file of files) {
  const path = `drizzle/meta/${file}`;
  const data = JSON.parse(fs.readFileSync(path));
  data.version = 6;
  fs.writeFileSync(path, JSON.stringify(data, null, 2));
}
console.log('Done!');

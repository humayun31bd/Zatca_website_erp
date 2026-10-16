const { execSync } = require('child_process');
const db = require('better-sqlite3')('sqlite.db');

while (true) {
  try {
    console.log('Running drizzle-kit push...');
    const output = execSync('npx drizzle-kit push', { encoding: 'utf-8' });
    console.log(output);
    console.log('SUCCESS!');
    break;
  } catch (error) {
    const errText = error.stderr || error.stdout || error.message;
    const match = errText.match(/index (\w+) already exists/);
    if (match) {
      const indexName = match[1];
      console.log(`Dropping index ${indexName}...`);
      try {
        db.exec(`DROP INDEX "${indexName}"`);
        console.log(`Dropped ${indexName}`);
      } catch (e) {
        console.error(`Failed to drop ${indexName}: ${e.message}`);
        break; // Stop if we can't drop it
      }
    } else {
      console.error('Unknown error:');
      console.error(errText);
      break;
    }
  }
}

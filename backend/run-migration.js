const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/zatca_erp' });
  await client.connect();
  
  const sql = fs.readFileSync(path.join(__dirname, 'drizzle/0006_whole_kingpin.sql'), 'utf-8');
  console.log('Running SQL...');
  try {
    await client.query(sql);
    console.log('Success');
  } catch (err) {
    console.error('Error executing query:', err);
  } finally {
    await client.end();
  }
}

run();

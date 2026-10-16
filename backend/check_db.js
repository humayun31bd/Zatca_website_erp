require('dotenv').config();
const { Client } = require('pg');
const client = new Client({
  connectionString: process.env.DATABASE_URL.replace('6543', '5432'),
  ssl: { rejectUnauthorized: false }
});

client.connect().then(() => {
  client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
    .then(res => console.log(res.rows.map(r => r.table_name)))
    .catch(console.error)
    .finally(() => client.end());
});

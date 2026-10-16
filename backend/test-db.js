const { db } = require('./src/lib/db');
console.log('Keys:', Object.keys(db));
if (db.dialect) console.log('Dialect:', db.dialect.constructor.name);

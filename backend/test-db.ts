import { db } from './src/lib/db';
console.log('Keys:', Object.keys(db));
console.log('session?', 'session' in db);
if ('dialect' in db) console.log('Dialect:', (db as any).dialect.constructor.name);

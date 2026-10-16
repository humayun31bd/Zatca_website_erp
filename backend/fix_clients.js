const db = require('better-sqlite3')('sqlite.db');

try {
  db.exec(`
    PRAGMA foreign_keys=OFF;

    CREATE TABLE \`__fixed_clients\` (
        \`id\` text PRIMARY KEY NOT NULL,
        \`tenant_id\` text NOT NULL,
        \`name\` text NOT NULL,
        \`vatNumber\` text,
        \`address\` text,
        \`email\` text,
        \`phone_number\` text,
        \`country\` text,
        \`state\` text,
        \`city\` text,
        \`customer_type\` text DEFAULT 'newCustomer',
        \`funds\` real DEFAULT 0,
        \`dues\` real DEFAULT 0,
        \`created_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
        \`updated_at\` integer DEFAULT (cast((julianday('now') - 2440587.5)*86400000 as integer)) NOT NULL,
        FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON UPDATE no action ON DELETE cascade
    );

    INSERT INTO \`__fixed_clients\`(
        \`id\`, \`tenant_id\`, \`name\`, \`vatNumber\`, \`address\`, \`email\`, \`phone_number\`, \`created_at\`, \`updated_at\`
    )
    SELECT
        \`id\`, \`tenant_id\`, \`name\`, \`vatNumber\`, \`address\`, \`email\`, \`phone_number\`, \`created_at\`, \`updated_at\`
    FROM \`clients\`;

    DROP TABLE \`clients\`;
    ALTER TABLE \`__fixed_clients\` RENAME TO \`clients\`;

    CREATE UNIQUE INDEX \`uq_tenant_client_name\` ON \`clients\` (\`tenant_id\`,\`name\`);

    PRAGMA foreign_keys=ON;
  `);
  console.log("Successfully recreated clients table.");
} catch (e) {
  console.error("Error:", e);
}

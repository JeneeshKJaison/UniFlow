const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'uniflow_db',
    password: process.env.DB_PASSWORD || '1234',
    port: process.env.DB_PORT || 5432,
});

async function run() {
    try {
        console.log("Checking workload_master table...");
        const res = await pool.query('SELECT * FROM workload_master');
        console.log(`Found ${res.rows.length} rows in workload_master.`);
        if (res.rows.length > 0) {
            console.log("Sample row:", res.rows[0]);
        }
    } catch (e) {
        console.error("DB Error:", e);
    } finally {
        pool.end();
    }
}
run();

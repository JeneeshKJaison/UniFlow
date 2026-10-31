const pool = require('./src/config/db');

async function checkSchema() {
    try {
        const tablesRes = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        console.log('Total tables in public schema:', tablesRes.rows.length);
        console.log(JSON.stringify(tablesRes.rows.map(r => r.table_name), null, 2));

        for (const r of tablesRes.rows) {
            const countRes = await pool.query(`SELECT COUNT(*) FROM "${r.table_name}"`);
            console.log(`${r.table_name}: ${countRes.rows[0].count} rows`);
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await pool.end();
    }
}

checkSchema();

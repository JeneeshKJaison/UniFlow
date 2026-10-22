const initWorkloadTables = require('./src/config/initWorkloadTables');
const pool = require('./src/config/db');

async function alterTables() {
    try {
        console.log('Verifying and updating workload tables...');
        await initWorkloadTables();
        console.log('Successfully altered and verified workload tables!');
    } catch (error) {
        console.error('Error altering tables:', error);
    } finally {
        await pool.end();
    }
}

alterTables();

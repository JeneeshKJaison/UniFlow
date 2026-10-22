const initWorkloadTables = require('./src/config/initWorkloadTables');
const pool = require('./src/config/db');

async function createWorkloadTables() {
    try {
        console.log('Creating and verifying all workload tables...');
        await initWorkloadTables();
        console.log('Workload tables created and verified successfully!');
    } catch (error) {
        console.error('Error creating workload tables:', error);
    } finally {
        await pool.end();
    }
}

createWorkloadTables();

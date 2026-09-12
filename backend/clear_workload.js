const pool = require('./src/config/db');

async function clearWorkloadData() {
    try {
        console.log('Clearing simulated workload data from the database...');
        
        await pool.query('TRUNCATE TABLE workload_master RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE teaching_loads RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE paper_and_assignment_setting RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE preparation_and_course_factors RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE evaluation_units RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE subject_faculty RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE subjects RESTART IDENTITY CASCADE');

        console.log('✓ Successfully wiped all workload and class data!');
    } catch (error) {
        console.error('Error clearing data:', error);
    } finally {
        await pool.end();
    }
}

clearWorkloadData();

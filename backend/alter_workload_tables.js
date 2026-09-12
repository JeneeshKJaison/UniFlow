const pool = require('./src/config/db');

async function alterTables() {
    const tables = [
        'teaching_loads',
        'paper_and_assignment_setting',
        'preparation_and_course_factors',
        'evaluation_units',
        'workload_master'
    ];

    try {
        console.log('Adding subject_name and faculty_name to workload tables...');
        
        for (const table of tables) {
            await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255)`);
            await pool.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255)`);
            console.log(`✓ Updated ${table}`);
        }

        console.log('Successfully altered workload tables!');
    } catch (error) {
        console.error('Error altering tables:', error);
    } finally {
        await pool.end();
    }
}

alterTables();

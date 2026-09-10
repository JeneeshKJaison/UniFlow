const pool = require('./src/config/db');

async function createSettingUnitsTable() {
    try {
        console.log('Creating paper_and_assignment_setting table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS paper_and_assignment_setting (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                faculty_id INTEGER,
                num_question_papers INTEGER DEFAULT 0,
                num_assignments INTEGER DEFAULT 2,
                num_question_bank INTEGER DEFAULT 0,
                subtotal_setting_units NUMERIC DEFAULT 0
            );
        `);
        console.log('✓ Created paper_and_assignment_setting table');

        console.log('Setting units table created successfully!');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await pool.end();
    }
}

createSettingUnitsTable();

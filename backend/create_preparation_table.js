const pool = require('./src/config/db');

async function createPreparationTable() {
    try {
        console.log('Creating preparation_and_course_factors table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS preparation_and_course_factors (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                faculty_id INTEGER,
                theory_subject_prep NUMERIC DEFAULT 0,
                theory_rubrics_prep NUMERIC DEFAULT 0,
                theory_copo_mapping NUMERIC DEFAULT 0,
                lab_experiments_prep NUMERIC DEFAULT 0,
                lab_rubrics_prep NUMERIC DEFAULT 0,
                lab_eval_sheets_prep NUMERIC DEFAULT 0,
                lab_copo_mapping NUMERIC DEFAULT 0,
                project_rubrics_prep NUMERIC DEFAULT 0,
                project_eval_sheets_prep NUMERIC DEFAULT 0,
                project_copo_mapping NUMERIC DEFAULT 0,
                project_scheduling NUMERIC DEFAULT 0,
                extra_additions NUMERIC DEFAULT 0,
                total_load NUMERIC DEFAULT 0
            );
        `);
        console.log('✓ Created preparation_and_course_factors table');

        console.log('Preparation table created successfully!');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await pool.end();
    }
}

createPreparationTable();

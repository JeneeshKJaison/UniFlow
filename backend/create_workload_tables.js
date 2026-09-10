const pool = require('./src/config/db');

async function createWorkloadTables() {
    try {
        console.log('Creating workload tables...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS teaching_loads (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                faculty_id INTEGER,
                students_in_class INTEGER DEFAULT 60,
                theory_hours NUMERIC DEFAULT 0,
                lab_hours NUMERIC DEFAULT 0,
                project_hours NUMERIC DEFAULT 0,
                tutorial_hours NUMERIC DEFAULT 0,
                students_in_lab INTEGER DEFAULT 0,
                students_in_project INTEGER DEFAULT 0,
                subtotal_weighted_units NUMERIC DEFAULT 0,
                total_load NUMERIC DEFAULT 0
            );
        `);
        console.log('✓ Created teaching_loads table');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS workload_master (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                faculty_id INTEGER,
                teaching_load_units NUMERIC DEFAULT 0,
                question_setting_units NUMERIC DEFAULT 0,
                prep_adjustment_units NUMERIC DEFAULT 0,
                evaluation_units NUMERIC DEFAULT 0,
                theory_hours_per_week NUMERIC DEFAULT 0,
                experience_multiplier NUMERIC DEFAULT 1,
                grand_total_workload_units NUMERIC DEFAULT 0
            );
        `);
        console.log('✓ Created workload_master table');

        console.log('Workload tables created successfully!');
    } catch (error) {
        console.error('Error creating workload tables:', error);
    } finally {
        await pool.end();
    }
}

createWorkloadTables();

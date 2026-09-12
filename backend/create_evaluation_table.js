const pool = require('./src/config/db');

async function createEvaluationTable() {
    try {
        console.log('Creating evaluation_units table...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS evaluation_units (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                faculty_id INTEGER,
                series_answer_scripts NUMERIC DEFAULT 0,
                end_sem_answer_scripts NUMERIC DEFAULT 0,
                assignment_scripts NUMERIC DEFAULT 0,
                lab_output_evaluations NUMERIC DEFAULT 0,
                practical_exam_evals NUMERIC DEFAULT 0,
                viva_voce_count NUMERIC DEFAULT 0,
                project_evaluations NUMERIC DEFAULT 0,
                subtotal_evaluation_units NUMERIC DEFAULT 0
            );
        `);
        console.log('✓ Created evaluation_units table');

        console.log('Evaluation units table created successfully!');
    } catch (error) {
        console.error('Error creating table:', error);
    } finally {
        await pool.end();
    }
}

createEvaluationTable();

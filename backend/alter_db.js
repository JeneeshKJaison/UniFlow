const pool = require('./src/config/db');

async function alterDb() {
    try {
        console.log('Altering database schema...');
        
        // Add course_type and ltpj_code to subjects table
        await pool.query(`
            ALTER TABLE subjects 
            ADD COLUMN IF NOT EXISTS course_type VARCHAR(255),
            ADD COLUMN IF NOT EXISTS ltpj_code VARCHAR(50);
        `);
        console.log('✓ Added course_type and ltpj_code to subjects');

        // Add role to subject_faculty table
        await pool.query(`
            ALTER TABLE subject_faculty 
            ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Theory';
        `);
        console.log('✓ Added role to subject_faculty');

        console.log('Database altered successfully!');
    } catch (error) {
        console.error('Error altering database:', error);
    } finally {
        await pool.end();
    }
}

alterDb();

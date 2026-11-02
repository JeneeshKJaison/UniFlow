const pool = require('./db');

async function initWorkloadTables() {
    try {
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS estimated_hours NUMERIC(8, 2);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS assignment_type VARCHAR(20);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_name VARCHAR(255);
            ALTER TABLE tasks ALTER COLUMN difficulty DROP NOT NULL;
            UPDATE tasks
            SET assignment_type = CASE WHEN subject_id IS NULL THEN 'other' ELSE 'subject' END,
                category_name = CASE
                    WHEN subject_id IS NULL THEN COALESCE(category_name, 'General work')
                    ELSE COALESCE(category_name, 'Subject-related')
                END
            WHERE assignment_type IS NULL OR category_name IS NULL;
            ALTER TABLE tasks ALTER COLUMN assignment_type SET DEFAULT 'subject';
            ALTER TABLE tasks ALTER COLUMN assignment_type SET NOT NULL;

            CREATE TABLE IF NOT EXISTS teaching_loads (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                subject_name VARCHAR(255),
                faculty_id INTEGER,
                faculty_name VARCHAR(255),
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

            CREATE TABLE IF NOT EXISTS paper_and_assignment_setting (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                subject_name VARCHAR(255),
                faculty_id INTEGER,
                faculty_name VARCHAR(255),
                num_question_papers INTEGER DEFAULT 0,
                num_assignments INTEGER DEFAULT 2,
                num_question_bank INTEGER DEFAULT 0,
                subtotal_setting_units NUMERIC DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS preparation_and_course_factors (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                subject_name VARCHAR(255),
                faculty_id INTEGER,
                faculty_name VARCHAR(255),
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

            CREATE TABLE IF NOT EXISTS evaluation_units (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                subject_name VARCHAR(255),
                faculty_id INTEGER,
                faculty_name VARCHAR(255),
                series_answer_scripts NUMERIC DEFAULT 0,
                end_sem_answer_scripts NUMERIC DEFAULT 0,
                assignment_scripts NUMERIC DEFAULT 0,
                lab_output_evaluations NUMERIC DEFAULT 0,
                practical_exam_evals NUMERIC DEFAULT 0,
                viva_voce_count NUMERIC DEFAULT 0,
                project_evaluations NUMERIC DEFAULT 0,
                subtotal_evaluation_units NUMERIC DEFAULT 0
            );

            CREATE TABLE IF NOT EXISTS workload_master (
                id SERIAL PRIMARY KEY,
                subject_id INTEGER,
                subject_name VARCHAR(255),
                faculty_id INTEGER,
                faculty_name VARCHAR(255),
                teaching_load_units NUMERIC DEFAULT 0,
                question_setting_units NUMERIC DEFAULT 0,
                prep_adjustment_units NUMERIC DEFAULT 0,
                evaluation_units NUMERIC DEFAULT 0,
                theory_hours_per_week NUMERIC DEFAULT 0,
                experience_multiplier NUMERIC DEFAULT 1,
                grand_total_workload_units NUMERIC DEFAULT 0
            );

            -- Ensure subject_name and faculty_name exist if tables already existed without them
            ALTER TABLE teaching_loads ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255);
            ALTER TABLE teaching_loads ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255);

            ALTER TABLE paper_and_assignment_setting ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255);
            ALTER TABLE paper_and_assignment_setting ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255);

            ALTER TABLE preparation_and_course_factors ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255);
            ALTER TABLE preparation_and_course_factors ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255);

            ALTER TABLE evaluation_units ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255);
            ALTER TABLE evaluation_units ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255);

            ALTER TABLE workload_master ADD COLUMN IF NOT EXISTS subject_name VARCHAR(255);
            ALTER TABLE workload_master ADD COLUMN IF NOT EXISTS faculty_name VARCHAR(255);

            -- Ensure course_type and ltpj_code on subjects
            ALTER TABLE subjects ADD COLUMN IF NOT EXISTS course_type VARCHAR(255);
            ALTER TABLE subjects ADD COLUMN IF NOT EXISTS ltpj_code VARCHAR(50);

            -- Ensure role on subject_faculty
            ALTER TABLE subject_faculty ADD COLUMN IF NOT EXISTS role VARCHAR(100) DEFAULT 'Theory';

            -- 16. Department Roles Master Table
            CREATE TABLE IF NOT EXISTS department_roles_master (
                id VARCHAR(10) PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                category VARCHAR(100) DEFAULT 'Department',
                source_pages VARCHAR(50),
                responsibility_summary TEXT
            );

            -- 17. Department Tasks Master Table
            CREATE TABLE IF NOT EXISTS department_tasks_master (
                id VARCHAR(10) PRIMARY KEY,
                role_id VARCHAR(10) REFERENCES department_roles_master(id) ON DELETE CASCADE,
                role_name VARCHAR(255) NOT NULL,
                responsibility_task VARCHAR(255) NOT NULL,
                work_unit VARCHAR(100) NOT NULL,
                std_effort NUMERIC(6, 2) NOT NULL,
                occurrences_per_semester INTEGER NOT NULL,
                complexity_factor NUMERIC(4, 2) NOT NULL,
                validation_note TEXT
            );

            -- 18. Faculty Department Workload Allocations Table
            CREATE TABLE IF NOT EXISTS faculty_department_workload (
                id SERIAL PRIMARY KEY,
                faculty_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                faculty_name VARCHAR(255) NOT NULL,
                role_id VARCHAR(10) REFERENCES department_roles_master(id) ON DELETE CASCADE,
                role_name VARCHAR(255) NOT NULL,
                task_id VARCHAR(10) REFERENCES department_tasks_master(id) ON DELETE CASCADE,
                task_name VARCHAR(255) NOT NULL,
                work_unit VARCHAR(100) NOT NULL,
                quantity NUMERIC(10, 2) NOT NULL DEFAULT 1,
                std_effort NUMERIC(6, 2) NOT NULL,
                occurrences INTEGER NOT NULL,
                complexity_factor NUMERIC(4, 2) NOT NULL,
                calculated_workload NUMERIC(10, 2) NOT NULL,
                remarks TEXT,
                category VARCHAR(50) DEFAULT 'Department',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            ALTER TABLE faculty_department_workload ALTER COLUMN role_id TYPE VARCHAR(50);
            ALTER TABLE faculty_department_workload ALTER COLUMN task_id TYPE VARCHAR(50);
            ALTER TABLE faculty_department_workload DROP CONSTRAINT IF EXISTS faculty_department_workload_role_id_fkey;
            ALTER TABLE faculty_department_workload DROP CONSTRAINT IF EXISTS faculty_department_workload_task_id_fkey;
            ALTER TABLE faculty_department_workload ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Department';

            ALTER TABLE department_roles_master ALTER COLUMN id TYPE VARCHAR(50);
            ALTER TABLE department_tasks_master ALTER COLUMN id TYPE VARCHAR(50);
            ALTER TABLE department_tasks_master ALTER COLUMN role_id TYPE VARCHAR(50);
            ALTER TABLE department_tasks_master DROP CONSTRAINT IF EXISTS department_tasks_master_role_id_fkey;
            ALTER TABLE department_tasks_master ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Department';
        `);

        // Seed master catalogs across all categories
        const WORKLOAD_CATALOGS = require('./workloadMasterCatalogs');
        for (const [categoryKey, catData] of Object.entries(WORKLOAD_CATALOGS)) {
            for (const r of catData.roles) {
                await pool.query(`
                    INSERT INTO department_roles_master (id, name, category, source_pages, responsibility_summary)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        category = EXCLUDED.category,
                        responsibility_summary = EXCLUDED.responsibility_summary
                `, [r.id, r.name, categoryKey, 'TKMCE Regulations 2023', r.summary]);
            }
            for (const t of catData.tasks) {
                await pool.query(`
                    INSERT INTO department_tasks_master 
                    (id, role_id, role_name, responsibility_task, work_unit, std_effort, occurrences_per_semester, complexity_factor, validation_note, category)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    ON CONFLICT (id) DO UPDATE SET
                        role_id = EXCLUDED.role_id,
                        role_name = EXCLUDED.role_name,
                        responsibility_task = EXCLUDED.responsibility_task,
                        work_unit = EXCLUDED.work_unit,
                        std_effort = EXCLUDED.std_effort,
                        occurrences_per_semester = EXCLUDED.occurrences_per_semester,
                        complexity_factor = EXCLUDED.complexity_factor,
                        category = EXCLUDED.category
                `, [
                    t.id, t.role_id, t.role_name, t.responsibility_task, t.work_unit,
                    t.std_effort, t.occurrences_per_semester, t.complexity_factor,
                    `${catData.name} Standard Metric`, categoryKey
                ]);
            }
        }

        console.log('✓ Workload tables, multi-domain categories, and master catalogs verified.');
    } catch (err) {
        console.error('Workload tables initialization error:', err.message);
    }
}

module.exports = initWorkloadTables;

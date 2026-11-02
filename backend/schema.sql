-- ============================================================
-- UniFlow Database Schema
-- ============================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    custom_id VARCHAR(50) UNIQUE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    is_hod BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Departments Table
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    hod_user_id INT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. User Departments Table
CREATE TABLE IF NOT EXISTS user_departments (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    UNIQUE(user_id, department_id)
);

-- 4. Courses Table
CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    department_id INT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    total_semesters INT DEFAULT 8,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id SERIAL PRIMARY KEY,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    semester INT NOT NULL,
    credits INT DEFAULT 3,
    course_type VARCHAR(255),
    ltpj_code VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Subject Faculty Allocation Table
CREATE TABLE IF NOT EXISTS subject_faculty (
    id SERIAL PRIMARY KEY,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    faculty_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(100) DEFAULT 'Theory',
    UNIQUE(subject_id, faculty_id)
);

-- 7. Tasks Table (HOD Workload Allocation & Faculty Tasks)
CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    created_by INT REFERENCES users(id) ON DELETE SET NULL,
    assigned_to INT REFERENCES users(id) ON DELETE CASCADE,
    subject_id INT REFERENCES subjects(id) ON DELETE SET NULL,
    assignment_type VARCHAR(20) NOT NULL DEFAULT 'subject',
    category_name VARCHAR(255),
    description TEXT NOT NULL,
    difficulty INT CHECK (difficulty BETWEEN 1 AND 10),
    estimated_hours NUMERIC(8, 2) CHECK (estimated_hours > 0),
    deadline DATE,
    scheduled_date DATE,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Students Profile & Enrollment Table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    user_id INT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INT NOT NULL DEFAULT 5,
    section VARCHAR(10) DEFAULT 'A',
    cgpa NUMERIC(3, 2) DEFAULT 8.40,
    admission_year INT DEFAULT 2023,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 9. Student Course Assignments (Created by Faculty)
CREATE TABLE IF NOT EXISTS student_assignments (
    id SERIAL PRIMARY KEY,
    faculty_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id INT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    course_id INT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    semester INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    difficulty INT NOT NULL CHECK (difficulty BETWEEN 1 AND 10),
    assigned_date DATE DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    max_marks INT DEFAULT 100,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Student Assignment Submissions & Status
CREATE TABLE IF NOT EXISTS student_assignment_submissions (
    id SERIAL PRIMARY KEY,
    assignment_id INT NOT NULL REFERENCES student_assignments(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'pending', -- pending, submitted, graded
    submission_text TEXT,
    submission_file VARCHAR(255),
    marks_obtained INT,
    remarks TEXT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(assignment_id, student_id)
);

-- 11. Teaching Loads Table
CREATE TABLE IF NOT EXISTS teaching_loads (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name VARCHAR(255),
    faculty_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

-- 12. Paper and Assignment Setting Table
CREATE TABLE IF NOT EXISTS paper_and_assignment_setting (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name VARCHAR(255),
    faculty_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    faculty_name VARCHAR(255),
    num_question_papers INTEGER DEFAULT 0,
    num_assignments INTEGER DEFAULT 2,
    num_question_bank INTEGER DEFAULT 0,
    subtotal_setting_units NUMERIC DEFAULT 0
);

-- 13. Preparation and Course Factors Table
CREATE TABLE IF NOT EXISTS preparation_and_course_factors (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name VARCHAR(255),
    faculty_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

-- 14. Evaluation Units Table
CREATE TABLE IF NOT EXISTS evaluation_units (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name VARCHAR(255),
    faculty_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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

-- 15. Workload Master Table
CREATE TABLE IF NOT EXISTS workload_master (
    id SERIAL PRIMARY KEY,
    subject_id INTEGER REFERENCES subjects(id) ON DELETE CASCADE,
    subject_name VARCHAR(255),
    faculty_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    faculty_name VARCHAR(255),
    teaching_load_units NUMERIC DEFAULT 0,
    question_setting_units NUMERIC DEFAULT 0,
    prep_adjustment_units NUMERIC DEFAULT 0,
    evaluation_units NUMERIC DEFAULT 0,
    theory_hours_per_week NUMERIC DEFAULT 0,
    experience_multiplier NUMERIC DEFAULT 1,
    grand_total_workload_units NUMERIC DEFAULT 0
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(faculty_id, task_id)
);

-- Student grievances require separate resolution confirmation from both parties.
CREATE TABLE IF NOT EXISTS student_grievances (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    subject VARCHAR(200) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'escalated', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    student_resolved_at TIMESTAMPTZ,
    faculty_resolved_at TIMESTAMPTZ,
    resolution_comment TEXT,
    resolved_at TIMESTAMPTZ,
    escalated_at TIMESTAMPTZ,
    escalated_to_hod_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS student_grievances_student_created_idx
    ON student_grievances (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS student_grievances_faculty_created_idx
    ON student_grievances (faculty_id, created_at DESC);
CREATE INDEX IF NOT EXISTS student_grievances_hod_escalated_idx
    ON student_grievances (escalated_to_hod_id, escalated_at DESC)
    WHERE escalated_at IS NOT NULL;

-- Faculty grievances to their department HOD require confirmation from both parties.
CREATE TABLE IF NOT EXISTS faculty_hod_grievances (
    id SERIAL PRIMARY KEY,
    faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    hod_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL DEFAULT 'other',
    subject VARCHAR(200) NOT NULL,
    details TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'open'
        CHECK (status IN ('open', 'resolved')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    due_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
    faculty_confirmed_at TIMESTAMPTZ,
    hod_resolved_at TIMESTAMPTZ,
    resolution_comment TEXT,
    resolved_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS faculty_hod_grievances_faculty_created_idx
    ON faculty_hod_grievances (faculty_id, created_at DESC);
CREATE INDEX IF NOT EXISTS faculty_hod_grievances_hod_created_idx
    ON faculty_hod_grievances (hod_id, created_at DESC);

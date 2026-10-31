const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');
const WORKLOAD_CATALOGS = require('./src/config/workloadMasterCatalogs');

async function seedAll() {
    try {
        console.log('====================================================');
        console.log('  UNIFLOW MASTER SEEDING SCRIPT');
        console.log('====================================================\n');

        const salt = await bcrypt.genSalt(10);
        const defaultHash = await bcrypt.hash('faculty123', salt);
        const adminHash = await bcrypt.hash('admin123', salt);
        const passwordHash = await bcrypt.hash('password123', salt);

        // 1. Ensure Table Structure & Constraints
        console.log('1. Verifying schema additions and unique constraints...');
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS faculty_remark TEXT;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;

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

            -- Ensure unique constraint on (faculty_id, task_id)
            DELETE FROM faculty_department_workload a USING faculty_department_workload b
            WHERE a.id < b.id AND a.faculty_id = b.faculty_id AND a.task_id = b.task_id;

            ALTER TABLE faculty_department_workload DROP CONSTRAINT IF EXISTS uq_faculty_task;
            ALTER TABLE faculty_department_workload ADD CONSTRAINT uq_faculty_task UNIQUE (faculty_id, task_id);
        `);
        console.log('   ✓ Constraints and columns verified.');

        // 2. Seed Base Users
        console.log('\n2. Seeding Users (HOD, Faculty, Students, Admin)...');
        const users = [
            { id: 8, customId: 'ADM001', name: 'UniFlow Administrator', email: 'admin@uniflow.edu', password: adminHash, role: 'admin', isHod: false },
            { id: 1, customId: 'HOD-CS01', name: 'Dr. Alan Turing', email: 'hod.cs@uniflow.edu', password: passwordHash, role: 'faculty', isHod: true },
            { id: 2, customId: 'FAC001', name: 'Grace Hopper', email: 'faculty@uniflow.edu', password: defaultHash, role: 'faculty', isHod: false },
            { id: 3, customId: 'FAC002', name: 'Linus Torvalds', email: 'linus@uniflow.edu', password: passwordHash, role: 'faculty', isHod: false },
            { id: 10, customId: 'FAC003', name: 'Dr. Jane Smith', email: 'jane@uniflow.edu', password: defaultHash, role: 'faculty', isHod: false },
            { id: 11, customId: 'FAC004', name: 'Dr. Alan Walker', email: 'alan@uniflow.edu', password: defaultHash, role: 'faculty', isHod: false },
            { id: 12, customId: 'FAC005', name: 'Dr. John Doe', email: 'john@uniflow.edu', password: defaultHash, role: 'faculty', isHod: false },
            { id: 4, customId: 'STU001', name: 'Alex Johnson', email: 'student@uniflow.edu', password: defaultHash, role: 'student', isHod: false },
            { id: 5, customId: 'STU002', name: 'Sarah Williams', email: 'sarah@uniflow.edu', password: defaultHash, role: 'student', isHod: false }
        ];

        for (const u of users) {
            await pool.query(`
                INSERT INTO users (id, custom_id, name, email, password_hash, role, is_hod)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id) DO UPDATE SET
                    custom_id = EXCLUDED.custom_id,
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    is_hod = EXCLUDED.is_hod
            `, [u.id, u.customId, u.name, u.email, u.password, u.role, u.isHod]);
        }
        await pool.query(`SELECT setval('users_id_seq', (SELECT GREATEST(MAX(id), 20) FROM users))`);
        console.log(`   ✓ Seeded ${users.length} users successfully.`);

        // 3. Seed Departments & Department Mappings
        console.log('\n3. Seeding Departments & User Assignments...');
        const departments = [
            { id: 1, name: 'Computer Science and Engineering', code: 'CSE', hod_user_id: 1 },
            { id: 2, name: 'Master of Computer Applications', code: 'MCA', hod_user_id: 1 },
            { id: 3, name: 'Mechanical Engineering', code: 'ME', hod_user_id: 1 },
            { id: 4, name: 'Electrical Engineering', code: 'EE', hod_user_id: 1 }
        ];
        for (const d of departments) {
            await pool.query(`
                INSERT INTO departments (id, name, code, hod_user_id)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE SET
                    name = EXCLUDED.name,
                    code = EXCLUDED.code,
                    hod_user_id = EXCLUDED.hod_user_id
            `, [d.id, d.name, d.code, d.hod_user_id]);
        }
        await pool.query(`SELECT setval('departments_id_seq', (SELECT GREATEST(MAX(id), 10) FROM departments))`);

        // User department assignments
        const facultyIds = [1, 2, 3, 10, 11, 12];
        for (const fId of facultyIds) {
            await pool.query(`
                INSERT INTO user_departments (user_id, department_id)
                VALUES ($1, 2)
                ON CONFLICT DO NOTHING
            `, [fId]);
        }
        console.log('   ✓ Departments and faculty affiliations mapped to MCA (ID 2).');

        // 4. Seed Master Catalogs (Roles & Tasks for 6 Domains)
        console.log('\n4. Seeding Master Catalogs for all 6 Workload Domains...');
        for (const [categoryKey, catData] of Object.entries(WORKLOAD_CATALOGS)) {
            for (const r of catData.roles) {
                await pool.query(`
                    INSERT INTO department_roles_master (id, name, category, source_pages, responsibility_summary)
                    VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (id) DO UPDATE SET
                        name = EXCLUDED.name,
                        category = EXCLUDED.category,
                        responsibility_summary = EXCLUDED.responsibility_summary
                `, [r.id, r.name, categoryKey, 'TKMCE Autonomous Framework', r.summary]);
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
        console.log('   ✓ Seeded all 6 workload domain catalogs.');

        // 5. Seed Multi-Domain Allocations across ALL 6 categories
        console.log('\n5. Seeding Cross-Domain Workload Allocations for all Faculty...');
        // Clear old allocations first to ensure clean state
        await pool.query(`TRUNCATE TABLE faculty_department_workload RESTART IDENTITY CASCADE`);

        const multiDomainAllocations = [
            // --- 1. DEPARTMENT WORK ---
            { faculty_id: 2, faculty_name: 'Grace Hopper', role_id: 'DEP01', role_name: 'Accreditation & Quality Assurance', task_id: 'DT01', task_name: 'NBA / NAAC Department Criterion Coordinator', work_unit: 'Criterion', qty: 2, effort: 5.0, occ: 4, comp: 1.5, calc: 60.0, remarks: 'Criteria 3 & 4 Lead', category: 'Department' },
            { faculty_id: 2, faculty_name: 'Grace Hopper', role_id: 'DEP02', role_name: 'Curriculum & Academic Administration', task_id: 'DT05', task_name: 'Department Timetable In-Charge', work_unit: 'Semester', qty: 1, effort: 12.0, occ: 1, comp: 1.25, calc: 15.0, remarks: 'Semester class schedule preparation', category: 'Department' },
            { faculty_id: 3, faculty_name: 'Linus Torvalds', role_id: 'DEP03', role_name: 'Laboratory Development & Maintenance', task_id: 'DT10', task_name: 'Advanced Computing Lab In-Charge', work_unit: 'Lab', qty: 1, effort: 8.0, occ: 3, comp: 1.25, calc: 30.0, remarks: 'OS and Network Lab maintenance', category: 'Department' },
            { faculty_id: 10, faculty_name: 'Dr. Jane Smith', role_id: 'DEP01', role_name: 'Accreditation & Quality Assurance', task_id: 'DT02', task_name: 'Course File & CO-PO Attainment Auditor', work_unit: 'Audit', qty: 4, effort: 4.0, occ: 2, comp: 1.25, calc: 40.0, remarks: 'Semester academic audit coordinator', category: 'Department' },
            { faculty_id: 11, faculty_name: 'Dr. Alan Walker', role_id: 'DEP04', role_name: 'Student Advisory & Mentoring', task_id: 'DT15', task_name: 'MCA 2024 Batch Class Advisor', work_unit: 'Batch', qty: 1, effort: 10.0, occ: 2, comp: 1.25, calc: 25.0, remarks: 'Mentoring 60 MCA students', category: 'Department' },
            { faculty_id: 1, faculty_name: 'Dr. Alan Turing', role_id: 'DEP02', role_name: 'Curriculum & Academic Administration', task_id: 'DT06', task_name: 'Board of Studies (BOS) Chairperson', work_unit: 'Meeting', qty: 2, effort: 6.0, occ: 2, comp: 1.5, calc: 36.0, remarks: 'Autonomous BOS Curriculum 2026', category: 'Department' },

            // --- 2. INSTITUTIONAL WORK ---
            { faculty_id: 2, faculty_name: 'Grace Hopper', role_id: 'INS01', role_name: 'Internal Quality Assurance Cell (IQAC)', task_id: 'INST02', task_name: 'NAAC / NBA Institutional Criteria Lead', work_unit: 'Criterion', qty: 2, effort: 6.0, occ: 3, comp: 1.5, calc: 54.0, remarks: 'Autonomous NBA criteria lead', category: 'Institutional' },
            { faculty_id: 3, faculty_name: 'Linus Torvalds', role_id: 'INS04', role_name: 'Campus Life & Student Welfare', task_id: 'INST13', task_name: 'Anti-Ragging Squad Committee Convener', work_unit: 'Inspection', qty: 1, effort: 2.5, occ: 8, comp: 1.2, calc: 24.0, remarks: 'Campus Anti-Ragging squad duty', category: 'Institutional' },
            { faculty_id: 10, faculty_name: 'Dr. Jane Smith', role_id: 'INS02', role_name: 'College Examination Cell', task_id: 'INST07', task_name: 'Chief Superintendent / University Exam Officer', work_unit: 'Session', qty: 1, effort: 3.5, occ: 8, comp: 1.25, calc: 35.0, remarks: 'Autonomous MCA Semester End Exams Duty', category: 'Institutional' },
            { faculty_id: 11, faculty_name: 'Dr. Alan Walker', role_id: 'INS03', role_name: 'Placement & Industry Relations', task_id: 'INST10', task_name: 'Department Placement Officer (DPO)', work_unit: 'Drive', qty: 5, effort: 4.0, occ: 2, comp: 1.25, calc: 50.0, remarks: 'Campus recruitment coordination', category: 'Institutional' },

            // --- 3. EXTRA PROACTIVE WORK ---
            { faculty_id: 2, faculty_name: 'Grace Hopper', role_id: 'EXT01', role_name: 'Student Technical Clubs & Chapters', task_id: 'EX02', task_name: 'Organizing Hackathons / Coding Contests', work_unit: 'Event', qty: 1, effort: 6.0, occ: 2, comp: 1.5, calc: 18.0, remarks: 'TKMCE Hackathon Convener', category: 'ExtraProactive' },
            { faculty_id: 3, faculty_name: 'Linus Torvalds', role_id: 'EXT02', role_name: 'Tech Fests & Symposia', task_id: 'EX06', task_name: 'Open Source / Linux Users Group Mentorship', work_unit: 'Workshop', qty: 2, effort: 3.0, occ: 4, comp: 1.0, calc: 24.0, remarks: 'Open source club mentorship', category: 'ExtraProactive' },
            { faculty_id: 10, faculty_name: 'Dr. Jane Smith', role_id: 'EXT01', role_name: 'Student Technical Clubs & Chapters', task_id: 'EX01', task_name: 'Faculty In-Charge for ACM / IEEE Student Branch', work_unit: 'Chapter', qty: 1, effort: 8.0, occ: 2, comp: 1.25, calc: 20.0, remarks: 'ACM student branch mentorship', category: 'ExtraProactive' },
            { faculty_id: 11, faculty_name: 'Dr. Alan Walker', role_id: 'EXT03', role_name: 'Incubation & Start-up Activities', task_id: 'EX09', task_name: 'Innovation & Entrepreneurship Development Cell (IEDC)', work_unit: 'Project', qty: 2, effort: 5.0, occ: 2, comp: 1.2, calc: 24.0, remarks: 'IEDC mentor for student startups', category: 'ExtraProactive' },

            // --- 4. FDPS & WORKSHOPS ---
            { faculty_id: 2, faculty_name: 'Grace Hopper', role_id: 'FDP01', role_name: 'FDPs & STTPs Conducted', task_id: 'FD01', task_name: 'Coordinator for AICTE/KTU 1-Week FDP', work_unit: 'Program', qty: 1, effort: 10.0, occ: 1, comp: 1.5, calc: 15.0, remarks: 'FDP on Cloud Native Architectures', category: 'FDP_Workshop' },
            { faculty_id: 3, faculty_name: 'Linus Torvalds', role_id: 'FDP02', role_name: 'Hands-on Workshops Conducted', task_id: 'FD03', task_name: 'Specialized 3-Day Technology Bootcamp', work_unit: 'Workshop', qty: 1, effort: 5.0, occ: 2, comp: 1.25, calc: 12.5, remarks: 'Kernel and Container Bootcamp', category: 'FDP_Workshop' },
            { faculty_id: 10, faculty_name: 'Dr. Jane Smith', role_id: 'FDP01', role_name: 'FDPs & STTPs Conducted', task_id: 'FD02', task_name: 'Co-Coordinator for State-level Pedagogical Workshop', work_unit: 'Program', qty: 1, effort: 6.0, occ: 2, comp: 1.25, calc: 15.0, remarks: 'Outcome-Based Education Workshop', category: 'FDP_Workshop' },
            { faculty_id: 11, faculty_name: 'Dr. Alan Walker', role_id: 'FDP02', role_name: 'Hands-on Workshops Conducted', task_id: 'FD04', task_name: 'Hands-on AI/ML Toolchain Lab Session', work_unit: 'Session', qty: 2, effort: 4.0, occ: 2, comp: 1.25, calc: 20.0, remarks: 'PyTorch & HuggingFace workshop', category: 'FDP_Workshop' },

            // --- 5. OWN RESEARCH WORKLOAD ---
            { faculty_id: 2, faculty_name: 'Grace Hopper', role_id: 'RES02', role_name: 'Doctoral & Masters Research Guidance', task_id: 'RS05', task_name: 'MCA Research Project & Dissertation Guide', work_unit: 'Student', qty: 6, effort: 2.0, occ: 6, comp: 1.25, calc: 90.0, remarks: '6 Final Semester MCA Projects', category: 'Research' },
            { faculty_id: 3, faculty_name: 'Linus Torvalds', role_id: 'RES03', role_name: 'Research Publications & Dissemination', task_id: 'RS07', task_name: 'Publication in SCI / IEEE Scopus Indexed Journal', work_unit: 'Paper', qty: 1, effort: 12.0, occ: 1, comp: 1.5, calc: 18.0, remarks: 'High-throughput OS virtualization paper', category: 'Research' },
            { faculty_id: 10, faculty_name: 'Dr. Jane Smith', role_id: 'RES01', role_name: 'Sponsored Research & Grants', task_id: 'RS01', task_name: 'Principal Investigator for Funded Research Project', work_unit: 'Project', qty: 1, effort: 15.0, occ: 2, comp: 1.5, calc: 45.0, remarks: 'DST-SERB Data Science Grant PI', category: 'Research' },
            { faculty_id: 11, faculty_name: 'Dr. Alan Walker', role_id: 'RES03', role_name: 'Research Publications & Dissemination', task_id: 'RS08', task_name: 'Conference Proceedings Publication (IEEE/Springer)', work_unit: 'Paper', qty: 2, effort: 6.0, occ: 1, comp: 1.25, calc: 15.0, remarks: 'Two IEEE conference papers accepted', category: 'Research' },

            // --- 6. CONSULTANCY ---
            { faculty_id: 2, faculty_name: 'Grace Hopper', role_id: 'CON01', role_name: 'Industrial Software Development', task_id: 'CN01', task_name: 'Industrial Software Product Architecture & Lead', work_unit: 'Project', qty: 1, effort: 10.0, occ: 2, comp: 1.5, calc: 30.0, remarks: 'State IT Mission ERP Architecture', category: 'Consultancy' },
            { faculty_id: 3, faculty_name: 'Linus Torvalds', role_id: 'CON02', role_name: 'Testing, Auditing & Quality Services', task_id: 'CN03', task_name: 'Cybersecurity Audit / Penetration Testing', work_unit: 'Audit', qty: 1, effort: 8.0, occ: 2, comp: 1.5, calc: 24.0, remarks: 'Banking core platform security audit', category: 'Consultancy' },
            { faculty_id: 10, faculty_name: 'Dr. Jane Smith', role_id: 'CON03', role_name: 'Corporate Training & Advisory', task_id: 'CN05', task_name: 'Corporate Technical Training Series (Industry)', work_unit: 'Module', qty: 2, effort: 6.0, occ: 1, comp: 1.25, calc: 15.0, remarks: 'Corporate Data Analytics Training for TCS', category: 'Consultancy' },
            { faculty_id: 11, faculty_name: 'Dr. Alan Walker', role_id: 'CON01', role_name: 'Industrial Software Development', task_id: 'CN02', task_name: 'Algorithm Optimization & Cloud Infrastructure Design', work_unit: 'Project', qty: 1, effort: 7.0, occ: 2, comp: 1.25, calc: 17.5, remarks: 'AWS cloud cost optimization consultancy', category: 'Consultancy' }
        ];

        for (const a of multiDomainAllocations) {
            await pool.query(`
                INSERT INTO faculty_department_workload
                (faculty_id, faculty_name, role_id, role_name, task_id, task_name, work_unit, quantity, std_effort, occurrences, complexity_factor, calculated_workload, remarks, category, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
            `, [
                a.faculty_id, a.faculty_name, a.role_id, a.role_name, a.task_id, a.task_name,
                a.work_unit, a.qty, a.effort, a.occ, a.comp, a.calc, a.remarks, a.category
            ]);
        }
        console.log(`   ✓ Seeded ${multiDomainAllocations.length} cross-domain allocations across all 6 categories.`);

        // 6. Seed Academic Courses, Subjects & Workload Tables
        console.log('\n6. Seeding Academic Courses, Subjects & Workload Tables...');
        // Clear old workload tables
        await pool.query(`TRUNCATE TABLE workload_master RESTART IDENTITY CASCADE`);
        await pool.query(`TRUNCATE TABLE teaching_loads RESTART IDENTITY CASCADE`);
        await pool.query(`TRUNCATE TABLE paper_and_assignment_setting RESTART IDENTITY CASCADE`);
        await pool.query(`TRUNCATE TABLE preparation_and_course_factors RESTART IDENTITY CASCADE`);
        await pool.query(`TRUNCATE TABLE evaluation_units RESTART IDENTITY CASCADE`);

        // Ensure MCA Course exists
        let mcaCourseRes = await pool.query(`SELECT id FROM courses WHERE name = 'Master of Computer Applications' LIMIT 1`);
        let mcaCourseId = mcaCourseRes.rows[0]?.id;
        if (!mcaCourseId) {
            const insC = await pool.query(`
                INSERT INTO courses (department_id, name, code)
                VALUES (2, 'Master of Computer Applications', 'MCA')
                RETURNING id
            `);
            mcaCourseId = insC.rows[0].id;
        }

        const simulatedClasses = [
            // Faculty 2: Grace Hopper (Experience: true -> multiplier 0.9)
            {
                faculty_id: 2, faculty_name: 'Grace Hopper', subject_name: 'Mathematical Foundations for Computing',
                course_type: 'Theory course embedded with tutorial & practical', ltpj: '2-1-2-0', role: 'Theory',
                students_class: 60, students_lab: 0, students_proj: 0, experience: true,
                teaching_units: 4.5, setting_units: 3.0, prep_units: 6.0, eval_units: 15.6, theory_hrs: 2, multiplier: 0.9
            },
            {
                faculty_id: 2, faculty_name: 'Grace Hopper', subject_name: 'Advanced Data Structures Lab',
                course_type: 'Theory course embedded with tutorial & practical', ltpj: '2-1-2-0', role: 'Lab In-Charge',
                students_class: 60, students_lab: 20, students_proj: 0, experience: true,
                teaching_units: 3.9, setting_units: 2.0, prep_units: 8.5, eval_units: 18.0, theory_hrs: 0, multiplier: 0.9
            },
            {
                faculty_id: 2, faculty_name: 'Grace Hopper', subject_name: 'Programming in Python',
                course_type: 'Project based course', ltpj: '2-0-2-2', role: 'Project In-Charge',
                students_class: 60, students_lab: 0, students_proj: 20, experience: true,
                teaching_units: 4.0, setting_units: 4.0, prep_units: 5.0, eval_units: 16.5, theory_hrs: 2, multiplier: 0.9
            },

            // Faculty 3: Linus Torvalds (Experience: false -> multiplier 1.0)
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds', subject_name: 'Computer Networks',
                course_type: 'Theory course embedded with tutorial', ltpj: '3-1-0-0', role: 'Theory',
                students_class: 60, students_lab: 0, students_proj: 0, experience: false,
                teaching_units: 3.5, setting_units: 5.0, prep_units: 6.0, eval_units: 20.4, theory_hrs: 3, multiplier: 1.0
            },
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds', subject_name: 'Linux Commands and Shell Scripting',
                course_type: 'Theory course embedded with practical without ESE', ltpj: '1-0-2-0', role: 'Lab In-Charge',
                students_class: 60, students_lab: 20, students_proj: 0, experience: true,
                teaching_units: 2.4, setting_units: 2.0, prep_units: 7.0, eval_units: 14.0, theory_hrs: 1, multiplier: 0.9
            },
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds', subject_name: 'Operating Systems Internals',
                course_type: 'Theory course embedded with practical', ltpj: '3-0-2-0', role: 'Theory',
                students_class: 60, students_lab: 0, students_proj: 0, experience: false,
                teaching_units: 4.0, setting_units: 4.0, prep_units: 6.0, eval_units: 19.2, theory_hrs: 3, multiplier: 1.0
            },

            // Faculty 10: Dr. Jane Smith (Experience: false -> multiplier 1.0)
            {
                faculty_id: 10, faculty_name: 'Dr. Jane Smith', subject_name: 'Advanced Database Management Systems',
                course_type: 'Theory course embedded with tutorial & practical', ltpj: '2-1-2-0', role: 'Theory',
                students_class: 85, students_lab: 0, students_proj: 0, experience: false, // Large class
                teaching_units: 5.5, setting_units: 5.0, prep_units: 6.0, eval_units: 28.5, theory_hrs: 2, multiplier: 1.0
            },
            {
                faculty_id: 10, faculty_name: 'Dr. Jane Smith', subject_name: 'Cloud Computing Architecture',
                course_type: 'Theory course embedded with tutorial', ltpj: '3-1-0-0', role: 'Theory',
                students_class: 60, students_lab: 0, students_proj: 0, experience: false,
                teaching_units: 3.5, setting_units: 5.0, prep_units: 6.0, eval_units: 20.4, theory_hrs: 3, multiplier: 1.0
            },
            {
                faculty_id: 10, faculty_name: 'Dr. Jane Smith', subject_name: 'Distributed Database Lab',
                course_type: 'Laboratory course', ltpj: '0-0-3-0', role: 'Lab',
                students_class: 60, students_lab: 20, students_proj: 0, experience: false,
                teaching_units: 2.5, setting_units: 1.0, prep_units: 7.0, eval_units: 15.0, theory_hrs: 0, multiplier: 1.0
            },
            {
                faculty_id: 10, faculty_name: 'Dr. Jane Smith', subject_name: 'Main Project Dissertation',
                course_type: 'Main Project', ltpj: '0-0-27-0', role: 'Project In-Charge',
                students_class: 60, students_lab: 0, students_proj: 20, experience: false,
                teaching_units: 6.0, setting_units: 2.0, prep_units: 5.0, eval_units: 18.0, theory_hrs: 0, multiplier: 1.0
            },

            // Faculty 11: Dr. Alan Walker (Experience: true -> multiplier 0.9)
            {
                faculty_id: 11, faculty_name: 'Dr. Alan Walker', subject_name: 'Advanced Software Engineering',
                course_type: 'Theory course embedded with tutorial', ltpj: '3-1-0-0', role: 'Theory',
                students_class: 60, students_lab: 0, students_proj: 0, experience: true,
                teaching_units: 3.5, setting_units: 5.0, prep_units: 6.0, eval_units: 20.4, theory_hrs: 3, multiplier: 0.9
            },
            {
                faculty_id: 11, faculty_name: 'Dr. Alan Walker', subject_name: 'Machine Learning & Deep Learning',
                course_type: 'Theory course embedded with practical', ltpj: '2-1-2-0', role: 'Theory',
                students_class: 60, students_lab: 0, students_proj: 0, experience: true,
                teaching_units: 4.5, setting_units: 4.0, prep_units: 6.0, eval_units: 18.0, theory_hrs: 2, multiplier: 0.9
            },
            {
                faculty_id: 11, faculty_name: 'Dr. Alan Walker', subject_name: 'AI Toolchain Laboratory',
                course_type: 'Laboratory course', ltpj: '0-0-3-0', role: 'Lab',
                students_class: 60, students_lab: 20, students_proj: 0, experience: true,
                teaching_units: 2.5, setting_units: 1.5, prep_units: 7.0, eval_units: 15.0, theory_hrs: 0, multiplier: 0.9
            },

            // Faculty 1: Dr. Alan Turing (HOD & Faculty, experience: true -> multiplier 0.9)
            {
                faculty_id: 1, faculty_name: 'Dr. Alan Turing', subject_name: 'Design and Analysis of Algorithms',
                course_type: 'Theory course embedded with tutorial', ltpj: '3-1-0-0', role: 'Theory',
                students_class: 60, students_lab: 0, students_proj: 0, experience: true,
                teaching_units: 3.5, setting_units: 5.0, prep_units: 6.0, eval_units: 20.4, theory_hrs: 3, multiplier: 0.9
            },
            {
                faculty_id: 1, faculty_name: 'Dr. Alan Turing', subject_name: 'Algorithms & Complexity Lab',
                course_type: 'Laboratory course', ltpj: '0-0-3-0', role: 'Lab In-Charge',
                students_class: 60, students_lab: 20, students_proj: 0, experience: true,
                teaching_units: 2.5, setting_units: 2.0, prep_units: 8.5, eval_units: 16.0, theory_hrs: 0, multiplier: 0.9
            }
        ];

        for (let i = 0; i < simulatedClasses.length; i++) {
            const c = simulatedClasses[i];
            // Find or insert subject
            let subRes = await pool.query(`SELECT id FROM subjects WHERE name = $1 AND course_id = $2 LIMIT 1`, [c.subject_name, mcaCourseId]);
            let subId = subRes.rows[0]?.id;
            if (!subId) {
                const uniqueCode = `MCA${101 + i}`;
                const insS = await pool.query(`
                    INSERT INTO subjects (course_id, name, code, semester)
                    VALUES ($1, $2, $3, 1)
                    ON CONFLICT (course_id, code) DO UPDATE SET name = EXCLUDED.name
                    RETURNING id
                `, [mcaCourseId, c.subject_name, uniqueCode]);
                subId = insS.rows[0].id;
            }

            // Link subject faculty
            await pool.query(`
                INSERT INTO subject_faculty (subject_id, faculty_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
            `, [subId, c.faculty_id]);

            // Insert into teaching_loads
            await pool.query(`
                INSERT INTO teaching_loads (subject_id, subject_name, faculty_id, faculty_name, students_in_class, theory_hours, lab_hours, project_hours, tutorial_hours, students_in_lab, students_in_project, subtotal_weighted_units, total_load)
                VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 1, $7, $8, $9, $9)
            `, [subId, c.subject_name, c.faculty_id, c.faculty_name, c.students_class, c.theory_hrs, c.students_lab, c.students_proj, c.teaching_units]);

            // Insert into paper_and_assignment_setting
            await pool.query(`
                INSERT INTO paper_and_assignment_setting (subject_id, subject_name, faculty_id, faculty_name, num_question_papers, num_assignments, num_question_bank, subtotal_setting_units)
                VALUES ($1, $2, $3, $4, 2, 2, 1, $5)
            `, [subId, c.subject_name, c.faculty_id, c.faculty_name, c.setting_units]);

            // Insert into preparation_and_course_factors
            await pool.query(`
                INSERT INTO preparation_and_course_factors (subject_id, subject_name, faculty_id, faculty_name, theory_subject_prep, theory_rubrics_prep, theory_copo_mapping, extra_additions, total_load)
                VALUES ($1, $2, $3, $4, 2, 2, 2, 0, $5)
            `, [subId, c.subject_name, c.faculty_id, c.faculty_name, c.prep_units]);

            // Insert into evaluation_units
            await pool.query(`
                INSERT INTO evaluation_units (subject_id, subject_name, faculty_id, faculty_name, series_answer_scripts, end_sem_answer_scripts, assignment_scripts, lab_output_evaluations, practical_exam_evals, subtotal_evaluation_units)
                VALUES ($1, $2, $3, $4, 60, 60, 120, 20, 20, $5)
            `, [subId, c.subject_name, c.faculty_id, c.faculty_name, c.eval_units]);

            // Compute grand total
            const rawTotal = c.teaching_units + c.setting_units + c.prep_units + c.eval_units;
            const grandTotal = parseFloat((rawTotal * c.multiplier).toFixed(2));

            // Insert into workload_master
            await pool.query(`
                INSERT INTO workload_master (subject_id, faculty_id, teaching_load_units, question_setting_units, prep_adjustment_units, evaluation_units, theory_hours_per_week, experience_multiplier, grand_total_workload_units, subject_name, faculty_name)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            `, [subId, c.faculty_id, c.teaching_units, c.setting_units, c.prep_units, c.eval_units, c.theory_hrs, c.multiplier, grandTotal, c.subject_name, c.faculty_name]);
        }
        console.log(`   ✓ Seeded ${simulatedClasses.length} academic courses & workload rows across 5 faculty.`);

        // 7. Seed Tasks for HOD Task Delegation & Workload Bars
        console.log('\n7. Seeding Active Tasks for HOD Task Governance (15 pts limit)...');
        await pool.query(`TRUNCATE TABLE tasks RESTART IDENTITY CASCADE`);

        const now = new Date();
        const formatDate = (daysOffset) => {
            const d = new Date(now);
            d.setDate(d.getDate() + daysOffset);
            return d.toISOString().split('T')[0];
        };

        const sampleTasks = [
            { assigned_to: 2, subject_id: 1, desc: 'Prepare NBA Criterion 4 Self Assessment Report', difficulty: 5, status: 'in_progress', scheduled: formatDate(-2), deadline: formatDate(5) },
            { assigned_to: 2, subject_id: 2, desc: 'Draft Series Exam 1 Question Paper for Algorithms', difficulty: 4, status: 'pending', scheduled: formatDate(0), deadline: formatDate(3) },
            { assigned_to: 3, subject_id: 2, desc: 'Setup OpenSource Linux Virtual Lab Images', difficulty: 6, status: 'in_progress', scheduled: formatDate(-3), deadline: formatDate(4) },
            { assigned_to: 10, subject_id: 3, desc: 'Coordinate NAAC Criterion 2 Curriculum Review', difficulty: 8, status: 'pending', scheduled: formatDate(1), deadline: formatDate(7) },
            { assigned_to: 10, subject_id: 1, desc: 'Conduct Second Internal Lab Evaluation', difficulty: 3, status: 'in_progress', scheduled: formatDate(-1), deadline: formatDate(2) },
            { assigned_to: 11, subject_id: 2, desc: 'Verify Student Attendance Shortage List', difficulty: 3, status: 'completed', scheduled: formatDate(-10), deadline: formatDate(-2) },
            { assigned_to: 11, subject_id: 3, desc: 'Draft End-Semester Practical Examination Schedule', difficulty: 5, status: 'pending', scheduled: formatDate(2), deadline: formatDate(6) },
            { assigned_to: 1, subject_id: 1, desc: 'Review Department Academic Audit Findings', difficulty: 4, status: 'in_progress', scheduled: formatDate(0), deadline: formatDate(4) }
        ];

        for (const t of sampleTasks) {
            await pool.query(`
                INSERT INTO tasks (created_by, assigned_to, subject_id, description, difficulty, status, scheduled_date, deadline)
                VALUES (1, $1, $2, $3, $4, $5, $6, $7)
            `, [t.assigned_to, t.subject_id, t.desc, t.difficulty, t.status, t.scheduled, t.deadline]);
        }
        console.log(`   ✓ Seeded ${sampleTasks.length} active tasks with varied difficulties.`);

        // 8. Seed Student Assignments & Submissions
        console.log('\n8. Seeding Student Assignments & Collision Data...');
        await pool.query(`TRUNCATE TABLE student_assignments RESTART IDENTITY CASCADE`);
        await pool.query(`TRUNCATE TABLE student_assignment_submissions RESTART IDENTITY CASCADE`);

        const sampleAssignments = [
            { course_id: mcaCourseId, subject_id: 1, semester: 1, title: 'Asymptotic Analysis & Master Theorem Problem Set', desc: 'Solve exercises 1 to 5 from chapter 3 of CLRS.', diff: 4, due: formatDate(3) },
            { course_id: mcaCourseId, subject_id: 2, semester: 1, title: 'Network Socket Programming in Python', desc: 'Implement multi-client chat server using TCP sockets.', diff: 5, due: formatDate(5) },
            { course_id: mcaCourseId, subject_id: 3, semester: 1, title: 'B-Tree & Indexing Operations in PostgreSQL', desc: 'Design execution plans and compare sequential vs index scan.', diff: 4, due: formatDate(8) }
        ];

        for (const a of sampleAssignments) {
            const insA = await pool.query(`
                INSERT INTO student_assignments (course_id, subject_id, semester, title, description, difficulty, due_date, faculty_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, 2)
                RETURNING id
            `, [a.course_id, a.subject_id, a.semester, a.title, a.desc, a.diff, a.due]);

            const assignId = insA.rows[0].id;
            // Distribute to students (id 4 and id 5)
            await pool.query(`
                INSERT INTO student_assignment_submissions (assignment_id, student_id, status)
                VALUES ($1, 4, 'pending'), ($1, 5, 'pending')
            `, [assignId]);
        }
        console.log(`   ✓ Seeded ${sampleAssignments.length} student assignments and student submission entries.`);

        console.log('\n====================================================');
        console.log('✅ ALL UNIFLOW TEST & GRAPH DATA SEEDED SUCCESSFULLY!');
        console.log('====================================================');
        console.log('• Total Academic Workload: 14 classes across 5 teachers');
        console.log('• Cross-Domain Workload: 24 duties across all 6 categories');
        console.log('• Active Tasks: 8 delegation tasks with 15-pt threshold tracking');
        console.log('• Student Assignments: 3 assignments with collision checking\n');
        process.exit(0);

    } catch (err) {
        console.error('❌ Seeding failed with error:', err);
        process.exit(1);
    }
}

seedAll();

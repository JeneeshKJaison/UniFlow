const pool = require('./src/config/db');
const WORKLOAD_CATALOGS = require('./src/config/workloadMasterCatalogs');

async function seedAllDomainsAndCurriculum() {
    try {
        console.log('--- Migrating & Seeding All Workload Domains and MCA Curriculum 2023 ---');

        // 1. Alter tables to support alphanumeric IDs and categories
        await pool.query(`
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

            -- Ensure unique constraint on (faculty_id, task_id) for ON CONFLICT queries
            DELETE FROM faculty_department_workload a USING faculty_department_workload b
            WHERE a.id < b.id AND a.faculty_id = b.faculty_id AND a.task_id = b.task_id;

            ALTER TABLE faculty_department_workload DROP CONSTRAINT IF EXISTS uq_faculty_task;
            ALTER TABLE faculty_department_workload ADD CONSTRAINT uq_faculty_task UNIQUE (faculty_id, task_id);
        `);
        console.log('✓ Constraints updated & category columns ready.');

        // 2. Populate department_roles_master & department_tasks_master from WORKLOAD_CATALOGS
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
            console.log(`✓ Seeded ${catData.roles.length} roles & ${catData.tasks.length} tasks for category [${categoryKey}]`);
        }

        // 3. Seed MCA Curriculum 2023 Course
        const mcaCourseRes = await pool.query(`
            INSERT INTO courses (department_id, name, code, total_semesters)
            VALUES (1, 'Master of Computer Applications (MCA 2023 Scheme)', 'MCA2023', 4)
            ON CONFLICT (code) DO UPDATE SET
                name = EXCLUDED.name,
                total_semesters = EXCLUDED.total_semesters
            RETURNING id
        `);
        const mcaCourseId = mcaCourseRes.rows[0].id;
        console.log(`✓ MCA 2023 Course registered with ID: ${mcaCourseId}`);

        // 4. Seed MCA Subjects
        const mcaSubjects = [
            // Semester 1
            { code: '23MCAJ101', name: 'Programming in Python', sem: 1, cred: 5, type: 'Project Based Course (PBC)', ltpj: '2-0-2-2' },
            { code: '23MCAP103', name: 'Mathematical Foundations for Computing', sem: 1, cred: 4, type: 'Program Core (PCC)', ltpj: '2-1-2-0' },
            { code: '23MCAP105', name: 'Advanced Data Structures', sem: 1, cred: 4, type: 'Program Core (PCC)', ltpj: '2-1-2-0' },
            { code: '23MCAT107', name: 'Computer Networks', sem: 1, cred: 4, type: 'Program Core (PCC)', ltpj: '3-1-0-0' },
            { code: '23MCAP109', name: 'Data Analytics and Visualization', sem: 1, cred: 2, type: 'Program Core (PCC)', ltpj: '1-0-2-0' },
            { code: '23MCAP111', name: 'Linux Commands and Shell Scripting', sem: 1, cred: 2, type: 'Program Core (PCC)', ltpj: '1-0-2-0' },
            { code: '23MCAP113', name: 'Professional Communication & Business Etiquettes', sem: 1, cred: 2, type: 'Program Core (PCC)', ltpj: '1-0-2-0' },

            // Semester 2
            { code: '23MCAJ202', name: 'Web Application Development', sem: 2, cred: 5, type: 'Project Based Course (PBC)', ltpj: '2-0-2-2' },
            { code: '23MCAP204', name: 'Object Oriented Programming (JAVA)', sem: 2, cred: 4, type: 'Program Core (PCC)', ltpj: '2-1-2-0' },
            { code: '23MCAP206', name: 'Advanced Database Management Systems', sem: 2, cred: 4, type: 'Program Core (PCC)', ltpj: '2-1-2-0' },
            { code: '23MCAE232', name: 'Design and Analysis of Algorithms', sem: 2, cred: 4, type: 'Professional Elective (PEC)', ltpj: '3-1-0-0' },
            { code: '23MCAP208', name: 'Cloud Computing', sem: 2, cred: 2, type: 'Program Core (PCC)', ltpj: '1-0-2-0' },
            { code: '23MCAP210', name: 'Applied Statistics with R', sem: 2, cred: 2, type: 'Program Core (PCC)', ltpj: '1-0-2-0' },
            { code: '23MCAP212', name: 'Virtualisation and Containers', sem: 2, cred: 2, type: 'Program Core (PCC)', ltpj: '1-0-2-0' },

            // Semester 3
            { code: '23MCAJ301', name: 'Machine Learning', sem: 3, cred: 5, type: 'Project Based Course (PBC)', ltpj: '2-0-2-2' },
            { code: '23MCAT302', name: 'Advanced Software Engineering', sem: 3, cred: 4, type: 'Program Core (PCC)', ltpj: '3-1-0-0' },
            { code: '23MCAE331', name: 'Artificial Intelligence', sem: 3, cred: 4, type: 'Professional Elective (PEC)', ltpj: '3-1-0-0' },
            { code: '23MCAE361', name: 'Deep Learning', sem: 3, cred: 4, type: 'Professional Elective (PEC)', ltpj: '3-1-0-0' },
            { code: '23MCAP305', name: 'Mobile Application Development (Flutter)', sem: 3, cred: 2, type: 'Program Core (PCC)', ltpj: '1-0-2-0' },
            { code: '23MCAT306', name: 'Cyber Security', sem: 3, cred: 2, type: 'Program Core (PCC)', ltpj: '2-0-0-0' },
            { code: '23MCAM307', name: 'Mini Project', sem: 3, cred: 3, type: 'Mini Project (MP)', ltpj: '0-0-6-0' },

            // Semester 4
            { code: '23MCAN402', name: 'Main Project (Research Project / Internship)', sem: 4, cred: 14, type: 'Main Project (PR)', ltpj: '0-0-27-0' },
            { code: '23MCAS404', name: 'Seminar and Technical Writing', sem: 4, cred: 1, type: 'Seminar (SR)', ltpj: '0-0-2-0' },
            { code: '23MCAC4XXX', name: 'Mandatory MOOC Course', sem: 4, cred: 2, type: 'Mandatory Course (MC)', ltpj: '0-0-0-0' }
        ];

        for (const s of mcaSubjects) {
            const subRes = await pool.query(`
                INSERT INTO subjects (course_id, name, code, semester, credits)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (course_id, code) DO UPDATE SET
                    name = EXCLUDED.name,
                    semester = EXCLUDED.semester,
                    credits = EXCLUDED.credits
                RETURNING id
            `, [mcaCourseId, s.name, s.code, s.sem, s.cred]);

            const subjectId = subRes.rows[0].id;

            // Map faculty to some core subjects (Grace Hopper: id 2, Linus Torvalds: id 3)
            if (['23MCAJ101', '23MCAP105', '23MCAJ202', '23MCAJ301', '23MCAN402'].includes(s.code)) {
                await pool.query(`
                    INSERT INTO subject_faculty (subject_id, faculty_id)
                    VALUES ($1, 2)
                    ON CONFLICT DO NOTHING
                `, [subjectId]);
            }
            if (['23MCAP111', '23MCAP208', '23MCAP212', '23MCAT306', '23MCAM307'].includes(s.code)) {
                await pool.query(`
                    INSERT INTO subject_faculty (subject_id, faculty_id)
                    VALUES ($1, 3)
                    ON CONFLICT DO NOTHING
                `, [subjectId]);
            }
        }
        console.log(`✓ Seeded ${mcaSubjects.length} MCA 2023 Scheme curriculum subjects.`);

        // 5. Seed diverse sample allocations for Grace Hopper (id 2) and Linus Torvalds (id 3)
        // so all categories have representative data!
        const sampleAllocations = [
            // Institutional Work for Grace Hopper
            {
                faculty_id: 2, faculty_name: 'Grace Hopper',
                role_id: 'INS01', role_name: 'Internal Quality Assurance Cell (IQAC)',
                task_id: 'INST02', task_name: 'NAAC / NBA Institutional Criteria Lead',
                work_unit: 'Criterion', qty: 2, effort: 6.0, occ: 4, comp: 1.5,
                calc: 72.0, remarks: 'Criteria 2 & 5 Lead for Autonomous NBA', category: 'Institutional'
            },
            {
                faculty_id: 2, faculty_name: 'Grace Hopper',
                role_id: 'INS02', role_name: 'College Examination Cell',
                task_id: 'INST07', task_name: 'Chief Superintendent / University Exam Officer',
                work_unit: 'Session', qty: 1, effort: 3.5, occ: 8, comp: 1.25,
                calc: 35.0, remarks: 'Autonomous MCA Semester End Exams Duty', category: 'Institutional'
            },
            // Extra Work Proactively
            {
                faculty_id: 2, faculty_name: 'Grace Hopper',
                role_id: 'EXT01', role_name: 'Student Technical Clubs & Chapters',
                task_id: 'EX02', task_name: 'Organizing Hackathons / 24-hr Coding Contests',
                work_unit: 'Event', qty: 1, effort: 6.0, occ: 2, comp: 1.5,
                calc: 18.0, remarks: 'Annual TKMCE National Hackathon Convener', category: 'ExtraProactive'
            },
            // FDPs & Workshops
            {
                faculty_id: 2, faculty_name: 'Grace Hopper',
                role_id: 'FDP01', role_name: 'FDPs & STTPs Conducted',
                task_id: 'FD01', task_name: 'Coordinator for AICTE/KTU Approved 1-Week or 2-Week FDP',
                work_unit: 'Program', qty: 1, effort: 10.0, occ: 1, comp: 1.5,
                calc: 15.0, remarks: '1-Week FDP on Cloud Native Architectures', category: 'FDP_Workshop'
            },
            // Research Workload
            {
                faculty_id: 2, faculty_name: 'Grace Hopper',
                role_id: 'RES02', role_name: 'Doctoral & Masters Research Guidance',
                task_id: 'RS05', task_name: 'MCA / M.Tech Research Project & Dissertation Guide [23MCAN402]',
                work_unit: 'Student/Team', qty: 6, effort: 2.0, occ: 12, comp: 1.25,
                calc: 180.0, remarks: '6 Final Semester MCA Projects [23MCAN402]', category: 'Research'
            },
            // Consultancy
            {
                faculty_id: 2, faculty_name: 'Grace Hopper',
                role_id: 'CON01', role_name: 'Industrial Software Development',
                task_id: 'CN01', task_name: 'Industrial Software Product Architecture & Lead Developer',
                work_unit: 'Project', qty: 1, effort: 10.0, occ: 2, comp: 1.5,
                calc: 30.0, remarks: 'Kerala State IT Mission ERP Architecture Consulting', category: 'Consultancy'
            },

            // Linus Torvalds sample allocations
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds',
                role_id: 'INS04', role_name: 'Campus Life & Student Welfare',
                task_id: 'INST13', task_name: 'Anti-Ragging Squad / Committee Convener',
                work_unit: 'Inspection', qty: 1, effort: 2.0, occ: 8, comp: 1.25,
                calc: 20.0, remarks: 'Campus Anti-Ragging squad patrols', category: 'Institutional'
            },
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds',
                role_id: 'EXT02', role_name: 'Tech Fests & Symposia',
                task_id: 'EX06', task_name: 'Open Source / Linux Users Group (LUG) Mentorship',
                work_unit: 'Workshop', qty: 2, effort: 3.0, occ: 4, comp: 1.0,
                calc: 24.0, remarks: 'Campus Open-Source Club hands-on mentoring', category: 'ExtraProactive'
            },
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds',
                role_id: 'FDP02', role_name: 'Hands-on Workshops Conducted',
                task_id: 'FD03', task_name: 'Organizing 2-3 Day Specialized Technology Bootcamp',
                work_unit: 'Workshop', qty: 1, effort: 5.0, occ: 2, comp: 1.25,
                calc: 12.5, remarks: 'Kernel and Container Internals Bootcamp', category: 'FDP_Workshop'
            },
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds',
                role_id: 'RES03', role_name: 'Research Publications & Dissemination',
                task_id: 'RS07', task_name: 'Publication in SCI / SCIE / Scopus Q1/Q2 Indexed Journal',
                work_unit: 'Paper', qty: 1, effort: 12.0, occ: 1, comp: 1.5,
                calc: 18.0, remarks: 'High-throughput OS virtualization paper in IEEE Trans', category: 'Research'
            },
            {
                faculty_id: 3, faculty_name: 'Linus Torvalds',
                role_id: 'CON02', role_name: 'Testing, Auditing & Quality Services',
                task_id: 'CN03', task_name: 'Cybersecurity Audit / Web Application Penetration Testing',
                work_unit: 'Audit', qty: 1, effort: 8.0, occ: 2, comp: 1.5,
                calc: 24.0, remarks: 'Banking core platform security penetration testing', category: 'Consultancy'
            }
        ];

        for (const a of sampleAllocations) {
            await pool.query(`
                INSERT INTO faculty_department_workload
                (faculty_id, faculty_name, role_id, role_name, task_id, task_name, work_unit, quantity, std_effort, occurrences, complexity_factor, calculated_workload, remarks, category, updated_at)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_TIMESTAMP)
                ON CONFLICT (faculty_id, task_id) DO UPDATE SET
                    role_name = EXCLUDED.role_name,
                    task_name = EXCLUDED.task_name,
                    work_unit = EXCLUDED.work_unit,
                    quantity = EXCLUDED.quantity,
                    std_effort = EXCLUDED.std_effort,
                    occurrences = EXCLUDED.occurrences,
                    complexity_factor = EXCLUDED.complexity_factor,
                    calculated_workload = EXCLUDED.calculated_workload,
                    remarks = EXCLUDED.remarks,
                    category = EXCLUDED.category,
                    updated_at = CURRENT_TIMESTAMP
            `, [
                a.faculty_id, a.faculty_name, a.role_id, a.role_name, a.task_id, a.task_name,
                a.work_unit, a.qty, a.effort, a.occ, a.comp, a.calc, a.remarks, a.category
            ]);
        }
        console.log(`✓ Seeded sample cross-domain workload allocations.`);

        console.log('✅ All domains and MCA curriculum 2023 seeded successfully!');
        process.exit(0);
    } catch (err) {
        console.error('❌ Seeding error:', err);
        process.exit(1);
    }
}

seedAllDomainsAndCurriculum();

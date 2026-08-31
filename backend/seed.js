const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');

const users = [
    {
        id: 8,
        customId: 'ADM001',
        name: 'UniFlow Administrator',
        email: 'admin@uniflow.edu',
        password: 'admin123',
        role: 'admin',
        isHod: false
    },
    {
        id: 1,
        customId: 'HOD-CS01',
        name: 'Dr. Alan Turing',
        email: 'hod.cs@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: true
    },
    {
        id: 6,
        customId: 'HOD-ME02',
        name: 'Dr. Nikola Tesla',
        email: 'hod.me@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: true
    },
    {
        id: 7,
        customId: 'HOD-EE03',
        name: 'Dr. Marie Curie',
        email: 'hod.ee@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: true
    },
    {
        id: 2,
        customId: 'FAC001',
        name: 'Grace Hopper',
        email: 'faculty@uniflow.edu',
        password: 'faculty123',
        role: 'faculty',
        isHod: false
    },
    {
        id: 3,
        customId: 'FAC002',
        name: 'Linus Torvalds',
        email: 'linus@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: false
    },
    {
        id: 4,
        customId: 'STU001',
        name: 'Ada Lovelace',
        email: 'student@uniflow.edu',
        password: 'student123',
        role: 'student',
        isHod: false
    },
    {
        id: 5,
        customId: 'STU002',
        name: 'Tim Berners-Lee',
        email: 'tim@uniflow.edu',
        password: 'password123',
        role: 'student',
        isHod: false
    }
];

const departments = [
    { id: 1, code: 'DEP-CS01', name: 'Computer Science', hodUserId: 1 },
    { id: 2, code: 'DEP-ME02', name: 'Mechanical Engineering', hodUserId: 6 },
    { id: 3, code: 'DEP-EE03', name: 'Electrical Engineering', hodUserId: 7 },
    { id: 4, code: 'DEP-CE04', name: 'Civil Engineering', hodUserId: null }
];

const userDepartments = [
    { userId: 1, departmentId: 1 },
    { userId: 2, departmentId: 1 },
    { userId: 3, departmentId: 1 },
    { userId: 4, departmentId: 1 },
    { userId: 5, departmentId: 1 },
    { userId: 6, departmentId: 2 },
    { userId: 7, departmentId: 3 }
];

async function seed() {
    try {
        console.log('--- Seeding UniFlow Database ---');

        // 1. Seed Users
        console.log('Seeding Users...');
        for (const user of users) {
            const passwordHash = await bcrypt.hash(user.password, 10);
            await pool.query(
                `
                INSERT INTO users (id, custom_id, name, email, password_hash, role, is_hod)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id)
                DO UPDATE SET
                    custom_id = EXCLUDED.custom_id,
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    is_hod = EXCLUDED.is_hod
                `,
                [user.id, user.customId, user.name, user.email, passwordHash, user.role, user.isHod]
            );
            console.log(`  ✓ User: ${user.email} (${user.name})`);
        }

        await pool.query(`
            SELECT setval(
                pg_get_serial_sequence('users', 'id'),
                COALESCE((SELECT MAX(id) FROM users), 1)
            )
        `);

        // 2. Seed Departments
        console.log('Seeding Departments...');
        for (const dept of departments) {
            await pool.query(
                `
                INSERT INTO departments (id, code, name, hod_user_id)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id)
                DO UPDATE SET
                    code = EXCLUDED.code,
                    name = EXCLUDED.name,
                    hod_user_id = EXCLUDED.hod_user_id
                `,
                [dept.id, dept.code, dept.name, dept.hodUserId]
            );
            console.log(`  ✓ Department: ${dept.code} - ${dept.name}`);
        }

        await pool.query(`
            SELECT setval(
                pg_get_serial_sequence('departments', 'id'),
                COALESCE((SELECT MAX(id) FROM departments), 1)
            )
        `);

        // 3. Seed User Departments
        console.log('Seeding User Departments...');
        for (const ud of userDepartments) {
            await pool.query(
                `
                INSERT INTO user_departments (user_id, department_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                `,
                [ud.userId, ud.departmentId]
            );
        }

        // 4. Seed Courses
        console.log('Seeding Courses...');
        const courses = [
            { departmentId: 1, name: 'B.Tech Computer Science and Engineering', code: 'CSE', totalSemesters: 8 },
            { departmentId: 2, name: 'B.Tech Mechanical Engineering', code: 'ME', totalSemesters: 8 },
            { departmentId: 3, name: 'B.Tech Electrical Engineering', code: 'EEE', totalSemesters: 8 },
            { departmentId: 4, name: 'B.Tech Civil Engineering', code: 'CE', totalSemesters: 8 }
        ];

        const courseMap = {};
        for (const c of courses) {
            const courseRes = await pool.query(
                `
                INSERT INTO courses (department_id, name, code, total_semesters)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (code)
                DO UPDATE SET
                    department_id = EXCLUDED.department_id,
                    name = EXCLUDED.name,
                    total_semesters = EXCLUDED.total_semesters
                RETURNING id, code
                `,
                [c.departmentId, c.name, c.code, c.totalSemesters]
            );
            courseMap[c.code] = courseRes.rows[0].id;
            console.log(`  ✓ Course: ${c.code} (ID: ${courseRes.rows[0].id}) - ${c.name}`);
        }

        const cseCourseId = courseMap['CSE'];

        // 5. Seed Subjects
        console.log('Seeding Subjects...');
        const subjects = [
            { id: 1, courseId: cseCourseId, name: 'Data Structures & Algorithms', code: 'CS201', semester: 3, credits: 4 },
            { id: 2, courseId: cseCourseId, name: 'Operating Systems', code: 'CS301', semester: 5, credits: 4 },
            { id: 3, courseId: cseCourseId, name: 'Database Management Systems', code: 'CS302', semester: 5, credits: 4 },
            { id: 4, courseId: cseCourseId, name: 'Computer Networks', code: 'CS303', semester: 5, credits: 4 },
            { id: 5, courseId: cseCourseId, name: 'Artificial Intelligence & Machine Learning', code: 'CS401', semester: 7, credits: 4 },
            { id: 6, courseId: cseCourseId, name: 'Discrete Mathematics', code: 'CS101', semester: 1, credits: 3 }
        ];

        for (const s of subjects) {
            await pool.query(
                `
                INSERT INTO subjects (id, course_id, name, code, semester, credits)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (id)
                DO UPDATE SET
                    course_id = EXCLUDED.course_id,
                    name = EXCLUDED.name,
                    code = EXCLUDED.code,
                    semester = EXCLUDED.semester,
                    credits = EXCLUDED.credits
                `,
                [s.id, s.courseId, s.name, s.code, s.semester, s.credits]
            );
            console.log(`  ✓ Subject: ${s.code} - ${s.name}`);
        }

        await pool.query(`
            SELECT setval(
                pg_get_serial_sequence('subjects', 'id'),
                COALESCE((SELECT MAX(id) FROM subjects), 1)
            )
        `);

        // 6. Seed Subject Faculty Mapping
        console.log('Seeding Subject-Faculty Allocations...');
        const subjectFaculty = [
            { subjectId: 1, facultyId: 2 }, // Grace Hopper -> DSA
            { subjectId: 1, facultyId: 3 }, // Linus Torvalds -> DSA
            { subjectId: 2, facultyId: 2 }, // Grace Hopper -> OS
            { subjectId: 2, facultyId: 3 }, // Linus Torvalds -> OS
            { subjectId: 3, facultyId: 2 }, // Grace Hopper -> DBMS
            { subjectId: 3, facultyId: 3 }, // Linus Torvalds -> DBMS
            { subjectId: 4, facultyId: 2 }, // Grace Hopper -> Networks
            { subjectId: 4, facultyId: 3 }, // Linus Torvalds -> Networks
            { subjectId: 5, facultyId: 2 }, // Grace Hopper -> AI & ML
            { subjectId: 5, facultyId: 3 }, // Linus Torvalds -> AI & ML
            { subjectId: 6, facultyId: 2 }, // Grace Hopper -> Discrete Math
            { subjectId: 6, facultyId: 3 }  // Linus Torvalds -> Discrete Math
        ];

        await pool.query('DELETE FROM subject_faculty');
        for (const sf of subjectFaculty) {
            await pool.query(
                `
                INSERT INTO subject_faculty (subject_id, faculty_id)
                VALUES ($1, $2)
                ON CONFLICT DO NOTHING
                `,
                [sf.subjectId, sf.facultyId]
            );
        }
        console.log(`  ✓ Seeded ${subjectFaculty.length} subject-faculty allocations.`);

        console.log('\n=========================================');
        console.log('Database successfully seeded with all initial data!');
        console.log('=========================================\n');

    } catch (error) {
        console.error('Seeding failed:', error);
    } finally {
        await pool.end();
    }
}

seed();
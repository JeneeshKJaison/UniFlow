const pool = require('./src/config/db');

async function clearAll() {
    try {
        console.log('====================================================');
        console.log('  UNIFLOW RESET: CLEARING ALL SEEDED WORKLOAD DATA');
        console.log('====================================================\n');

        console.log('Wiping workload tables, tasks, and allocations...');

        await pool.query('TRUNCATE TABLE workload_master RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE teaching_loads RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE paper_and_assignment_setting RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE preparation_and_course_factors RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE evaluation_units RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE faculty_department_workload RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE student_assignment_submissions RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE student_assignments RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE tasks RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE subject_faculty RESTART IDENTITY CASCADE');
        await pool.query('TRUNCATE TABLE subjects RESTART IDENTITY CASCADE');

        console.log('✓ Successfully wiped:');
        console.log('  - workload_master');
        console.log('  - teaching_loads');
        console.log('  - paper_and_assignment_setting');
        console.log('  - preparation_and_course_factors');
        console.log('  - evaluation_units');
        console.log('  - faculty_department_workload (all 6 categories)');
        console.log('  - student_assignments & submissions');
        console.log('  - tasks (delegation workload)');
        console.log('  - subjects & subject_faculty');
        console.log('\n✅ Database is now clean! Run `npm run seed` to repopulate fresh data anytime.\n');
        process.exit(0);

    } catch (err) {
        console.error('❌ Error clearing seed data:', err);
        process.exit(1);
    }
}

clearAll();

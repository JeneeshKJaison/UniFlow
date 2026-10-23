const pool = require('./src/config/db');
const initWorkloadTables = require('./src/config/initWorkloadTables');

async function seedDepartmentWorkload() {
    try {
        console.log('--- Initializing Department Workload Master Tables ---');
        await initWorkloadTables();

        // Check if sample faculty department workload exists
        const countRes = await pool.query('SELECT COUNT(*) FROM faculty_department_workload');
        if (parseInt(countRes.rows[0].count) > 0) {
            console.log(`faculty_department_workload already has ${countRes.rows[0].count} entries.`);
            return;
        }

        console.log('Populating initial demonstration department workload for faculty members...');

        // Find users for Grace Hopper (FAC001), John Doe (FAC002), Jane Smith (FAC003)
        const usersRes = await pool.query(`SELECT id, custom_id, name, email FROM users WHERE role = 'faculty' AND is_hod = false ORDER BY id ASC`);
        const users = usersRes.rows;

        if (users.length === 0) {
            console.log('No faculty users found in DB to attach sample workload.');
            return;
        }

        // Map faculty members (Grace Hopper or first faculty, second faculty, etc.)
        const facA = users[0]; // e.g. Grace Hopper
        const facB = users.length > 1 ? users[1] : users[0]; // e.g. John Doe / Linus
        const facC = users.length > 2 ? users[2] : users[0]; // e.g. Jane Smith

        // Sample task allocations as defined in the spec PDF:
        const sampleAllocations = [
            // Faculty A (Total: 64.35 hrs, 5 tasks)
            {
                faculty_id: facA.id,
                faculty_name: facA.name,
                role_id: 'R07',
                role_name: 'Faculty Advisor',
                task_id: 'T001',
                task_name: 'Attendance monitoring',
                work_unit: 'Student',
                quantity: 45,
                std_effort: 0.03,
                occurrences: 16,
                complexity_factor: 1.0,
                calculated_workload: 21.60,
                remarks: 'Example: 45 advisees'
            },
            {
                faculty_id: facA.id,
                faculty_name: facA.name,
                role_id: 'R07',
                role_name: 'Faculty Advisor',
                task_id: 'T002',
                task_name: 'Student counselling / progress review',
                work_unit: 'Student',
                quantity: 45,
                std_effort: 0.08,
                occurrences: 4,
                complexity_factor: 1.25,
                calculated_workload: 18.00,
                remarks: 'Example only'
            },
            {
                faculty_id: facA.id,
                faculty_name: facA.name,
                role_id: 'R07',
                role_name: 'Faculty Advisor',
                task_id: 'T003',
                task_name: 'Parent / PTA meeting',
                work_unit: 'Meeting',
                quantity: 1,
                std_effort: 1.5,
                occurrences: 2,
                complexity_factor: 1.5,
                calculated_workload: 4.50,
                remarks: 'Example: 1 parent meeting; 2 occurrences'
            },
            {
                faculty_id: facA.id,
                faculty_name: facA.name,
                role_id: 'R11',
                role_name: 'Lab In-charge',
                task_id: 'T036',
                task_name: 'Equipment / stock verification',
                work_unit: 'Lab',
                quantity: 1,
                std_effort: 3.0,
                occurrences: 2,
                complexity_factor: 1.5,
                calculated_workload: 9.00,
                remarks: 'Example: 1 lab'
            },
            {
                faculty_id: facA.id,
                faculty_name: facA.name,
                role_id: 'R11',
                role_name: 'Lab In-charge',
                task_id: 'T037',
                task_name: 'Maintenance coordination',
                work_unit: 'Maintenance event',
                quantity: 1,
                std_effort: 0.75,
                occurrences: 12,
                complexity_factor: 1.25,
                calculated_workload: 11.25,
                remarks: 'Example: 12 maintenance events'
            },

            // Faculty B (Total: 30.00 hrs, 2 tasks)
            {
                faculty_id: facB.id,
                faculty_name: facB.name,
                role_id: 'R03',
                role_name: 'DQAC',
                task_id: 'T008',
                task_name: 'Academic audit / result analysis',
                work_unit: 'Audit',
                quantity: 1,
                std_effort: 5.0,
                occurrences: 2,
                complexity_factor: 1.5,
                calculated_workload: 15.00,
                remarks: 'Example: 1 department audit activity'
            },
            {
                faculty_id: facB.id,
                faculty_name: facB.name,
                role_id: 'R03',
                role_name: 'DQAC',
                task_id: 'T011',
                task_name: 'AQAR/SSR/SAR/quality report preparation',
                work_unit: 'Report',
                quantity: 1,
                std_effort: 5.0,
                occurrences: 2,
                complexity_factor: 1.5,
                calculated_workload: 15.00,
                remarks: 'Example: report cycle'
            },

            // Faculty C (Total: 102.75 hrs, 2 tasks)
            {
                faculty_id: facC.id,
                faculty_name: facC.name,
                role_id: 'R09',
                role_name: 'Department Placement Coordinator',
                task_id: 'T028',
                task_name: 'Placement eligibility verification',
                work_unit: 'Student',
                quantity: 120,
                std_effort: 0.03,
                occurrences: 2,
                complexity_factor: 1.25,
                calculated_workload: 9.00,
                remarks: 'Example: 120 students'
            },
            {
                faculty_id: facC.id,
                faculty_name: facC.name,
                role_id: 'R09',
                role_name: 'Department Placement Coordinator',
                task_id: 'T029',
                task_name: 'Placement training attendance/report',
                work_unit: 'Session',
                quantity: 10,
                std_effort: 0.75,
                occurrences: 10,
                complexity_factor: 1.25,
                calculated_workload: 93.75,
                remarks: 'Example: 10 training sessions'
            }
        ];

        for (const item of sampleAllocations) {
            await pool.query(
                `INSERT INTO faculty_department_workload 
                 (faculty_id, faculty_name, role_id, role_name, task_id, task_name, work_unit, quantity, std_effort, occurrences, complexity_factor, calculated_workload, remarks)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                 ON CONFLICT (faculty_id, task_id) DO UPDATE SET
                   quantity = EXCLUDED.quantity,
                   std_effort = EXCLUDED.std_effort,
                   occurrences = EXCLUDED.occurrences,
                   complexity_factor = EXCLUDED.complexity_factor,
                   calculated_workload = EXCLUDED.calculated_workload,
                   remarks = EXCLUDED.remarks,
                   updated_at = CURRENT_TIMESTAMP`,
                [
                    item.faculty_id, item.faculty_name, item.role_id, item.role_name,
                    item.task_id, item.task_name, item.work_unit, item.quantity,
                    item.std_effort, item.occurrences, item.complexity_factor,
                    item.calculated_workload, item.remarks
                ]
            );
        }

        console.log(`✓ Seeded ${sampleAllocations.length} sample department workload entries.`);
    } catch (err) {
        console.error('Error seeding department workload:', err);
    } finally {
        await pool.end();
    }
}

seedDepartmentWorkload();

const pool = require('./src/config/db');
const bcrypt = require('bcryptjs');
const http = require('http');

// Utility for making HTTP POST requests
function post(path, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const options = {
            hostname: 'localhost',
            port: 5000,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        };
        if (token) options.headers['Authorization'] = 'Bearer ' + token;

        const req = http.request(options, res => {
            let resData = '';
            res.on('data', d => resData += d);
            res.on('end', () => {
                try { resolve({ status: res.statusCode, data: JSON.parse(resData) }); } 
                catch(e) { resolve({ status: res.statusCode, data: resData }); }
            });
        });
        req.on('error', error => reject(error));
        req.write(data);
        req.end();
    });
}

const newTeachers = [
    { customId: 'FAC002', name: 'Dr. John Doe', email: 'john@uniflow.edu', password: 'faculty123', role: 'faculty', isHod: false },
    { customId: 'FAC003', name: 'Dr. Jane Smith', email: 'jane@uniflow.edu', password: 'faculty123', role: 'faculty', isHod: false },
    { customId: 'FAC004', name: 'Dr. Alan Walker', email: 'alan@uniflow.edu', password: 'faculty123', role: 'faculty', isHod: false }
];

async function simulate() {
    try {
        console.log('--- STARTING WORKLOAD SIMULATION ---');

        // 1. Create the new teachers in the DB
        console.log('\\n1. Creating 3 new faculty members...');
        const salt = await bcrypt.genSalt(10);
        for (const teacher of newTeachers) {
            const check = await pool.query('SELECT * FROM users WHERE custom_id = $1', [teacher.customId]);
            if (check.rows.length === 0) {
                const hashed = await bcrypt.hash(teacher.password, salt);
                await pool.query(
                    'INSERT INTO users (custom_id, name, email, password_hash, role, is_hod) VALUES ($1, $2, $3, $4, $5, $6)',
                    [teacher.customId, teacher.name, teacher.email, hashed, teacher.role, teacher.isHod]
                );
                console.log(`Created: ${teacher.name}`);
            } else {
                console.log(`Already exists: ${teacher.name}`);
                // Ensure the email matches what we're going to login with
                await pool.query('UPDATE users SET email = $1, password_hash = $2 WHERE custom_id = $3', [teacher.email, await bcrypt.hash(teacher.password, salt), teacher.customId]);
            }
        }

        // 2. Login to get JWT tokens for all 4 teachers (including the existing one)
        console.log('\\n2. Authenticating 4 teachers to get API tokens...');
        const allTeacherEmails = ['faculty@uniflow.edu', 'john@uniflow.edu', 'jane@uniflow.edu', 'alan@uniflow.edu'];
        const tokens = [];
        
        for (const email of allTeacherEmails) {
            const loginRes = await post('/api/auth/login', { email, password: 'faculty123' });
            if (loginRes.status === 200 && loginRes.data.token) {
                tokens.push(loginRes.data.token);
                console.log(`Successfully logged in: ${email}`);
            } else {
                console.error(`Failed to login ${email}:`, loginRes.data);
                process.exit(1);
            }
        }

        // Helper function to simulate submitting the form
        async function assignClass(tokenIndex, role, programName, subjectName, semester, courseType, ltpjCode, studentsClass, studentsInLab, studentsInProject, priorExperience, labModification) {
            console.log(`Assigning ${subjectName} [${role}] to Teacher ${tokenIndex + 1}...`);
            const res = await post('/api/workload/classes', {
                programName, subjectName, semester, courseType, ltpjCode, role, studentsClass, studentsInLab, studentsInProject, priorExperience, labModification
            }, tokens[tokenIndex]);

            if (res.status === 200 || res.status === 201) {
                console.log(`   ✓ Success!`);
            } else {
                console.log(`   X Failed:`, res.data);
            }
        }

        // 3. Simulate assigning Theory Courses (Distributed individually)
        console.log('\\n3. Simulating Theory Classes (Randomly assigning Prior Experience)...');
        await assignClass(0, 'Theory', 'MCA', 'Mathematical Foundations for Computing', 1, 'Theory course embedded with tutorial & practical', '2-1-2-0', 60, 0, 0, true, false);
        await assignClass(1, 'Theory', 'MCA', 'Computer Networks', 1, 'Theory course embedded with tutorial', '3-1-0-0', 60, 0, 0, false, false);
        await assignClass(2, 'Theory', 'MCA', 'Advanced Database Management Systems', 2, 'Theory course embedded with tutorial & practical', '2-1-2-0', 85, 0, 0, true, false); // 85 students triggers Large Class Adjustment
        await assignClass(3, 'Theory', 'MCA', 'Advanced Software Engineering', 3, 'Theory course embedded with tutorial', '3-1-0-0', 60, 0, 0, false, false);

        // 4. Simulate assigning Lab Courses (Split among 3 teachers, 20 students each)
        console.log('\\n4. Simulating Lab Classes (Split among 3 teachers, 20 students each)...');
        // Advanced Data Structures Lab
        await assignClass(0, 'Lab In-Charge', 'MCA', 'Advanced Data Structures', 1, 'Theory course embedded with tutorial & practical', '2-1-2-0', 60, 20, 0, true, true); // Made modifications!
        await assignClass(1, 'Lab', 'MCA', 'Advanced Data Structures', 1, 'Theory course embedded with tutorial & practical', '2-1-2-0', 60, 20, 0, false, false);
        await assignClass(2, 'Lab', 'MCA', 'Advanced Data Structures', 1, 'Theory course embedded with tutorial & practical', '2-1-2-0', 60, 20, 0, false, false);

        // Linux Commands Lab
        await assignClass(1, 'Lab In-Charge', 'MCA', 'Linux Commands and Shell Scripting', 1, 'Theory course embedded with practical without ESE', '1-0-2-0', 60, 20, 0, true, false); // No modifications
        await assignClass(2, 'Lab', 'MCA', 'Linux Commands and Shell Scripting', 1, 'Theory course embedded with practical without ESE', '1-0-2-0', 60, 20, 0, true, false);
        await assignClass(3, 'Lab', 'MCA', 'Linux Commands and Shell Scripting', 1, 'Theory course embedded with practical without ESE', '1-0-2-0', 60, 20, 0, false, false);

        // 5. Simulate assigning Project Courses (Split among 3 teachers, 20 students each)
        console.log('\\n5. Simulating Project Classes (Split among 3 teachers, 20 students each)...');
        // Programming in Python
        await assignClass(0, 'Project In-Charge', 'MCA', 'Programming in Python', 1, 'Project based course', '2-0-2-2', 60, 0, 20, true, false);
        await assignClass(2, 'Project', 'MCA', 'Programming in Python', 1, 'Project based course', '2-0-2-2', 60, 0, 20, false, false);
        await assignClass(3, 'Project', 'MCA', 'Programming in Python', 1, 'Project based course', '2-0-2-2', 60, 0, 20, true, false);
        
        // Main Project (Semester 4)
        await assignClass(1, 'Project In-Charge', 'MCA', 'Main Project (Research Project/Internship)', 4, 'Main Project', '0-0-27-0', 60, 0, 20, true, false);
        await assignClass(2, 'Project', 'MCA', 'Main Project (Research Project/Internship)', 4, 'Main Project', '0-0-27-0', 60, 0, 20, true, false);
        await assignClass(3, 'Project', 'MCA', 'Main Project (Research Project/Internship)', 4, 'Main Project', '0-0-27-0', 60, 0, 20, false, false);

        console.log('\\n--- SIMULATION COMPLETE ---');
        console.log('You can now open pgAdmin and view the `workload_master` table to see the final calculated weights!');
        process.exit(0);

    } catch (error) {
        console.error('Simulation failed:', error);
        process.exit(1);
    }
}

simulate();

const pool = require("../config/db");

const WORKLOAD_THRESHOLD = 120;

const getOverallFacultyWorkload = async (db, facultyId) => {
    const result = await db.query(
        `
        SELECT
            COALESCE((
                SELECT SUM(grand_total_workload_units)
                FROM workload_master
                WHERE faculty_id = $1
            ), 0)
            + COALESCE((
                SELECT SUM(calculated_workload)
                FROM faculty_department_workload
                WHERE faculty_id = $1
            ), 0)
            + COALESCE((
                SELECT SUM(COALESCE(estimated_hours, difficulty, 0))
                FROM tasks
                WHERE assigned_to = $1
                  AND (status IS NULL OR LOWER(status) != 'completed')
            ), 0) AS current_workload
        `,
        [facultyId]
    );
    return Number(result.rows[0]?.current_workload || 0);
};


// =====================================================
// 1. GET ALL SUBJECTS (Optionally filtered by department or faculty)
// =====================================================

const getSubjects = async (req, res) => {
    try {
        const { faculty_id, course_id, semester } = req.query;
        const currentUserId = req.user?.userId || req.user?.id;

        let query = `
            SELECT 
                s.id,
                s.name,
                s.code,
                s.semester,
                s.credits,
                s.course_id,
                c.name AS course_name,
                c.department_id,
                d.name AS department_name,
                COALESCE(
                    json_agg(
                        json_build_object('id', u.id, 'name', u.name, 'email', u.email)
                    ) FILTER (WHERE u.id IS NOT NULL),
                    '[]'
                ) AS faculty
            FROM subjects s
            JOIN courses c ON s.course_id = c.id
            JOIN departments d ON c.department_id = d.id
            LEFT JOIN subject_faculty sf ON s.id = sf.subject_id
            LEFT JOIN users u ON sf.faculty_id = u.id
            WHERE 1=1
        `;
        const params = [];

        if (faculty_id) {
            params.push(parseInt(faculty_id));
            query += ` AND s.id IN (SELECT subject_id FROM subject_faculty WHERE faculty_id = $${params.length})`;
        }

        if (course_id) {
            params.push(parseInt(course_id));
            query += ` AND s.course_id = $${params.length}`;
        }

        if (semester) {
            params.push(parseInt(semester));
            query += ` AND s.semester = $${params.length}`;
        }

        if (req.user?.isHod && currentUserId && !faculty_id) {
            const deptRes = await pool.query(
                `SELECT id FROM departments WHERE hod_user_id = $1 UNION SELECT department_id FROM user_departments WHERE user_id = $1`,
                [currentUserId]
            );
            if (deptRes.rows.length > 0) {
                const deptIds = deptRes.rows.map(r => r.id);
                params.push(deptIds);
                query += ` AND c.department_id = ANY($${params.length})`;
            }
        }

        query += ` GROUP BY s.id, c.name, c.department_id, d.name ORDER BY s.semester ASC, s.name ASC`;

        const result = await pool.query(query, params);

        return res.status(200).json({
            success: true,
            subjects: result.rows
        });

    } catch (error) {
        console.error("Get subjects error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching subjects."
        });
    }
};


// =====================================================
// 2. GET FACULTY LIST (with active current workload)
// =====================================================

const getFaculty = async (req, res) => {
    try {
        const query = `
            SELECT 
                u.id,
                u.custom_id,
                u.name,
                u.email,
                u.role,
                u.is_hod,
                COALESCE(
                    (
                        SELECT SUM(COALESCE(t.estimated_hours, t.difficulty, 0))
                        FROM tasks t
                        WHERE t.assigned_to = u.id
                          AND (t.status IS NULL OR LOWER(t.status) != 'completed')
                    ),
                    0
                )
                + COALESCE((SELECT SUM(grand_total_workload_units) FROM workload_master WHERE faculty_id = u.id), 0)
                + COALESCE((SELECT SUM(calculated_workload) FROM faculty_department_workload WHERE faculty_id = u.id), 0)
                AS total_active_workload,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object('id', s.id, 'name', s.name, 'code', s.code, 'semester', s.semester)
                    ) FILTER (WHERE s.id IS NOT NULL),
                    '[]'
                ) AS assigned_subjects
            FROM users u
            LEFT JOIN subject_faculty sf ON u.id = sf.faculty_id
            LEFT JOIN subjects s ON sf.subject_id = s.id
            WHERE u.role = 'faculty' AND u.is_hod = false
            GROUP BY u.id, u.custom_id, u.name, u.email, u.role, u.is_hod
            ORDER BY u.name ASC
        `;
        const result = await pool.query(query);

        return res.status(200).json({
            success: true,
            faculty: result.rows,
            threshold: WORKLOAD_THRESHOLD
        });
    } catch (error) {
        console.error("Get faculty error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching faculty members."
        });
    }
};


// =====================================================
// 3. GET ACTIVE TASKS
// =====================================================

const getTasks = async (req, res) => {
    try {
        const result = await pool.query(
            `
            SELECT 
                t.id,
                t.created_by,
                t.assigned_to,
                t.subject_id,
                t.description,
                t.difficulty,
                t.estimated_hours,
                COALESCE(t.estimated_hours, t.difficulty, 0) AS workload_points,
                t.assignment_type,
                t.category_name,
                t.deadline,
                t.scheduled_date,
                t.status,
                t.created_at,
                u_creator.name AS creator_name,
                u_assignee.name AS assignee_name,
                u_assignee.email AS assignee_email,
                s.name AS subject_name,
                s.code AS subject_code
            FROM tasks t
            LEFT JOIN users u_creator ON t.created_by = u_creator.id
            LEFT JOIN users u_assignee ON t.assigned_to = u_assignee.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            ORDER BY t.deadline ASC, t.id DESC
            `
        );

        return res.status(200).json({
            success: true,
            tasks: result.rows
        });
    } catch (error) {
        console.error("Get tasks error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while fetching tasks."
        });
    }
};


// =====================================================
// 4. INTELLIGENT WORKLOAD SUGGESTION ENGINE
// =====================================================

const suggestTask = async (req, res) => {
    try {
        const {
            assignment_type,
            category_name,
            subject_id,
            assigned_to,
            description,
            estimated_hours,
            deadline,
            scheduled_date
        } = req.body;
        if (!['subject', 'other'].includes(assignment_type)) {
            return res.status(400).json({ success: false, message: "Select either subject-related work or other work." });
        }
        const assignmentType = assignment_type;
        const facultyId = Number(assigned_to);
        const subjectId = subject_id ? Number(subject_id) : null;
        const hours = Number(estimated_hours);
        const startDate = scheduled_date;
        const endDate = deadline || scheduled_date;

        if (!Number.isInteger(facultyId) || facultyId < 1 ||
            !description?.trim() || !Number.isFinite(hours) || hours <= 0 ||
            !startDate || !category_name?.trim() ||
            (assignmentType === 'subject' && (!Number.isInteger(subjectId) || subjectId < 1))) {
            return res.status(400).json({
                success: false,
                message: "Provide a faculty member, category, description, positive estimated hours, and scheduled date. Subject-related work also requires a subject."
            });
        }
        if (Number.isNaN(Date.parse(startDate)) || Number.isNaN(Date.parse(endDate)) ||
            new Date(endDate) < new Date(startDate)) {
            return res.status(400).json({
                success: false,
                message: "The deadline must be on or after the scheduled date."
            });
        }

        const durationDays = Math.round((Date.parse(endDate) - Date.parse(startDate)) / 86400000);
        const facultyInfo = await pool.query(
            `SELECT id, name, email FROM users WHERE id = $1 AND role = 'faculty' AND is_hod = false`,
            [facultyId]
        );
        if (!facultyInfo.rows.length) {
            return res.status(400).json({ success: false, message: "Select an assignable faculty member." });
        }
        const facultyName = facultyInfo.rows[0].name;

        const [currentWorkload, workloadResult] = await Promise.all([
            getOverallFacultyWorkload(pool, facultyId),
            pool.query(
            `
            SELECT COALESCE(
                    json_agg(
                        json_build_object(
                            'id', t.id,
                            'description', t.description,
                            'workload_points', COALESCE(t.estimated_hours, t.difficulty, 0),
                            'estimated_hours', t.estimated_hours,
                            'scheduled_date', t.scheduled_date,
                            'deadline', t.deadline,
                            'status', t.status
                        )
                    ) FILTER (WHERE t.id IS NOT NULL),
                    '[]'
                ) AS overlapping_tasks
            FROM tasks t
            WHERE t.assigned_to = $1
              AND (t.status IS NULL OR LOWER(t.status) != 'completed')
              AND t.scheduled_date <= $3::date
              AND COALESCE(t.deadline, t.scheduled_date) >= $2::date
            `,
            [facultyId, startDate, endDate]
            )
        ]);

        const overlappingTasks = workloadResult.rows[0]?.overlapping_tasks || [];
        const resultingWorkload = currentWorkload + hours;

        const altDatesResult = await pool.query(
            `
            SELECT 
                TO_CHAR(d::date, 'YYYY-MM-DD') AS alternative_scheduled_date,
                TO_CHAR((d::date + $4 * INTERVAL '1 day')::date, 'YYYY-MM-DD') AS alternative_deadline,
                COALESCE((SELECT SUM(grand_total_workload_units) FROM workload_master WHERE faculty_id = $1), 0)
                + COALESCE((SELECT SUM(calculated_workload) FROM faculty_department_workload WHERE faculty_id = $1), 0)
                + COALESCE((
                    SELECT SUM(COALESCE(t.estimated_hours, t.difficulty, 0))
                    FROM tasks t
                    WHERE t.assigned_to = $1
                      AND (t.status IS NULL OR LOWER(t.status) != 'completed')
                      AND t.scheduled_date <= (d::date + $4 * INTERVAL '1 day')::date
                      AND COALESCE(t.deadline, t.scheduled_date) >= d::date
                ), 0) AS existing_workload
            FROM generate_series(
                $2::date + INTERVAL '1 day',
                $2::date + INTERVAL '30 days',
                INTERVAL '1 day'
            ) AS d
            WHERE COALESCE((SELECT SUM(grand_total_workload_units) FROM workload_master WHERE faculty_id = $1), 0)
                + COALESCE((SELECT SUM(calculated_workload) FROM faculty_department_workload WHERE faculty_id = $1), 0)
                + COALESCE((
                    SELECT SUM(COALESCE(t.estimated_hours, t.difficulty, 0))
                    FROM tasks t
                    WHERE t.assigned_to = $1
                      AND (t.status IS NULL OR LOWER(t.status) != 'completed')
                      AND t.scheduled_date <= (d::date + $4 * INTERVAL '1 day')::date
                      AND COALESCE(t.deadline, t.scheduled_date) >= d::date
                ), 0) + $3 <= $5
            ORDER BY existing_workload ASC, d ASC
            LIMIT 4
            `,
            [facultyId, startDate, hours, durationDays, WORKLOAD_THRESHOLD]
        );

        const alternativeDates = altDatesResult.rows.map(r => ({
            scheduled_date: r.alternative_scheduled_date,
            deadline: r.alternative_deadline,
            existing_workload: Number(r.existing_workload),
            resulting_workload: Number(r.existing_workload) + hours
        }));

        const altFacultyResult = await pool.query(
            `
            SELECT 
                u.id,
                u.name,
                u.email,
                COALESCE((SELECT SUM(grand_total_workload_units) FROM workload_master WHERE faculty_id = u.id), 0)
                + COALESCE((SELECT SUM(calculated_workload) FROM faculty_department_workload WHERE faculty_id = u.id), 0)
                + COALESCE((
                    SELECT SUM(COALESCE(t.estimated_hours, t.difficulty, 0))
                    FROM tasks t
                    WHERE t.assigned_to = u.id
                      AND (t.status IS NULL OR LOWER(t.status) != 'completed')
                ), 0) AS current_workload,
                (
                    SELECT COUNT(*) 
                    FROM subject_faculty sf 
                    WHERE sf.subject_id = $2::int AND sf.faculty_id = u.id
                ) > 0 AS teaches_subject
            FROM users u
            WHERE u.role = 'faculty'
              AND u.is_hod = false
              AND u.id != $1
              AND (
                  $3 = 'other'
                  OR u.id IN (SELECT sf.faculty_id FROM subject_faculty sf WHERE sf.subject_id = $2::int)
                  OR
                  u.id IN (
                      SELECT ud.user_id FROM user_departments ud
                      WHERE ud.department_id IN (
                          SELECT ud2.department_id FROM user_departments ud2 WHERE ud2.user_id = $4
                          UNION
                          SELECT c.department_id FROM subjects s JOIN courses c ON s.course_id = c.id WHERE s.id = $2::int
                      )
                  )
              )
            GROUP BY u.id, u.name, u.email
            HAVING COALESCE((SELECT SUM(grand_total_workload_units) FROM workload_master WHERE faculty_id = u.id), 0)
                + COALESCE((SELECT SUM(calculated_workload) FROM faculty_department_workload WHERE faculty_id = u.id), 0)
                + COALESCE((
                    SELECT SUM(COALESCE(t.estimated_hours, t.difficulty, 0))
                    FROM tasks t
                    WHERE t.assigned_to = u.id
                      AND (t.status IS NULL OR LOWER(t.status) != 'completed')
                ), 0) + $5 <= $6
            ORDER BY teaches_subject DESC, current_workload ASC, u.name ASC
            LIMIT 5
            `,
            [facultyId, subjectId, assignmentType, req.user?.userId || req.user?.id || 0, hours, WORKLOAD_THRESHOLD]
        );

        const alternativeFaculty = altFacultyResult.rows.map(f => ({
            id: f.id,
            name: f.name,
            email: f.email,
            current_workload: Number(f.current_workload),
            resulting_workload: Number(f.current_workload) + hours,
            teaches_subject: f.teaches_subject
        }));

        const canAssign = resultingWorkload <= WORKLOAD_THRESHOLD;

        return res.status(200).json({
            success: true,
            can_assign: canAssign,
            message: canAssign
                ? `${facultyName} is available for this assignment.`
                : `This assignment would exceed the ${WORKLOAD_THRESHOLD}-point workload threshold.`,
            selected_faculty: {
                id: facultyId,
                name: facultyName,
                current_workload: currentWorkload,
                estimated_hours: hours,
                added_workload_points: hours,
                resulting_workload: resultingWorkload
            },
            overlapping_tasks: overlappingTasks,
            threshold: WORKLOAD_THRESHOLD,
            task: {
                assignment_type: assignmentType,
                category_name: category_name.trim(),
                subject_id: assignmentType === 'subject' ? subjectId : null,
                assigned_to: facultyId,
                description: description.trim(),
                estimated_hours: hours,
                deadline: deadline || null,
                scheduled_date: startDate
            },
            recommendations: {
                alternative_dates: alternativeDates,
                alternative_faculty: alternativeFaculty
            }
        });

    } catch (error) {
        console.error("Suggest task error:", error);
        return res.status(500).json({
            success: false,
            message: error.code === '42703'
                ? "Task database columns are outdated. Apply the task migration and restart the backend."
                : "Server error while calculating workload capacity. Check the backend logs for details."
        });
    }
};


// =====================================================
// 5. FINAL TASK ASSIGNMENT (Strict Threshold Enforcement)
// =====================================================

const assignTask = async (req, res) => {
    const client = await pool.connect();
    let transactionStarted = false;
    try {
        const {
            assignment_type,
            category_name,
            subject_id,
            assigned_to,
            description,
            estimated_hours,
            deadline,
            scheduled_date
        } = req.body;

        const created_by = req.user?.userId || req.user?.id;

        if (!created_by) {
            return res.status(401).json({
                success: false,
                message: "Authentication expired. Please login again."
            });
        }

        if (!['subject', 'other'].includes(assignment_type)) {
            return res.status(400).json({ success: false, message: "Select either subject-related work or other work." });
        }
        const assignmentType = assignment_type;
        const facultyId = Number(assigned_to);
        const subjectId = subject_id ? Number(subject_id) : null;
        const hours = Number(estimated_hours);
        if (!Number.isInteger(facultyId) || facultyId < 1 ||
            !description?.trim() || !Number.isFinite(hours) || hours <= 0 ||
            !scheduled_date || !category_name?.trim() ||
            (assignmentType === 'subject' && (!Number.isInteger(subjectId) || subjectId < 1))) {
            return res.status(400).json({
                success: false,
                message: "Provide a faculty member, category, description, positive estimated hours, and scheduled date. Subject-related work also requires a subject."
            });
        }
        const endDate = deadline || scheduled_date;
        if (Number.isNaN(Date.parse(scheduled_date)) || Number.isNaN(Date.parse(endDate)) ||
            new Date(endDate) < new Date(scheduled_date)) {
            return res.status(400).json({
                success: false,
                message: "The deadline must be on or after the scheduled date."
            });
        }

        await client.query('BEGIN');
        transactionStarted = true;
        const facultyResult = await client.query(
            `SELECT id FROM users WHERE id = $1 AND role = 'faculty' AND is_hod = false FOR UPDATE`,
            [facultyId]
        );
        if (!facultyResult.rows.length) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(400).json({ success: false, message: "Select an assignable faculty member." });
        }

        const currentWorkload = await getOverallFacultyWorkload(client, facultyId);
        const resultingWorkload = currentWorkload + hours;

        if (resultingWorkload > WORKLOAD_THRESHOLD) {
            await client.query('ROLLBACK');
            transactionStarted = false;
            return res.status(409).json({
                success: false,
                can_assign: false,
                message: `Workload limit exceeded. Current overall workload is ${currentWorkload.toFixed(2)} points; adding ${hours} hours (${hours} points) would reach ${resultingWorkload.toFixed(2)} points (maximum ${WORKLOAD_THRESHOLD}).`,
                current_workload: currentWorkload,
                requested_hours: hours,
                resulting_workload: resultingWorkload,
                threshold: WORKLOAD_THRESHOLD
            });
        }

        const taskResult = await client.query(
            `
            INSERT INTO tasks (
                created_by,
                assigned_to,
                subject_id,
                assignment_type,
                category_name,
                description,
                estimated_hours,
                difficulty,
                deadline,
                scheduled_date,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, NULL, $8, $9, $10)
            RETURNING *
            `,
            [
                created_by,
                facultyId,
                assignmentType === 'subject' ? subjectId : null,
                assignmentType,
                category_name.trim(),
                description.trim(),
                hours,
                deadline || null,
                scheduled_date,
                "approved"
            ]
        );
        await client.query('COMMIT');
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: "Task approved and assigned successfully.",
            task: taskResult.rows[0],
            workload: {
                previous: currentWorkload,
                added_hours: hours,
                added_workload_points: hours,
                total: resultingWorkload,
                threshold: WORKLOAD_THRESHOLD
            }
        });

    } catch (error) {
        if (transactionStarted) {
            await client.query('ROLLBACK').catch(rollbackError => {
                console.error("Task assignment rollback error:", rollbackError);
            });
        }
        console.error("Assign task error:", error);
        return res.status(500).json({
            success: false,
            message: error.code === '23503'
                ? "The selected faculty, creator, or subject is no longer available. Refresh the page and try again."
                : error.code === '42703'
                    ? "Task database columns are outdated. Apply the task migration and restart the backend."
                    : "Server error while assigning task. Check the backend logs for details."
        });
    } finally {
        client.release();
    }
};

// =====================================================
// 6. ADD A NEW CLASS (Faculty manually adding assigned class)
// =====================================================

const addClass = async (req, res) => {
    const client = await pool.connect();
    try {
        const { programName, semester, courseType, ltpjCode, role, subjectName, subjectCode } = req.body;
        const currentUserId = req.user?.userId || req.user?.id;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        await client.query('BEGIN');

        // 1. Find or create the course (Program)
        let courseResult = await client.query(
            `SELECT id FROM courses WHERE name ILIKE $1 LIMIT 1`,
            [programName]
        );

        let courseId;
        if (courseResult.rows.length > 0) {
            courseId = courseResult.rows[0].id;
        } else {
            // Determine department_id from current user if possible
            const deptRes = await client.query(
                `SELECT department_id FROM user_departments WHERE user_id = $1 LIMIT 1`,
                [currentUserId]
            );
            const deptId = deptRes.rows.length > 0 ? deptRes.rows[0].department_id : 1; // fallback to 1

            // Create new course with a unique code to prevent unique constraint violations
            const genericCode = `GEN-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
            const newCourseRes = await client.query(
                `INSERT INTO courses (department_id, name, code, total_semesters) VALUES ($1, $2, $3, $4) RETURNING id`,
                [deptId, programName, genericCode, 8] // Default generic code and 8 semesters
            );
            courseId = newCourseRes.rows[0].id;
        }

        // 2. Insert the subject
        const codeToUse = subjectCode || `SUB-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        const subjectRes = await client.query(
            `INSERT INTO subjects (course_id, name, code, semester, credits, course_type, ltpj_code) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [courseId, subjectName || 'Custom Subject', codeToUse, semester, 3, courseType, ltpjCode] // default 3 credits
        );
        const subjectId = subjectRes.rows[0].id;

        // 3. Link subject to faculty
        await client.query(
            `INSERT INTO subject_faculty (subject_id, faculty_id, role) VALUES ($1, $2, $3)
             ON CONFLICT (subject_id, faculty_id) DO UPDATE SET role = EXCLUDED.role`,
            [subjectId, currentUserId, role || 'Theory']
        );

        // 4. Calculate workloads and populate tracking tables
        const { studentsInLab, studentsInProject, priorExperience, labModification, studentsClass: bodyStudentsClass } = req.body;
        const [l, t, p, j] = (ltpjCode || '0-0-0-0').split('-').map(Number);
        
        const theoryHours = l || 0;
        const tutorialHours = t || 0;
        const labHours = p || 0;
        const projectHours = j || 0;
        const studentsClass = bodyStudentsClass || 60; 
        const studentsLab = parseInt(studentsInLab) || 0;
        const studentsProject = parseInt(studentsInProject) || 0;
        
        // Calculate weighted loads based on exact formulas provided by the user
        const weightedTheory = theoryHours;
        const weightedLab = labHours * 0.5;
        const weightedProject = projectHours * 0.5;
        const weightedTutorial = tutorialHours * 0.5;
        const weightedStudentsLab = studentsLab * 0.02;
        const weightedStudentsProject = studentsProject * 0.05;

        // Large class adjustment
        const largeClassAdjustment = studentsClass > 80 ? 1.0 : 0;

        const subtotalWeighted = weightedTheory + weightedLab + weightedProject + weightedTutorial + weightedStudentsLab + weightedStudentsProject + largeClassAdjustment;
        const totalLoad = subtotalWeighted;

        // 5. Calculate Question/Assignment Setting Units
        let numQuestionPapers = 0;
        if (ltpjCode === '2-0-0-0' || ltpjCode === '2-0-2-2') numQuestionPapers = 2;
        else if (ltpjCode === '1-0-2-0') numQuestionPapers = 1;
        else if (ltpjCode === '3-1-0-0' || ltpjCode === '2-1-2-0') numQuestionPapers = 3;

        let numAssignments = 2;
        if (['3-1-0-0', '2-1-2-0', '2-0-2-2'].includes(ltpjCode)) {
            numAssignments = 4;
        }

        const subtotalSettingUnits = (numQuestionPapers * 1) + (numAssignments * 0.5);

        // 6. Calculate Preparation Adjustment Units
        let prepTheorySubject = 0, prepTheoryRubrics = 0, prepTheoryCopo = 0;
        let prepLabExp = 0, prepLabRubrics = 0, prepLabEvalSheets = 0, prepLabCopo = 0;
        let prepProjRubrics = 0, prepProjEvalSheets = 0, prepProjCopo = 0, prepProjScheduling = 0;
        let subtotalPrepUnits = 0;

        if (role === 'Theory') {
            prepTheorySubject = 1; prepTheoryRubrics = 1; prepTheoryCopo = 1;
            subtotalPrepUnits = (1 * 2) + (1 * 2) + (1 * 2); // 6 units
        } else if (role === 'Lab') {
            prepLabExp = 1; prepLabRubrics = 1; prepLabEvalSheets = 1; prepLabCopo = 1;
            const labModWeight = labModification ? 2 : 0.5; 
            subtotalPrepUnits = (1 * 2) + (1 * 2) + (1 * 0.5) + (1 * 2) + labModWeight;
        } else if (role === 'Project') {
            prepProjRubrics = 1; prepProjEvalSheets = 1; prepProjCopo = 1; prepProjScheduling = 1;
            subtotalPrepUnits = (1 * 2) + (1 * 0.5) + (1 * 2) + (1 * 0.5); // 5 units
        }

        const experienceMultiplier = priorExperience ? 0.9 : 1.0;

        // 7. Calculate Evaluation Units
        const seriesExams = 2; // Assuming 2 series exams per semester
        let endSemScripts = 0;
        
        // If course doesn't have ESE or is purely project/seminar, it has 0 end sem scripts
        const courseTypeLower = (courseType || '').toLowerCase();
        if (!courseTypeLower.includes('without ese') && !courseTypeLower.includes('project') && !courseTypeLower.includes('seminar')) {
            endSemScripts = studentsClass; // 1 ESE script per student
        }

        const seriesScripts = seriesExams * studentsClass;
        const assignmentScriptsTotal = numAssignments * studentsClass;
        const labOutputs = studentsLab * 10; // Assuming 10 weekly lab outputs
        const practicalExams = studentsLab; 
        const vivaVoce = studentsProject; 
        const projectEvals = studentsProject;

        const weightedSeriesScripts = seriesScripts * 0.05;
        const weightedEndSemScripts = endSemScripts * 0.08;
        const weightedAssignmentScripts = assignmentScriptsTotal * 0.02;
        const weightedLabOutputs = labOutputs * 0.05;
        const weightedPracticalExams = practicalExams * 0.1;
        const weightedVivaVoce = vivaVoce * 0.15;
        const weightedProjectEvals = projectEvals * 0.15;

        const subtotalEvalUnits = weightedSeriesScripts + weightedEndSemScripts + weightedAssignmentScripts + weightedLabOutputs + weightedPracticalExams + weightedVivaVoce + weightedProjectEvals;

        // Fetch faculty name for easier viewing in pgAdmin
        const userRes = await client.query('SELECT name FROM users WHERE id = $1', [currentUserId]);
        const facultyName = userRes.rows[0] ? userRes.rows[0].name : 'Unknown Faculty';
        const finalSubjectName = subjectName || 'Custom Subject';

        await client.query(
            `INSERT INTO teaching_loads 
             (subject_id, subject_name, faculty_id, faculty_name, students_in_class, theory_hours, lab_hours, project_hours, tutorial_hours, students_in_lab, students_in_project, subtotal_weighted_units, total_load)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
             [subjectId, finalSubjectName, currentUserId, facultyName, studentsClass, theoryHours, labHours, projectHours, tutorialHours, studentsLab, studentsProject, subtotalWeighted, totalLoad]
        );

        await client.query(
            `INSERT INTO paper_and_assignment_setting 
             (subject_id, subject_name, faculty_id, faculty_name, num_question_papers, num_assignments, num_question_bank, subtotal_setting_units)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
             [subjectId, finalSubjectName, currentUserId, facultyName, numQuestionPapers, numAssignments, 0, subtotalSettingUnits]
        );

        await client.query(
            `INSERT INTO preparation_and_course_factors 
             (subject_id, subject_name, faculty_id, faculty_name, theory_subject_prep, theory_rubrics_prep, theory_copo_mapping, lab_experiments_prep, lab_rubrics_prep, lab_eval_sheets_prep, lab_copo_mapping, project_rubrics_prep, project_eval_sheets_prep, project_copo_mapping, project_scheduling, extra_additions, total_load)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
             [subjectId, finalSubjectName, currentUserId, facultyName, prepTheorySubject, prepTheoryRubrics, prepTheoryCopo, prepLabExp, prepLabRubrics, prepLabEvalSheets, prepLabCopo, prepProjRubrics, prepProjEvalSheets, prepProjCopo, prepProjScheduling, 0, subtotalPrepUnits]
        );

        await client.query(
            `INSERT INTO evaluation_units 
             (subject_id, subject_name, faculty_id, faculty_name, series_answer_scripts, end_sem_answer_scripts, assignment_scripts, lab_output_evaluations, practical_exam_evals, viva_voce_count, project_evaluations, subtotal_evaluation_units)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
             [subjectId, finalSubjectName, currentUserId, facultyName, seriesScripts, endSemScripts, assignmentScriptsTotal, labOutputs, practicalExams, vivaVoce, projectEvals, subtotalEvalUnits]
        );

        const grandTotal = (totalLoad + subtotalSettingUnits + subtotalPrepUnits + subtotalEvalUnits) * experienceMultiplier;

        await client.query(
            `INSERT INTO workload_master 
             (subject_id, subject_name, faculty_id, faculty_name, teaching_load_units, question_setting_units, prep_adjustment_units, evaluation_units, theory_hours_per_week, experience_multiplier, grand_total_workload_units)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
             [subjectId, finalSubjectName, currentUserId, facultyName, totalLoad, subtotalSettingUnits, subtotalPrepUnits, subtotalEvalUnits, theoryHours, experienceMultiplier, grandTotal]
        );

        await client.query('COMMIT');

        return res.status(200).json({
            success: true,
            message: "Class added successfully."
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Add class error:", error);
        return res.status(500).json({
            success: false,
            message: error.message || "Server error while adding class."
        });
    } finally {
        client.release();
    }
};


// =====================================================
// 7. GET HOD SUMMARY DATA
// =====================================================

const getHodSummary = async (req, res) => {
    try {
        const masterRes = await pool.query('SELECT * FROM workload_master ORDER BY faculty_name, subject_name');
        const teachingRes = await pool.query('SELECT * FROM teaching_loads ORDER BY faculty_name, subject_name');
        const paperRes = await pool.query('SELECT * FROM paper_and_assignment_setting ORDER BY faculty_name, subject_name');
        const prepRes = await pool.query('SELECT * FROM preparation_and_course_factors ORDER BY faculty_name, subject_name');
        const evalRes = await pool.query('SELECT * FROM evaluation_units ORDER BY faculty_name, subject_name');

        return res.status(200).json({
            success: true,
            workload_master: masterRes.rows,
            teaching_loads: teachingRes.rows,
            paper_and_assignment_setting: paperRes.rows,
            preparation_and_course_factors: prepRes.rows,
            evaluation_units: evalRes.rows
        });
    } catch (error) {
        console.error("Get HOD summary error:", error);
        return res.status(500).json({ success: false, message: "Server error" });
    }
};

// =====================================================
// 8. GET DEPARTMENT & DOMAIN WORKLOAD MASTER (Roles & Tasks)
// =====================================================

const WORKLOAD_CATALOGS = require('../config/workloadMasterCatalogs');

const getWorkloadCatalogs = (req, res) => {
    return res.status(200).json({
        success: true,
        catalogs: WORKLOAD_CATALOGS
    });
};

const getDepartmentMaster = async (req, res) => {
    try {
        const { category } = req.query;
        let rolesQuery = 'SELECT * FROM department_roles_master';
        let tasksQuery = 'SELECT * FROM department_tasks_master';
        const params = [];

        if (category && category !== 'all') {
            params.push(category);
            rolesQuery += ' WHERE category = $1';
            tasksQuery += ' WHERE category = $1';
        }

        rolesQuery += ' ORDER BY id ASC';
        tasksQuery += ' ORDER BY role_id ASC, id ASC';

        const rolesRes = await pool.query(rolesQuery, params);
        const tasksRes = await pool.query(tasksQuery, params);

        return res.status(200).json({
            success: true,
            roles: rolesRes.rows,
            tasks: tasksRes.rows,
            catalogs: WORKLOAD_CATALOGS
        });
    } catch (error) {
        console.error("Get department master error:", error);
        return res.status(500).json({ success: false, message: "Server error while fetching master data." });
    }
};

// =====================================================
// 9. GET FACULTY WORKLOAD (Multi-Domain / Category Filtered)
// =====================================================

const getFacultyDepartmentWorkload = async (req, res) => {
    try {
        const facultyId = req.user.userId;
        const { category } = req.query;

        let query = `
            SELECT 
                id,
                faculty_id,
                faculty_name,
                role_id,
                role_name,
                task_id,
                task_name,
                work_unit,
                quantity,
                std_effort,
                occurrences,
                complexity_factor,
                calculated_workload,
                remarks,
                category,
                created_at,
                updated_at
             FROM faculty_department_workload
             WHERE faculty_id = $1
        `;
        const params = [facultyId];

        if (category && category !== 'all') {
            params.push(category);
            query += ` AND category = $${params.length}`;
        }

        query += ` ORDER BY category ASC, role_id ASC, task_id ASC`;

        const result = await pool.query(query, params);

        // Also compute category breakdown across ALL allocations for this faculty
        const allRes = await pool.query(
            `SELECT category, calculated_workload FROM faculty_department_workload WHERE faculty_id = $1`,
            [facultyId]
        );

        const categoryBreakdown = {
            Department: { hours: 0, count: 0 },
            Institutional: { hours: 0, count: 0 },
            ExtraProactive: { hours: 0, count: 0 },
            FDP_Workshop: { hours: 0, count: 0 },
            Research: { hours: 0, count: 0 },
            Consultancy: { hours: 0, count: 0 }
        };

        let grandTotal = 0;
        allRes.rows.forEach(r => {
            const cat = r.category || 'Department';
            const hrs = parseFloat(r.calculated_workload || 0);
            if (!categoryBreakdown[cat]) {
                categoryBreakdown[cat] = { hours: 0, count: 0 };
            }
            categoryBreakdown[cat].hours = parseFloat((categoryBreakdown[cat].hours + hrs).toFixed(2));
            categoryBreakdown[cat].count += 1;
            grandTotal += hrs;
        });

        const filteredTotalHours = result.rows.reduce((sum, r) => sum + parseFloat(r.calculated_workload || 0), 0);

        return res.status(200).json({
            success: true,
            allocations: result.rows,
            summary: {
                totalHours: parseFloat(filteredTotalHours.toFixed(2)),
                taskCount: result.rows.length,
                grandTotalHours: parseFloat(grandTotal.toFixed(2)),
                categoryBreakdown
            }
        });
    } catch (error) {
        console.error("Get faculty workload error:", error);
        return res.status(500).json({ success: false, message: "Server error while fetching faculty workload." });
    }
};

// =====================================================
// 10. SAVE / UPDATE FACULTY WORKLOAD (Any Domain)
// =====================================================

const saveFacultyDepartmentWorkload = async (req, res) => {
    try {
        const facultyId = req.user.userId;

        const userRes = await pool.query('SELECT name FROM users WHERE id = $1', [facultyId]);
        const facultyName = userRes.rows[0]?.name || 'Faculty Member';

        const {
            role_id,
            role_name,
            task_id,
            task_name,
            work_unit,
            quantity,
            std_effort,
            occurrences,
            complexity_factor,
            remarks,
            category
        } = req.body;

        if (!role_id || !task_id) {
            return res.status(400).json({ success: false, message: "Role and Task are required." });
        }

        const cat = category || 'Department';
        const qty = parseFloat(quantity) || 1;
        const effort = parseFloat(std_effort) || 1;
        const occ = parseInt(occurrences) || 1;
        const comp = parseFloat(complexity_factor) || 1.0;
        const calculated = parseFloat((qty * effort * occ * comp).toFixed(2));

        const insertRes = await pool.query(
            `INSERT INTO faculty_department_workload
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
             RETURNING *`,
            [
                facultyId, facultyName, role_id, role_name || '', task_id,
                task_name || '', work_unit || 'Unit', qty, effort, occ, comp, calculated, remarks || '', cat
            ]
        );

        return res.status(200).json({
            success: true,
            message: `${cat} workload allocation saved successfully.`,
            item: insertRes.rows[0]
        });
    } catch (error) {
        console.error("Save faculty workload error:", error);
        return res.status(500).json({ success: false, message: "Server error while saving workload." });
    }
};

// =====================================================
// 11. DELETE FACULTY WORKLOAD ALLOCATION
// =====================================================

const deleteFacultyDepartmentWorkload = async (req, res) => {
    try {
        const facultyId = req.user.userId;
        const { id } = req.params;

        let query = '';
        let params = [];

        if (isNaN(id)) {
            query = 'DELETE FROM faculty_department_workload WHERE faculty_id = $1 AND task_id = $2 RETURNING id';
            params = [facultyId, id];
        } else {
            query = 'DELETE FROM faculty_department_workload WHERE faculty_id = $1 AND id = $2 RETURNING id';
            params = [facultyId, parseInt(id)];
        }

        const deleteRes = await pool.query(query, params);

        if (deleteRes.rowCount === 0) {
            return res.status(404).json({ success: false, message: "Task allocation not found or unauthorized." });
        }

        return res.status(200).json({
            success: true,
            message: "Workload task allocation removed successfully."
        });
    } catch (error) {
        console.error("Delete faculty workload error:", error);
        return res.status(500).json({ success: false, message: "Server error while removing workload item." });
    }
};

// =====================================================
// 12. GET HOD WORKLOAD SUMMARY (Multi-Category Filtered)
// =====================================================

const getHodDepartmentSummary = async (req, res) => {
    try {
        const currentUserId = req.user?.userId || req.user?.id;
        const selectedCategory = req.query?.category || 'Department';

        const facultyQuery = `
            SELECT
                faculty.id,
                faculty.custom_id,
                faculty.name,
                faculty.email,
                COALESCE((
                    SELECT SUM(master.grand_total_workload_units)
                    FROM workload_master AS master
                    WHERE master.faculty_id = faculty.id
                ), 0) AS academic_workload_units,
                COALESCE((
                    SELECT SUM(allocation.calculated_workload)
                    FROM faculty_department_workload AS allocation
                    WHERE allocation.faculty_id = faculty.id
                ), 0) AS overall_cross_domain_workload_hours,
                COALESCE((
                    SELECT SUM(COALESCE(task.estimated_hours, task.difficulty, 0))
                    FROM tasks AS task
                    WHERE task.assigned_to = faculty.id
                      AND (task.status IS NULL OR LOWER(task.status) != 'completed')
                ), 0) AS active_task_workload_hours
            FROM users AS faculty
            WHERE faculty.role = 'faculty'
              AND (faculty.is_hod = false OR faculty.id = $1)
            ORDER BY name ASC
        `;
        const facultyRes = await pool.query(facultyQuery, [currentUserId || 0]);
        const facultyList = facultyRes.rows;

        // Query allocations, optionally filtered by category
        let workloadSql = `
            SELECT 
                fdw.*,
                u.custom_id AS faculty_custom_id
            FROM faculty_department_workload fdw
            JOIN users u ON fdw.faculty_id = u.id
        `;
        const workloadParams = [];
        if (selectedCategory && selectedCategory !== 'all') {
            workloadParams.push(selectedCategory);
            workloadSql += ` WHERE fdw.category = $1`;
        }
        workloadSql += ` ORDER BY fdw.faculty_name ASC, fdw.role_id ASC, fdw.task_id ASC`;

        const workloadRes = await pool.query(workloadSql, workloadParams);
        const allWorkloads = workloadRes.rows;

        const facultyMap = {};
        facultyList.forEach(f => {
            facultyMap[f.id] = {
                faculty_id: f.id,
                custom_id: f.custom_id || `FAC${f.id}`,
                faculty_name: f.name,
                email: f.email,
                academic_workload_units: Number(f.academic_workload_units || 0),
                overall_cross_domain_workload_hours: Number(f.overall_cross_domain_workload_hours || 0),
                active_task_workload_hours: Number(f.active_task_workload_hours || 0),
                overall_workload: Number((
                    Number(f.academic_workload_units || 0)
                    + Number(f.overall_cross_domain_workload_hours || 0)
                    + Number(f.active_task_workload_hours || 0)
                ).toFixed(2)),
                department_workload_hours: 0,
                number_of_tasks: 0,
                tasks: []
            };
        });

        allWorkloads.forEach(row => {
            if (facultyMap[row.faculty_id]) {
                const hours = parseFloat(row.calculated_workload || 0);
                facultyMap[row.faculty_id].department_workload_hours += hours;
                facultyMap[row.faculty_id].number_of_tasks += 1;
                facultyMap[row.faculty_id].tasks.push({
                    id: row.id,
                    role_id: row.role_id,
                    role_name: row.role_name,
                    task_id: row.task_id,
                    task_name: row.task_name,
                    work_unit: row.work_unit,
                    quantity: parseFloat(row.quantity),
                    std_effort: parseFloat(row.std_effort),
                    occurrences: parseInt(row.occurrences),
                    complexity_factor: parseFloat(row.complexity_factor),
                    calculated_workload: hours,
                    remarks: row.remarks,
                    category: row.category || 'Department'
                });
            }
        });

        const facultySummary = Object.values(facultyMap);

        const departmentTotalHours = facultySummary.reduce((sum, f) => sum + f.department_workload_hours, 0);
        const divisor = facultySummary.length || 1;
        const departmentAverageHours = parseFloat((departmentTotalHours / divisor).toFixed(2));

        facultySummary.forEach(f => {
            f.department_workload_hours = parseFloat(f.department_workload_hours.toFixed(2));
            if (departmentTotalHours > 0) {
                f.workload_share_pct = parseFloat(((f.department_workload_hours / departmentTotalHours) * 100).toFixed(1));
            } else {
                f.workload_share_pct = 0.0;
            }

            if (f.number_of_tasks === 0) {
                f.interpretation = "No data entered";
            } else if (f.department_workload_hours >= departmentAverageHours) {
                f.interpretation = "Above department average";
            } else {
                f.interpretation = "Below department average";
            }
        });

        return res.status(200).json({
            success: true,
            category: selectedCategory,
            department_total_hours: parseFloat(departmentTotalHours.toFixed(2)),
            department_average_hours: departmentAverageHours,
            total_faculties: facultySummary.length,
            faculty_summary: facultySummary,
            all_allocations: allWorkloads
        });

    } catch (error) {
        console.error("Get HOD workload summary error:", error);
        return res.status(500).json({ success: false, message: "Server error while fetching HOD workload summary." });
    }
};

module.exports = {
    getSubjects,
    getFaculty,
    getTasks,
    suggestTask,
    assignTask,
    addClass,
    getHodSummary,
    getWorkloadCatalogs,
    getDepartmentMaster,
    getFacultyDepartmentWorkload,
    saveFacultyDepartmentWorkload,
    deleteFacultyDepartmentWorkload,
    getHodDepartmentSummary
};
const pool = require("../config/db");

const WORKLOAD_THRESHOLD = 15;


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
        const currentUserId = req.user?.userId || req.user?.id;

        let query = `
            SELECT 
                u.id,
                u.custom_id,
                u.name,
                u.email,
                u.role,
                u.is_hod,
                COALESCE(
                    (
                        SELECT SUM(t.difficulty)
                        FROM tasks t
                        WHERE t.assigned_to = u.id
                          AND (t.status IS NULL OR t.status != 'completed')
                    ),
                    0
                ) AS total_active_workload,
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
        `;
        const params = [];

        if (req.user?.isHod && currentUserId) {
            const deptRes = await pool.query(
                `SELECT id FROM departments WHERE hod_user_id = $1 UNION SELECT department_id FROM user_departments WHERE user_id = $1`,
                [currentUserId]
            );
            if (deptRes.rows.length > 0) {
                const deptIds = deptRes.rows.map(r => r.id);
                params.push(deptIds);
                query += ` AND u.id IN (
                    SELECT user_id FROM user_departments WHERE department_id = ANY($${params.length})
                    UNION
                    SELECT sf2.faculty_id FROM subject_faculty sf2 
                    JOIN subjects s2 ON sf2.subject_id = s2.id 
                    JOIN courses c2 ON s2.course_id = c2.id 
                    WHERE c2.department_id = ANY($${params.length})
                )`;
            }
        }

        query += ` GROUP BY u.id, u.custom_id, u.name, u.email, u.role, u.is_hod ORDER BY u.name ASC`;

        const result = await pool.query(query, params);

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
            subject_id,
            assigned_to,
            description,
            difficulty,
            deadline,
            scheduled_date
        } = req.body;

        if (
            !subject_id ||
            !assigned_to ||
            !description ||
            !difficulty ||
            !scheduled_date
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required task details (subject, faculty, description, difficulty, scheduled date)."
            });
        }

        const taskDifficulty = parseInt(difficulty);
        if (taskDifficulty < 1 || taskDifficulty > 10) {
            return res.status(400).json({
                success: false,
                message: "Difficulty must be between 1 and 10."
            });
        }

        const facultyId = parseInt(assigned_to);
        const start_date = scheduled_date;
        const end_date = deadline || scheduled_date;

        // Calculate task duration in days
        const sDate = new Date(start_date);
        const eDate = new Date(end_date);
        const durationDays = Math.max(0, Math.round((eDate - sDate) / (1000 * 60 * 60 * 24)));

        // 1. Fetch current faculty info & active overlapping workload during [start_date, end_date]
        const facultyInfo = await pool.query(`SELECT id, name, email FROM users WHERE id = $1`, [facultyId]);
        const facultyName = facultyInfo.rows[0]?.name || "Faculty Member";

        const workloadResult = await pool.query(
            `
            SELECT 
                COALESCE(SUM(t.difficulty), 0) AS current_workload,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', t.id,
                            'description', t.description,
                            'difficulty', t.difficulty,
                            'scheduled_date', t.scheduled_date,
                            'deadline', t.deadline,
                            'status', t.status
                        )
                    ) FILTER (WHERE t.id IS NOT NULL),
                    '[]'
                ) AS overlapping_tasks
            FROM tasks t
            WHERE t.assigned_to = $1
              AND (t.status IS NULL OR t.status != 'completed')
              AND t.scheduled_date <= $3
              AND COALESCE(t.deadline, t.scheduled_date) >= $2
            `,
            [facultyId, start_date, end_date]
        );

        const currentWorkload = parseInt(workloadResult.rows[0]?.current_workload || 0);
        const overlappingTasks = workloadResult.rows[0]?.overlapping_tasks || [];
        const resultingWorkload = currentWorkload + taskDifficulty;

        // 2. Find Alternative Dates for this faculty (looking up to 30 days ahead where workload fits)
        const altDatesResult = await pool.query(
            `
            SELECT 
                TO_CHAR(d::date, 'YYYY-MM-DD') AS alternative_scheduled_date,
                TO_CHAR((d::date + $4 * INTERVAL '1 day')::date, 'YYYY-MM-DD') AS alternative_deadline,
                COALESCE(
                    (
                        SELECT SUM(t.difficulty)
                        FROM tasks t
                        WHERE t.assigned_to = $1
                          AND (t.status IS NULL OR t.status != 'completed')
                          AND t.scheduled_date <= (d::date + $4 * INTERVAL '1 day')::date
                          AND COALESCE(t.deadline, t.scheduled_date) >= d::date
                    ),
                    0
                ) AS existing_workload
            FROM generate_series(
                $2::date + INTERVAL '1 day',
                $2::date + INTERVAL '30 days',
                INTERVAL '1 day'
            ) AS d
            WHERE COALESCE(
                (
                    SELECT SUM(t.difficulty)
                    FROM tasks t
                    WHERE t.assigned_to = $1
                      AND (t.status IS NULL OR t.status != 'completed')
                      AND t.scheduled_date <= (d::date + $4 * INTERVAL '1 day')::date
                      AND COALESCE(t.deadline, t.scheduled_date) >= d::date
                ),
                0
            ) + $3 <= $5
            ORDER BY existing_workload ASC, d ASC
            LIMIT 4
            `,
            [facultyId, start_date, taskDifficulty, durationDays, WORKLOAD_THRESHOLD]
        );

        // Format alternative dates with resulting workload
        const alternativeDates = altDatesResult.rows.map(r => ({
            scheduled_date: r.alternative_scheduled_date,
            deadline: r.alternative_deadline,
            existing_workload: parseInt(r.existing_workload),
            resulting_workload: parseInt(r.existing_workload) + taskDifficulty
        }));

        // 3. Find Alternative Faculty who teach the same subject or in the same department and have capacity
        const altFacultyResult = await pool.query(
            `
            SELECT 
                u.id,
                u.name,
                u.email,
                COALESCE(
                    (
                        SELECT SUM(t.difficulty)
                        FROM tasks t
                        WHERE t.assigned_to = u.id
                          AND (t.status IS NULL OR t.status != 'completed')
                          AND t.scheduled_date <= $3
                          AND COALESCE(t.deadline, t.scheduled_date) >= $2
                    ),
                    0
                ) AS current_workload,
                (
                    SELECT COUNT(*) 
                    FROM subject_faculty sf 
                    WHERE sf.subject_id = $4 AND sf.faculty_id = u.id
                ) > 0 AS teaches_subject
            FROM users u
            WHERE u.role = 'faculty'
              AND u.is_hod = false
              AND u.id != $1
              AND (
                  u.id IN (SELECT sf.faculty_id FROM subject_faculty sf WHERE sf.subject_id = $4)
                  OR
                  u.id IN (
                      SELECT ud.user_id FROM user_departments ud
                      WHERE ud.department_id IN (
                          SELECT ud2.department_id FROM user_departments ud2 WHERE ud2.user_id = $1
                          UNION
                          SELECT c.department_id FROM subjects s JOIN courses c ON s.course_id = c.id WHERE s.id = $4
                      )
                  )
              )
            GROUP BY u.id, u.name, u.email
            HAVING COALESCE(
                (
                    SELECT SUM(t.difficulty)
                    FROM tasks t
                    WHERE t.assigned_to = u.id
                      AND (t.status IS NULL OR t.status != 'completed')
                      AND t.scheduled_date <= $3
                      AND COALESCE(t.deadline, t.scheduled_date) >= $2
                ),
                0
            ) + $5 <= $6
            ORDER BY teaches_subject DESC, current_workload ASC, u.name ASC
            LIMIT 5
            `,
            [facultyId, start_date, end_date, parseInt(subject_id), taskDifficulty, WORKLOAD_THRESHOLD]
        );

        const alternativeFaculty = altFacultyResult.rows.map(f => ({
            id: f.id,
            name: f.name,
            email: f.email,
            current_workload: parseInt(f.current_workload),
            resulting_workload: parseInt(f.current_workload) + taskDifficulty,
            teaches_subject: f.teaches_subject
        }));

        // 4. Decision
        const canAssign = resultingWorkload <= WORKLOAD_THRESHOLD;

        return res.status(200).json({
            success: true,
            can_assign: canAssign,
            message: canAssign
                ? `${facultyName} is available for this assignment.`
                : `Faculty workload would exceed the maximum threshold of ${WORKLOAD_THRESHOLD} points.`,
            selected_faculty: {
                id: facultyId,
                name: facultyName,
                current_workload: currentWorkload,
                added_difficulty: taskDifficulty,
                resulting_workload: resultingWorkload
            },
            overlapping_tasks: overlappingTasks,
            threshold: WORKLOAD_THRESHOLD,
            task: {
                subject_id: parseInt(subject_id),
                assigned_to: facultyId,
                description,
                difficulty: taskDifficulty,
                deadline: deadline || null,
                scheduled_date
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
            message: "Server error while calculating workload capacity."
        });
    }
};


// =====================================================
// 5. FINAL TASK ASSIGNMENT (Strict Threshold Enforcement)
// =====================================================

const assignTask = async (req, res) => {
    try {
        const {
            subject_id,
            assigned_to,
            description,
            difficulty,
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

        if (
            !subject_id ||
            !assigned_to ||
            !description ||
            !difficulty ||
            !scheduled_date
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required task details."
            });
        }

        const taskDifficulty = parseInt(difficulty);
        const facultyId = parseInt(assigned_to);
        const start_date = scheduled_date;
        const end_date = deadline || scheduled_date;

        if (taskDifficulty < 1 || taskDifficulty > 10) {
            return res.status(400).json({
                success: false,
                message: "Difficulty must be between 1 and 10."
            });
        }

        // Check active overlapping workload in database
        const workloadResult = await pool.query(
            `
            SELECT COALESCE(SUM(t.difficulty), 0) AS current_workload
            FROM tasks t
            WHERE t.assigned_to = $1
              AND (t.status IS NULL OR t.status != 'completed')
              AND t.scheduled_date <= $3
              AND COALESCE(t.deadline, t.scheduled_date) >= $2
            `,
            [facultyId, start_date, end_date]
        );

        const currentWorkload = parseInt(workloadResult.rows[0]?.current_workload || 0);
        const resultingWorkload = currentWorkload + taskDifficulty;

        // STRICT CHECK: Reject if total active workload would exceed threshold
        if (resultingWorkload > WORKLOAD_THRESHOLD) {
            return res.status(409).json({
                success: false,
                can_assign: false,
                message: `Workload limit exceeded. Faculty current workload is ${currentWorkload} pts. Adding ${taskDifficulty} pts reaches ${resultingWorkload} pts (Maximum allowed: ${WORKLOAD_THRESHOLD} pts).`,
                current_workload: currentWorkload,
                requested_difficulty: taskDifficulty,
                resulting_workload: resultingWorkload,
                threshold: WORKLOAD_THRESHOLD
            });
        }

        // Insert task into database
        const taskResult = await pool.query(
            `
            INSERT INTO tasks (
                created_by,
                assigned_to,
                subject_id,
                description,
                difficulty,
                deadline,
                scheduled_date,
                status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *
            `,
            [
                created_by,
                facultyId,
                parseInt(subject_id),
                description,
                taskDifficulty,
                deadline || null,
                scheduled_date,
                "approved"
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Task approved and assigned successfully.",
            task: taskResult.rows[0],
            workload: {
                previous: currentWorkload,
                added: taskDifficulty,
                total: resultingWorkload,
                threshold: WORKLOAD_THRESHOLD
            }
        });

    } catch (error) {
        console.error("Assign task error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while assigning task."
        });
    }
};

// =====================================================
// 6. ADD A NEW CLASS (Faculty manually adding assigned class)
// =====================================================

const addClass = async (req, res) => {
    try {
        const { programName, semester, courseType, ltpjCode, role, subjectName, subjectCode } = req.body;
        const currentUserId = req.user?.userId || req.user?.id;

        if (!currentUserId) {
            return res.status(401).json({ success: false, message: "Unauthorized" });
        }

        // 1. Find or create the course (Program)
        let courseResult = await pool.query(
            `SELECT id FROM courses WHERE name = $1 LIMIT 1`,
            [programName]
        );

        let courseId;
        if (courseResult.rows.length > 0) {
            courseId = courseResult.rows[0].id;
        } else {
            // Determine department_id from current user if possible
            const deptRes = await pool.query(
                `SELECT department_id FROM user_departments WHERE user_id = $1 LIMIT 1`,
                [currentUserId]
            );
            const deptId = deptRes.rows.length > 0 ? deptRes.rows[0].department_id : 1; // fallback to 1

            // Create new course with a unique code to prevent unique constraint violations
            const genericCode = `GEN-${Math.floor(Math.random() * 100000)}`;
            const newCourseRes = await pool.query(
                `INSERT INTO courses (department_id, name, code, total_semesters) VALUES ($1, $2, $3, $4) RETURNING id`,
                [deptId, programName, genericCode, 8] // Default generic code and 8 semesters
            );
            courseId = newCourseRes.rows[0].id;
        }

        // 2. Insert the subject
        const codeToUse = subjectCode || `SUB-${Math.floor(Math.random() * 10000)}`;
        const subjectRes = await pool.query(
            `INSERT INTO subjects (course_id, name, code, semester, credits, course_type, ltpj_code) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
            [courseId, subjectName || 'Custom Subject', codeToUse, semester, 3, courseType, ltpjCode] // default 3 credits
        );
        const subjectId = subjectRes.rows[0].id;

        // 3. Link subject to faculty
        await pool.query(
            `INSERT INTO subject_faculty (subject_id, faculty_id, role) VALUES ($1, $2, $3)
             ON CONFLICT DO NOTHING`,
            [subjectId, currentUserId, role || 'Theory']
        );

        // 4. Calculate workloads and populate tracking tables
        const { studentsInLab, studentsInProject, priorExperience, labModification } = req.body;
        const [l, t, p, j] = (ltpjCode || '0-0-0-0').split('-').map(Number);
        
        const theoryHours = l || 0;
        const tutorialHours = t || 0;
        const labHours = p || 0;
        const projectHours = j || 0;
        const studentsClass = 60; // Keep at 60 for now as requested
        const studentsLab = parseInt(studentsInLab) || 0;
        const studentsProject = parseInt(studentsInProject) || 0;
        
        // Calculate weighted loads based on exact formulas provided by the user
        const weightedTheory = theoryHours;
        const weightedLab = labHours * 0.5;
        const weightedProject = projectHours * 0.5;
        const weightedTutorial = tutorialHours * 0.5;
        const weightedStudentsLab = studentsLab * 0.02;
        const weightedStudentsProject = studentsProject * 0.05;

        const subtotalWeighted = weightedTheory + weightedLab + weightedProject + weightedTutorial + weightedStudentsLab + weightedStudentsProject;
        const totalLoad = subtotalWeighted;

        // 5. Calculate Question/Assignment Setting Units
        let numQuestionPapers = 0;
        if (ltpjCode === '2-0-0-0' || ltpjCode === '2-0-2-2') numQuestionPapers = 2;
        else if (ltpjCode === '1-0-2-0') numQuestionPapers = 1;
        else if (ltpjCode === '3-1-0-0' || ltpjCode === '2-1-2-0') numQuestionPapers = 3;

        const numAssignments = 2;
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

        await pool.query(
            `INSERT INTO teaching_loads 
             (subject_id, faculty_id, students_in_class, theory_hours, lab_hours, project_hours, tutorial_hours, students_in_lab, students_in_project, subtotal_weighted_units, total_load)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
             [subjectId, currentUserId, studentsClass, theoryHours, labHours, projectHours, tutorialHours, studentsLab, studentsProject, subtotalWeighted, totalLoad]
        );

        await pool.query(
            `INSERT INTO paper_and_assignment_setting 
             (subject_id, faculty_id, num_question_papers, num_assignments, num_question_bank, subtotal_setting_units)
             VALUES ($1, $2, $3, $4, $5, $6)`,
             [subjectId, currentUserId, numQuestionPapers, numAssignments, 0, subtotalSettingUnits]
        );

        await pool.query(
            `INSERT INTO preparation_and_course_factors 
             (subject_id, faculty_id, theory_subject_prep, theory_rubrics_prep, theory_copo_mapping, lab_experiments_prep, lab_rubrics_prep, lab_eval_sheets_prep, lab_copo_mapping, project_rubrics_prep, project_eval_sheets_prep, project_copo_mapping, project_scheduling, extra_additions, total_load)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
             [subjectId, currentUserId, prepTheorySubject, prepTheoryRubrics, prepTheoryCopo, prepLabExp, prepLabRubrics, prepLabEvalSheets, prepLabCopo, prepProjRubrics, prepProjEvalSheets, prepProjCopo, prepProjScheduling, 0, subtotalPrepUnits]
        );

        const grandTotal = (totalLoad + subtotalSettingUnits + subtotalPrepUnits) * experienceMultiplier;

        await pool.query(
            `INSERT INTO workload_master 
             (subject_id, faculty_id, teaching_load_units, question_setting_units, prep_adjustment_units, theory_hours_per_week, experience_multiplier, grand_total_workload_units)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
             [subjectId, currentUserId, totalLoad, subtotalSettingUnits, subtotalPrepUnits, theoryHours, experienceMultiplier, grandTotal]
        );

        return res.status(200).json({
            success: true,
            message: "Class added successfully."
        });

    } catch (error) {
        console.error("Add class error:", error);
        return res.status(500).json({
            success: false,
            message: "Server error while adding class."
        });
    }
};


module.exports = {
    getSubjects,
    getFaculty,
    getTasks,
    suggestTask,
    assignTask,
    addClass
};
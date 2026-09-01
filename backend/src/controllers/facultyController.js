const pool = require('../config/db');

// Configurable constants for Student Workload
const MAX_DAILY_STUDENT_WORKLOAD = 10;
const MAX_WEEKLY_STUDENT_WORKLOAD = 18;

// =====================================================
// 1. GET TASKS ASSIGNED TO LOGGED-IN FACULTY (From HOD)
// =====================================================
const getMyTasks = async (req, res) => {
    try {
        const facultyId = req.user.userId || req.user.id;

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
                COALESCE(u_creator.name, 'HOD') AS creator_name,
                COALESCE(s.name, 'General Department Task') AS subject_name,
                s.code AS subject_code
            FROM tasks t
            LEFT JOIN users u_creator ON t.created_by = u_creator.id
            LEFT JOIN subjects s ON t.subject_id = s.id
            WHERE t.assigned_to = $1
            ORDER BY 
                CASE WHEN LOWER(t.status) = 'completed' THEN 1 ELSE 0 END,
                COALESCE(t.deadline, t.scheduled_date) ASC, 
                t.id DESC
            `,
            [facultyId]
        );

        const activeTasks = result.rows.filter(t => !t.status || t.status.toLowerCase() !== 'completed');
        const totalWorkload = activeTasks.reduce((sum, t) => sum + (parseInt(t.difficulty) || 0), 0);

        return res.status(200).json({
            success: true,
            tasks: result.rows,
            summary: {
                totalTasks: result.rows.length,
                activeCount: activeTasks.length,
                completedCount: result.rows.length - activeTasks.length,
                currentWorkload: totalWorkload,
                threshold: 15
            }
        });

    } catch (error) {
        console.error('Get faculty tasks error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch faculty tasks.'
        });
    }
};


// =====================================================
// 2. UPDATE TASK STATUS (Pending / In Progress / Completed)
// =====================================================
const updateTaskStatus = async (req, res) => {
    try {
        const facultyId = req.user.userId || req.user.id;
        const taskId = parseInt(req.params.id);
        const { status } = req.body;

        if (!status) {
            return res.status(400).json({
                success: false,
                message: 'Task status is required.'
            });
        }

        const validStatuses = ['pending', 'in_progress', 'completed', 'active', 'approved'];
        if (!validStatuses.includes(status.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Allowed values: ${validStatuses.join(', ')}`
            });
        }

        const result = await pool.query(
            `
            UPDATE tasks
            SET status = $1
            WHERE id = $2 AND assigned_to = $3
            RETURNING *
            `,
            [status.toLowerCase(), taskId, facultyId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Task not found or not assigned to this faculty member.'
            });
        }

        return res.status(200).json({
            success: true,
            message: `Task status updated to "${status}".`,
            task: result.rows[0]
        });

    } catch (error) {
        console.error('Update task status error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to update task status.'
        });
    }
};


// =====================================================
// 3. GET FACULTY ASSIGNED SUBJECTS / CLASSES
// =====================================================
const getMySubjects = async (req, res) => {
    try {
        const facultyId = req.user.userId || req.user.id;

        const result = await pool.query(
            `
            SELECT 
                s.id,
                s.name,
                s.code,
                s.semester,
                s.credits,
                s.course_id,
                c.name AS course_name,
                c.code AS course_code,
                d.name AS department_name
            FROM subjects s
            JOIN courses c ON s.course_id = c.id
            JOIN departments d ON c.department_id = d.id
            JOIN subject_faculty sf ON s.id = sf.subject_id
            WHERE sf.faculty_id = $1
            ORDER BY s.semester ASC, s.name ASC
            `,
            [facultyId]
        );

        return res.status(200).json({
            success: true,
            subjects: result.rows
        });

    } catch (error) {
        console.error('Get faculty subjects error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assigned subjects.'
        });
    }
};


// =====================================================
// 4. CHECK STUDENT WORKLOAD & COLLISION ENGINE
// =====================================================
const checkStudentWorkload = async (req, res) => {
    try {
        const facultyId = req.user.userId || req.user.id;
        const { subject_id, difficulty, due_date } = req.body;

        if (!subject_id || !difficulty || !due_date) {
            return res.status(400).json({
                success: false,
                message: 'Subject, difficulty, and due date are required.'
            });
        }

        const taskDiff = parseInt(difficulty);
        if (taskDiff < 1 || taskDiff > 10) {
            return res.status(400).json({
                success: false,
                message: 'Difficulty must be between 1 and 10.'
            });
        }

        // Verify subject & get course and semester
        const subjectRes = await pool.query(
            `
            SELECT s.id, s.name, s.code, s.semester, s.course_id, c.name AS course_name
            FROM subjects s
            JOIN courses c ON s.course_id = c.id
            JOIN subject_faculty sf ON s.id = sf.subject_id
            WHERE s.id = $1 AND sf.faculty_id = $2
            `,
            [parseInt(subject_id), facultyId]
        );

        if (subjectRes.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not assigned to teach this subject or it does not exist.'
            });
        }

        const subject = subjectRes.rows[0];
        const courseId = subject.course_id;
        const semester = subject.semester;

        // 1. Calculate Daily Workload for this specific class on target due_date
        const dailyRes = await pool.query(
            `
            SELECT 
                COALESCE(SUM(sa.difficulty), 0) AS total_difficulty,
                COUNT(sa.id) AS assignment_count,
                COALESCE(json_agg(
                    json_build_object(
                        'id', sa.id,
                        'title', sa.title,
                        'difficulty', sa.difficulty,
                        'subject_code', s2.code,
                        'subject_name', s2.name
                    )
                ) FILTER (WHERE sa.id IS NOT NULL), '[]') AS assignments
            FROM student_assignments sa
            JOIN subjects s2 ON sa.subject_id = s2.id
            WHERE sa.course_id = $1 AND sa.semester = $2 AND sa.due_date = $3
            `,
            [courseId, semester, due_date]
        );

        const currentDailyWorkload = parseInt(dailyRes.rows[0]?.total_difficulty || 0);
        const existingAssignments = dailyRes.rows[0]?.assignments || [];
        const resultingDailyWorkload = currentDailyWorkload + taskDiff;

        // 2. Calculate Weekly Workload for this class (window of +- 3 days)
        const weeklyRes = await pool.query(
            `
            SELECT COALESCE(SUM(difficulty), 0) AS total_difficulty
            FROM student_assignments
            WHERE course_id = $1 AND semester = $2
              AND due_date BETWEEN ($3::date - INTERVAL '3 days') AND ($3::date + INTERVAL '3 days')
            `,
            [courseId, semester, due_date]
        );
        const currentWeeklyWorkload = parseInt(weeklyRes.rows[0]?.total_difficulty || 0);
        const resultingWeeklyWorkload = currentWeeklyWorkload + taskDiff;

        const isDailyOverloaded = resultingDailyWorkload > MAX_DAILY_STUDENT_WORKLOAD;
        const isWeeklyOverloaded = resultingWeeklyWorkload > MAX_WEEKLY_STUDENT_WORKLOAD;
        const hasCollision = isDailyOverloaded || isWeeklyOverloaded;

        // If collision / overload detected -> Calculate Alternative Available Dates
        let alternativeDates = [];
        if (hasCollision) {
            const requestedDate = new Date(due_date);

            // Scan next 14 days
            for (let offset = 1; offset <= 14; offset++) {
                const candidateDate = new Date(requestedDate);
                candidateDate.setDate(requestedDate.getDate() + offset);
                const dateStr = candidateDate.toISOString().split('T')[0];

                const candRes = await pool.query(
                    `
                    SELECT 
                        COALESCE(SUM(difficulty), 0) AS daily_difficulty
                    FROM student_assignments
                    WHERE course_id = $1 AND semester = $2 AND due_date = $3
                    `,
                    [courseId, semester, dateStr]
                );

                const candDaily = parseInt(candRes.rows[0]?.daily_difficulty || 0);
                const candResulting = candDaily + taskDiff;

                if (candResulting <= MAX_DAILY_STUDENT_WORKLOAD) {
                    alternativeDates.push({
                        date: dateStr,
                        formatted_date: candidateDate.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
                        current_workload: candDaily,
                        task_difficulty: taskDiff,
                        resulting_workload: candResulting,
                        threshold: MAX_DAILY_STUDENT_WORKLOAD
                    });
                }

                if (alternativeDates.length >= 4) break; // Provide top 4 recommendations
            }
        }

        return res.status(200).json({
            success: true,
            can_assign: !hasCollision,
            is_overloaded: hasCollision,
            reason: isDailyOverloaded ? 'Daily workload threshold exceeded' : (isWeeklyOverloaded ? 'High concentration of assignments in this week' : null),
            target_class: {
                course_id: courseId,
                course_name: subject.course_name,
                semester: semester,
                subject_name: subject.name,
                subject_code: subject.code
            },
            workload: {
                date: due_date,
                current_daily_workload: currentDailyWorkload,
                task_difficulty: taskDiff,
                resulting_daily_workload: resultingDailyWorkload,
                daily_threshold: MAX_DAILY_STUDENT_WORKLOAD,
                current_weekly_workload: currentWeeklyWorkload,
                resulting_weekly_workload: resultingWeeklyWorkload,
                weekly_threshold: MAX_WEEKLY_STUDENT_WORKLOAD
            },
            existing_assignments: existingAssignments,
            alternative_dates: alternativeDates
        });

    } catch (error) {
        console.error('Check student workload error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to evaluate student workload collision.'
        });
    }
};


// =====================================================
// 5. ASSIGN WORK TO STUDENTS (Persist to DB & Enrolled Roster)
// =====================================================
const assignWorkToStudents = async (req, res) => {
    const client = await pool.connect();
    try {
        const facultyId = req.user.userId || req.user.id;
        const { subject_id, title, description, difficulty, due_date, max_marks } = req.body;

        if (!subject_id || !description || !difficulty || !due_date) {
            return res.status(400).json({
                success: false,
                message: 'Please fill in all required fields (subject, description, difficulty, due date).'
            });
        }

        const taskDiff = parseInt(difficulty);
        if (taskDiff < 1 || taskDiff > 10) {
            return res.status(400).json({
                success: false,
                message: 'Difficulty must be between 1 and 10.'
            });
        }

        // Get subject and class metadata
        const subjectRes = await client.query(
            `
            SELECT s.id, s.name, s.code, s.semester, s.course_id, c.name AS course_name
            FROM subjects s
            JOIN courses c ON s.course_id = c.id
            JOIN subject_faculty sf ON s.id = sf.subject_id
            WHERE s.id = $1 AND sf.faculty_id = $2
            `,
            [parseInt(subject_id), facultyId]
        );

        if (subjectRes.rows.length === 0) {
            return res.status(403).json({
                success: false,
                message: 'You are not authorized to assign work for this subject.'
            });
        }

        const subject = subjectRes.rows[0];
        const assignmentTitle = title || `${subject.code} - Assignment`;

        await client.query('BEGIN');

        // 1. Insert Assignment
        const assignRes = await client.query(
            `
            INSERT INTO student_assignments (
                faculty_id,
                subject_id,
                course_id,
                semester,
                title,
                description,
                difficulty,
                due_date,
                max_marks
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
            `,
            [
                facultyId,
                subject.id,
                subject.course_id,
                subject.semester,
                assignmentTitle,
                description,
                taskDiff,
                due_date,
                parseInt(max_marks) || 100
            ]
        );

        const newAssignment = assignRes.rows[0];

        // 2. Fetch all students in this course & semester (Strict isolation)
        const studentsRes = await client.query(
            `
            SELECT user_id
            FROM students
            WHERE course_id = $1 AND semester = $2
            `,
            [subject.course_id, subject.semester]
        );

        // 3. Create default pending submission entries for each student
        for (const stu of studentsRes.rows) {
            await client.query(
                `
                INSERT INTO student_assignment_submissions (assignment_id, student_id, status)
                VALUES ($1, $2, 'pending')
                ON CONFLICT (assignment_id, student_id) DO NOTHING
                `,
                [newAssignment.id, stu.user_id]
            );
        }

        await client.query('COMMIT');

        return res.status(201).json({
            success: true,
            message: `Assignment successfully published to ${studentsRes.rows.length} students in ${subject.course_name} (Semester ${subject.semester}).`,
            assignment: newAssignment,
            students_notified: studentsRes.rows.length
        });

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Assign work to students error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error while assigning work to students.'
        });
    } finally {
        client.release();
    }
};


// =====================================================
// 6. GET ASSIGNED STUDENT WORKS BY THIS FACULTY
// =====================================================
const getMyAssignedStudentWorks = async (req, res) => {
    try {
        const facultyId = req.user.userId || req.user.id;

        const result = await pool.query(
            `
            SELECT 
                sa.id,
                sa.title,
                sa.description,
                sa.difficulty,
                sa.assigned_date,
                sa.due_date,
                sa.max_marks,
                sa.semester,
                s.name AS subject_name,
                s.code AS subject_code,
                c.name AS course_name,
                c.code AS course_code,
                COUNT(sas.id) AS total_students,
                COUNT(sas.id) FILTER (WHERE sas.status = 'submitted') AS submitted_count,
                COUNT(sas.id) FILTER (WHERE sas.status = 'graded') AS graded_count
            FROM student_assignments sa
            JOIN subjects s ON sa.subject_id = s.id
            JOIN courses c ON sa.course_id = c.id
            LEFT JOIN student_assignment_submissions sas ON sa.id = sas.assignment_id
            WHERE sa.faculty_id = $1
            GROUP BY sa.id, s.name, s.code, c.name, c.code
            ORDER BY sa.due_date DESC, sa.id DESC
            `,
            [facultyId]
        );

        return res.status(200).json({
            success: true,
            assigned_works: result.rows
        });

    } catch (error) {
        console.error('Get assigned student works error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch assigned student works.'
        });
    }
};


module.exports = {
    getMyTasks,
    updateTaskStatus,
    getMySubjects,
    checkStudentWorkload,
    assignWorkToStudents,
    getMyAssignedStudentWorks
};

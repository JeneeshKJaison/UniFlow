const pool = require('../config/db');

// =====================================================
// 1. GET STUDENT DASHBOARD DATA & STATS
// =====================================================
const getStudentDashboard = async (req, res) => {
    try {
        const studentUserId = req.user.userId || req.user.id;

        // Fetch student profile info
        const profileRes = await pool.query(
            `
            SELECT 
                u.id AS user_id,
                u.custom_id,
                u.name,
                u.email,
                s.semester,
                s.section,
                s.cgpa,
                s.admission_year,
                c.id AS course_id,
                c.name AS course_name,
                c.code AS course_code,
                d.name AS department_name
            FROM users u
            LEFT JOIN students s ON u.id = s.user_id
            LEFT JOIN courses c ON s.course_id = c.id
            LEFT JOIN departments d ON c.department_id = d.id
            WHERE u.id = $1
            `,
            [studentUserId]
        );

        if (profileRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student record not found.'
            });
        }

        const profile = profileRes.rows[0];
        const courseId = profile.course_id;
        const semester = profile.semester || 5;

        // Fetch active enrolled courses count
        const coursesCountRes = await pool.query(
            `
            SELECT COUNT(*) AS active_courses
            FROM subjects
            WHERE course_id = $1 AND semester = $2
            `,
            [courseId, semester]
        );
        const activeCoursesCount = parseInt(coursesCountRes.rows[0]?.active_courses || 0);

        // Fetch assignment stats
        const assignStatsRes = await pool.query(
            `
            SELECT 
                COUNT(sa.id) AS total_assignments,
                COUNT(sa.id) FILTER (WHERE sas.status = 'pending' OR sas.status IS NULL) AS pending_assignments,
                COUNT(sa.id) FILTER (WHERE sas.status = 'submitted' OR sas.status = 'graded') AS completed_assignments,
                COALESCE(SUM(sa.difficulty) FILTER (WHERE sas.status = 'pending' OR sas.status IS NULL), 0) AS active_workload_points
            FROM student_assignments sa
            LEFT JOIN student_assignment_submissions sas 
                ON sa.id = sas.assignment_id AND sas.student_id = $1
            WHERE sa.course_id = $2 AND sa.semester = $3
            `,
            [studentUserId, courseId, semester]
        );

        const assignStats = assignStatsRes.rows[0];
        const pendingCount = parseInt(assignStats?.pending_assignments || 0);
        const completedCount = parseInt(assignStats?.completed_assignments || 0);
        const activeWorkloadPoints = parseInt(assignStats?.active_workload_points || 0);

        // Max recommended weekly workload points is 20
        const workloadPct = Math.min(100, Math.round((activeWorkloadPoints / 20) * 100));

        return res.status(200).json({
            success: true,
            profile: {
                id: profile.user_id,
                customId: profile.custom_id,
                name: profile.name,
                email: profile.email,
                courseName: profile.course_name || 'B.Tech Computer Science',
                courseCode: profile.course_code || 'CSE',
                department: profile.department_name || 'Computer Science',
                semester: semester,
                section: profile.section || 'A',
                cgpa: profile.cgpa || 8.40,
                admissionYear: profile.admission_year || 2023
            },
            stats: {
                activeCourses: activeCoursesCount,
                pendingAssignments: pendingCount,
                completedAssignments: completedCount,
                workloadPoints: activeWorkloadPoints,
                workloadPercentage: workloadPct
            }
        });

    } catch (error) {
        console.error('Get student dashboard error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch student dashboard details.'
        });
    }
};


// =====================================================
// 2. GET ALL ASSIGNMENTS FOR THIS STUDENT
// =====================================================
const getStudentAssignments = async (req, res) => {
    try {
        const studentUserId = req.user.userId || req.user.id;

        // Get student's course & semester
        const stuRes = await pool.query(
            `SELECT course_id, semester FROM students WHERE user_id = $1`,
            [studentUserId]
        );

        if (stuRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student profile not found.'
            });
        }

        const { course_id, semester } = stuRes.rows[0];

        // Fetch assignments with individual submission status
        const assignmentsRes = await pool.query(
            `
            SELECT 
                sa.id,
                sa.title,
                sa.description,
                sa.difficulty,
                sa.assigned_date,
                sa.due_date,
                sa.max_marks,
                s.name AS subject_name,
                s.code AS subject_code,
                u_fac.name AS faculty_name,
                COALESCE(sas.status, 'pending') AS submission_status,
                sas.marks_obtained,
                sas.remarks,
                sas.submitted_at
            FROM student_assignments sa
            JOIN subjects s ON sa.subject_id = s.id
            JOIN users u_fac ON sa.faculty_id = u_fac.id
            LEFT JOIN student_assignment_submissions sas 
                ON sa.id = sas.assignment_id AND sas.student_id = $1
            WHERE sa.course_id = $2 AND sa.semester = $3
            ORDER BY 
                CASE WHEN COALESCE(sas.status, 'pending') = 'pending' THEN 0 ELSE 1 END,
                sa.due_date ASC, 
                sa.id DESC
            `,
            [studentUserId, course_id, semester]
        );

        return res.status(200).json({
            success: true,
            assignments: assignmentsRes.rows
        });

    } catch (error) {
        console.error('Get student assignments error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch student assignments.'
        });
    }
};


// =====================================================
// 3. GET ENROLLED COURSES & SUBJECTS
// =====================================================
const getStudentCourses = async (req, res) => {
    try {
        const studentUserId = req.user.userId || req.user.id;

        const stuRes = await pool.query(
            `SELECT course_id, semester FROM students WHERE user_id = $1`,
            [studentUserId]
        );

        if (stuRes.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        const { course_id, semester } = stuRes.rows[0];

        const coursesRes = await pool.query(
            `
            SELECT 
                s.id,
                s.name,
                s.code,
                s.credits,
                s.semester,
                COALESCE(
                    (
                        SELECT string_agg(u.name, ', ')
                        FROM subject_faculty sf
                        JOIN users u ON sf.faculty_id = u.id
                        WHERE sf.subject_id = s.id
                    ),
                    'To be assigned'
                ) AS faculty_names
            FROM subjects s
            WHERE s.course_id = $1 AND s.semester = $2
            ORDER BY s.code ASC
            `,
            [course_id, semester]
        );

        return res.status(200).json({
            success: true,
            courses: coursesRes.rows
        });

    } catch (error) {
        console.error('Get student courses error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to fetch enrolled courses.'
        });
    }
};


// =====================================================
// 4. SUBMIT ASSIGNMENT (Student action)
// =====================================================
const submitAssignment = async (req, res) => {
    try {
        const studentUserId = req.user.userId || req.user.id;
        const assignmentId = parseInt(req.params.id);
        const { submission_text } = req.body;

        const result = await pool.query(
            `
            INSERT INTO student_assignment_submissions (
                assignment_id,
                student_id,
                status,
                submission_text,
                submitted_at
            )
            VALUES ($1, $2, 'submitted', $3, NOW())
            ON CONFLICT (assignment_id, student_id)
            DO UPDATE SET
                status = 'submitted',
                submission_text = EXCLUDED.submission_text,
                submitted_at = NOW()
            RETURNING *
            `,
            [assignmentId, studentUserId, submission_text || 'Submitted online.']
        );

        return res.status(200).json({
            success: true,
            message: 'Assignment submitted successfully!',
            submission: result.rows[0]
        });

    } catch (error) {
        console.error('Submit assignment error:', error);
        return res.status(500).json({
            success: false,
            message: 'Failed to submit assignment.'
        });
    }
};


module.exports = {
    getStudentDashboard,
    getStudentAssignments,
    getStudentCourses,
    submitAssignment
};

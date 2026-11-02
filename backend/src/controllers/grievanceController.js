const pool = require('../config/db');
const { escalateOverdueGrievances } = require('../services/grievanceService');

const GRIEVANCE_CATEGORIES = new Set(['academic', 'facility', 'hostel', 'other']);

async function getStudentDepartment(studentId) {
    const result = await pool.query(`
        SELECT course.department_id, department.hod_user_id
        FROM students AS student
        JOIN courses AS course ON course.id = student.course_id
        JOIN departments AS department ON department.id = course.department_id
        WHERE student.user_id = $1
    `, [studentId]);

    return result.rows[0] || null;
}

async function getFacultyOptions(req, res) {
    try {
        const student = await getStudentDepartment(req.user.userId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found.' });
        }

        const result = await pool.query(`
            SELECT DISTINCT faculty.id, faculty.name
            FROM users AS faculty
            WHERE faculty.role = 'faculty'
              AND faculty.is_hod = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_departments AS membership
                      WHERE membership.user_id = faculty.id
                        AND membership.department_id = $1
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM subject_faculty AS allocation
                      JOIN subjects AS subject ON subject.id = allocation.subject_id
                      JOIN courses AS course ON course.id = subject.course_id
                      WHERE allocation.faculty_id = faculty.id
                        AND course.department_id = $1
                  )
              )
            ORDER BY faculty.name
        `, [student.department_id]);

        return res.status(200).json({ success: true, faculty: result.rows });
    } catch (error) {
        console.error('Get grievance faculty options error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load faculty options.' });
    }
}

async function getStudentGrievances(req, res) {
    try {
        await escalateOverdueGrievances();
        const result = await pool.query(`
            SELECT grievance.*, faculty.name AS faculty_name, department.name AS department_name
            FROM student_grievances AS grievance
            JOIN users AS faculty ON faculty.id = grievance.faculty_id
            JOIN departments AS department ON department.id = grievance.department_id
            WHERE grievance.student_id = $1
            ORDER BY grievance.created_at DESC, grievance.id DESC
        `, [req.user.userId]);

        return res.status(200).json({ success: true, grievances: result.rows });
    } catch (error) {
        console.error('Get student grievances error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load grievances.' });
    }
}

async function fileGrievance(req, res) {
    try {
        const { faculty_id, category, subject, details } = req.body;
        const facultyId = Number(faculty_id);
        const trimmedSubject = typeof subject === 'string' ? subject.trim() : '';
        const trimmedDetails = typeof details === 'string' ? details.trim() : '';
        const normalizedCategory = typeof category === 'string' ? category : 'other';

        if (!Number.isInteger(facultyId) || facultyId < 1 ||
            !trimmedSubject || trimmedSubject.length > 200 ||
            !trimmedDetails || trimmedDetails.length > 5000 ||
            !GRIEVANCE_CATEGORIES.has(normalizedCategory)) {
            return res.status(400).json({
                success: false,
                message: 'Choose a faculty member and provide a valid category, subject, and description.'
            });
        }

        const student = await getStudentDepartment(req.user.userId);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student profile not found.' });
        }
        if (!student.hod_user_id) {
            return res.status(409).json({
                success: false,
                message: 'Your department does not have an assigned HOD for grievance escalation.'
            });
        }

        const result = await pool.query(`
            INSERT INTO student_grievances
                (student_id, faculty_id, department_id, category, subject, details)
            SELECT $1, faculty.id, $2, $3, $4, $5
            FROM users AS faculty
            WHERE faculty.id = $6
              AND faculty.role = 'faculty'
              AND faculty.is_hod = FALSE
              AND (
                  EXISTS (
                      SELECT 1
                      FROM user_departments AS membership
                      WHERE membership.user_id = faculty.id
                        AND membership.department_id = $2
                  )
                  OR EXISTS (
                      SELECT 1
                      FROM subject_faculty AS allocation
                      JOIN subjects AS subject ON subject.id = allocation.subject_id
                      JOIN courses AS course ON course.id = subject.course_id
                      WHERE allocation.faculty_id = faculty.id
                        AND course.department_id = $2
                  )
              )
            RETURNING *
        `, [
            req.user.userId,
            student.department_id,
            normalizedCategory,
            trimmedSubject,
            trimmedDetails,
            facultyId
        ]);

        if (result.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'The selected faculty member is not in your department.'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Grievance filed. The faculty member has 7 days to resolve it.',
            grievance: result.rows[0]
        });
    } catch (error) {
        console.error('File grievance error:', error);
        return res.status(500).json({ success: false, message: 'Failed to file grievance.' });
    }
}

async function getFacultyGrievances(req, res) {
    try {
        await escalateOverdueGrievances();
        const result = await pool.query(`
            SELECT grievance.*, student.name AS student_name, department.name AS department_name
            FROM student_grievances AS grievance
            JOIN users AS student ON student.id = grievance.student_id
            JOIN departments AS department ON department.id = grievance.department_id
            WHERE grievance.faculty_id = $1
            ORDER BY grievance.created_at DESC, grievance.id DESC
        `, [req.user.userId]);

        return res.status(200).json({ success: true, grievances: result.rows });
    } catch (error) {
        console.error('Get faculty grievances error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load grievances.' });
    }
}

async function getFacultyHodDepartments(req, res) {
    try {
        const result = await pool.query(`
            SELECT department.id, department.name, hod.id AS hod_id, hod.name AS hod_name
            FROM user_departments AS membership
            JOIN departments AS department ON department.id = membership.department_id
            JOIN users AS hod ON hod.id = department.hod_user_id
            WHERE membership.user_id = $1
              AND hod.role = 'faculty'
              AND hod.is_hod = TRUE
            ORDER BY department.name
        `, [req.user.userId]);

        return res.status(200).json({ success: true, departments: result.rows });
    } catch (error) {
        console.error('Get faculty grievance departments error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load your department HODs.' });
    }
}

async function fileFacultyHodGrievance(req, res) {
    try {
        const departmentId = Number(req.body.department_id);
        const { category, subject, details } = req.body;
        const trimmedSubject = typeof subject === 'string' ? subject.trim() : '';
        const trimmedDetails = typeof details === 'string' ? details.trim() : '';
        const normalizedCategory = typeof category === 'string' ? category : 'other';

        if (!Number.isInteger(departmentId) || departmentId < 1 ||
            !trimmedSubject || trimmedSubject.length > 200 ||
            !trimmedDetails || trimmedDetails.length > 5000 ||
            !GRIEVANCE_CATEGORIES.has(normalizedCategory)) {
            return res.status(400).json({
                success: false,
                message: 'Choose a department and provide a valid category, subject, and description.'
            });
        }

        const result = await pool.query(`
            INSERT INTO faculty_hod_grievances
                (faculty_id, hod_id, department_id, category, subject, details)
            SELECT membership.user_id, department.hod_user_id, department.id, $3, $4, $5
            FROM user_departments AS membership
            JOIN departments AS department ON department.id = membership.department_id
            JOIN users AS hod ON hod.id = department.hod_user_id
            WHERE membership.user_id = $1
              AND department.id = $2
              AND hod.role = 'faculty'
              AND hod.is_hod = TRUE
            RETURNING *
        `, [req.user.userId, departmentId, normalizedCategory, trimmedSubject, trimmedDetails]);

        if (result.rowCount === 0) {
            return res.status(400).json({
                success: false,
                message: 'You are not a member of that department or it has no assigned HOD.'
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Grievance filed with your HOD. They have 7 days to respond.',
            grievance: result.rows[0]
        });
    } catch (error) {
        console.error('File faculty grievance to HOD error:', error);
        return res.status(500).json({ success: false, message: 'Failed to file grievance with your HOD.' });
    }
}

async function getFacultyHodGrievances(req, res) {
    try {
        const result = await pool.query(`
            SELECT grievance.*, hod.name AS hod_name, department.name AS department_name
            FROM faculty_hod_grievances AS grievance
            JOIN users AS hod ON hod.id = grievance.hod_id
            JOIN departments AS department ON department.id = grievance.department_id
            WHERE grievance.faculty_id = $1
            ORDER BY grievance.created_at DESC, grievance.id DESC
        `, [req.user.userId]);

        return res.status(200).json({ success: true, grievances: result.rows });
    } catch (error) {
        console.error('Get faculty-to-HOD grievances error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load your HOD grievances.' });
    }
}

async function getHodFacultyGrievances(req, res) {
    try {
        const result = await pool.query(`
            SELECT grievance.*, faculty.name AS faculty_name,
                   hod.name AS hod_name, department.name AS department_name
            FROM faculty_hod_grievances AS grievance
            JOIN users AS faculty ON faculty.id = grievance.faculty_id
            JOIN users AS hod ON hod.id = grievance.hod_id
            JOIN departments AS department ON department.id = grievance.department_id
            WHERE grievance.hod_id = $1
              AND grievance.resolved_at IS NULL
            ORDER BY grievance.created_at DESC, grievance.id DESC
        `, [req.user.userId]);

        return res.status(200).json({ success: true, grievances: result.rows });
    } catch (error) {
        console.error('Get faculty grievances for HOD error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load faculty grievances.' });
    }
}

async function markHodResolved(req, res) {
    const grievanceId = Number(req.params.id);
    if (!Number.isInteger(grievanceId) || grievanceId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid grievance ID.' });
    }
    const rawComment = req.body?.resolution_comment;
    if (rawComment !== undefined && typeof rawComment !== 'string') {
        return res.status(400).json({ success: false, message: 'Resolution comment must be text.' });
    }
    const resolutionComment = typeof rawComment === 'string' ? rawComment.trim() : '';
    if (resolutionComment.length > 2000) {
        return res.status(400).json({ success: false, message: 'Resolution comment must be 2000 characters or fewer.' });
    }

    try {
        const result = await pool.query(`
            UPDATE faculty_hod_grievances
            SET hod_resolved_at = CURRENT_TIMESTAMP,
                resolution_comment = $3,
                resolved_at = CASE
                    WHEN faculty_confirmed_at IS NOT NULL THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END,
                status = CASE
                    WHEN faculty_confirmed_at IS NOT NULL THEN 'resolved'
                    ELSE 'open'
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND hod_id = $2
              AND hod_resolved_at IS NULL
              AND resolved_at IS NULL
            RETURNING *
        `, [grievanceId, req.user.userId, resolutionComment || null]);

        if (result.rowCount === 0) {
            const existing = await pool.query(`
                SELECT hod_resolved_at, resolved_at
                FROM faculty_hod_grievances
                WHERE id = $1 AND hod_id = $2
            `, [grievanceId, req.user.userId]);
            if (existing.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Grievance not found.' });
            }
            return res.status(409).json({
                success: false,
                message: existing.rows[0].resolved_at
                    ? 'This grievance has already been resolved by both parties.'
                    : 'You have already marked this grievance as resolved.'
            });
        }

        return res.status(200).json({
            success: true,
            message: result.rows[0].resolved_at
                ? 'Both parties confirmed resolution. The grievance is closed.'
                : 'Your resolution has been recorded. The faculty member must confirm it.',
            grievance: result.rows[0]
        });
    } catch (error) {
        console.error('Mark faculty grievance resolved by HOD error:', error);
        return res.status(500).json({ success: false, message: 'Failed to record HOD resolution.' });
    }
}

async function markFacultyHodConfirmed(req, res) {
    const grievanceId = Number(req.params.id);
    if (!Number.isInteger(grievanceId) || grievanceId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid grievance ID.' });
    }

    try {
        const result = await pool.query(`
            UPDATE faculty_hod_grievances
            SET faculty_confirmed_at = CURRENT_TIMESTAMP,
                resolved_at = CURRENT_TIMESTAMP,
                status = 'resolved',
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND faculty_id = $2
              AND hod_resolved_at IS NOT NULL
              AND faculty_confirmed_at IS NULL
              AND resolved_at IS NULL
            RETURNING *
        `, [grievanceId, req.user.userId]);

        if (result.rowCount === 0) {
            const existing = await pool.query(`
                SELECT faculty_confirmed_at, hod_resolved_at, resolved_at
                FROM faculty_hod_grievances
                WHERE id = $1 AND faculty_id = $2
            `, [grievanceId, req.user.userId]);
            if (existing.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Grievance not found.' });
            }
            return res.status(409).json({
                success: false,
                message: existing.rows[0].resolved_at
                    ? 'This grievance has already been resolved by both parties.'
                    : existing.rows[0].faculty_confirmed_at
                        ? 'You have already confirmed this grievance as resolved.'
                        : 'The HOD must mark this grievance resolved before you can confirm it.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Both parties confirmed resolution. The grievance is closed.',
            grievance: result.rows[0]
        });
    } catch (error) {
        console.error('Confirm faculty grievance resolution error:', error);
        return res.status(500).json({ success: false, message: 'Failed to confirm grievance resolution.' });
    }
}

async function markFacultyResolved(req, res) {
    return markResolved(req, res, 'faculty');
}

async function markStudentResolved(req, res) {
    return markResolved(req, res, 'student');
}

async function markResolved(req, res, role) {
    const grievanceId = Number(req.params.id);
    if (!Number.isInteger(grievanceId) || grievanceId < 1) {
        return res.status(400).json({ success: false, message: 'Invalid grievance ID.' });
    }
    const rawComment = req.body?.resolution_comment;
    if (rawComment !== undefined && typeof rawComment !== 'string') {
        return res.status(400).json({ success: false, message: 'Resolution comment must be text.' });
    }
    const resolutionComment = typeof rawComment === 'string' ? rawComment.trim() : '';
    if (resolutionComment.length > 2000) {
        return res.status(400).json({ success: false, message: 'Resolution comment must be 2000 characters or fewer.' });
    }

    try {
        await escalateOverdueGrievances();

        const partyColumn = role === 'faculty' ? 'faculty_id' : 'student_id';
        const timestampColumn = role === 'faculty' ? 'faculty_resolved_at' : 'student_resolved_at';
        const otherTimestampColumn = role === 'faculty' ? 'student_resolved_at' : 'faculty_resolved_at';

        const result = await pool.query(`
            UPDATE student_grievances
            SET ${timestampColumn} = CURRENT_TIMESTAMP,
                resolution_comment = ${role === 'faculty' ? '$3' : 'resolution_comment'},
                resolved_at = CASE
                    WHEN ${otherTimestampColumn} IS NOT NULL THEN CURRENT_TIMESTAMP
                    ELSE NULL
                END,
                status = CASE
                    WHEN ${otherTimestampColumn} IS NOT NULL THEN 'resolved'
                    WHEN escalated_at IS NOT NULL THEN 'escalated'
                    ELSE 'open'
                END,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $1
              AND ${partyColumn} = $2
              AND ${timestampColumn} IS NULL
              AND resolved_at IS NULL
              ${role === 'student' ? 'AND faculty_resolved_at IS NOT NULL' : ''}
            RETURNING *
        `, [grievanceId, req.user.userId, resolutionComment || null]);

        if (result.rowCount === 0) {
            const existing = await pool.query(`
                SELECT ${timestampColumn} AS marked_at, faculty_resolved_at, resolved_at
                FROM student_grievances
                WHERE id = $1 AND ${partyColumn} = $2
            `, [grievanceId, req.user.userId]);

            if (existing.rowCount === 0) {
                return res.status(404).json({ success: false, message: 'Grievance not found.' });
            }
            return res.status(409).json({
                success: false,
                message: existing.rows[0].resolved_at
                    ? 'This grievance has already been resolved by both parties.'
                    : existing.rows[0].marked_at
                        ? 'You have already marked this grievance as resolved.'
                        : role === 'student' && !existing.rows[0].faculty_resolved_at
                            ? 'The faculty member must mark this grievance resolved before you can confirm it.'
                            : 'This grievance could not be updated.'
            });
        }

        return res.status(200).json({
            success: true,
            message: result.rows[0].resolved_at
                ? 'Both parties confirmed resolution. The grievance is closed.'
                : 'Your resolution confirmation has been recorded.',
            grievance: result.rows[0]
        });
    } catch (error) {
        console.error(`Mark grievance resolved by ${role} error:`, error);
        return res.status(500).json({ success: false, message: 'Failed to record resolution.' });
    }
}

async function getHodEscalatedGrievances(req, res) {
    try {
        await escalateOverdueGrievances();
        const result = await pool.query(`
            SELECT grievance.*, student.name AS student_name,
                   faculty.name AS faculty_name, department.name AS department_name
            FROM student_grievances AS grievance
            JOIN users AS student ON student.id = grievance.student_id
            JOIN users AS faculty ON faculty.id = grievance.faculty_id
            JOIN departments AS department ON department.id = grievance.department_id
            WHERE grievance.escalated_to_hod_id = $1
              AND grievance.escalated_at IS NOT NULL
              AND grievance.resolved_at IS NULL
            ORDER BY grievance.escalated_at DESC, grievance.id DESC
        `, [req.user.userId]);

        return res.status(200).json({ success: true, grievances: result.rows });
    } catch (error) {
        console.error('Get HOD escalated grievances error:', error);
        return res.status(500).json({ success: false, message: 'Failed to load escalated grievances.' });
    }
}

module.exports = {
    getFacultyOptions,
    getStudentGrievances,
    fileGrievance,
    markStudentResolved,
    getFacultyGrievances,
    markFacultyResolved,
    getFacultyHodDepartments,
    fileFacultyHodGrievance,
    getFacultyHodGrievances,
    markFacultyHodConfirmed,
    getHodFacultyGrievances,
    markHodResolved,
    getHodEscalatedGrievances
};

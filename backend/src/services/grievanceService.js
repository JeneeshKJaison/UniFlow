const pool = require('../config/db');

async function escalateOverdueGrievances() {
    const result = await pool.query(`
        UPDATE student_grievances AS grievance
        SET status = 'escalated',
            escalated_at = CURRENT_TIMESTAMP,
            escalated_to_hod_id = department.hod_user_id,
            updated_at = CURRENT_TIMESTAMP
        FROM departments AS department
        WHERE grievance.department_id = department.id
          AND department.hod_user_id IS NOT NULL
          AND grievance.due_at <= CURRENT_TIMESTAMP
          AND grievance.resolved_at IS NULL
          AND grievance.escalated_at IS NULL
          AND (
              grievance.student_resolved_at IS NULL
              OR grievance.faculty_resolved_at IS NULL
          )
        RETURNING grievance.id
    `);

    return result.rowCount;
}

module.exports = { escalateOverdueGrievances };

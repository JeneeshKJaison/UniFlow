const pool = require('./db');

async function initGrievanceTables() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS student_grievances (
            id SERIAL PRIMARY KEY,
            student_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
            category VARCHAR(50) NOT NULL DEFAULT 'other',
            subject VARCHAR(200) NOT NULL,
            details TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'escalated', 'resolved')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            due_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
            student_resolved_at TIMESTAMPTZ,
            faculty_resolved_at TIMESTAMPTZ,
            resolved_at TIMESTAMPTZ,
            escalated_at TIMESTAMPTZ,
            escalated_to_hod_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS student_grievances_student_created_idx
            ON student_grievances (student_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS student_grievances_faculty_created_idx
            ON student_grievances (faculty_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS student_grievances_hod_escalated_idx
            ON student_grievances (escalated_to_hod_id, escalated_at DESC)
            WHERE escalated_at IS NOT NULL;

        CREATE TABLE IF NOT EXISTS faculty_hod_grievances (
            id SERIAL PRIMARY KEY,
            faculty_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            hod_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
            category VARCHAR(50) NOT NULL DEFAULT 'other',
            subject VARCHAR(200) NOT NULL,
            details TEXT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'open'
                CHECK (status IN ('open', 'resolved')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
            due_at TIMESTAMPTZ NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '7 days'),
            faculty_confirmed_at TIMESTAMPTZ,
            hod_resolved_at TIMESTAMPTZ,
            resolved_at TIMESTAMPTZ,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS faculty_hod_grievances_faculty_created_idx
            ON faculty_hod_grievances (faculty_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS faculty_hod_grievances_hod_created_idx
            ON faculty_hod_grievances (hod_id, created_at DESC);

        ALTER TABLE student_grievances
            ADD COLUMN IF NOT EXISTS resolution_comment TEXT;
        ALTER TABLE faculty_hod_grievances
            ADD COLUMN IF NOT EXISTS resolution_comment TEXT;
    `);
}

module.exports = initGrievanceTables;

const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const workloadRoutes = require("./routes/workloadRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const studentRoutes = require("./routes/studentRoutes");

const app = express();


// ==========================
// Middleware
// ==========================

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use("/api/workload", workloadRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/student", studentRoutes);


// ==========================
// Test Route
// ==========================

app.get('/', (req, res) => {
    res.json({
        message: 'UniFlow Backend is running!'
    });
});


// Auto-migrate task table columns if not exists & clear Linus Torvalds tasks
(async () => {
    try {
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS faculty_remark TEXT;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
        `);

        // Clear tasks for Linus Torvalds (linus@uniflow.edu)
        const clearLinusRes = await pool.query(`
            DELETE FROM tasks 
            WHERE assigned_to IN (SELECT id FROM users WHERE email = 'linus@uniflow.edu' OR name ILIKE '%Linus%')
            RETURNING id
        `);
        console.log(`✓ Task columns verified. Cleared ${clearLinusRes.rowCount} workload tasks for Linus Torvalds.`);
    } catch (e) {
        console.error('Task column migration check error:', e.message);
    }
})();

// ==========================
// Database Test Route
// ==========================

app.get('/api/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            success: true,
            message: 'Database connection successful',
            time: result.rows[0].now
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
});


// ==========================
// Start Server
// ==========================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`UniFlow Backend running on http://localhost:${PORT}`);
});
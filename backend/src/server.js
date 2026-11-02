const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const workloadRoutes = require("./routes/workloadRoutes");
const facultyRoutes = require("./routes/facultyRoutes");
const studentRoutes = require("./routes/studentRoutes");
const grievanceRoutes = require("./routes/grievanceRoutes");
const { escalateOverdueGrievances } = require('./services/grievanceService');

const app = express();


// ==========================
// Middleware
// ==========================

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../UI')));
app.use('/api/auth', authRoutes);
app.use("/api/workload", workloadRoutes);
app.use("/api/faculty", facultyRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/grievances", grievanceRoutes);


// ==========================
// Test Route
// ==========================

app.get('/', (req, res) => {
    res.json({
        message: 'UniFlow Backend is running!'
    });
});


const initWorkloadTables = require('./config/initWorkloadTables');
const initGrievanceTables = require('./config/initGrievanceTables');

// Auto-migrate task columns and initialize dependent workload tables before accepting requests.
const initializeDatabase = async () => {
    try {
        await pool.query(`
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS faculty_remark TEXT;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_filename VARCHAR(255);
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS attachment_url TEXT;
            ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP;
        `);

        console.log('✓ Task columns verified.');
        await initWorkloadTables();
        await initGrievanceTables();
        await escalateOverdueGrievances();
    } catch (e) {
        console.error('Database initialization failed:', e);
        throw e;
    }
};

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

initializeDatabase()
    .then(() => {
        const escalationInterval = setInterval(() => {
            escalateOverdueGrievances()
                .then((count) => {
                    if (count > 0) {
                        console.log(`✓ Automatically escalated ${count} overdue grievance(s).`);
                    }
                })
                .catch((error) => {
                    console.error('Automatic grievance escalation failed:', error);
                });
        }, 60_000);
        escalationInterval.unref();

        app.listen(PORT, () => {
            console.log(`UniFlow Backend running on http://localhost:${PORT}`);
        });
    })
    .catch(() => {
        process.exitCode = 1;
    });
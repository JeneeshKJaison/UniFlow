const express = require('express');
const cors = require('cors');
require('dotenv').config();

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const workloadRoutes = require("./routes/workloadRoutes");

const app = express();


// ==========================
// Middleware
// ==========================

app.use(cors());
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use("/api/workload", workloadRoutes);


// ==========================
// Test Route
// ==========================

app.get('/', (req, res) => {
    res.json({
        message: 'UniFlow Backend is running!'
    });
});


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
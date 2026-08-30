const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const pool = require('../config/db');


// ==========================================
// LOGIN
// ==========================================

const login = async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check input
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        // Find user
        const result = await pool.query(
            `
            SELECT
                id,
                custom_id,
                name,
                email,
                password_hash,
                role,
                is_hod
            FROM users
            WHERE LOWER(email) = LOWER($1)
            `,
            [email]
        );

        // User doesn't exist
        if (result.rows.length === 0) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        const user = result.rows[0];

        // Compare password
        const passwordMatch = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password'
            });
        }

        // Determine frontend role
        let frontendRole = user.role;

        if (user.role === 'faculty' && user.is_hod) {
            frontendRole = 'hod';
        }

        // Create JWT
        const token = jwt.sign(
            {
                userId: user.id,
                role: frontendRole,
                isHod: user.is_hod
            },
            process.env.JWT_SECRET,
            {
                expiresIn: '1d'
            }
        );

        // Return user information
        res.json({
            success: true,
            message: 'Login successful',

            token,

            user: {
                id: user.id,
                customId: user.custom_id,
                name: user.name,
                email: user.email,
                role: frontendRole,
                isHOD: user.is_hod
            }
        });

    } catch (error) {

        console.error('Login error:', error);

        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
};


module.exports = {
    login
};
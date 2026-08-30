const bcrypt = require('bcryptjs');
const pool = require('./src/config/db');


const users = [
    
    {
    id: 8,
    customId: 'ADM001',
    name: 'UniFlow Administrator',
    email: 'admin@uniflow.edu',
    password: 'admin123',
    role: 'admin',
    isHod: false
    },

    {
        id: 1,
        customId: 'HOD-CS01',
        name: 'Dr. Alan Turing',
        email: 'hod.cs@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: true
    },

    {
        id: 6,
        customId: 'HOD-ME02',
        name: 'Dr. Nikola Tesla',
        email: 'hod.me@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: true
    },

    {
        id: 7,
        customId: 'HOD-EE03',
        name: 'Dr. Marie Curie',
        email: 'hod.ee@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: true
    },

    {
        id: 2,
        customId: 'FAC001',
        name: 'Grace Hopper',
        email: 'faculty@uniflow.edu',
        password: 'faculty123',
        role: 'faculty',
        isHod: false
    },

    {
        id: 3,
        customId: 'FAC002',
        name: 'Linus Torvalds',
        email: 'linus@uniflow.edu',
        password: 'password123',
        role: 'faculty',
        isHod: false
    },

    {
        id: 4,
        customId: 'STU001',
        name: 'Ada Lovelace',
        email: 'student@uniflow.edu',
        password: 'student123',
        role: 'student',
        isHod: false
    },

    {
        id: 5,
        customId: 'STU002',
        name: 'Tim Berners-Lee',
        email: 'tim@uniflow.edu',
        password: 'password123',
        role: 'student',
        isHod: false
    }

];


async function seedUsers() {

    try {

        console.log('Seeding UniFlow users...');


        for (const user of users) {

            const passwordHash = await bcrypt.hash(
                user.password,
                10
            );


            await pool.query(
                `
                INSERT INTO users
                (
                    id,
                    custom_id,
                    name,
                    email,
                    password_hash,
                    role,
                    is_hod
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (id)
                DO UPDATE SET
                    custom_id = EXCLUDED.custom_id,
                    name = EXCLUDED.name,
                    email = EXCLUDED.email,
                    password_hash = EXCLUDED.password_hash,
                    role = EXCLUDED.role,
                    is_hod = EXCLUDED.is_hod
                `,
                [
                    user.id,
                    user.customId,
                    user.name,
                    user.email,
                    passwordHash,
                    user.role,
                    user.isHod
                ]
            );

            console.log(`✓ ${user.email}`);
        }


        // Reset sequence so future users get IDs after 7
        await pool.query(`
            SELECT setval(
                pg_get_serial_sequence('users', 'id'),
                COALESCE((SELECT MAX(id) FROM users), 1)
            )
        `);


        console.log('');
        console.log('Users seeded successfully!');

    } catch (error) {

        console.error('Seeding failed:', error);

    } finally {

        await pool.end();

    }
}


seedUsers();
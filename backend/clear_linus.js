const pool = require('./src/config/db');

async function run() {
    try {
        const linusUser = await pool.query("SELECT id, name FROM users WHERE email = 'linus@uniflow.edu'");
        if (linusUser.rows.length === 0) {
            console.log('Linus not found.');
            process.exit(0);
        }

        const linusId = linusUser.rows[0].id;
        const res = await pool.query('DELETE FROM tasks WHERE assigned_to = $1 RETURNING id', [linusId]);
        console.log(`Cleared ${res.rowCount} tasks for Linus Torvalds (ID ${linusId}).`);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();

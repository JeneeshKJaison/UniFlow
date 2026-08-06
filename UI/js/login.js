document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault(); // Prevent default form submission

        // Get the form values
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        // Determine role and route based on credentials
        if (email === 'admin@uniflow.edu' && password === 'admin123') {
            window.location.href = 'admin/dashboard.html';
        } else if (email === 'hod@uniflow.edu' && password === 'hod123') {
            window.location.href = 'hod/dashboard.html';
        } else if (email === 'faculty@uniflow.edu' && password === 'faculty123') {
            window.location.href = 'faculty/dashboard.html';
        } else if (email === 'student@uniflow.edu' && password === 'student123') {
            window.location.href = 'student/dashboard.html';
        } else {
            alert('Invalid Credentials. Please check your email and password.');
        }
    });
});

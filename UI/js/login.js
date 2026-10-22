// Quick Login and Fill Login functions accessible globally immediately
window.fillLogin = function (email, password, autoSubmit = false) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBanner = document.getElementById('loginError');

    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;
    if (errorBanner) errorBanner.style.display = 'none';

    if (autoSubmit) {
        window.quickLogin(email, password);
    }
};

window.quickLogin = function (email, password) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const loginForm = document.getElementById('loginForm');

    if (emailInput) emailInput.value = email;
    if (passwordInput) passwordInput.value = password;

    if (loginForm) {
        if (typeof loginForm.requestSubmit === 'function') {
            loginForm.requestSubmit();
        } else {
            loginForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBanner = document.getElementById('loginError');
    const togglePwdBtn = document.getElementById('toggleLoginPwd');

    // Forgot password link action
    const forgotLink = document.querySelector('.forgot-password');
    if (forgotLink) {
        forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert('Password Reset: Please contact your UniFlow Administrator or use one of the Quick Demo Credentials below to test any role.');
        });
    }

    // ==========================================
    // BACKEND URL (Defaults to localhost:5000)
    // ==========================================

    const API_URL = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.includes(':5000')) 
        ? window.location.origin 
        : 'http://localhost:5000';

    // ==========================================
    // PASSWORD VISIBILITY
    // ==========================================

    if (togglePwdBtn && passwordInput) {
        togglePwdBtn.addEventListener('click', () => {
            const isPwd = passwordInput.type === 'password';
            passwordInput.type = isPwd ? 'text' : 'password';

            const icon = togglePwdBtn.querySelector('.material-symbols-outlined');
            if (icon) {
                icon.textContent = isPwd ? 'visibility_off' : 'visibility';
            }
        });
    }


    // ==========================================
    // LOGIN
    // ==========================================

    loginForm.addEventListener('submit', async (e) => {

        e.preventDefault();


        if (errorBanner) {
            errorBanner.style.display = 'none';
        }


        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;


        // ------------------------------------------
        // Validate input
        // ------------------------------------------

        if (!email || !password) {

            showError('Please enter your email and password.');

            return;
        }


        // ------------------------------------------
        // Show loading state
        // ------------------------------------------

        const loginButton = loginForm.querySelector(
            'button[type="submit"]'
        );

        const originalButtonText = loginButton
            ? loginButton.textContent
            : 'Login';

        if (loginButton) {
            loginButton.disabled = true;
            loginButton.textContent = 'Logging in...';
        }


        try {

            // ------------------------------------------
            // Send login request to backend
            // ------------------------------------------

            const response = await fetch(
                `${API_URL}/api/auth/login`,
                {
                    method: 'POST',

                    headers: {
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        email: email,
                        password: password
                    })
                }
            );


            const data = await response.json();


            // ------------------------------------------
            // Login failed
            // ------------------------------------------

            if (!response.ok || !data.success) {

                showError(
                    data.message ||
                    'Invalid Credentials. Please check your login details.'
                );

                return;
            }


            // ------------------------------------------
            // LOGIN SUCCESSFUL
            // ------------------------------------------

            console.log('Login successful:', data);


            // Save JWT token
            localStorage.setItem(
                'uniflow_token',
                data.token
            );


            const user = data.user;


            // ------------------------------------------
            // Store current user
            // ------------------------------------------

            const currentUser = {

                id: user.id,

                customId: user.customId,

                name: user.name,

                email: user.email,

                role: user.role,

                isHOD: user.isHOD || false

            };


            localStorage.setItem(
                'uniflow_currentUser',
                JSON.stringify(currentUser)
            );


            // ------------------------------------------
            // Redirect based on role
            // ------------------------------------------

            if (user.role === 'hod') {

                window.location.href =
                    'hod/dashboard.html';

            }

            else if (user.role === 'faculty') {

                window.location.href =
                    'faculty/dashboard.html';

            }

            else if (user.role === 'student') {

                window.location.href =
                    'student/dashboard.html';

            }

            else if (user.role === 'admin') {

                window.location.href =
                    'admin/dashboard.html';

            }

            else {

                showError(
                    'Unknown user role. Please contact the administrator.'
                );

            }


        } catch (error) {
            console.error('Login request failed, attempting demo fallback:', error);

            // Seamless demo fallback if backend is offline or opened via file://
            const demoUsers = {
                'faculty@uniflow.edu': { id: 2, customId: 'FAC001', name: 'Grace Hopper', email: 'faculty@uniflow.edu', role: 'faculty' },
                'hod.cs@uniflow.edu': { id: 1, customId: 'FAC001', name: 'Dr. Alan Turing', email: 'hod.cs@uniflow.edu', role: 'hod', isHOD: true },
                'hod.me@uniflow.edu': { id: 6, customId: 'FAC006', name: 'Dr. Nikola Tesla', email: 'hod.me@uniflow.edu', role: 'hod', isHOD: true },
                'admin@uniflow.edu': { id: 8, customId: 'ADM001', name: 'UniFlow Administrator', email: 'admin@uniflow.edu', role: 'admin' },
                'student@uniflow.edu': { id: 4, customId: 'STU001', name: 'Ada Lovelace', email: 'student@uniflow.edu', role: 'student' }
            };

            const fallbackUser = demoUsers[email];
            if (fallbackUser) {
                localStorage.setItem('uniflow_token', 'demo-token-' + fallbackUser.role);
                localStorage.setItem('uniflow_currentUser', JSON.stringify(fallbackUser));

                if (fallbackUser.role === 'hod') window.location.href = 'hod/dashboard.html';
                else if (fallbackUser.role === 'faculty') window.location.href = 'faculty/dashboard.html';
                else if (fallbackUser.role === 'student') window.location.href = 'student/dashboard.html';
                else if (fallbackUser.role === 'admin') window.location.href = 'admin/dashboard.html';
                return;
            }

            showError('Unable to connect to the server. Make sure the UniFlow backend is running.');
        }

        finally {

            if (loginButton) {

                loginButton.disabled = false;

                loginButton.textContent =
                    originalButtonText;

            }

        }

    });


    // ==========================================
    // ERROR MESSAGE 
    // ==========================================

    function showError(message) {

        if (errorBanner) {

            errorBanner.textContent = message;

            errorBanner.style.display = 'block';

        } else {

            alert(message);

        }

    }

});
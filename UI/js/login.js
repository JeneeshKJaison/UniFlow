document.addEventListener('DOMContentLoaded', () => {

    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBanner = document.getElementById('loginError');
    const togglePwdBtn = document.getElementById('toggleLoginPwd');


    // ==========================================
    // BACKEND URL
    // ==========================================

    const API_URL = 'http://localhost:5000';


    // ==========================================
    // PASSWORD VISIBILITY
    // ==========================================

    if (togglePwdBtn && passwordInput) {

        togglePwdBtn.addEventListener('click', () => {

            const isPwd = passwordInput.type === 'password';

            passwordInput.type = isPwd ? 'text' : 'password';

            const icon = togglePwdBtn.querySelector(
                '.material-symbols-outlined'
            );

            if (icon) {
                icon.textContent = isPwd
                    ? 'visibility_off'
                    : 'visibility';
            }

        });

    }


    // ==========================================
    // AUTOFILL DEMO CREDENTIALS
    // ==========================================

    window.fillLogin = function (email, password) {

        if (emailInput) {
            emailInput.value = email;
        }

        if (passwordInput) {
            passwordInput.value = password;
        }

        if (errorBanner) {
            errorBanner.style.display = 'none';
        }

    };


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

            console.error('Login request failed:', error);

            showError(
                'Unable to connect to the server. Make sure the UniFlow backend is running.'
            );

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
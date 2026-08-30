document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBanner = document.getElementById('loginError');
    const togglePwdBtn = document.getElementById('toggleLoginPwd');

    // --- Ensure Default Data Exists in LocalStorage ---
    const defaultDataStore = {
        departments: [
            { id: 1, customId: 'DEP-CS01', name: 'Computer Science', currentHodId: 1 },
            { id: 2, customId: 'DEP-ME02', name: 'Mechanical Engineering', currentHodId: 6 },
            { id: 3, customId: 'DEP-EE03', name: 'Electrical Engineering', currentHodId: 7 },
            { id: 4, customId: 'DEP-CE04', name: 'Civil Engineering', currentHodId: null }
        ],
        courses: [
            { id: 1, deptId: 1, name: 'B.Tech Computer Science', semesters: 8 },
            { id: 2, deptId: 2, name: 'B.Tech Mechanical', semesters: 8 },
            { id: 3, deptId: 3, name: 'B.Tech Electrical', semesters: 8 },
            { id: 4, deptId: 4, name: 'B.Tech Civil', semesters: 8 }
        ],
        users: [
            { id: 1, customId: 'HOD-CS01', name: 'Dr. Alan Turing', email: 'hod.cs@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [1], courseId: null, semester: null, isHOD: true },
            { id: 6, customId: 'HOD-ME02', name: 'Dr. Nikola Tesla', email: 'hod.me@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [2], courseId: null, semester: null, isHOD: true },
            { id: 7, customId: 'HOD-EE03', name: 'Dr. Marie Curie', email: 'hod.ee@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [3], courseId: null, semester: null, isHOD: true },
            { id: 2, customId: 'FAC001', name: 'Grace Hopper', email: 'faculty@uniflow.edu', password: 'faculty123', role: 'faculty', deptIds: [1], courseId: null, semester: null, isHOD: false },
            { id: 3, customId: 'FAC002', name: 'Linus Torvalds', email: 'linus@uniflow.edu', password: 'password123', role: 'faculty', deptIds: [1], courseId: null, semester: null, isHOD: false },
            { id: 4, customId: 'STU001', name: 'Ada Lovelace', email: 'student@uniflow.edu', password: 'student123', role: 'student', deptIds: [1], courseId: 1, semester: 6, isHOD: false },
            { id: 5, customId: 'STU002', name: 'Tim Berners-Lee', email: 'tim@uniflow.edu', password: 'password123', role: 'student', deptIds: [1], courseId: 1, semester: 4, isHOD: false }
        ]
    };

    function getDataStore() {
        const stored = localStorage.getItem('uniflow_dataStore');
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch (e) {
                console.error(e);
            }
        }
        localStorage.setItem('uniflow_dataStore', JSON.stringify(defaultDataStore));
        return defaultDataStore;
    }

    // Initialize store
    getDataStore();

    // Toggle Password Visibility
    if (togglePwdBtn && passwordInput) {
        togglePwdBtn.addEventListener('click', () => {
            const isPwd = passwordInput.type === 'password';
            passwordInput.type = isPwd ? 'text' : 'password';
            const icon = togglePwdBtn.querySelector('.material-symbols-outlined');
            if (icon) icon.textContent = isPwd ? 'visibility_off' : 'visibility';
        });
    }

    // Global autofill helper
    window.fillLogin = function(email, password) {
        if (emailInput) emailInput.value = email;
        if (passwordInput) passwordInput.value = password;
        if (errorBanner) errorBanner.style.display = 'none';
    };

    // Form Submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (errorBanner) errorBanner.style.display = 'none';

        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;

        // 1. Super Admin Authentication
        if (email === 'admin@uniflow.edu' && (password === 'admin123' || password === 'admin')) {
            const adminUser = { role: 'admin', name: 'Super Admin', email: 'admin@uniflow.edu' };
            localStorage.setItem('uniflow_currentUser', JSON.stringify(adminUser));
            window.location.href = 'admin/dashboard.html';
            return;
        }

        const dataStore = getDataStore();
        const users = dataStore.users || [];
        const departments = dataStore.departments || [];
        const courses = dataStore.courses || [];

        // 2. Dynamic User Authentication from Data Store
        // Check exact email + password match, or check legacy fallback credentials
        let matchedUser = users.find(u => u.email.toLowerCase() === email && u.password === password);

        // Fallback for default aliases if user used old generic logins
        if (!matchedUser) {
            if (email === 'hod@uniflow.edu' && (password === 'hod123' || password === 'password123')) {
                matchedUser = users.find(u => u.isHOD) || users[0];
            } else if (email === 'faculty@uniflow.edu' && (password === 'faculty123' || password === 'password123')) {
                matchedUser = users.find(u => u.role === 'faculty' && !u.isHOD);
            } else if (email === 'student@uniflow.edu' && (password === 'student123' || password === 'password123')) {
                matchedUser = users.find(u => u.role === 'student');
            }
        }

        if (matchedUser) {
            // Find Department details
            const userDeptId = (matchedUser.deptIds && matchedUser.deptIds.length > 0) ? matchedUser.deptIds[0] : (matchedUser.deptId || 1);
            let dept = departments.find(d => d.id === userDeptId);
            if (!dept && matchedUser.isHOD) {
                dept = departments.find(d => d.currentHodId === matchedUser.id);
            }
            const deptName = dept ? dept.name : 'Department';

            // Check if HOD
            const isHodUser = matchedUser.isHOD || (dept && dept.currentHodId === matchedUser.id);

            if (isHodUser) {
                const currentUser = {
                    id: matchedUser.id,
                    customId: matchedUser.customId || 'HOD',
                    name: matchedUser.name,
                    email: matchedUser.email,
                    role: 'hod',
                    isHOD: true,
                    deptId: dept ? dept.id : 1,
                    deptName: deptName
                };
                localStorage.setItem('uniflow_currentUser', JSON.stringify(currentUser));
                window.location.href = 'hod/dashboard.html';
                return;
            }

            if (matchedUser.role === 'faculty') {
                const currentUser = {
                    id: matchedUser.id,
                    customId: matchedUser.customId || 'FAC',
                    name: matchedUser.name,
                    email: matchedUser.email,
                    role: 'faculty',
                    deptId: userDeptId,
                    deptName: deptName,
                    isHOD: false
                };
                localStorage.setItem('uniflow_currentUser', JSON.stringify(currentUser));
                window.location.href = 'faculty/dashboard.html';
                return;
            }

            if (matchedUser.role === 'student') {
                const course = courses.find(c => c.id === matchedUser.courseId);
                const currentUser = {
                    id: matchedUser.customId || `STU00${matchedUser.id}`,
                    name: matchedUser.name,
                    email: matchedUser.email,
                    role: 'student',
                    dept: deptName,
                    deptId: userDeptId,
                    courseId: matchedUser.courseId,
                    course: course ? course.name : (matchedUser.course || 'B.Tech Computer Science'),
                    semester: matchedUser.semester || 1
                };
                localStorage.setItem('uniflow_currentUser', JSON.stringify(currentUser));
                window.location.href = 'student/dashboard.html';
                return;
            }
        }

        // If credentials failed
        if (errorBanner) {
            errorBanner.textContent = 'Invalid Credentials. Please check your login email and password.';
            errorBanner.style.display = 'block';
        } else {
            alert('Invalid Credentials. Please check your login email and password.');
        }
    });
});

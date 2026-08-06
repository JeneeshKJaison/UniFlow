document.addEventListener('DOMContentLoaded', () => {
    // Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all nav items
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active class to clicked item
            item.classList.add('active');

            // Hide all sections
            sections.forEach(section => section.classList.remove('active'));
            
            // Show target section
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Populate data if logged in
    const currentUser = JSON.parse(localStorage.getItem('uniflow_currentUser'));
    if (currentUser && currentUser.role === 'student') {
        // Update header
        document.getElementById('headerStudentName').textContent = currentUser.name;
        document.getElementById('headerStudentInitials').textContent = currentUser.name.charAt(0).toUpperCase();

        // Update profile
        document.getElementById('profile-id').textContent = currentUser.id;
        document.getElementById('profile-name').textContent = currentUser.name;
        document.getElementById('profile-email').textContent = currentUser.email;
        document.getElementById('profile-dept').textContent = currentUser.dept;
        document.getElementById('profile-course').textContent = currentUser.course;
        
        if (currentUser.semester) {
            document.getElementById('stat-semester').textContent = currentUser.semester;
        }
    }
});

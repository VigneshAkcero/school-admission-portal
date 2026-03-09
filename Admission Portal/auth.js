/**
 * Auth.js - Handles session management and role-based access control.
 */
const Auth = {
    // Mock Users
    USERS: [
        { email: 'principal@alphabuddy.com', password: 'admin123', role: 'principal', dashboard: 'index.html' },
        { email: 'admin@alphabuddy.com', password: 'admin123', role: 'admin', dashboard: 'admin.html' }
    ],

    // Storage Keys
    SESSION_KEY: 'alphabuddy_session',

    init() {
        const currentPage = window.location.pathname.split('/').pop();
        const session = this.getSession();

        // Separate page for student login - no auth check needed there
        if (currentPage === 'student_login.html' || currentPage === 'test_portal.html') {
            return;
        }

        // If on login page and already logged in, redirect to dashboard
        if (currentPage === 'login.html') {
            if (session) {
                window.location.href = session.dashboard;
            }
            return;
        }

        // If not logged in and not on login page, redirect to login
        if (!session) {
            window.location.href = 'login.html';
            return;
        }

        // Role-based access control for specific dashboards
        if (currentPage === 'admin.html' && session.role !== 'admin') {
            window.location.href = 'index.html'; 
        }
    },

    async login(email, password) {
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const user = await response.json();
                const sessionData = {
                    email: user.email,
                    role: user.role,
                    dashboard: user.dashboard,
                    timestamp: Date.now()
                };
                localStorage.setItem(this.SESSION_KEY, JSON.stringify(sessionData));
                window.location.href = user.dashboard;
                return true;
            }
            return false;
        } catch (error) {
            console.error("Login error:", error);
            return false;
        }
    },

    logout() {
        localStorage.removeItem(this.SESSION_KEY);
        window.location.href = 'login.html';
    },

    getSession() {
        const session = localStorage.getItem(this.SESSION_KEY);
        return session ? JSON.parse(session) : null;
    }
};

// Initialize auth check immediately to prevent page flash
Auth.init();

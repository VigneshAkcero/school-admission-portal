// Shared Data Management via LocalStorage
const DEFAULT_APPLICANTS = [
    { id: 'ADM-2026-001', name: 'Jane Doe', score: 92, date: 'Mar 5, 2026', status: 'Approved', avatar: 'JD' },
    { id: 'ADM-2026-042', name: 'Michael Smith', score: 78, date: 'Mar 4, 2026', status: 'Pending', avatar: 'MS' },
    { id: 'ADM-2026-115', name: 'Alice Brown', score: 85, date: 'Mar 3, 2026', status: 'Approved', avatar: 'AB' },
    { id: 'ADM-2026-204', name: 'Robert Wilson', score: 45, date: 'Mar 2, 2026', status: 'Rejected', avatar: 'RW' },
    { id: 'ADM-2026-205', name: 'Sarah Jenkins', score: 88, date: 'Mar 1, 2026', status: 'Pending', avatar: 'SJ' },
    { id: 'ADM-2026-206', name: 'David Miller', score: 95, date: 'Feb 28, 2026', status: 'Approved', avatar: 'DM' },
];

const DEFAULT_TESTS = [
    { id: 'SCI-772', name: 'Science Entrance 2026', subject: 'Science', participants: 428, progress: 65, status: 'Active' },
    { id: 'LOG-102', name: 'Logic & Reasoning B', subject: 'Aptitude & Logic', participants: 1102, progress: 0, status: 'Scheduled' }
];

const API_URL = ''; // Relative paths work as the server serves the frontend

const PortalData = {
    async init() {
        // Initialization is mostly handled by Python server on startup
        console.log("Portal Data initialized with backend");
    },

    async getApplicants() {
        // Note: Applicants are still mock in index.html for UI, but could be moved to API
        return DEFAULT_APPLICANTS; 
    },

    async getTests() {
        const response = await fetch(`${API_URL}/api/tests`);
        return await response.json();
    },

    async saveTest(test) {
        const response = await fetch(`${API_URL}/api/tests/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(test)
        });
        return await response.json();
    },

    async updateTest(id, updates) {
        // Using saveTest for insert/update in this simple SQLite implementation
        const response = await fetch(`${API_URL}/api/tests/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({id, ...updates})
        });
        return await response.json();
    },

    async getStudents() {
        const response = await fetch(`${API_URL}/api/students`);
        return await response.json();
    },

    async saveStudent(studentData) {
        const response = await fetch(`${API_URL}/api/students/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData)
        });
        return await response.json();
    },

    async verifyStudent(code) {
        const response = await fetch(`${API_URL}/api/students/verify?code=${code}`);
        if (!response.ok) return null;
        return await response.json();
    },

    async saveSubmission(testCode, submissionData) {
        const response = await fetch(`${API_URL}/api/submissions/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ testCode, ...submissionData })
        });
        return await response.json();
    },

    async getSubmission(testCode) {
        // Not implemented in this phase, but could be added to API
        return null;
    }
};

// Global Interactivity
document.addEventListener('DOMContentLoaded', () => {
    PortalData.init();

    // Global Search Logic
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            // Dispatch a global search event that pages can listen to
            window.dispatchEvent(new CustomEvent('portalSearch', { detail: query }));
        });
    }

    // Active Tab Highlighting (if not already handled)
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href');
        if (href === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    // Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            Auth.logout();
        });
    }
});

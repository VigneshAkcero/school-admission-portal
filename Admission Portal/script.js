document.addEventListener('DOMContentLoaded', () => {
    // Shared Chart Config
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.color = '#64748b';
    Chart.defaults.plugins.tooltip.backgroundColor = '#0f172a';
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;

    // 1. Admission Trends Chart (Line Chart)
    const trendsCtx = document.getElementById('trendsChart').getContext('2d');
    const trendsGradient = trendsCtx.createLinearGradient(0, 0, 0, 400);
    trendsGradient.addColorStop(0, 'rgba(79, 70, 229, 0.4)');
    trendsGradient.addColorStop(1, 'rgba(79, 70, 229, 0)');

    new Chart(trendsCtx, {
        type: 'line',
        data: {
            labels: ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'],
            datasets: [{
                label: 'Applications',
                data: [450, 580, 520, 890, 1100, 1284],
                borderColor: '#4f46e5',
                borderWidth: 3,
                fill: true,
                backgroundColor: trendsGradient,
                tension: 0.4,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#4f46e5',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f1f5f9' },
                    border: { display: false }
                },
                x: {
                    grid: { display: false },
                    border: { display: false }
                }
            }
        }
    });

    // 2. Subject Proficiency Chart (Radar Chart)
    const subjectCtx = document.getElementById('subjectChart').getContext('2d');
    new Chart(subjectCtx, {
        type: 'radar',
        data: {
            labels: ['Math', 'Science', 'English', 'Aptitude', 'General Knowledge', 'Critical Thinking'],
            datasets: [{
                label: 'Avg Score',
                data: [85, 78, 92, 88, 70, 82],
                backgroundColor: 'rgba(79, 70, 229, 0.2)',
                borderColor: '#4f46e5',
                borderWidth: 2,
                pointBackgroundColor: '#4f46e5'
            }, {
                label: 'Passing Mark',
                data: [50, 50, 60, 55, 45, 50],
                backgroundColor: 'rgba(148, 163, 184, 0.1)',
                borderColor: '#94a3b8',
                borderWidth: 1,
                borderDash: [5, 5],
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 2.5,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 20 }
                }
            },
            scales: {
                r: {
                    angleLines: { color: '#f1f5f9' },
                    grid: { color: '#f1f5f9' },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    ticks: { display: false }
                }
            }
        }
    });

    // Interactivity: Search Box Focus (Handled in shared.js mostly, but keep styles)
    const searchInput = document.querySelector('.search-box input');
    if (searchInput) {
        searchInput.addEventListener('focus', () => {
            searchInput.parentElement.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)';
            searchInput.style.borderColor = '#4f46e5';
        });
        searchInput.addEventListener('blur', () => {
            searchInput.parentElement.style.boxShadow = 'none';
            searchInput.style.borderColor = '#e2e8f0';
        });
    }

    // Render Recent Applications from Shared Storage
    const renderApplications = (filter = '') => {
        const tableBody = document.querySelector('table tbody');
        if (!tableBody) return;

        const apps = PortalData.getApplicants().filter(a => 
            a.name.toLowerCase().includes(filter.toLowerCase()) || 
            a.id.toLowerCase().includes(filter.toLowerCase())
        ).slice(0, 5); // Show only top 5 for "Recent"

        tableBody.innerHTML = apps.map(app => `
            <tr>
                <td class="table-avatar-cell">
                    <div class="table-avatar">${app.avatar}</div>
                    ${app.name}
                </td>
                <td>#${app.id}</td>
                <td>${app.score}/100</td>
                <td>${app.date}</td>
                <td><span class="badge badge-${app.status.toLowerCase()}">${app.status}</span></td>
            </tr>
        `).join('');
    };

    renderApplications();

    // Listen for Global Search
    window.addEventListener('portalSearch', (e) => {
        renderApplications(e.detail);
    });

    // Handle "View All"
    const viewAllBtn = document.querySelector('.table-container .chart-header button');
    if (viewAllBtn) {
        viewAllBtn.onclick = () => window.location.href = 'applicants.html';
    }
});

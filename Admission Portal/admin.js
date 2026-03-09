document.addEventListener('DOMContentLoaded', () => {
    // 1. Handle Test Generation Form
    const testForm = document.getElementById('generateTestForm');
    const activeTestList = document.getElementById('activeTestList');
    let distributionChart = null;

    const renderStats = async () => {
        const tests = await PortalData.getTests();
        const activeTests = tests.filter(t => t.status === 'Active');
        const scheduledTests = tests.filter(t => t.status === 'Scheduled');
        
        const totalParticipants = activeTests.reduce((sum, t) => sum + t.participants, 0);
        const avgCompletion = activeTests.length > 0 
            ? Math.round(activeTests.reduce((sum, t) => sum + t.progress, 0) / activeTests.length) 
            : 0;

        document.getElementById('totalTests').textContent = tests.length;
        document.getElementById('activeParticipants').textContent = totalParticipants.toLocaleString();
        document.getElementById('avgCompletion').textContent = `${avgCompletion}%`;
        document.getElementById('scheduledTests').textContent = scheduledTests.length;
    };

    const updateDistributionChart = async () => {
        const tests = await PortalData.getTests();
        const subjects = {};
        tests.forEach(t => {
            subjects[t.subject] = (subjects[t.subject] || 0) + 1;
        });

        const ctx = document.getElementById('distributionChart').getContext('2d');
        
        if (distributionChart) {
            distributionChart.destroy();
        }

        distributionChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(subjects),
                datasets: [{
                    data: Object.values(subjects),
                    backgroundColor: [
                        '#6366f1',
                        '#10b981',
                        '#f59e0b',
                        '#f43f5e',
                        '#8b5cf6'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                aspectRatio: 1.5,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            font: { family: 'Inter', size: 12 }
                        }
                    }
                }
            }
        });
    };

    window.deleteTest = (id) => {
        if (confirm('Are you sure you want to remove this test session?')) {
            const tests = PortalData.getTests();
            const updatedTests = tests.filter(t => t.id !== id);
            localStorage.setItem('portal_tests', JSON.stringify(updatedTests));
            renderAll();
        }
    };

    const renderTests = async (filterString = '') => {
        const allTests = await PortalData.getTests();
        const tests = allTests.filter(t => 
            t.name.toLowerCase().includes(filterString.toLowerCase()) || 
            t.subject.toLowerCase().includes(filterString.toLowerCase())
        );
        activeTestList.innerHTML = tests.map((test, index) => `
            <div class="stat-card monitor-card animate-fade-in" style="margin-bottom: 1rem; animation-delay: ${index * 0.1}s; border-left-color: ${test.status === 'Scheduled' ? 'var(--warning)' : 'var(--primary)'}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        <h4 style="font-weight: 700;">${test.name}</h4>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
                            <p style="font-size: 0.8rem; color: var(--text-muted);">ID: #${test.id} | ${test.subject}</p>
                        </div>
                    </div>
                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
                        <span class="badge badge-${test.status === 'Active' ? 'success' : 'pending'}" style="display: flex; align-items: center; gap: 4px;">
                            <span class="status-indicator status-${test.status.toLowerCase()}"></span> ${test.status}
                        </span>
                        <button onclick="deleteTest('${test.id}')" style="background: none; border: none; color: var(--danger); cursor: pointer; display: flex; align-items: center; gap: 4px; font-size: 0.75rem; font-weight: 600;">
                            <i data-lucide="trash-2" style="width: 14px;"></i> Remove
                        </button>
                    </div>
                </div>
                <div style="margin-top: 1.25rem;">
                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-bottom: 0.5rem;">
                        <span>${test.status === 'Scheduled' ? 'Registered' : 'Participants'}: <strong>${test.participants.toLocaleString()}</strong></span>
                        <span>${test.status === 'Scheduled' ? 'Starts in' : 'Completion'}: <strong>${test.status === 'Scheduled' ? '2h 15m' : Math.round(test.progress) + '%'}</strong></span>
                    </div>
                    <div class="test-progress-bar">
                        <div class="progress-fill" style="width: ${test.progress}%; background: ${test.status === 'Scheduled' ? '#94a3b8' : 'var(--primary)'}"></div>
                    </div>
                </div>
            </div>
        `).join('');
        lucide.createIcons();
    };

    const renderStudents = async () => {
        const students = await PortalData.getStudents();
        const registeredStudentsList = document.getElementById('registeredStudentsList');
        if (!registeredStudentsList) return;

        registeredStudentsList.innerHTML = students.map((student, index) => `
            <tr class="animate-fade-in" style="animation-delay: ${index * 0.05}s">
                <td>
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-weight: 600;">${student.name}</span>
                        <span style="font-size: 0.75rem; color: var(--text-muted);">${student.parentName} (${student.parentMobile})</span>
                    </div>
                </td>
                <td><span class="badge badge-pending">Grade ${student.grade}</span></td>
                <td><code style="background: var(--surface-3); padding: 4px 8px; border-radius: 4px; font-weight: 700; color: var(--primary);">${student.testCode}</code></td>
            </tr>
        `).join('');
    };

    const renderAll = async () => {
        await renderTests();
        await renderStats();
        await updateDistributionChart();
        await renderStudents();
    };

    renderAll();

    // Student Registration Handler
    const studentForm = document.getElementById('studentRegistrationForm');
    if (studentForm) {
        studentForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('studentName').value;
            const parentName = document.getElementById('parentName').value;
            const parentMobile = document.getElementById('parentMobile').value;
            const grade = document.getElementById('studentGrade').value;

            const newStudent = { name, parentName, parentMobile, grade };

            const result = await PortalData.saveStudent(newStudent);
            if (result && result.testCode) {
                await renderAll();
                studentForm.reset();
                alert(`Student Registered! Code: ${result.testCode}`);
            }
            
            lucide.createIcons();
        });
    }

    testForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const testName = document.getElementById('testName').value;
        const testDate = document.getElementById('testDate').value;
        const testSubject = document.getElementById('testSubject').value;
        const testDuration = document.getElementById('testTime').value;

        const sessionID = Math.random().toString(36).substr(2, 3).toUpperCase() + '-' + Math.floor(Math.random() * 900 + 100);

        const newTestData = {
            id: sessionID,
            name: testName,
            subject: testSubject,
            participants: Math.floor(Math.random() * 500) + 50,
            progress: 0,
            status: 'Scheduled',
            date: testDate,
            duration: testDuration
        };

        await PortalData.saveTest(newTestData);
        await renderAll();
        testForm.reset();
    });

    // Listen for Global Search
    window.addEventListener('portalSearch', (e) => {
        renderTests(e.detail);
    });

    // 2. Simulate real-time progress for active tests
    setInterval(() => {
        const tests = PortalData.getTests();
        let changed = false;
        tests.forEach(test => {
            if (test.status === 'Active' && test.progress < 100) {
                test.progress += Math.random() * 0.5;
                if (test.progress > 100) test.progress = 100;
                changed = true;
            }
        });
        if (changed) {
            localStorage.setItem('portal_tests', JSON.stringify(tests));
            renderTests();
            renderStats(); // Update avg completion
        }
    }, 3000);
});

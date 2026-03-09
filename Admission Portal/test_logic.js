document.addEventListener('DOMContentLoaded', () => {
    const student = JSON.parse(sessionStorage.getItem('active_student'));
    
    if (!student) {
        window.location.href = 'student_login.html';
        return;
    }

    // Initialize UI
    document.getElementById('studentNameDisplay').textContent = student.name;
    document.getElementById('testCodeDisplay').textContent = `Test Code: ${student.testCode}`;
    document.getElementById('studentAvatar').textContent = student.name.split(' ').map(n => n[0]).join('').toUpperCase();

    // Map Grade to PDF
    // Grade extraction from code or student object
    const grade = student.grade;
    const pdfMap = {
        '1': 'CLASS 1 ADMISSION TEST Q.P.pdf',
        '2': 'CLASS 2 ADMISSION TEST Q.P.pdf',
        '3': 'CLASS 3 ADMISSION TEST Q.P.pdf',
        '4': 'CLASS 4 ADMISSION TEST Q.P.pdf',
        '5': 'CLASS 5 ADMISSION TEST Q.P.pdf',
        '6': 'CLASS 6 ADMISSION TEST Q.P.pdf',
        '7': 'CLASS 7 ADMISSION TEST Q.P.pdf',
        '8': 'CLASS 8 ADMISSION TEST Q.P.pdf',
        '9': 'CLASS 9 ADMISSION TEST Q.P.pdf'
    };

    const pdfFile = pdfMap[grade] || 'CLASS 5 ADMISSION TEST Q.P.pdf'; // Fallback
    const pdfPath = `Test Resources/${pdfFile}`;
    document.getElementById('pdfFrame').src = pdfPath;

    // Generate Answer Sheet (50 questions for now, can be adjusted)
    const questionsList = document.getElementById('questionsList');
    const numQuestions = 50;
    const answers = {};

    for (let i = 1; i <= numQuestions; i++) {
        const row = document.createElement('div');
        row.className = 'question-row';
        row.innerHTML = `
            <div class="q-number">${i}</div>
            <div class="options-group">
                <button class="option-btn" data-q="${i}" data-v="A">A</button>
                <button class="option-btn" data-q="${i}" data-v="B">B</button>
                <button class="option-btn" data-q="${i}" data-v="C">C</button>
                <button class="option-btn" data-q="${i}" data-v="D">D</button>
            </div>
        `;
        questionsList.appendChild(row);
    }

    // Handle Option Selection
    questionsList.addEventListener('click', (e) => {
        if (e.target.classList.contains('option-btn')) {
            const q = e.target.getAttribute('data-q');
            const v = e.target.getAttribute('data-v');
            
            // Unselect siblings
            const buttons = e.target.parentElement.querySelectorAll('.option-btn');
            buttons.forEach(btn => btn.classList.remove('selected'));
            
            e.target.classList.add('selected');
            answers[q] = v;
        }
    });

    // Timer Logic
    let timeLeft = 60 * 60; // 60 minutes
    const timerText = document.getElementById('timerText');
    
    const updateTimer = () => {
        const mins = Math.floor(timeLeft / 60);
        const secs = timeLeft % 60;
        timerText.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        
        if (timeLeft <= 300) { // Last 5 minutes
            document.getElementById('testTimer').classList.add('timer-urgent');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            autoSubmit();
        }
        timeLeft--;
    };

    const timerInterval = setInterval(updateTimer, 1000);
    updateTimer();

    // Submission Logic
    const submitBtn = document.getElementById('submitTestBtn');
    const overlay = document.getElementById('modalOverlay');
    const modalContent = document.getElementById('modalContent');

    const showModal = (content) => {
        modalContent.innerHTML = content;
        overlay.style.display = 'flex';
    };

    const confirmSubmit = () => {
        const answeredCount = Object.keys(answers).length;
        showModal(`
            <div class="text-center">
                <i data-lucide="help-circle" style="width: 48px; color: var(--primary); margin-bottom: 1.5rem;"></i>
                <h2 class="title-outfit">Submit Examination?</h2>
                <p class="text-muted mt-2">You have answered ${answeredCount} out of ${numQuestions} questions.</p>
                <div class="mt-8 flex gap-4">
                    <button id="cancelSubmit" class="btn" style="background: var(--surface-3); flex: 1; justify-content: center;">Review</button>
                    <button id="finalSubmit" class="btn btn-primary" style="flex: 1; justify-content: center;">Confirm Submission</button>
                </div>
            </div>
        `);
        lucide.createIcons();

        document.getElementById('cancelSubmit').onclick = () => overlay.style.display = 'none';
        document.getElementById('finalSubmit').onclick = finalizeSubmission;
    };

    const finalizeSubmission = async () => {
        clearInterval(timerInterval);
        const score = 0; // In a real app, calculate this with answer keys
        
        const submissionData = {
            studentName: student.name,
            grade: student.grade,
            answers: answers,
            score: score,
            duration: 3600 - timeLeft
        };

        await PortalData.saveSubmission(student.testCode, submissionData);
        
        showModal(`
            <div class="text-center">
                <i data-lucide="check-circle" style="width: 64px; color: var(--success); margin-bottom: 1.5rem;"></i>
                <h2 class="title-outfit">Test Submitted Successfully!</h2>
                <p class="text-muted mt-2">Your responses have been recorded. You can now close this window or return to the home page.</p>
                <button onclick="window.location.href='index.html'" class="btn btn-primary btn-full mt-8">Return to Dashboard</button>
            </div>
        `);
        lucide.createIcons();
        sessionStorage.removeItem('active_student');
    };

    const autoSubmit = () => {
        showModal(`
            <div class="text-center">
                <h2 class="title-outfit">Time Limit Exceeded!</h2>
                <p class="text-muted">Your examination is being automatically submitted.</p>
            </div>
        `);
        setTimeout(finalizeSubmission, 2000);
    };

    submitBtn.onclick = confirmSubmit;
});

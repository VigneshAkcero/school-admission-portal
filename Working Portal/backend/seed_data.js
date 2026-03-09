const { Pool } = require("pg");

const pool = new Pool({
    connectionString: "postgres://postgres:password@localhost:5432/montessori_admission",
});

const grades = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const names = [
    "Arjun Sharma", "Priya Patel", "Rohan Gupta", "Ananya Iyer", "Vikram Singh",
    "Saira Khan", "Ishaan Malhotra", "Meera Reddy", "Aditya Joshi", "Zara Ahmed",
    "Karthik Nair", "Sana Mirza", "Kabir Das", "Aisha Begum", "Rishi Kapoor",
    " Kavya Rao", "Siddharth Verma", "Tanvi Shah", "Rayan Sheikh", "Dia Banerjee",
    "Vivaan Choudhury", "Myra Saxena", "Arav Batra", "Navya Mehra", "Reyansh Kapoor",
    "Shanaya Gill", "Advait Pandey", "Aaradhya Singh", "Atharv Kulkarni", "Kaira Deshmukh",
    "Ishanvi Bose", "Vihaan Chatterjee", "Prisha Sen", "Abhimanyu Mukherjee", "Anika Roy",
    "Dhruv Goswami", "Avni Mishra", "Shaurya Dubery", "Vanya Tiwari", "Rudransh Shukla",
    "Amaira Pathak", "Ayansh Chaudhary", "Zoya Siddiqui", "Hamza Ali", "Sara Khan",
    "Yusuf Malik", "Fatima Zaid", "Omar Farooq", "Mariam Hussain", "Zaid Qureshi",
    "Eshaal Fatima", "Mustafa Ahmed", "Hiba Noor", "Arish Khan", "Inaya Syed", "Rayyan Khan"
];
const parents = ["Rajesh", "Sunita", "Amit", "Deepa", "Sanjay", "Farah", "Rahul", "Laxmi", "Vinod", "Rukhsar"];
const statuses = ["pending", "test_scheduled", "test_started", "test_completed", "approved", "rejected"];

async function seed() {
    console.log("Seeding data with valid UUIDs...");

    // Get a valid user ID (admin)
    const userRes = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (userRes.rows.length === 0) {
        console.error("No admin user found. Run migration first.");
        process.exit(1);
    }
    const adminId = userRes.rows[0].id;

    for (let i = 0; i < names.length; i++) {
        const name = names[i];
        const parent = parents[Math.floor(Math.random() * parents.length)];
        const mobile = "98" + Math.floor(10000000 + Math.random() * 90000000);
        const grade = grades[Math.floor(Math.random() * grades.length)];
        const status = statuses[Math.floor(Math.random() * statuses.length)];

        const now = new Date();
        const yy = now.getFullYear().toString().slice(-2);
        const mm = (now.getMonth() + 1).toString().padStart(2, "0");
        const gg = grade.toString().padStart(2, "0");
        const serial = (i + 50).toString().padStart(3, "0");
        const testCode = `${yy}${mm}${gg}${serial}`;

        let score_english = null;
        let score_math = null;
        let score_science_evs = null;
        let score_telugu = null;
        let score_hindi = null;
        let score = null;
        let test_started_at = null;
        let test_completed_at = null;

        if (["test_completed", "approved", "rejected"].includes(status)) {
            score_english = Math.floor(Math.random() * 20);
            score_math = Math.floor(Math.random() * 20);
            score_science_evs = Math.floor(Math.random() * 20);
            score_telugu = Math.floor(Math.random() * 20);
            score_hindi = Math.floor(Math.random() * 20);
            score = score_english + score_math + score_science_evs + score_telugu + score_hindi;

            const start = new Date();
            start.setMinutes(start.getMinutes() - 45 - Math.floor(Math.random() * 60));
            test_started_at = start.toISOString();

            const end = new Date(start);
            end.setMinutes(end.getMinutes() + 40 + Math.floor(Math.random() * 5));
            test_completed_at = end.toISOString();
        }

        const appliedAt = new Date();
        appliedAt.setDate(appliedAt.getDate() - Math.floor(Math.random() * 30));

        await pool.query(
            `INSERT INTO applicants (
                student_name, parent_name, mobile_number, grade, status, 
                test_code, score_english, score_math, score_science_evs, score_telugu, score_hindi, score,
                test_started_at, test_completed_at, applied_at, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
            [
                name, parent, mobile, grade, status,
                testCode, score_english, score_math, score_science_evs, score_telugu, score_hindi, score,
                test_started_at, test_completed_at, appliedAt.toISOString(), adminId
            ]
        );
    }

    console.log("Seeding complete: " + names.length + " applicants added.");
    process.exit(0);
}

seed().catch(err => {
    console.error(err);
    process.exit(1);
});

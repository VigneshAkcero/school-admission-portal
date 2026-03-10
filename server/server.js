import express from "express";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

// Mock data
const mockSlots = [
  { date: "2026-03-15", weekday: "Sat", day: 15, month: "Mar", fullLabel: "Saturday, March 15, 2026" },
  { date: "2026-03-16", weekday: "Sun", day: 16, month: "Mar", fullLabel: "Sunday, March 16, 2026" },
  { date: "2026-03-22", weekday: "Sat", day: 22, month: "Mar", fullLabel: "Saturday, March 22, 2026" },
  { date: "2026-03-23", weekday: "Sun", day: 23, month: "Mar", fullLabel: "Sunday, March 23, 2026" },
  { date: "2026-03-29", weekday: "Sat", day: 29, month: "Mar", fullLabel: "Saturday, March 29, 2026" },
  { date: "2026-03-30", weekday: "Sun", day: 30, month: "Mar", fullLabel: "Sunday, March 30, 2026" },
];

// API endpoint for getting available slots
app.get("/api/parent/slots", (req, res) => {
  res.json({
    slots: mockSlots,
    success: true,
  });
});

// API endpoint for registration
app.post("/api/parent/register", (req, res) => {
  const { studentName, parentName, mobileNumber, grade, preferredTestDate, preferredTestSlot } = req.body;

  // Validate input
  if (!studentName || !parentName || !mobileNumber || !grade || !preferredTestDate || !preferredTestSlot) {
    return res.status(400).json({
      error: "Missing required fields",
    });
  }

  // Generate application ID and registration code
  const applicationId = `APP-${Date.now()}`;
  const registrationCode = `REG-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

  res.json({
    success: true,
    applicationId,
    studentName,
    registrationCode,
    amount: 50000, // 500 INR in paise
    amountDisplay: "₹500",
  });
});

// Login endpoint for admin
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;

  // Simple mock authentication
  if (username === "admin" && password === "admin123") {
    res.json({
      user: {
        id: "admin-001",
        email: "admin@montessori.local",
        name: "Admin User",
        role: "admin",
      },
      token: "mock-token-" + Date.now(),
    });
  } else if (username === "principal" && password === "principal123") {
    res.json({
      user: {
        id: "principal-001",
        email: "principal@montessori.local",
        name: "Principal",
        role: "principal",
      },
      token: "mock-token-" + Date.now(),
    });
  } else {
    res.status(401).json({
      error: "Invalid username or password",
    });
  }
});

app.listen(PORT, () => {
  console.log(`School Admission Portal Backend running on http://localhost:${PORT}`);
});

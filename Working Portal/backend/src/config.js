const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const parseOrigins = (value, fallbackList) => {
  const source = (value || "").trim();
  if (!source) {
    return fallbackList;
  }

  return source
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
};

const config = {
  port: Number(process.env.PORT || 4000),
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  adminOrigins: parseOrigins(process.env.ADMIN_ORIGIN, [
    "http://localhost:3300",
    "http://127.0.0.1:3300",
  ]),
  studentOrigins: parseOrigins(process.env.STUDENT_ORIGIN, [
    "http://localhost:3301",
    "http://127.0.0.1:3301",
  ]),
};

if (!config.dbUrl) {
  throw new Error("DATABASE_URL is required");
}

module.exports = config;

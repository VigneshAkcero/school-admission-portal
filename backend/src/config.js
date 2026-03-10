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

const PRIVATE_HOST_PATTERN =
  /^(localhost|127\.0\.0\.1|10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})$/;

function isAllowedOrigin(origin, allowedOrigins, expectedPort) {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;

  try {
    const parsed = new URL(origin);
    return ["http:", "https:"].includes(parsed.protocol) && parsed.port === expectedPort && PRIVATE_HOST_PATTERN.test(parsed.hostname);
  } catch {
    return false;
  }
}

const config = {
  port: Number(process.env.PORT || 4000),
  https: String(process.env.HTTPS || "false").toLowerCase() === "true",
  httpsKeyPath: path.resolve(process.cwd(), process.env.HTTPS_KEY_PATH || "../certs/dev.key"),
  httpsCertPath: path.resolve(process.cwd(), process.env.HTTPS_CERT_PATH || "../certs/dev.crt"),
  httpsCaPath: process.env.HTTPS_CA_PATH ? path.resolve(process.cwd(), process.env.HTTPS_CA_PATH) : null,
  dbUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET || "dev-secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
  adminOrigins: parseOrigins(process.env.ADMIN_ORIGIN, [
    "http://localhost:3300",
    "http://127.0.0.1:3300",
    "https://localhost:3300",
    "https://127.0.0.1:3300",
  ]),
  studentOrigins: parseOrigins(process.env.STUDENT_ORIGIN, [
    "http://localhost:3301",
    "http://127.0.0.1:3301",
    "https://localhost:3301",
    "https://127.0.0.1:3301",
  ]),
  isAllowedAdminOrigin(origin) {
    return isAllowedOrigin(origin, this.adminOrigins, "3300");
  },
  isAllowedStudentOrigin(origin) {
    return isAllowedOrigin(origin, this.studentOrigins, "3301");
  },
};

if (!config.dbUrl) {
  throw new Error("DATABASE_URL is required");
}

module.exports = config;

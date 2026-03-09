const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const pool = require("./pool");
require("../config");

function parseArgs() {
  const args = process.argv.slice(2);
  const map = {};
  for (let i = 0; i < args.length; i += 1) {
    const item = args[i];
    if (!item.startsWith("--")) continue;
    const key = item.slice(2);
    const value = args[i + 1];
    map[key] = value;
    i += 1;
  }
  return map;
}

async function upsertUser(user) {
  const hash = await bcrypt.hash(user.password, 10);
  await pool.query(
    `INSERT INTO users (email, password_hash, role, name)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, name = EXCLUDED.name`,
    [user.email.toLowerCase(), hash, user.role, user.name],
  );
}

async function main() {
  const args = parseArgs();
  let users = [];

  if (args.config) {
    const configPath = path.resolve(process.cwd(), args.config);
    const raw = fs.readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw);
    users = Array.isArray(parsed) ? parsed : [parsed];
  } else {
    users = [
      {
        name: args.name || "Admin User",
        email: args.email,
        password: args.password,
        role: args.role || "admin",
      },
    ];
  }

  for (const user of users) {
    if (!user.email || !user.password || !["admin", "principal", "receptionist"].includes(user.role)) {
      throw new Error("Each user needs email, password, and role (admin|principal|receptionist)");
    }
    await upsertUser(user);
    console.log(`Upserted ${user.role} user: ${user.email}`);
  }

  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

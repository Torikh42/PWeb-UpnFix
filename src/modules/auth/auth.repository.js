import db from "@/lib/db";

export async function findUserByEmail(email) {
  const [users] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
  return users.length > 0 ? users[0] : null;
}

export async function createUser(fullName, email, hashedPassword) {
  const [result] = await db.query(
    "INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)",
    [fullName, email, hashedPassword]
  );
  return result.insertId;
}

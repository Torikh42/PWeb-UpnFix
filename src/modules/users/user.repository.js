import db from "@/lib/db";

export async function findAllUsers() {
  const [rows] = await db.query(
    "SELECT id, full_name, email, role, created_at FROM users"
  );
  return rows;
}

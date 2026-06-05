import db from "@/lib/db";

export async function findAllReports(status, category, sortBy) {
  let query = `
    SELECT 
      reports.*, 
      users.full_name 
    FROM reports 
    JOIN users ON reports.user_id = users.id
  `;
  const params = [];

  const whereClauses = [];
  if (status && status !== "ALL") {
    whereClauses.push("reports.status = ?");
    params.push(status);
  }
  if (category && category !== "ALL") {
    whereClauses.push("reports.category = ?");
    params.push(category);
  }

  if (whereClauses.length > 0) {
    query += " WHERE " + whereClauses.join(" AND ");
  }

  query += ` ORDER BY reports.created_at ${sortBy === "oldest" ? "ASC" : "DESC"}`;

  const [reports] = await db.query(query, params);
  return reports;
}

export async function createReport(userId, title, description, location, category, imageUrl) {
  const [result] = await db.query(
    "INSERT INTO reports (user_id, title, description, location, category, image_url) VALUES (?, ?, ?, ?, ?, ?)",
    [userId, title, description, location, category, imageUrl]
  );
  return result.insertId;
}

export async function findReportById(reportId) {
  const [reports] = await db.query("SELECT * FROM reports WHERE id = ?", [reportId]);
  return reports.length > 0 ? reports[0] : null;
}

export async function updateReportStatus(reportId, status) {
  const [result] = await db.query("UPDATE reports SET status = ? WHERE id = ?", [status, reportId]);
  return result.affectedRows > 0;
}

export async function deleteReportById(reportId) {
  await db.query("DELETE FROM reports WHERE id = ?", [reportId]);
}

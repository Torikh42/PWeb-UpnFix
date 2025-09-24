import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") || "newest"; // Default sort by newest

    // Start building the query
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

    // Add sorting
    query += ` ORDER BY reports.created_at ${
      sortBy === "oldest" ? "ASC" : "DESC"
    }`;

    const [reports] = await db.query(query, params);

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Get all reports API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

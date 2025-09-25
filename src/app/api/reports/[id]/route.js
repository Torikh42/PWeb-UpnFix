import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import db from "@/lib/db";
import jwt from "jsonwebtoken";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getPublicId(imageUrl) {
  const parts = imageUrl.split("/");
  const lastPart = parts.pop();
  const publicId = lastPart.split(".")[0];
  return publicId;
}

export async function DELETE(request, { params }) {
  try {
    const { id: reportId } = await params;

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    const [reports] = await db.query("SELECT * FROM reports WHERE id = ?", [
      reportId,
    ]);
    if (reports.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const report = reports[0];

    if (report.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const publicId = getPublicId(report.image_url);
    if (publicId) {
      await cloudinary.uploader.destroy(publicId);
    }

    await db.query("DELETE FROM reports WHERE id = ? AND user_id = ?", [
      reportId,
      userId,
    ]);

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report API error:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import db from "@/lib/db";
import { jwtVerify } from "jose";

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET environment variable is not set");
  }
  return new TextEncoder().encode(secret);
}

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

export async function PATCH(request, { params }) {
  try {
    const { id: reportId } = await params;
    const { status } = await request.json();

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      decoded = payload;
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (decoded.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedStatus = ["PENDING", "DIPROSES", "SELESAI"];
    if (!allowedStatus.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const [result] = await db.query(
      "UPDATE reports SET status = ? WHERE id = ?",
      [status, reportId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Report status updated successfully" });
  } catch (error) {
    console.error("Update report status API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { params } = await context; 
    const { id: reportId } = params;

    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let decoded;
    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey());
      decoded = payload;
    } catch (err) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const [reports] = await db.query("SELECT * FROM reports WHERE id = ?", [
      reportId,
    ]);
    if (reports.length === 0) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    const report = reports[0];

    const isOwner = report.user_id === decoded.id;
    const isAdmin = decoded.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (report.image_url) {
      const publicId = getPublicId(report.image_url);
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
    }

    await db.query("DELETE FROM reports WHERE id = ?", [reportId]);

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

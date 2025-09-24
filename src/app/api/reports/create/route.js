import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import db from "@/lib/db";
import jwt from "jsonwebtoken";

// Konfigurasi Cloudinary dengan environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request) {
  try {
    // 1. Otentikasi Pengguna
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id;

    // 2. Ambil data dari form (multipart/form-data)
    const formData = await request.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const location = formData.get("location");
    const category = formData.get("category");
    const file = formData.get("file");

    if (!title || !description || !location || !category || !file) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      );
    }

    // 3. Upload gambar ke Cloudinary
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ resource_type: "image" }, (err, result) => {
          if (err) reject(err);
          resolve(result);
        })
        .end(buffer);
    });

    if (!uploadResult || !uploadResult.secure_url) {
      throw new Error("Cloudinary upload failed");
    }

    const imageUrl = uploadResult.secure_url;

    // 4. Simpan data laporan ke database
    const [result] = await db.query(
      "INSERT INTO reports (user_id, title, description, location, category, image_url) VALUES (?, ?, ?, ?, ?, ?)",
      [userId, title, description, location, category, imageUrl]
    );

    return NextResponse.json(
      {
        message: "Report created successfully",
        reportId: result.insertId,
        imageUrl,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create report API error:", error);
    if (error.name === "JsonWebTokenError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

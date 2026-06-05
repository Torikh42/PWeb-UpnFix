import { v2 as cloudinary } from "cloudinary";
import { jwtVerify } from "jose";
import {
  findAllReports,
  createReport,
  findReportById,
  updateReportStatus,
  deleteReportById,
} from "./report.repository";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function getJwtSecretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(secret);
}

function getPublicId(imageUrl) {
  const parts = imageUrl.split("/");
  const lastPart = parts.pop();
  return lastPart.split(".")[0];
}

export async function verifyToken(token) {
  if (!token) throw new Error("Unauthorized");
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    return payload;
  } catch (err) {
    throw new Error("Invalid token");
  }
}

export async function getReports(status, category, sortBy) {
  return await findAllReports(status, category, sortBy);
}

export async function submitReport(userPayload, title, description, location, category, file) {
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

  const reportId = await createReport(
    userPayload.id,
    title,
    description,
    location,
    category,
    uploadResult.secure_url
  );

  return { reportId, imageUrl: uploadResult.secure_url };
}

export async function changeReportStatus(userPayload, reportId, status) {
  if (userPayload.role !== "ADMIN") throw new Error("Forbidden");

  const success = await updateReportStatus(reportId, status);
  if (!success) throw new Error("Report not found");
}

export async function removeReport(userPayload, reportId) {
  const report = await findReportById(reportId);
  if (!report) throw new Error("Report not found");

  const isOwner = report.user_id === userPayload.id;
  const isAdmin = userPayload.role === "ADMIN";

  if (!isOwner && !isAdmin) throw new Error("Forbidden");

  if (report.image_url) {
    const publicId = getPublicId(report.image_url);
    if (publicId) await cloudinary.uploader.destroy(publicId);
  }

  await deleteReportById(reportId);
}

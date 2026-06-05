import { NextResponse } from "next/server";
import { updateStatusSchema } from "./report.schema";
import { getReports, submitReport, changeReportStatus, removeReport, verifyToken } from "./report.service";

export async function getAllReportsHandler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const category = searchParams.get("category");
    const sortBy = searchParams.get("sortBy") || "newest";

    const reports = await getReports(status, category, sortBy);
    return NextResponse.json(reports);
  } catch (error) {
    console.error("Get all reports API error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function createReportHandler(request) {
  try {
    const token = request.cookies.get("token")?.value;
    const userPayload = await verifyToken(token);

    const formData = await request.formData();
    const title = formData.get("title");
    const description = formData.get("description");
    const location = formData.get("location");
    const category = formData.get("category");
    const file = formData.get("file");

    if (!title || !description || !location || !category || !file) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    const { reportId, imageUrl } = await submitReport(
      userPayload, title, description, location, category, file
    );

    return NextResponse.json(
      { message: "Report created successfully", reportId, imageUrl },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create report API error:", error);
    if (error.message === "Unauthorized" || error.message === "Invalid token") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function updateReportHandler(request, { params }) {
  try {
    const { id: reportId } = await params;
    const body = await request.json();

    const { error, value } = updateStatusSchema.validate(body);
    if (error) {
      return NextResponse.json({ error: "Invalid input", details: error.details[0].message }, { status: 400 });
    }

    const token = request.cookies.get("token")?.value;
    const userPayload = await verifyToken(token);

    await changeReportStatus(userPayload, reportId, value.status);

    return NextResponse.json({ message: "Report status updated successfully" });
  } catch (error) {
    console.error("Update report status API error:", error);
    if (error.message === "Unauthorized" || error.message === "Invalid token") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message === "Report not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function deleteReportHandler(request, context) {
  try {
    const { params } = await context;
    const { id: reportId } = params;

    const token = request.cookies.get("token")?.value;
    const userPayload = await verifyToken(token);

    await removeReport(userPayload, reportId);

    return NextResponse.json({ message: "Report deleted successfully" });
  } catch (error) {
    console.error("Delete report API error:", error);
    if (error.message === "Unauthorized" || error.message === "Invalid token") {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error.message === "Forbidden") {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error.message === "Report not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

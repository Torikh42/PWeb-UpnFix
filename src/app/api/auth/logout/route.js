import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const response = NextResponse.json({ message: "Logout successful" });
    response.cookies.set("token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (err) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

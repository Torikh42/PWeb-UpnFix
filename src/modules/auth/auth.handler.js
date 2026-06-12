import { NextResponse } from "next/server";
import { loginSchema, signupSchema } from "./auth.schema";
import { login, register } from "./auth.service";
import { checkFortressConnectivity } from "@/lib/fortress";

export async function loginHandler(request) {
  try {
    const body = await request.json();

    const { error, value } = loginSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { error: "Invalid input", details: error.details[0].message },
        { status: 400 }
      );
    }

    const { email, password } = value;
    
    // Call Service
    const { user, token } = await login(email, password);

    // Verifikasi integrasi konektivitas dengan Apache Fortress LDAP
    await checkFortressConnectivity();

    const response = NextResponse.json({
      message: "Login successful",
      user,
    });

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24,
    });

    return response;
  } catch (err) {
    if (err.message === "Invalid email or password") {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    console.error("Login API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function signupHandler(request) {
  try {
    const body = await request.json();

    const { error, value } = signupSchema.validate(body);
    if (error) {
      return NextResponse.json(
        { error: "Invalid input", details: error.details[0].message },
        { status: 400 }
      );
    }

    const { full_name, email, password } = value;
    
    // Call Service
    const userId = await register(full_name, email, password);

    return NextResponse.json(
      { message: "User created successfully", userId },
      { status: 201 }
    );
  } catch (err) {
    if (err.message === "Email already exists") {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("Signup API Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function logoutHandler(request) {
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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import Joi from "joi";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import db from "../../../../lib/db";

const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

export async function POST(request) {
  try {
    const body = await request.json();

    const { error, value } = schema.validate(body);
    if (error) {
      return NextResponse.json(
        { error: "Invalid input", details: error.details[0].message },
        { status: 400 }
      );
    }

    const { email, password } = value;

    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const user = users[0];

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1d",
    });

    delete user.password;

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
    console.error("Login API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

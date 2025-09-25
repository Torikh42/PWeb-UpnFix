import { NextResponse } from "next/server";
import Joi from "joi";
import bcrypt from "bcryptjs";
import db from "../../../../lib/db";

const schema = Joi.object({
  full_name: Joi.string().min(3).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
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

    const { full_name, email, password } = value;

    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10); 

    const [result] = await db.query(
      "INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)",
      [full_name, email, hashedPassword]
    );

    return NextResponse.json(
      {
        message: "User created successfully",
        userId: result.insertId,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("Signup API Error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

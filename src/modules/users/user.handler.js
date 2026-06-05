import { NextResponse } from "next/server";
import { getAllUsers } from "./user.service";

export async function getAllUsersHandler() {
  try {
    const users = await getAllUsers();
    return NextResponse.json(users);
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching users", error },
      { status: 500 }
    );
  }
}

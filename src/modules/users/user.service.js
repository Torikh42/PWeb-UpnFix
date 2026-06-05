import { findAllUsers } from "./user.repository";

export async function getAllUsers() {
  return await findAllUsers();
}

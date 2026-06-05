import { getAllUsersHandler } from "@/modules/users/user.handler";

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Mendapatkan Semua User (Khusus Admin)
 *     tags: [Users]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sukses mengambil data
 */
export const GET = getAllUsersHandler;

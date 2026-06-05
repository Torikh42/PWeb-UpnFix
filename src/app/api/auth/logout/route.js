import { logoutHandler } from "@/modules/auth/auth.handler";

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout User
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout berhasil
 */
export const POST = logoutHandler;

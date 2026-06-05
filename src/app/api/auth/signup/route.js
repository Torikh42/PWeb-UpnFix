import { signupHandler } from "@/modules/auth/auth.handler";

/**
 * @swagger
 * /api/auth/signup:
 *   post:
 *     summary: Registrasi User Baru
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SignupPayload'
 *     responses:
 *       201:
 *         description: User berhasil dibuat
 *       409:
 *         description: Email sudah terdaftar
 *       400:
 *         description: Input tidak valid
 */
export const POST = signupHandler;

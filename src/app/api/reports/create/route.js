import { createReportHandler } from "@/modules/reports/report.handler";

/**
 * @swagger
 * /api/reports/create:
 *   post:
 *     summary: Membuat Laporan Baru
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               location:
 *                 type: string
 *               category:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Laporan berhasil dibuat
 */
export const POST = createReportHandler;

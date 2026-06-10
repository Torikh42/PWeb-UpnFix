export const dynamic = "force-dynamic";
import { getAllReportsHandler } from "@/modules/reports/report.handler";

/**
 * @swagger
 * /api/reports:
 *   get:
 *     summary: Mendapatkan Semua Laporan
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *         description: Filter status (ALL, PENDING, DIPROSES, SELESAI)
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter kategori
 *     responses:
 *       200:
 *         description: Sukses mengambil data
 */
export const GET = getAllReportsHandler;

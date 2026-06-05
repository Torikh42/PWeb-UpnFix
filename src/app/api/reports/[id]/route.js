import { updateReportHandler, deleteReportHandler } from "@/modules/reports/report.handler";

/**
 * @swagger
 * /api/reports/{id}:
 *   patch:
 *     summary: Update Status Laporan (Khusus Admin)
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateStatusPayload'
 *     responses:
 *       200:
 *         description: Status berhasil diperbarui
 */
export const PATCH = updateReportHandler;

/**
 * @swagger
 * /api/reports/{id}:
 *   delete:
 *     summary: Hapus Laporan (Admin atau Pemilik Laporan)
 *     tags: [Reports]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID laporan yang akan dihapus
 *     responses:
 *       200:
 *         description: Laporan berhasil dihapus
 *       401:
 *         description: Tidak terautentikasi
 *       403:
 *         description: Tidak memiliki akses
 *       404:
 *         description: Laporan tidak ditemukan
 */
export const DELETE = deleteReportHandler;


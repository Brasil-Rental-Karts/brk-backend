import { Request, Response } from 'express';

import { BadRequestException } from '../exceptions/bad-request.exception';
import { authMiddleware, requireAdmin } from '../middleware/auth.middleware';
import { SeasonRegistrationService } from '../services/season-registration.service';
import { BaseController } from './base.controller';

/**
 * @swagger
 * components:
 *   schemas:
 *     ReactivatePaymentRequest:
 *       type: object
 *       required:
 *         - newDueDate
 *       properties:
 *         newDueDate:
 *           type: string
 *           format: date
 *           description: Nova data de vencimento no formato YYYY-MM-DD
 *           example: "2024-01-15"
 */

export class PaymentManagementController extends BaseController {
  constructor(private seasonRegistrationService: SeasonRegistrationService) {
    super('/payment-management');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /payment-management/overdue-payments:
     *   get:
     *     summary: Buscar todos os pagamentos vencidos do sistema
     *     tags: [Payment Management]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de todos os pagamentos vencidos
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                       registrationId:
     *                         type: string
     *                       billingType:
     *                         type: string
     *                       value:
     *                         type: number
     *                       dueDate:
     *                         type: string
     *                       status:
     *                         type: string
     *                       registration:
     *                         type: object
     *                         properties:
     *                           id:
     *                             type: string
     *                           userId:
     *                             type: string
     *                           seasonId:
     *                             type: string
     *                           amount:
     *                             type: number
     *                           paymentStatus:
     *                             type: string
     *                           createdAt:
     *                             type: string
     *       400:
     *         description: Erro na requisição
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Sem permissão
     */
    this.router.get(
      '/overdue-payments',
      authMiddleware,
      requireAdmin,
      this.getAllOverduePayments.bind(this)
    );

    /**
     * @swagger
     * /payment-management/overdue-payments/{registrationId}:
     *   get:
     *     summary: Buscar pagamentos vencidos de uma inscrição
     *     tags: [Payment Management]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: registrationId
     *         required: true
     *         schema:
     *           type: string
     *         description: ID da inscrição
     *     responses:
     *       200:
     *         description: Lista de pagamentos vencidos
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: array
     *                   items:
     *                     type: object
     *                     properties:
     *                       id:
     *                         type: string
     *                       registrationId:
     *                         type: string
     *                       billingType:
     *                         type: string
     *                       value:
     *                         type: number
     *                       dueDate:
     *                         type: string
     *                       status:
     *                         type: string
     *       400:
     *         description: Erro na requisição
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Sem permissão
     */
    this.router.get(
      '/overdue-payments/:registrationId',
      authMiddleware,
      requireAdmin,
      this.getOverduePayments.bind(this)
    );

    /**
     * @swagger
     * /payment-management/reactivate-payment/{paymentId}:
     *   post:
     *     summary: Reativar uma fatura vencida
     *     tags: [Payment Management]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: paymentId
     *         required: true
     *         schema:
     *           type: string
     *         description: ID do pagamento
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/ReactivatePaymentRequest'
     *     responses:
     *       200:
     *         description: Fatura reativada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 data:
     *                   type: object
     *                   properties:
     *                     id:
     *                       type: string
     *                     dueDate:
     *                       type: string
     *                     status:
     *                       type: string
     *                     pixQrCode:
     *                       type: string
     *                     pixCopyPaste:
     *                       type: string
     *                 message:
     *                   type: string
     *       400:
     *         description: Erro na requisição
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Sem permissão
     */
    this.router.post(
      '/reactivate-payment/:paymentId',
      authMiddleware,
      requireAdmin,
      this.reactivateOverduePayment.bind(this)
    );

    /**
     * @swagger
     * /payment-management/test-asaas:
     *   get:
     *     summary: Testar conexão com Asaas
     *     tags: [Payment Management]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Status da conexão com Asaas
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Sem permissão
     */
    this.router.get(
      '/test-asaas',
      authMiddleware,
      requireAdmin,
      this.testAsaasConnection.bind(this)
    );
  }

  private async getAllOverduePayments(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const overduePayments =
        await this.seasonRegistrationService.getAllOverduePayments();

      res.json({
        success: true,
        data: overduePayments,
      });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  private async getOverduePayments(req: Request, res: Response): Promise<void> {
    try {
      const { registrationId } = req.params;

      const overduePayments =
        await this.seasonRegistrationService.getOverduePayments(registrationId);

      res.json({
        success: true,
        data: overduePayments,
      });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  private async reactivateOverduePayment(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { newDueDate } = req.body;

      if (!newDueDate) {
        throw new BadRequestException('Nova data de vencimento é obrigatória');
      }

      // Validar formato da data
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(newDueDate)) {
        throw new BadRequestException('Data deve estar no formato YYYY-MM-DD');
      }

      const reactivatedPayment =
        await this.seasonRegistrationService.reactivateOverduePayment(
          paymentId,
          newDueDate
        );

      res.json({
        success: true,
        data: reactivatedPayment,
        message: 'Fatura reativada com sucesso',
      });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }

  private async testAsaasConnection(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const isConnected =
        await this.seasonRegistrationService.testAsaasConnection();

      res.json({
        success: true,
        connected: isConnected,
        message: isConnected
          ? 'Conexão com Asaas OK'
          : 'Falha na conexão com Asaas',
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        connected: false,
        message: error.message,
      });
    }
  }
}

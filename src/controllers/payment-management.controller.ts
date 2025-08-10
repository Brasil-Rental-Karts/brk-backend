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
     * /payment-management/pending-payments:
     *   get:
     *     summary: Buscar todos os pagamentos pendentes do sistema
     *     tags: [Payment Management]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de todos os pagamentos pendentes
     *       400:
     *         description: Erro na requisição
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Sem permissão
     */
    this.router.get(
      '/pending-payments',
      authMiddleware,
      requireAdmin,
      this.getAllPendingPayments.bind(this)
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
     * /payment-management/update-due-date/{paymentId}:
     *   put:
     *     summary: Atualizar a data de vencimento de uma cobrança pendente
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
     *         description: Vencimento atualizado com sucesso
     *       400:
     *         description: Erro na requisição
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Sem permissão
     */
    this.router.put(
      '/update-due-date/:paymentId',
      authMiddleware,
      requireAdmin,
      this.updatePaymentDueDate.bind(this)
    );

    /**
     * @swagger
     * /payment-management/update-payment-value/{paymentId}:
     *   put:
     *     summary: Atualizar o valor de uma cobrança
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
     *             type: object
     *             required: [newValue]
     *             properties:
     *               newValue:
     *                 type: number
     *                 description: Novo valor da cobrança (em reais)
     *                 example: 150.5
     *     responses:
     *       200:
     *         description: Cobrança atualizada com sucesso
     *       400:
     *         description: Erro na requisição
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Sem permissão
     */
    this.router.put(
      '/update-payment-value/:paymentId',
      authMiddleware,
      requireAdmin,
      this.updatePaymentValue.bind(this)
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

  private async getAllPendingPayments(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const pendingPayments =
        await this.seasonRegistrationService.getAllPendingPayments();

      res.json({
        success: true,
        data: pendingPayments,
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

  private async updatePaymentDueDate(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { newDueDate } = req.body;

      if (!newDueDate) {
        throw new BadRequestException('Nova data de vencimento é obrigatória');
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(newDueDate)) {
        throw new BadRequestException('Data deve estar no formato YYYY-MM-DD');
      }

      const updated = await this.seasonRegistrationService.updatePaymentDueDate(
        paymentId,
        newDueDate
      );

      res.json({ success: true, data: updated, message: 'Vencimento atualizado com sucesso' });
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

  private async updatePaymentValue(req: Request, res: Response): Promise<void> {
    try {
      const { paymentId } = req.params;
      const { newValue } = req.body as { newValue: number };

      if (newValue === undefined || newValue === null) {
        throw new BadRequestException('Novo valor é obrigatório');
      }
      if (isNaN(Number(newValue)) || Number(newValue) <= 0) {
        throw new BadRequestException('Novo valor inválido');
      }

      const updated = await this.seasonRegistrationService.updatePaymentValue(
        paymentId,
        Number(newValue)
      );

      res.json({ success: true, data: updated });
    } catch (error: any) {
      throw new BadRequestException(error.message);
    }
  }
}

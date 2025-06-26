import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SeasonRegistrationService } from '../services/season-registration.service';
import { AsaasService } from '../services/asaas.service';
import { BadRequestException } from '../exceptions/bad-request.exception';

/**
 * @swagger
 * components:
 *   schemas:
 *     AsaasWebhookPayload:
 *       type: object
 *       properties:
 *         event:
 *           type: string
 *           description: Tipo do evento
 *           enum: [PAYMENT_CREATED, PAYMENT_AWAITING_RISK_ANALYSIS, PAYMENT_APPROVED_BY_RISK_ANALYSIS, PAYMENT_REPROVED_BY_RISK_ANALYSIS, PAYMENT_UPDATED, PAYMENT_CONFIRMED, PAYMENT_RECEIVED, PAYMENT_CREDIT_CARD_CAPTURE_REFUSED, PAYMENT_AWAITING_CHARGEBACK, PAYMENT_REFUNDED, PAYMENT_REFUND_IN_PROGRESS, PAYMENT_RECEIVED_IN_CASH, PAYMENT_CHARGEBACK_REQUESTED, PAYMENT_CHARGEBACK_DISPUTE, PAYMENT_AWAITING_CHARGEBACK_REVERSAL, PAYMENT_DUNNING_RECEIVED, PAYMENT_DUNNING_REQUESTED, PAYMENT_BANK_SLIP_VIEWED, PAYMENT_CHECKOUT_VIEWED, PAYMENT_DELETED, PAYMENT_RESTORED, PAYMENT_OVERDUE, PAYMENT_PARTIALLY_REFUNDED]
 *         payment:
 *           type: object
 *           properties:
 *             object:
 *               type: string
 *             id:
 *               type: string
 *             dateCreated:
 *               type: string
 *               format: date-time
 *             customer:
 *               type: string
 *             subscription:
 *               type: string
 *               nullable: true
 *             installment:
 *               type: string
 *               nullable: true
 *             paymentLink:
 *               type: string
 *               nullable: true
 *             dueDate:
 *               type: string
 *               format: date
 *             originalDueDate:
 *               type: string
 *               format: date
 *             value:
 *               type: number
 *             netValue:
 *               type: number
 *             originalValue:
 *               type: number
 *               nullable: true
 *             interestValue:
 *               type: number
 *               nullable: true
 *             description:
 *               type: string
 *               nullable: true
 *             billingType:
 *               type: string
 *               enum: [CREDIT_CARD, PIX]
 *             status:
 *               type: string
 *               enum: [PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, RECEIVED_IN_CASH, REFUND_REQUESTED, REFUND_IN_PROGRESS, CHARGEBACK_REQUESTED, CHARGEBACK_DISPUTE, AWAITING_CHARGEBACK_REVERSAL, DUNNING_REQUESTED, DUNNING_RECEIVED, AWAITING_RISK_ANALYSIS]
 *             pixTransaction:
 *               type: object
 *               nullable: true
 *             paymentDate:
 *               type: string
 *               format: date
 *               nullable: true
 *             clientPaymentDate:
 *               type: string
 *               format: date
 *               nullable: true
 *             installmentNumber:
 *               type: integer
 *               nullable: true
 *             creditDate:
 *               type: string
 *               format: date
 *               nullable: true
 *             estimatedCreditDate:
 *               type: string
 *               format: date
 *               nullable: true
 *             invoiceUrl:
 *               type: string
 *             bankSlipUrl:
 *               type: string
 *               nullable: true
 *             transactionReceiptUrl:
 *               type: string
 *               nullable: true
 *             invoiceNumber:
 *               type: string
 *             externalReference:
 *               type: string
 *               nullable: true
 */

export class AsaasWebhookController extends BaseController {
  constructor(
    private registrationService: SeasonRegistrationService,
    private asaasService: AsaasService
  ) {
    super('/webhooks/asaas');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /webhooks/asaas:
     *   post:
     *     summary: Receber webhooks do Asaas
     *     tags: [Webhooks]
     *     description: Endpoint para receber notificações de eventos do Asaas
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/AsaasWebhookPayload'
     *     responses:
     *       200:
     *         description: Webhook processado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 success:
     *                   type: boolean
     *                 message:
     *                   type: string
     *       400:
     *         description: Dados inválidos no webhook
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post('/', this.handleWebhook.bind(this));

    /**
     * @swagger
     * /webhooks/asaas/test:
     *   post:
     *     summary: Endpoint de teste para webhooks
     *     tags: [Webhooks]
     *     description: Endpoint para testar o recebimento de webhooks
     *     responses:
     *       200:
     *         description: Teste realizado com sucesso
     */
    this.router.post('/test', this.testWebhook.bind(this));
  }

  private async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const webhookData = req.body;

      // Validar se o webhook tem a estrutura esperada
      if (!webhookData.event || !webhookData.payment) {
        throw new BadRequestException('Estrutura de webhook inválida');
      }

      // Validar autenticidade do webhook (implementação básica)
      const isValid = this.asaasService.validateWebhook(webhookData, req.headers['x-asaas-signature'] as string);
      if (!isValid) {
        res.status(400).json({
          success: false,
          message: 'Assinatura do webhook inválida'
        });
        return;
      }

      // Processar o webhook
      await this.registrationService.processAsaasWebhook(webhookData);

      res.json({
        success: true,
        message: 'Webhook processado com sucesso'
      });

    } catch (error) {
      // Responder com erro mas não falhar completamente para evitar reenvios desnecessários
      const statusCode = error instanceof BadRequestException ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  private async testWebhook(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        message: 'Teste de webhook realizado com sucesso',
        receivedData: req.body,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Erro no teste de webhook'
      });
    }
  }
} 
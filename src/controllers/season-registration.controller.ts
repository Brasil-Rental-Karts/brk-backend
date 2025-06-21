import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { SeasonRegistrationService, CreateRegistrationData } from '../services/season-registration.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { UserRole } from '../models/user.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { SeasonService } from '../services/season.service';

/**
 * @swagger
 * components:
 *   schemas:
 *     CreateRegistrationRequest:
 *       type: object
 *       required:
 *         - seasonId
 *         - categoryIds
 *         - paymentMethod
 *         - userDocument
 *       properties:
 *         seasonId:
 *           type: string
 *           format: uuid
 *           description: ID da temporada
 *         categoryIds:
 *           type: array
 *           items:
 *             type: string
 *             format: uuid
 *           description: IDs das categorias selecionadas
 *           minItems: 1
 *         paymentMethod:
 *           type: string
          *           enum: [pix, cartao_credito]
 *           description: Método de pagamento desejado
 *         userDocument:
 *           type: string
 *           description: CPF/CNPJ do usuário
 *           example: "123.456.789-00"
 *     
 *     RegistrationResponse:
 *       type: object
 *       properties:
 *         registration:
 *           type: object
 *           properties:
 *             id:
 *               type: string
 *               format: uuid
 *             userId:
 *               type: string
 *               format: uuid
 *             seasonId:
 *               type: string
 *               format: uuid
 *             status:
 *               type: string
 *               enum: [pending, payment_pending, confirmed, cancelled, expired]
 *             paymentStatus:
 *               type: string
 *               enum: [pending, processing, paid, failed, cancelled, refunded]
 *             amount:
 *               type: number
 *         paymentData:
 *           type: object
 *           properties:
 *             registrationId:
 *               type: string
 *               format: uuid
 *             billingType:
 *               type: string
 *               enum: [CREDIT_CARD, PIX]
 *             value:
 *               type: number
 *             dueDate:
 *               type: string
 *               format: date
 *             invoiceUrl:
 *               type: string
 *               nullable: true
 *             bankSlipUrl:
 *               type: string
 *               nullable: true
 *             pixQrCode:
 *               type: string
 *               nullable: true
 *             pixCopyPaste:
 *               type: string
 *               nullable: true
 */

export class SeasonRegistrationController extends BaseController {
  constructor(
    private registrationService: SeasonRegistrationService,
    private championshipStaffService: ChampionshipStaffService,
    private seasonService: SeasonService
  ) {
    super('/season-registrations');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /season-registrations:
     *   post:
     *     summary: Criar inscrição em temporada
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateRegistrationRequest'
     *     responses:
     *       201:
     *         description: Inscrição criada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/RegistrationResponse'
     *       400:
     *         description: Dados inválidos ou usuário já inscrito
     *       404:
     *         description: Temporada não encontrada
     */
    this.router.post('/', authMiddleware, this.createRegistration.bind(this));

    /**
     * @swagger
     * /season-registrations/my:
     *   get:
     *     summary: Listar minhas inscrições
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de inscrições do usuário
     */
    this.router.get('/my', authMiddleware, this.getMyRegistrations.bind(this));

    /**
     * @swagger
     * /season-registrations/{id}:
     *   get:
     *     summary: Buscar inscrição por ID
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Inscrição encontrada
     *       404:
     *         description: Inscrição não encontrada
     */
    this.router.get('/:id', authMiddleware, this.getRegistrationById.bind(this));

    /**
     * @swagger
     * /season-registrations/{id}/payment:
     *   get:
     *     summary: Buscar dados de pagamento de uma inscrição
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Dados de pagamento encontrados
     *       404:
     *         description: Inscrição ou dados de pagamento não encontrados
     */
    this.router.get('/:id/payment', authMiddleware, this.getPaymentData.bind(this));

    /**
     * @swagger
     * /season-registrations/{id}/sync-payment:
     *   post:
     *     summary: Sincronizar status de pagamento com Asaas
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Status de pagamento sincronizado com sucesso
     *       404:
     *         description: Inscrição não encontrada
     *       500:
     *         description: Erro ao sincronizar com Asaas
     */
    this.router.post('/:id/sync-payment', authMiddleware, this.syncPaymentStatus.bind(this));

    /**
     * @swagger
     * /season-registrations/{id}/payment-callback:
     *   get:
     *     summary: Callback de pagamento (redirecionamento do Asaas)
     *     tags: [Season Registrations]
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       302:
     *         description: Redirecionamento para o frontend
     */
    this.router.get('/:id/payment-callback', this.handlePaymentCallback.bind(this));

    /**
     * @swagger
     * /season-registrations/{id}/cancel:
     *   post:
     *     summary: Cancelar inscrição
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               reason:
     *                 type: string
     *                 description: Motivo do cancelamento
     *     responses:
     *       200:
     *         description: Inscrição cancelada com sucesso
     *       400:
     *         description: Não é possível cancelar a inscrição
     *       404:
     *         description: Inscrição não encontrada
     */
    this.router.post('/:id/cancel', authMiddleware, this.cancelRegistration.bind(this));

    /**
     * @swagger
     * /season-registrations/season/{seasonId}:
     *   get:
     *     summary: Listar inscrições de uma temporada (Admin/Manager)
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: seasonId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Lista de inscrições da temporada
     */
    this.router.get('/season/:seasonId', authMiddleware, this.getRegistrationsBySeason.bind(this));

    /**
     * @swagger
     * /season-registrations/championship/{championshipId}:
     *   get:
     *     summary: Listar todas as inscrições de um campeonato (Admin/Manager)
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Lista de inscrições do campeonato
     */
    this.router.get('/championship/:championshipId', authMiddleware, this.getRegistrationsByChampionship.bind(this));

    /**
     * @swagger
     * /season-registrations/championship/{championshipId}/split-status:
     *   get:
     *     summary: Verificar status de configuração de split de um campeonato
     *     tags: [Season Registrations]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: championshipId
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *     responses:
     *       200:
     *         description: Status de configuração do split
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 isValid:
     *                   type: boolean
     *                 errors:
     *                   type: array
     *                   items:
     *                     type: string
     *                 championship:
     *                   type: object
     */
    this.router.get('/championship/:championshipId/split-status', authMiddleware, this.checkChampionshipSplitStatus.bind(this));
  }

  private async createRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId, categoryIds, paymentMethod, userDocument, installments } = req.body;
      const userId = req.user!.id;

      // Validar dados de entrada
      if (!seasonId || !paymentMethod || !categoryIds || !userDocument) {
        throw new BadRequestException('seasonId, categoryIds, paymentMethod e userDocument são obrigatórios');
      }

      if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
        throw new BadRequestException('Pelo menos uma categoria deve ser selecionada');
      }

      const validPaymentMethods = ['pix', 'cartao_credito'];
      if (!validPaymentMethods.includes(paymentMethod)) {
        throw new BadRequestException('Método de pagamento inválido');
      }

      const registrationData: CreateRegistrationData = {
        userId,
        seasonId,
        categoryIds,
        paymentMethod,
        userDocument,
        installments
      };

      const result = await this.registrationService.createRegistration(registrationData);

      res.status(201).json({
        message: 'Inscrição criada com sucesso',
        data: result
      });
          } catch (error) {
        console.error('Error creating registration:', error);
        res.status(error instanceof BadRequestException ? 400 : 500).json({
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  private async getMyRegistrations(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const registrations = await this.registrationService.findByUserId(userId);

      res.json({
        message: 'Inscrições recuperadas com sucesso',
        data: registrations
      });
    } catch (error) {
      console.error('Error getting user registrations:', error);
      res.status(500).json({
        message: 'Erro interno do servidor'
      });
    }
  }

  private async getRegistrationById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const registration = await this.registrationService.findById(id);

      if (!registration) {
        throw new NotFoundException('Inscrição não encontrada');
      }

      // Verificar se o usuário tem permissão para ver esta inscrição
      if (registration.userId !== req.user!.id && 
          ![UserRole.ADMINISTRATOR, UserRole.MANAGER].includes(req.user!.role)) {
        res.status(403).json({
          message: 'Sem permissão para acessar esta inscrição'
        });
        return;
      }

      res.json({
        message: 'Inscrição encontrada',
        data: registration
      });
    } catch (error) {
      console.error('Error getting registration:', error);
      res.status(error instanceof NotFoundException ? 404 : 500).json({
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  private async getPaymentData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Verificar se a inscrição existe e se o usuário tem permissão
      const registration = await this.registrationService.findById(id);
      if (!registration) {
        throw new NotFoundException('Inscrição não encontrada');
      }

      if (registration.userId !== req.user!.id && 
          ![UserRole.ADMINISTRATOR, UserRole.MANAGER].includes(req.user!.role)) {
        res.status(403).json({
          message: 'Sem permissão para acessar dados de pagamento desta inscrição'
        });
        return;
      }

      const paymentData = await this.registrationService.getPaymentData(id);

      if (!paymentData) {
        throw new NotFoundException('Dados de pagamento não encontrados');
      }

      console.log(`[CONTROLLER] Retornando ${paymentData.length} parcelas para frontend:`);
      paymentData.forEach((p, index) => {
        console.log(`  ${index + 1}. ID: ${p.id} | Status: ${p.status} | InstallmentNumber: ${p.installmentNumber} | DueDate: ${p.dueDate} | Value: ${p.value}`);
      });

      res.json({
        message: 'Dados de pagamento encontrados',
        data: paymentData
      });
    } catch (error) {
      console.error('Error getting payment data:', error);
      res.status(error instanceof NotFoundException ? 404 : 500).json({
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  private async cancelRegistration(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        throw new BadRequestException('Motivo do cancelamento é obrigatório');
      }

      // Verificar se a inscrição existe e se o usuário tem permissão
      const registration = await this.registrationService.findById(id);
      if (!registration) {
        throw new NotFoundException('Inscrição não encontrada');
      }

      if (registration.userId !== req.user!.id && 
          ![UserRole.ADMINISTRATOR, UserRole.MANAGER].includes(req.user!.role)) {
        res.status(403).json({
          message: 'Sem permissão para cancelar esta inscrição'
        });
        return;
      }

      const cancelledRegistration = await this.registrationService.cancelRegistration(id, reason);

      res.json({
        message: 'Inscrição cancelada com sucesso',
        data: cancelledRegistration
      });
    } catch (error) {
      console.error('Error cancelling registration:', error);
      res.status(error instanceof BadRequestException ? 400 : 
                 error instanceof NotFoundException ? 404 : 500).json({
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }

  private async getRegistrationsBySeason(req: Request, res: Response): Promise<void> {
    try {
      const { seasonId } = req.params;
      const userId = req.user!.id;

      // Buscar a season para obter o championshipId
      const season = await this.seasonService.findById(seasonId);
      if (!season) {
        res.status(404).json({
          message: 'Temporada não encontrada'
        });
        return;
      }

      // Verificar se o usuário tem permissão para acessar os dados desta temporada
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, season.championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para acessar os dados desta temporada'
        });
        return;
      }

      const registrations = await this.registrationService.findBySeasonId(seasonId);

      res.json({
        message: 'Inscrições da temporada recuperadas com sucesso',
        data: registrations
      });
    } catch (error) {
      console.error('Error getting season registrations:', error);
      res.status(500).json({
        message: 'Erro interno do servidor'
      });
    }
  }

  private async getRegistrationsByChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      const userId = req.user!.id;

      // Verificar se o usuário tem permissão para acessar os dados do campeonato
      const hasPermission = await this.championshipStaffService.hasChampionshipPermission(userId, championshipId);
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para acessar os dados deste campeonato'
        });
        return;
      }

      const registrations = await this.registrationService.findByChampionshipId(championshipId);

      res.json({
        message: 'Inscrições do campeonato recuperadas com sucesso',
        data: registrations
      });
    } catch (error) {
      console.error('Error getting championship registrations:', error);
      res.status(500).json({
        message: 'Erro interno do servidor'
      });
    }
  }

  private async checkChampionshipSplitStatus(req: Request, res: Response): Promise<void> {
    try {
      const { championshipId } = req.params;
      
      const splitStatus = await this.registrationService.validateChampionshipSplitConfiguration(championshipId);
      
      res.json({
        message: 'Status de configuração de split verificado',
        data: splitStatus
      });
    } catch (error) {
      console.error('Error checking championship split status:', error);
      res.status(500).json({
        message: 'Erro interno do servidor ao verificar status de split'
      });
    }
  }

  /**
   * Handle payment callback from Asaas and redirect to frontend
   */
  private async handlePaymentCallback(req: Request, res: Response): Promise<void> {
    try {
      const { id: registrationId } = req.params;
      
      // Extrair primeira URL do FRONTEND_URL
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
      const redirectUrl = `${frontendUrl}/registration/${registrationId}/payment?success=true`;
      
      console.log('=== CALLBACK DE PAGAMENTO ===');
      console.log('registrationId:', registrationId);
      console.log('Redirecionando para:', redirectUrl);
      
      // Redirecionar para o frontend com parâmetro de sucesso
      res.redirect(302, redirectUrl);
    } catch (error: any) {
      console.error('Erro no callback de pagamento:', error);
      // Em caso de erro, redirecionar para página de erro
      const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || 'http://localhost:5173';
      res.redirect(302, `${frontendUrl}/error?message=callback_error`);
    }
  }

  private async syncPaymentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      
      // Verificar se a inscrição existe e se o usuário tem permissão
      const registration = await this.registrationService.findById(id);
      if (!registration) {
        throw new NotFoundException('Inscrição não encontrada');
      }

      if (registration.userId !== req.user!.id && 
          ![UserRole.ADMINISTRATOR, UserRole.MANAGER].includes(req.user!.role)) {
        res.status(403).json({
          message: 'Sem permissão para sincronizar status de pagamento desta inscrição'
        });
        return;
      }

      const syncStatus = await this.registrationService.syncPaymentStatusFromAsaas(id);

      if (!syncStatus) {
        throw new NotFoundException('Erro ao sincronizar status de pagamento');
      }

      res.json({
        message: 'Status de pagamento sincronizado com sucesso',
        data: syncStatus
      });
    } catch (error) {
      console.error('Error syncing payment status:', error);
      res.status(error instanceof NotFoundException ? 404 : 500).json({
        message: error instanceof Error ? error.message : 'Erro interno do servidor'
      });
    }
  }
} 
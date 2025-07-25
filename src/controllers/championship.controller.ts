import { NextFunction, Request, Response } from 'express';

import { BadRequestException } from '../exceptions/bad-request.exception';
import { ForbiddenException } from '../exceptions/forbidden.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { Championship, PersonType } from '../models/championship.entity';
import { UserRole } from '../models/user.entity';
import { AuthService } from '../services/auth.service';
import { ChampionshipService } from '../services/championship.service';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { MemberProfileService } from '../services/member-profile.service';
import { SeasonRegistrationService } from '../services/season-registration.service';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';

/**
 * @swagger
 * components:
 *   schemas:
 *     Championship:
 *       type: object
 *       required:
 *         - name
 *         - document
 *         - cep
 *         - state
 *         - city
 *         - fullAddress
 *         - number
 *         - ownerId
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: ID único do campeonato
 *         name:
 *           type: string
 *           maxLength: 90
 *           description: Nome do campeonato
 *         championshipImage:
 *           type: string
 *           description: URL da imagem do campeonato
 *         shortDescription:
 *           type: string
 *           maxLength: 165
 *           description: Descrição curta do campeonato
 *         fullDescription:
 *           type: string
 *           description: Descrição completa do campeonato
 *         personType:
 *           type: integer
 *           enum: [0, 1]
 *           description: Tipo de pessoa (0 = Física, 1 = Jurídica)
 *         document:
 *           type: string
 *           maxLength: 18
 *           description: CPF ou CNPJ
 *         socialReason:
 *           type: string
 *           maxLength: 255
 *           description: Razão social (apenas para pessoa jurídica)
 *         cep:
 *           type: string
 *           maxLength: 9
 *           description: CEP do endereço
 *         state:
 *           type: string
 *           maxLength: 2
 *           description: Estado (UF)
 *         city:
 *           type: string
 *           maxLength: 100
 *           description: Cidade
 *         fullAddress:
 *           type: string
 *           description: Endereço completo
 *         number:
 *           type: string
 *           maxLength: 10
 *           description: Número do endereço
 *         complement:
 *           type: string
 *           maxLength: 100
 *           description: Complemento do endereço
 *         province:
 *           type: string
 *           maxLength: 100
 *           description: Bairro
 *         isResponsible:
 *           type: boolean
 *           description: Se o usuário é o responsável pelo campeonato
 *         responsibleName:
 *           type: string
 *           maxLength: 100
 *           description: Nome do responsável
 *         responsiblePhone:
 *           type: string
 *           maxLength: 15
 *           description: Telefone do responsável
 *         responsibleEmail:
 *           type: string
 *           maxLength: 100
 *           description: E-mail do responsável (quando não é responsável)
 *         responsibleBirthDate:
 *           type: string
 *           format: date
 *           description: Data de nascimento do responsável (quando não é responsável)
 *         companyType:
 *           type: string
 *           enum: [MEI, LIMITED, INDIVIDUAL, ASSOCIATION]
 *           description: Tipo de empresa (apenas para pessoa jurídica)
 *         sponsors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               id:
 *                 type: string
 *               name:
 *                 type: string
 *               logoImage:
 *                 type: string
 *               website:
 *                 type: string
 *           description: Lista de patrocinadores
 *         asaasWalletId:
 *           type: string
 *           description: ID da carteira (wallet) no Asaas para split payment
 *         platformCommissionPercentage:
 *           type: number
 *           format: decimal
 *           minimum: 0
 *           maximum: 100
 *           default: 10.00
 *           description: Percentual de comissão da plataforma BRK
 *         splitEnabled:
 *           type: boolean
 *           default: true
 *           description: Indica se o split payment está habilitado
 *         ownerId:
 *           type: string
 *           format: uuid
 *           description: ID do usuário proprietário
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     ChampionshipBasicInfo:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         name:
 *           type: string
 *         shortDescription:
 *           type: string
 *         fullDescription:
 *           type: string
 */

export class ChampionshipController extends BaseController {
  constructor(
    private championshipService: ChampionshipService,
    private userService: UserService,
    private authService: AuthService,
    private memberProfileService: MemberProfileService,
    private championshipStaffService: ChampionshipStaffService,
    private seasonRegistrationService: SeasonRegistrationService
  ) {
    super('/championships');
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /championships:
     *   get:
     *     summary: Listar todos os campeonatos
     *     tags: [Championships]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de campeonatos
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Championship'
     */
    this.router.get('/', authMiddleware, this.getAllChampionships.bind(this));

    /**
     * @swagger
     * /championships/my:
     *   get:
     *     summary: Listar campeonatos do usuário logado
     *     tags: [Championships]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Lista de campeonatos do usuário
     *         content:
     *           application/json:
     *             schema:
     *               type: array
     *               items:
     *                 $ref: '#/components/schemas/Championship'
     */
    this.router.get('/my', authMiddleware, this.getMyChampionships.bind(this));

    /**
     * @swagger
     * /championships/public/{slugOrId}:
     *   get:
     *     summary: Buscar campeonato por slug ou ID (rota pública para inscrições)
     *     tags: [Championships]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: slugOrId
     *         required: true
     *         schema:
     *           type: string
     *           description: Slug ou ID do campeonato
     *     responses:
     *       200:
     *         description: Campeonato encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Championship'
     *       404:
     *         description: Campeonato não encontrado
     */
    this.router.get(
      '/public/:slugOrId',
      authMiddleware,
      this.getChampionshipPublic.bind(this)
    );

    /**
     * @swagger
     * /championships/{id}:
     *   get:
     *     summary: Buscar campeonato por ID
     *     tags: [Championships]
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
     *         description: Campeonato encontrado
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Championship'
     *       404:
     *         description: Campeonato não encontrado
     */
    this.router.get(
      '/:id',
      authMiddleware,
      this.getChampionshipById.bind(this)
    );

    /**
     * @swagger
     * /championships/{id}/basic:
     *   get:
     *     summary: Buscar informações básicas do campeonato (otimizado para cache)
     *     tags: [Championships]
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
     *         description: Informações básicas do campeonato
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/ChampionshipBasicInfo'
     *       404:
     *         description: Campeonato não encontrado
     */
    this.router.get(
      '/:id/basic',
      authMiddleware,
      this.getChampionshipBasicInfo.bind(this)
    );

    /**
     * @swagger
     * /championships:
     *   post:
     *     summary: Criar novo campeonato
     *     tags: [Championships]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - name
     *               - document
     *               - cep
     *               - state
     *               - city
     *               - fullAddress
     *               - number
     *             properties:
     *               name:
     *                 type: string
     *                 maxLength: 90
     *               shortDescription:
     *                 type: string
     *                 maxLength: 165
     *               fullDescription:
     *                 type: string
     *               personType:
     *                 type: integer
     *                 enum: [0, 1]
     *               document:
     *                 type: string
     *                 maxLength: 18
     *               socialReason:
     *                 type: string
     *                 maxLength: 255
     *               cep:
     *                 type: string
     *                 maxLength: 9
     *               state:
     *                 type: string
     *                 maxLength: 2
     *               city:
     *                 type: string
     *                 maxLength: 100
     *               fullAddress:
     *                 type: string
     *               number:
     *                 type: string
     *                 maxLength: 10
     *               isResponsible:
     *                 type: boolean
     *               responsibleName:
     *                 type: string
     *                 maxLength: 100
     *               responsiblePhone:
     *                 type: string
     *                 maxLength: 15
     *     responses:
     *       201:
     *         description: Campeonato criado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Championship'
     *       400:
     *         description: Dados inválidos
     */
    this.router.post(
      '/',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.createChampionship.bind(this)
    );

    /**
     * @swagger
     * /championships/{id}:
     *   put:
     *     summary: Atualizar campeonato
     *     tags: [Championships]
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
     *               name:
     *                 type: string
     *                 maxLength: 90
     *               shortDescription:
     *                 type: string
     *                 maxLength: 165
     *               fullDescription:
     *                 type: string
     *               personType:
     *                 type: integer
     *                 enum: [0, 1]
     *               document:
     *                 type: string
     *                 maxLength: 18
     *               socialReason:
     *                 type: string
     *                 maxLength: 255
     *               cep:
     *                 type: string
     *                 maxLength: 9
     *               state:
     *                 type: string
     *                 maxLength: 2
     *               city:
     *                 type: string
     *                 maxLength: 100
     *               fullAddress:
     *                 type: string
     *               number:
     *                 type: string
     *                 maxLength: 10
     *               complement:
     *                 type: string
     *                 maxLength: 100
     *               isResponsible:
     *                 type: boolean
     *               responsibleName:
     *                 type: string
     *                 maxLength: 100
     *               responsiblePhone:
     *                 type: string
     *                 maxLength: 15
     *     responses:
     *       200:
     *         description: Campeonato atualizado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Championship'
     *       404:
     *         description: Campeonato não encontrado
     *       403:
     *         description: Sem permissão para atualizar este campeonato
     */
    this.router.put('/:id', authMiddleware, this.updateChampionship.bind(this));

    /**
     * @swagger
     * /championships/{id}:
     *   delete:
     *     summary: Deletar campeonato
     *     tags: [Championships]
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
     *         description: Campeonato deletado com sucesso
     *       404:
     *         description: Campeonato não encontrado
     *       403:
     *         description: Sem permissão para deletar este campeonato
     */
    this.router.delete(
      '/:id',
      authMiddleware,
      roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]),
      this.deleteChampionship.bind(this)
    );

    /**
     * @swagger
     * /championships/{id}/asaas-status:
     *   get:
     *     summary: Verifica o status da configuração Asaas do campeonato
     *     description: Permite verificar o status da configuração Asaas. Acessível pelo owner do campeonato ou usuários com role Administrator/Manager.
     *     tags: [Championships]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do campeonato
     *     responses:
     *       200:
     *         description: Status da configuração Asaas
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 championshipId:
     *                   type: string
     *                 splitEnabled:
     *                   type: boolean
     *                 asaasWalletId:
     *                   type: string
     *                   nullable: true
     *                 configured:
     *                   type: boolean
     *                 document:
     *                   type: string
     *                 personType:
     *                   type: number
     *       403:
     *         description: Usuário sem permissão (apenas owner, Administrator ou Manager)
     *       404:
     *         description: Campeonato não encontrado
     */
    this.router.get(
      '/:id/asaas-status',
      authMiddleware,
      this.checkAsaasStatus.bind(this)
    );

    /**
     * @swagger
     * /championships/{id}/asaas-wallet:
     *   put:
     *     summary: Atualiza o Wallet ID do Asaas para o campeonato
     *     description: Permite atualizar o Wallet ID do Asaas para habilitar o split de pagamentos. Acessível pelo owner do campeonato ou usuários com role Administrator/Manager.
     *     tags: [Championships]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: string
     *           format: uuid
     *         description: ID do campeonato
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required:
     *               - walletId
     *             properties:
     *               walletId:
     *                 type: string
     *                 description: Wallet ID da conta Asaas
     *     responses:
     *       200:
     *         description: Wallet ID atualizado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Championship'
     *       400:
     *         description: Dados inválidos ou split desabilitado
     *       401:
     *         description: Token não fornecido ou inválido
     *       403:
     *         description: Usuário sem permissão para acessar este campeonato
     *       404:
     *         description: Campeonato não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.put(
      '/:id/asaas-wallet',
      authMiddleware,
      this.updateAsaasWallet.bind(this)
    );
  }

  private async getAllChampionships(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const championships = await this.championshipService.findAll();
      res.json(championships);
    } catch (error) {
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getChampionshipById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      const championship = await this.championshipService.findById(id);

      if (!championship) {
        throw new NotFoundException('Campeonato não encontrado');
      }

      // Verificar se o usuário tem permissão para acessar este campeonato
      const hasPermission =
        await this.championshipStaffService.hasChampionshipPermission(
          userId,
          id
        );
      if (!hasPermission) {
        throw new ForbiddenException(
          'Você não tem permissão para acessar este campeonato'
        );
      }

      res.json(championship);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof ForbiddenException) {
        res.status(403).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getChampionshipPublic(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { slugOrId } = req.params;

      const championship = await this.findChampionshipBySlugOrId(slugOrId);

      if (!championship) {
        throw new NotFoundException('Campeonato não encontrado');
      }

      res.json(championship);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getChampionshipBasicInfo(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { id } = req.params;
      const basicInfo =
        await this.championshipService.getChampionshipBasicInfo(id);

      if (!basicInfo) {
        throw new NotFoundException('Campeonato não encontrado');
      }

      res.json(basicInfo);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getMyChampionships(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      // Buscar campeonatos próprios
      const ownedChampionships =
        await this.championshipService.findByOwnerId(userId);

      // Buscar campeonatos onde é staff
      const staffChampionshipIds =
        await this.championshipStaffService.getUserStaffChampionships(userId);
      const staffChampionships = await Promise.all(
        staffChampionshipIds.map(id => this.championshipService.findById(id))
      );

      // Buscar campeonatos onde está inscrito como piloto
      const userRegistrations =
        await this.seasonRegistrationService.findByUserId(userId);
      const participatingChampionshipIds = new Set<string>();

      // Extrair IDs únicos dos campeonatos das inscrições
      userRegistrations.forEach(registration => {
        if (registration.season && registration.season.championshipId) {
          participatingChampionshipIds.add(registration.season.championshipId);
        }
      });

      // Buscar dados completos dos campeonatos onde está inscrito
      const participatingChampionships = await Promise.all(
        Array.from(participatingChampionshipIds).map(id =>
          this.championshipService.findById(id)
        )
      );

      // Combinar e remover duplicatas
      const allChampionships: any[] = [...ownedChampionships];

      // Adicionar campeonatos onde é staff (se não for owner)
      staffChampionships.forEach(staffChamp => {
        if (
          staffChamp &&
          !allChampionships.find(owned => owned.id === staffChamp.id)
        ) {
          allChampionships.push({
            ...staffChamp,
            isStaff: true,
            isOwner: false,
            isPilot: false,
          });
        }
      });

      // Adicionar campeonatos onde está inscrito como piloto (se não for owner nem staff)
      participatingChampionships.forEach(pilotChamp => {
        if (
          pilotChamp &&
          !allChampionships.find(existing => existing.id === pilotChamp.id)
        ) {
          allChampionships.push({
            ...pilotChamp,
            isStaff: false,
            isOwner: false,
            isPilot: true,
          });
        }
      });

      // Marcar os campeonatos próprios e verificar se também é piloto
      allChampionships.forEach((champ: any) => {
        if (
          !champ.hasOwnProperty('isStaff') &&
          !champ.hasOwnProperty('isPilot')
        ) {
          champ.isOwner = true;
          champ.isStaff = false;
          champ.isPilot = participatingChampionshipIds.has(champ.id);
        } else if (champ.isStaff) {
          // Se é staff, verificar se também é piloto
          champ.isPilot = participatingChampionshipIds.has(champ.id);
        }
      });

      res.json(allChampionships);
    } catch (error) {
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async createChampionship(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const userId = (req as any).user.id;
    const championshipData = req.body;

    // Validações básicas
    this.validateChampionshipData(championshipData);

    // Adiciona o ownerId
    championshipData.ownerId = userId;

    // Preenchimento automático dos campos responsáveis se isResponsible for true
    if (championshipData.isResponsible === true) {
      await this.fillResponsibleDataFromUser(championshipData, userId);
    }

    // Gerar IDs para sponsors se eles existirem
    if (championshipData.sponsors && Array.isArray(championshipData.sponsors)) {
      championshipData.sponsors = championshipData.sponsors.map(
        (sponsor: any) => ({
          ...sponsor,
          id: this.generateSponsorId(sponsor.name),
          type: sponsor.type || 'sponsor', // Default para 'sponsor' se não especificado
        })
      );
    }

    const championship =
      await this.championshipService.create(championshipData);
    res.status(201).json(championship);
  }

  private async updateChampionship(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const championshipData = req.body;

    // Verifica se o campeonato existe
    const existingChampionship = await this.championshipService.findById(id);
    if (!existingChampionship) {
      throw new NotFoundException('Campeonato não encontrado');
    }

    // Verifica se o usuário é o proprietário ou staff member
    const hasPermission =
      await this.championshipStaffService.hasChampionshipPermission(userId, id);
    if (!hasPermission) {
      throw new ForbiddenException(
        'Você não tem permissão para atualizar este campeonato'
      );
    }

    // Validações básicas (apenas para campos que estão sendo atualizados)
    this.validateChampionshipData(championshipData, false);

    // Preenchimento automático dos campos responsáveis se isResponsible for true
    if (championshipData.isResponsible === true) {
      await this.fillResponsibleDataFromUser(championshipData, userId);
    }

    // Gerar IDs para sponsors se eles existirem
    if (championshipData.sponsors && Array.isArray(championshipData.sponsors)) {
      championshipData.sponsors = championshipData.sponsors.map(
        (sponsor: any) => ({
          ...sponsor,
          id: sponsor.id || this.generateSponsorId(sponsor.name),
          type: sponsor.type || 'sponsor', // Default para 'sponsor' se não especificado
        })
      );
    }

    const championship = await this.championshipService.update(
      id,
      championshipData
    );
    res.json(championship);
  }

  private async deleteChampionship(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Verifica se o campeonato existe
    const existingChampionship = await this.championshipService.findById(id);
    if (!existingChampionship) {
      throw new NotFoundException('Campeonato não encontrado');
    }

    // Verifica se o usuário é o proprietário
    if (existingChampionship.ownerId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para deletar este campeonato'
      );
    }

    await this.championshipService.delete(id);
    res.json({ message: 'Campeonato deletado com sucesso' });
  }

  private async findChampionshipBySlugOrId(
    slugOrId: string
  ): Promise<Championship | null> {
    return this.championshipService.findBySlugOrId(slugOrId);
  }

  private validateChampionshipData(data: any, isCreate: boolean = true): void {
    if (isCreate) {
      // Validações obrigatórias para criação
      if (!data.name || data.name.trim().length === 0) {
        throw new BadRequestException('Nome do campeonato é obrigatório');
      }
      if (
        !data.championshipImage ||
        data.championshipImage.trim().length === 0
      ) {
        throw new BadRequestException('Imagem do campeonato é obrigatória');
      }
      if (!data.shortDescription || data.shortDescription.trim().length === 0) {
        throw new BadRequestException(
          'Descrição curta do campeonato é obrigatória'
        );
      }
      if (!data.fullDescription || data.fullDescription.trim().length === 0) {
        throw new BadRequestException(
          'Descrição completa do campeonato é obrigatória'
        );
      }
      if (!data.document || data.document.trim().length === 0) {
        throw new BadRequestException('Documento é obrigatório');
      }
      if (!data.cep || data.cep.trim().length === 0) {
        throw new BadRequestException('CEP é obrigatório');
      }
      if (!data.state || data.state.trim().length === 0) {
        throw new BadRequestException('Estado é obrigatório');
      }
      if (!data.city || data.city.trim().length === 0) {
        throw new BadRequestException('Cidade é obrigatória');
      }
      if (!data.fullAddress || data.fullAddress.trim().length === 0) {
        throw new BadRequestException('Endereço completo é obrigatório');
      }
      if (!data.province || data.province.trim().length === 0) {
        throw new BadRequestException('Bairro é obrigatório');
      }
      if (!data.number || data.number.trim().length === 0) {
        throw new BadRequestException('Número do endereço é obrigatório');
      }
    }

    // Validações de tamanho
    if (data.name && data.name.length > 90) {
      throw new BadRequestException(
        'Nome do campeonato deve ter no máximo 90 caracteres'
      );
    }
    if (data.shortDescription && data.shortDescription.length > 165) {
      throw new BadRequestException(
        'Descrição curta deve ter no máximo 165 caracteres'
      );
    }
    if (data.document && data.document.length > 18) {
      throw new BadRequestException(
        'Documento deve ter no máximo 18 caracteres'
      );
    }
    if (data.socialReason && data.socialReason.length > 255) {
      throw new BadRequestException(
        'Razão social deve ter no máximo 255 caracteres'
      );
    }
    if (data.cep && data.cep.length > 9) {
      throw new BadRequestException('CEP deve ter no máximo 9 caracteres');
    }
    if (data.state && data.state.length > 2) {
      throw new BadRequestException('Estado deve ter no máximo 2 caracteres');
    }
    if (data.city && data.city.length > 100) {
      throw new BadRequestException('Cidade deve ter no máximo 100 caracteres');
    }
    if (data.number && data.number.length > 10) {
      throw new BadRequestException('Número deve ter no máximo 10 caracteres');
    }
    if (data.complement && data.complement.length > 100) {
      throw new BadRequestException(
        'Complemento deve ter no máximo 100 caracteres'
      );
    }
    if (data.responsibleName && data.responsibleName.length > 100) {
      throw new BadRequestException(
        'Nome do responsável deve ter no máximo 100 caracteres'
      );
    }
    if (data.responsiblePhone && data.responsiblePhone.length > 15) {
      throw new BadRequestException(
        'Telefone do responsável deve ter no máximo 15 caracteres'
      );
    }

    // Validação do tipo de pessoa
    if (
      data.personType !== undefined &&
      ![PersonType.FISICA, PersonType.JURIDICA].includes(data.personType)
    ) {
      throw new BadRequestException('Tipo de pessoa inválido');
    }

    // Validação condicional: se não é responsável, deve informar nome e telefone
    if (data.isResponsible === false) {
      if (!data.responsibleName || data.responsibleName.trim().length === 0) {
        throw new BadRequestException(
          'Nome do responsável é obrigatório quando não é o próprio usuário'
        );
      }
      if (!data.responsiblePhone || data.responsiblePhone.trim().length === 0) {
        throw new BadRequestException(
          'Telefone do responsável é obrigatório quando não é o próprio usuário'
        );
      }
      if (!data.responsibleEmail || data.responsibleEmail.trim().length === 0) {
        throw new BadRequestException(
          'E-mail do responsável é obrigatório quando não é o próprio usuário'
        );
      }
      if (!data.responsibleBirthDate) {
        throw new BadRequestException(
          'Data de nascimento do responsável é obrigatória quando não é o próprio usuário'
        );
      }
    }

    // Validação condicional: se é pessoa jurídica, deve informar razão social
    if (data.personType === PersonType.JURIDICA) {
      if (!data.socialReason || data.socialReason.trim().length === 0) {
        throw new BadRequestException(
          'Razão social é obrigatória para pessoa jurídica'
        );
      }
    }

    // Validação dos patrocinadores
    if (data.sponsors && Array.isArray(data.sponsors)) {
      for (const sponsor of data.sponsors) {
        if (!sponsor.name || sponsor.name.trim().length === 0) {
          throw new BadRequestException('Nome do patrocinador é obrigatório');
        }
        if (!sponsor.logoImage || sponsor.logoImage.trim().length === 0) {
          throw new BadRequestException('Logo do patrocinador é obrigatório');
        }
        if (sponsor.website && typeof sponsor.website !== 'string') {
          throw new BadRequestException(
            'Website do patrocinador deve ser uma string válida'
          );
        }
        if (sponsor.type && !['sponsor', 'supporter'].includes(sponsor.type)) {
          throw new BadRequestException(
            'Tipo do patrocinador deve ser "sponsor" ou "supporter"'
          );
        }
      }
    }
  }

  /**
   * Preenche automaticamente os dados do responsável com informações do usuário logado
   */
  private async fillResponsibleDataFromUser(
    championshipData: any,
    userId: string
  ): Promise<void> {
    try {
      // Buscar dados do usuário
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new NotFoundException(`Usuário com ID ${userId} não encontrado.`);
      }

      // Buscar dados do member profile
      const memberProfile =
        await this.memberProfileService.findByUserId(userId);

      // Validar se os campos obrigatórios existem no perfil do usuário
      if (!user.phone) {
        throw new BadRequestException(
          'Seu perfil de usuário não possui um telefone. Por favor, atualize seu cadastro.'
        );
      }
      if (!memberProfile || !memberProfile.birthDate) {
        throw new BadRequestException(
          'Seu perfil de usuário não possui uma data de nascimento. Por favor, atualize seu cadastro.'
        );
      }

      // Preencher campos responsáveis com dados do usuário
      championshipData.responsibleName = user.name || '';
      championshipData.responsiblePhone = user.phone;
      championshipData.responsibleEmail = user.email || '';
      championshipData.responsibleBirthDate = memberProfile.birthDate;
    } catch (error) {
      // Não falha a criação do campeonato se não conseguir buscar os dados do usuário
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Não foi possível preencher os dados do responsável a partir do seu perfil de usuário.'
      );
    }
  }

  private generateSponsorId(name: string): string {
    return (
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove acentos
        .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
        .replace(/\s+/g, '-') // Substitui espaços por hífens
        .replace(/--+/g, '-') // Remove hífens duplos
        .trim()
        .slice(0, 50) + // Limita o tamanho
      '-' +
      Date.now().toString(36)
    ); // Adiciona timestamp para garantir unicidade
  }

  private async checkAsaasStatus(req: Request, res: Response): Promise<void> {
    try {
      const championshipId = req.params.id;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const championship =
        await this.championshipService.findById(championshipId);
      if (!championship) {
        res.status(404).json({ message: 'Campeonato não encontrado' });
        return;
      }

      // Verifica se o usuário tem permissão para gerenciar este campeonato
      const hasPermission =
        await this.championshipStaffService.hasChampionshipPermission(
          userId,
          championshipId
        );
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para acessar este campeonato',
        });
        return;
      }

      const status =
        await this.championshipService.getAsaasStatus(championshipId);

      res.json(status);
    } catch (error: any) {
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async updateAsaasWallet(req: Request, res: Response): Promise<void> {
    try {
      const championshipId = req.params.id;
      const userId = (req as any).user.id;
      const { walletId } = req.body;

      // Verifica se o campeonato existe
      const championship =
        await this.championshipService.findById(championshipId);
      if (!championship) {
        res.status(404).json({ message: 'Campeonato não encontrado' });
        return;
      }

      // Verifica se o usuário tem permissão para gerenciar este campeonato
      const hasPermission =
        await this.championshipStaffService.hasChampionshipPermission(
          userId,
          championshipId
        );
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para acessar este campeonato',
        });
        return;
      }

      // Verifica se o split está habilitado
      if (!championship.splitEnabled) {
        res.status(400).json({
          message: 'Split payment não está habilitado para este campeonato',
        });
        return;
      }

      // Verifica se o Wallet ID é válido
      if (!walletId || walletId.trim().length === 0) {
        res.status(400).json({ message: 'Wallet ID é obrigatório' });
        return;
      }

      // Atualiza o Wallet ID
      const updatedChampionship =
        await this.championshipService.updateAsaasWalletId(
          championshipId,
          walletId
        );

      res.json(updatedChampionship);
    } catch (error: any) {
      res
        .status(500)
        .json({ message: 'Erro interno do servidor ao atualizar Wallet ID' });
    }
  }
}

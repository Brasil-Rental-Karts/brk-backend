import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { ChampionshipService } from '../services/championship.service';
import { UserService } from '../services/user.service';
import { AuthService } from '../services/auth.service';
import { authMiddleware, roleMiddleware } from '../middleware/auth.middleware';
import { Championship, PersonType } from '../models/championship.entity';
import { UserRole } from '../models/user.entity';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { NotFoundException } from '../exceptions/not-found.exception';
import { ForbiddenException } from '../exceptions/forbidden.exception';

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
 *         incomeValue:
 *           type: number
 *           format: decimal
 *           description: Faturamento/Renda mensal em reais
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
 *         asaasCustomerId:
 *           type: string
 *           description: ID do cliente/subconta no Asaas
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
    private authService: AuthService
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
    this.router.get('/:id', authMiddleware, this.getChampionshipById.bind(this));

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
    this.router.get('/:id/basic', authMiddleware, this.getChampionshipBasicInfo.bind(this));

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
     *       201:
     *         description: Campeonato criado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Championship'
     *       400:
     *         description: Dados inválidos
     */
    this.router.post('/', authMiddleware, roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]), this.createChampionship.bind(this));

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
    this.router.put('/:id', authMiddleware, roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]), this.updateChampionship.bind(this));

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
    this.router.delete('/:id', authMiddleware, roleMiddleware([UserRole.ADMINISTRATOR, UserRole.MANAGER]), this.deleteChampionship.bind(this));

    /**
     * @swagger
     * /championships/{id}/create-asaas-account:
     *   post:
     *     summary: Criar subconta Asaas manualmente
     *     description: Cria a subconta Asaas para o campeonato através das configurações
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
     *         description: Subconta Asaas criada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 asaasCustomerId:
     *                   type: string
     *                 asaasWalletId:
     *                   type: string
     *       400:
     *         description: Erro na criação da subconta (dados inválidos, split desabilitado, etc.)
     *       404:
     *         description: Campeonato não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post('/:id/create-asaas-account', authMiddleware, this.createAsaasAccount.bind(this));

    /**
     * @swagger
     * /championships/{id}/retry-asaas-setup:
     *   post:
     *     summary: Força a configuração da subconta Asaas para o campeonato
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
     *         description: Subconta configurada com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Championship'
     *       400:
     *         description: Erro de validação ou campeonato já configurado
     *       401:
     *         description: Token não fornecido ou inválido
     *       403:
     *         description: Usuário sem permissão para acessar este campeonato
     *       404:
     *         description: Campeonato não encontrado
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post('/:id/retry-asaas-setup', authMiddleware, this.retryAsaasSetup.bind(this));

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
   *                 asaasCustomerId:
   *                   type: string
   *                   nullable: true
   *                 asaasWalletId:
   *                   type: string
   *                   nullable: true
   *                 configured:
   *                   type: boolean
   *                 canRetry:
   *                   type: boolean
   *                 document:
   *                   type: string
   *       403:
   *         description: Usuário sem permissão (apenas owner, Administrator ou Manager)
   *       404:
   *         description: Campeonato não encontrado
     */
    this.router.get('/:id/asaas-status', authMiddleware, this.checkAsaasStatus.bind(this));
  }

  private async getAllChampionships(req: Request, res: Response): Promise<void> {
    try {
      const championships = await this.championshipService.findAll();
      res.json(championships);
    } catch (error) {
      console.error('Error getting all championships:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async getChampionshipById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const championship = await this.championshipService.findById(id);

      if (!championship) {
        throw new NotFoundException('Campeonato não encontrado');
      }

      res.json(championship);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting championship by id:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getChampionshipBasicInfo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const basicInfo = await this.championshipService.getChampionshipBasicInfo(id);

      if (!basicInfo) {
        throw new NotFoundException('Campeonato não encontrado');
      }

      res.json(basicInfo);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else {
        console.error('Error getting championship basic info:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async getMyChampionships(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const championships = await this.championshipService.findByOwnerId(userId);
      res.json(championships);
    } catch (error) {
      console.error('Error getting user championships:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }

  private async createChampionship(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const championshipData = req.body;

      // Validações básicas
      this.validateChampionshipData(championshipData);

      // Adiciona o ownerId
      championshipData.ownerId = userId;

      // Gerar IDs para sponsors se eles existirem
      if (championshipData.sponsors && Array.isArray(championshipData.sponsors)) {
        championshipData.sponsors = championshipData.sponsors.map((sponsor: any) => ({
          ...sponsor,
          id: this.generateSponsorId(sponsor.name)
        }));
      }

      const championship = await this.championshipService.create(championshipData);
      res.status(201).json(championship);
    } catch (error: any) {
      if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error creating championship:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async updateChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      const championshipData = req.body;

      // Verifica se o campeonato existe
      const existingChampionship = await this.championshipService.findById(id);
      if (!existingChampionship) {
        throw new NotFoundException('Campeonato não encontrado');
      }

      // Verifica se o usuário é o proprietário
      if (existingChampionship.ownerId !== userId) {
        throw new ForbiddenException('Você não tem permissão para atualizar este campeonato');
      }

      // Validações básicas (apenas para campos que estão sendo atualizados)
      this.validateChampionshipData(championshipData, false);

      // Gerar IDs para sponsors se eles existirem
      if (championshipData.sponsors && Array.isArray(championshipData.sponsors)) {
        championshipData.sponsors = championshipData.sponsors.map((sponsor: any) => ({
          ...sponsor,
          id: sponsor.id || this.generateSponsorId(sponsor.name)
        }));
      }

      const championship = await this.championshipService.update(id, championshipData);
      res.json(championship);
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof ForbiddenException) {
        res.status(403).json({ message: error.message });
      } else if (error instanceof BadRequestException) {
        res.status(400).json({ message: error.message });
      } else {
        console.error('Error updating championship:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private async deleteChampionship(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      // Verifica se o campeonato existe
      const existingChampionship = await this.championshipService.findById(id);
      if (!existingChampionship) {
        throw new NotFoundException('Campeonato não encontrado');
      }

      // Verifica se o usuário é o proprietário
      if (existingChampionship.ownerId !== userId) {
        throw new ForbiddenException('Você não tem permissão para deletar este campeonato');
      }

      await this.championshipService.delete(id);
      res.json({ message: 'Campeonato deletado com sucesso' });
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        res.status(404).json({ message: error.message });
      } else if (error instanceof ForbiddenException) {
        res.status(403).json({ message: error.message });
      } else {
        console.error('Error deleting championship:', error);
        res.status(500).json({ message: 'Erro interno do servidor' });
      }
    }
  }

  private validateChampionshipData(data: any, isCreate: boolean = true): void {
    if (isCreate) {
      // Validações obrigatórias para criação
      if (!data.name || data.name.trim().length === 0) {
        throw new BadRequestException('Nome do campeonato é obrigatório');
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
      if (!data.number || data.number.trim().length === 0) {
        throw new BadRequestException('Número do endereço é obrigatório');
      }
    }

    // Validações de tamanho
    if (data.name && data.name.length > 90) {
      throw new BadRequestException('Nome do campeonato deve ter no máximo 90 caracteres');
    }
    if (data.shortDescription && data.shortDescription.length > 165) {
      throw new BadRequestException('Descrição curta deve ter no máximo 165 caracteres');
    }
    if (data.document && data.document.length > 18) {
      throw new BadRequestException('Documento deve ter no máximo 18 caracteres');
    }
    if (data.socialReason && data.socialReason.length > 255) {
      throw new BadRequestException('Razão social deve ter no máximo 255 caracteres');
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
      throw new BadRequestException('Complemento deve ter no máximo 100 caracteres');
    }
    if (data.responsibleName && data.responsibleName.length > 100) {
      throw new BadRequestException('Nome do responsável deve ter no máximo 100 caracteres');
    }
    if (data.responsiblePhone && data.responsiblePhone.length > 15) {
      throw new BadRequestException('Telefone do responsável deve ter no máximo 15 caracteres');
    }

    // Validação do tipo de pessoa
    if (data.personType !== undefined && ![PersonType.FISICA, PersonType.JURIDICA].includes(data.personType)) {
      throw new BadRequestException('Tipo de pessoa inválido');
    }

    // Validação condicional: se não é responsável, deve informar nome e telefone
    if (data.isResponsible === false) {
      if (!data.responsibleName || data.responsibleName.trim().length === 0) {
        throw new BadRequestException('Nome do responsável é obrigatório quando não é o próprio usuário');
      }
      if (!data.responsiblePhone || data.responsiblePhone.trim().length === 0) {
        throw new BadRequestException('Telefone do responsável é obrigatório quando não é o próprio usuário');
      }
    }

    // Validação condicional: se é pessoa jurídica, deve informar razão social
    if (data.personType === PersonType.JURIDICA) {
      if (!data.socialReason || data.socialReason.trim().length === 0) {
        throw new BadRequestException('Razão social é obrigatória para pessoa jurídica');
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
          throw new BadRequestException('Website do patrocinador deve ser uma string válida');
        }
      }
    }
  }

  private generateSponsorId(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^\w\s-]/g, '') // Remove caracteres especiais
      .replace(/\s+/g, '-') // Substitui espaços por hífens
      .replace(/--+/g, '-') // Remove hífens duplos
      .trim()
      .slice(0, 50) // Limita o tamanho
      + '-' + Date.now().toString(36); // Adiciona timestamp para garantir unicidade
  }

  private async createAsaasAccount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;

      // Verifica se o campeonato existe
      const championship = await this.championshipService.findById(id);
      if (!championship) {
        res.status(404).json({ message: 'Campeonato não encontrado' });
        return;
      }

      // Verifica se o usuário é o proprietário
      if (championship.ownerId !== userId) {
        res.status(403).json({ message: 'Você não tem permissão para configurar este campeonato' });
        return;
      }

      // Cria a subconta Asaas
      const updatedChampionship = await this.championshipService.createAsaasSubAccount(id);

      if (updatedChampionship && updatedChampionship.asaasCustomerId && updatedChampionship.asaasWalletId) {
        res.json({
          message: 'Subconta Asaas criada com sucesso',
          asaasCustomerId: updatedChampionship.asaasCustomerId,
          asaasWalletId: updatedChampionship.asaasWalletId
        });
      } else {
        res.status(500).json({ message: 'Erro ao criar subconta Asaas' });
      }
    } catch (error: any) {
      console.error('Error creating Asaas account:', error);
      
      if (error.message.includes('não encontrado') || error.message.includes('not found')) {
        res.status(404).json({ message: error.message });
      } else if (error.message.includes('não está habilitado') || error.message.includes('obrigatório')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor ao criar subconta Asaas' });
      }
    }
  }

  private async retryAsaasSetup(req: Request, res: Response): Promise<void> {
    try {
      const championshipId = req.params.id;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      // Verifica se o campeonato existe
      const championship = await this.championshipService.findById(championshipId);
      if (!championship) {
        res.status(404).json({ message: 'Campeonato não encontrado' });
        return;
      }

      // Verifica se o usuário tem permissão (owner ou admin)
      if (userRole !== UserRole.ADMINISTRATOR && championship.ownerId !== userId) {
        res.status(403).json({ message: 'Você não tem permissão para configurar este campeonato' });
        return;
      }

      console.log(`[CHAMPIONSHIP] Forçando configuração da subconta Asaas para campeonato: ${championshipId}`);
      console.log(`[CHAMPIONSHIP] Dados atuais - asaasCustomerId: ${championship.asaasCustomerId}, asaasWalletId: ${championship.asaasWalletId}`);

      // Força a configuração da subconta
      const updatedChampionship = await this.championshipService.retryAsaasSubAccountSetup(championshipId);

      res.json({
        message: 'Subconta configurada com sucesso',
        championship: updatedChampionship
      });
    } catch (error: any) {
      console.error('Error in retryAsaasSetup:', error);
      
      if (error.message === 'Campeonato não encontrado') {
        res.status(404).json({ message: error.message });
      } else if (error.message === 'Split payment não está habilitado para este campeonato') {
        res.status(400).json({ message: error.message });
      } else if (error.message.includes('Subconta já configurada')) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: 'Erro interno do servidor ao configurar subconta' });
      }
    }
  }

  private async checkAsaasStatus(req: Request, res: Response): Promise<void> {
    try {
      const championshipId = req.params.id;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;

      const championship = await this.championshipService.findById(championshipId);
      if (!championship) {
        res.status(404).json({ message: 'Campeonato não encontrado' });
        return;
      }

      // Verifica se o usuário tem permissão (owner, administrator ou manager)
      const hasPermission = 
        userRole === UserRole.ADMINISTRATOR || 
        userRole === UserRole.MANAGER || 
        championship.ownerId === userId;

      if (!hasPermission) {
        res.status(403).json({ message: 'Você não tem permissão para acessar este campeonato' });
        return;
      }

      const isConfigured = !!(championship.asaasCustomerId && championship.asaasWalletId);
      const canRetry = championship.splitEnabled && championship.document && !isConfigured;

      res.json({
        championshipId: championship.id,
        splitEnabled: championship.splitEnabled,
        asaasCustomerId: championship.asaasCustomerId,
        asaasWalletId: championship.asaasWalletId,
        configured: isConfigured,
        canRetry: canRetry,
        document: championship.document,
        personType: championship.personType
      });
    } catch (error: any) {
      console.error('Error checking Asaas status:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
} 
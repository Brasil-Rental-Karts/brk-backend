import { Request, Response } from 'express';

import { AppDataSource } from '../config/database.config';
import { authMiddleware } from '../middleware/auth.middleware';
import { MemberProfile } from '../models/member-profile.entity';
import { User } from '../models/user.entity';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import { UserRepository } from '../repositories/user.repository';
import { AdminStatsService } from '../services/admin-stats.service';
import { UserService } from '../services/user.service';
import { BaseController } from './base.controller';

/**
 * @swagger
 * components:
 *   schemas:
 *     AdminStats:
 *       type: object
 *       properties:
 *         totalUsers:
 *           type: number
 *           description: Total de usuários ativos no sistema
 *           example: 150
 *         totalUsersWithRegistrations:
 *           type: number
 *           description: Total de usuários únicos que possuem pelo menos uma inscrição em qualquer campeonato
 *           example: 120
 *         totalConfirmedRegistrations:
 *           type: number
 *           description: Soma total de pilotos confirmados em todos os campeonatos
 *           example: 200
 *         championshipsStats:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ChampionshipStats'
 *     ChampionshipStats:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: ID do campeonato
 *           example: "123e4567-e89b-12d3-a456-426614174000"
 *         name:
 *           type: string
 *           description: Nome do campeonato
 *           example: "Campeonato Brasileiro de Kart 2024"
 *         totalRegistrations:
 *           type: number
 *           description: Total de inscrições no campeonato
 *           example: 50
 *         confirmedRegistrations:
 *           type: number
 *           description: Total de inscrições confirmadas
 *           example: 45
 *         pendingRegistrations:
 *           type: number
 *           description: Total de inscrições pendentes
 *           example: 3
 *         cancelledRegistrations:
 *           type: number
 *           description: Total de inscrições canceladas
 *           example: 2
 *         totalUsers:
 *           type: number
 *           description: Total de usuários únicos no campeonato
 *           example: 45
 *         confirmedUsers:
 *           type: number
 *           description: Total de usuários com inscrições confirmadas
 *           example: 40
 *         pilotsEnrolled:
 *           type: number
 *           description: Total de pilotos inscritos no campeonato
 *           example: 50
 *         pilotsConfirmed:
 *           type: number
 *           description: Pilotos que pagaram tudo, pelo menos uma parcela, são isentos ou têm pagamento direto
 *           example: 35
 *         pilotsPending:
 *           type: number
 *           description: Pilotos que não pagaram nada mas têm parcelas pendentes
 *           example: 10
 *         pilotsOverdue:
 *           type: number
 *           description: Pilotos que deixaram vencer parcelas
 *           example: 5
 */

export class AdminStatsController extends BaseController {
  private adminStatsService: AdminStatsService;
  private userService: UserService;

  constructor() {
    super('/admin-stats');
    this.adminStatsService = new AdminStatsService();
    this.userService = new UserService(
      new UserRepository(AppDataSource.getRepository(User)),
      new MemberProfileRepository(AppDataSource.getRepository(MemberProfile))
    );
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /admin-stats:
     *   get:
     *     summary: Obtém estatísticas administrativas
     *     description: Retorna estatísticas gerais do sistema para administradores
     *     tags: [Admin Stats]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Estatísticas recuperadas com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Estatísticas administrativas recuperadas com sucesso"
     *                 data:
     *                   $ref: '#/components/schemas/AdminStats'
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Acesso negado - requer permissões de administrador
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/', authMiddleware, this.getAdminStats.bind(this));

    /**
     * @swagger
     * /admin-stats/cache/users/preload:
     *   post:
     *     summary: Faz o preload de todos os usuários no cache Redis
     *     description: Carrega todos os usuários do banco de dados para o cache Redis para melhor performance
     *     tags: [Admin Stats]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Preload realizado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Cache de usuários atualizado com sucesso"
     *                 data:
     *                   type: object
     *                   properties:
     *                     totalUsers:
     *                       type: number
     *                       example: 150
     *                       description: Total de usuários carregados no cache
     *                     duration:
     *                       type: string
     *                       example: "2.5s"
     *                       description: Tempo que levou para carregar
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Acesso negado - requer permissões de administrador
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/cache/users/preload',
      authMiddleware,
      this.preloadUsersCache.bind(this)
    );

    /**
     * @swagger
     * /admin-stats/cache/categories/update:
     *   post:
     *     summary: Atualiza o cache de pilotos por categoria no Redis
     *     description: Carrega todos os pilotos inscritos em cada categoria para o cache Redis
     *     tags: [Admin Stats]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Cache de categorias atualizado com sucesso
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Cache de categorias atualizado com sucesso"
     *                 data:
     *                   type: object
     *                   properties:
     *                     totalCategories:
     *                       type: number
     *                       example: 25
     *                       description: Total de categorias processadas
     *                     totalPilots:
     *                       type: number
     *                       example: 1500
     *                       description: Total de pilotos carregados no cache
     *                     duration:
     *                       type: string
     *                       example: "3.2s"
     *                       description: Tempo que levou para carregar
     *       401:
     *         description: Não autorizado
     *       403:
     *         description: Acesso negado - requer permissões de administrador
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.post(
      '/cache/categories/update',
      authMiddleware,
      this.updateCategoriesCache.bind(this)
    );
  }

  private async getAdminStats(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se o usuário é administrador
      if (req.user!.role !== 'Administrator') {
        res.status(403).json({
          message: 'Acesso negado. Requer permissões de administrador.',
        });
        return;
      }

      const stats = await this.adminStatsService.getAdminStats();

      res.json({
        message: 'Estatísticas administrativas recuperadas com sucesso',
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting admin stats:', error);
      res.status(500).json({
        message: error.message || 'Erro interno do servidor',
      });
    }
  }

  private async preloadUsersCache(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se o usuário é administrador
      if (req.user!.role !== 'Administrator') {
        res.status(403).json({
          message: 'Acesso negado. Requer permissões de administrador.',
        });
        return;
      }

      const startTime = Date.now();
      await this.userService.preloadAllUsersToCache();
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(1);

      // Get total users for response
      const totalUsers = (await this.userService.getAllCachedUserIds()).length;

      const result = {
        totalUsers,
        duration: `${duration}s`,
      };

      res.json({
        message: 'Cache de usuários atualizado com sucesso',
        data: result,
      });
    } catch (error: any) {
      console.error('Error preloading users cache:', error);
      res.status(500).json({
        message: error.message || 'Erro interno do servidor',
      });
    }
  }

  private async updateCategoriesCache(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      // Verificar se o usuário é administrador
      if (req.user!.role !== 'Administrator') {
        res.status(403).json({
          message: 'Acesso negado. Requer permissões de administrador.',
        });
        return;
      }

      const result = await this.adminStatsService.updateCategoriesPilotsCache();

      res.json({
        message: 'Cache de categorias atualizado com sucesso',
        data: result,
      });
    } catch (error: any) {
      console.error('Error updating categories cache:', error);
      res.status(500).json({
        message: error.message || 'Erro interno do servidor',
      });
    }
  }
}

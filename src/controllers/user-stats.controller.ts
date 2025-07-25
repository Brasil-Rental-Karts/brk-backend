import { Request, Response } from 'express';

import { authMiddleware } from '../middleware/auth.middleware';
import { UserStatsService } from '../services/user-stats.service';
import { BaseController } from './base.controller';

/**
 * @swagger
 * components:
 *   schemas:
 *     UserStats:
 *       type: object
 *       properties:
 *         memberSince:
 *           type: string
 *           description: Ano em que o usuário se tornou membro
 *           example: "2023"
 *         totalRegistrations:
 *           type: number
 *           description: Total de inscrições do usuário
 *           example: 5
 *         confirmedRegistrations:
 *           type: number
 *           description: Total de inscrições confirmadas
 *           example: 3
 *         totalChampionships:
 *           type: number
 *           description: Total de campeonatos únicos que participou
 *           example: 2
 *         totalSeasons:
 *           type: number
 *           description: Total de temporadas únicas que participou
 *           example: 4
 *         totalUpcomingRaces:
 *           type: number
 *           description: Total de corridas futuras
 *           example: 3
 *         registrationsByStatus:
 *           type: object
 *           properties:
 *             confirmed:
 *               type: number
 *             payment_pending:
 *               type: number
 *             pending:
 *               type: number
 *             cancelled:
 *               type: number
 *             expired:
 *               type: number
 *         paymentsByStatus:
 *           type: object
 *           properties:
 *             paid:
 *               type: number
 *             pending:
 *               type: number
 *             processing:
 *               type: number
 *             failed:
 *               type: number
 *             cancelled:
 *               type: number
 *             refunded:
 *               type: number
 */

export class UserStatsController extends BaseController {
  private userStatsService: UserStatsService;

  constructor() {
    super('/user-stats');
    this.userStatsService = new UserStatsService();
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /user-stats:
     *   get:
     *     summary: Buscar estatísticas do usuário logado
     *     tags: [User Stats]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Estatísticas do usuário
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   $ref: '#/components/schemas/UserStats'
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get('/', authMiddleware, this.getUserStats.bind(this));

    /**
     * @swagger
     * /user-stats/basic:
     *   get:
     *     summary: Buscar estatísticas básicas do usuário logado (otimizado)
     *     tags: [User Stats]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Estatísticas básicas do usuário
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                 data:
     *                   type: object
     *                   properties:
     *                     memberSince:
     *                       type: string
     *                     totalRegistrations:
     *                       type: number
     *                     confirmedRegistrations:
     *                       type: number
     *                     totalChampionships:
     *                       type: number
     *                     totalSeasons:
     *                       type: number
     *                     totalUpcomingRaces:
     *                       type: number
     *       401:
     *         description: Token de acesso inválido
     *       500:
     *         description: Erro interno do servidor
     */
    this.router.get(
      '/basic',
      authMiddleware,
      this.getUserBasicStats.bind(this)
    );
  }

  private async getUserStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await this.userStatsService.getUserStats(userId);

      res.json({
        message: 'Estatísticas do usuário recuperadas com sucesso',
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting user stats:', error);
      res.status(500).json({
        message: error.message || 'Erro interno do servidor',
      });
    }
  }

  private async getUserBasicStats(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user!.id;
      const stats = await this.userStatsService.getUserBasicStats(userId);

      res.json({
        message: 'Estatísticas básicas do usuário recuperadas com sucesso',
        data: stats,
      });
    } catch (error: any) {
      console.error('Error getting user basic stats:', error);
      res.status(500).json({
        message: error.message || 'Erro interno do servidor',
      });
    }
  }
}

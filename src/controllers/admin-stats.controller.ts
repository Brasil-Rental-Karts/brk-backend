import { Router, Request, Response } from 'express';
import { BaseController } from './base.controller';
import { AdminStatsService } from '../services/admin-stats.service';
import { authMiddleware } from '../middleware/auth.middleware';

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

  constructor() {
    super('/admin-stats');
    this.adminStatsService = new AdminStatsService();
    this.initializeRoutes();
  }

  public initializeRoutes(): void {
    /**
     * @swagger
     * /admin-stats:
     *   get:
     *     summary: Obtém estatísticas administrativas do sistema
     *     description: Retorna estatísticas gerais do sistema incluindo total de usuários, inscrições e dados por campeonato
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
  }

  private async getAdminStats(req: Request, res: Response): Promise<void> {
    try {
      // Verificar se o usuário é administrador
      if (req.user!.role !== 'Administrator') {
        res.status(403).json({
          message: 'Acesso negado. Requer permissões de administrador.'
        });
        return;
      }

      const stats = await this.adminStatsService.getAdminStats();

      res.json({
        message: 'Estatísticas administrativas recuperadas com sucesso',
        data: stats
      });
    } catch (error: any) {
      console.error('Error getting admin stats:', error);
      res.status(500).json({
        message: error.message || 'Erro interno do servidor'
      });
    }
  }
} 
import { NextFunction, Request, Response } from 'express';

import { UserRole } from '../models/user.entity';
import { ChampionshipStaffService } from '../services/championship-staff.service';

interface ChampionshipAccessRequest extends Request {
  championshipId?: string;
}

/**
 * Middleware que verifica se o usuário tem permissão para acessar recursos de um campeonato específico.
 * Permite acesso para:
 * - Administradores e Managers (acesso global)
 * - Owners do campeonato
 * - Staff members do campeonato
 */
export const championshipAccessMiddleware = (
  championshipStaffService: ChampionshipStaffService,
  paramName: string = 'championshipId'
) => {
  return async (
    req: ChampionshipAccessRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Administradores e Managers têm acesso global
      if ([UserRole.ADMINISTRATOR, UserRole.MANAGER].includes(req.user.role)) {
        next();
        return;
      }

      // Extrair championshipId dos parâmetros da rota
      const championshipId = req.params[paramName];
      if (!championshipId) {
        res.status(400).json({ message: 'Championship ID is required' });
        return;
      }

      // Verificar se o usuário tem permissão para este campeonato específico
      const hasPermission =
        await championshipStaffService.hasChampionshipPermission(
          req.user.id,
          championshipId
        );
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para acessar este campeonato',
        });
        return;
      }

      // Adicionar championshipId ao request para uso posterior
      req.championshipId = championshipId;
      next();
    } catch (error) {
      console.error('Championship access middleware error:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
};

/**
 * Middleware para rotas que precisam verificar acesso a dados relacionados a campeonatos
 * através de seasonId (busca o championshipId através da season)
 */
export const seasonAccessMiddleware = (
  championshipStaffService: ChampionshipStaffService,
  seasonService: any, // Seria melhor ter uma interface definida
  paramName: string = 'seasonId'
) => {
  return async (
    req: ChampionshipAccessRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      // Administradores e Managers têm acesso global
      if ([UserRole.ADMINISTRATOR, UserRole.MANAGER].includes(req.user.role)) {
        next();
        return;
      }

      // Extrair seasonId dos parâmetros da rota
      const seasonId = req.params[paramName];
      if (!seasonId) {
        res.status(400).json({ message: 'Season ID is required' });
        return;
      }

      // Buscar a season para obter o championshipId
      const season = await seasonService.findById(seasonId);
      if (!season) {
        res.status(404).json({ message: 'Temporada não encontrada' });
        return;
      }

      // Verificar se o usuário tem permissão para este campeonato
      const hasPermission =
        await championshipStaffService.hasChampionshipPermission(
          req.user.id,
          season.championshipId
        );
      if (!hasPermission) {
        res.status(403).json({
          message: 'Você não tem permissão para acessar esta temporada',
        });
        return;
      }

      // Adicionar championshipId ao request para uso posterior
      req.championshipId = season.championshipId;
      next();
    } catch (error) {
      console.error('Season access middleware error:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
};

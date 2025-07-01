import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/user.entity';
import { ChampionshipStaffService } from '../services/championship-staff.service';
import { StaffPermissions } from '../models/championship-staff.entity';

interface StaffPermissionsRequest extends Request {
  championshipId?: string;
}

/**
 * Middleware que verifica se o usuário tem permissão específica para acessar recursos de um campeonato.
 * Permite acesso para:
 * - Administradores e Managers (acesso global)
 * - Owners do campeonato (todas as permissões)
 * - Staff members com a permissão específica
 */
export const staffPermissionsMiddleware = (
  championshipStaffService: ChampionshipStaffService,
  permission: keyof StaffPermissions,
  paramName: string = 'championshipId'
) => {
  return async (req: StaffPermissionsRequest, res: Response, next: NextFunction): Promise<void> => {
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

      // Verificar se o usuário tem a permissão específica
      const hasPermission = await championshipStaffService.hasSpecificPermission(req.user.id, championshipId, permission);
      if (!hasPermission) {
        res.status(403).json({ 
          message: `Você não tem permissão para acessar ${permission} neste campeonato` 
        });
        return;
      }

      // Adicionar championshipId ao request para uso posterior
      req.championshipId = championshipId;
      next();
    } catch (error) {
      console.error('Staff permissions middleware error:', error);
      res.status(500).json({ message: 'Erro interno do servidor' });
    }
  };
}; 
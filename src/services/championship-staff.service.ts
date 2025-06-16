import { BaseService } from './base.service';
import { ChampionshipStaff, StaffRole } from '../models/championship-staff.entity';
import { ChampionshipStaffRepository } from '../repositories/championship-staff.repository';
import { UserService } from './user.service';
import { ChampionshipService } from './championship.service';
import { NotFoundException } from '../exceptions/not-found.exception';
import { BadRequestException } from '../exceptions/bad-request.exception';
import { ForbiddenException } from '../exceptions/forbidden.exception';

export interface AddStaffMemberRequest {
  email: string;
}

export interface StaffMemberResponse {
  id: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  role: StaffRole | 'owner';
  addedAt: Date;
  addedBy: {
    id: string;
    name: string;
    email: string;
  };
  isOwner?: boolean;
}

export class ChampionshipStaffService extends BaseService<ChampionshipStaff> {
  constructor(
    protected repository: ChampionshipStaffRepository,
    private userService: UserService,
    private championshipService: ChampionshipService
  ) {
    super(repository);
  }

  async getStaffMembers(championshipId: string): Promise<StaffMemberResponse[]> {
    const staffMembers = await this.repository.findByChampionshipId(championshipId);
    
    // Buscar dados do owner do campeonato
    const championship = await this.championshipService.findById(championshipId);
    if (!championship) {
      throw new NotFoundException('Campeonato não encontrado');
    }

    const owner = await this.userService.findById(championship.ownerId);
    if (!owner) {
      throw new NotFoundException('Proprietário do campeonato não encontrado');
    }

    const result: StaffMemberResponse[] = [];

    // Adicionar o owner primeiro na lista
    result.push({
      id: `owner-${championship.ownerId}`, // ID especial para o owner
      user: {
        id: owner.id,
        name: owner.name,
        email: owner.email
      },
      role: 'owner' as any,
      addedAt: championship.createdAt,
      addedBy: {
        id: owner.id,
        name: owner.name,
        email: owner.email
      },
      isOwner: true
    });

    // Adicionar membros do staff
    staffMembers.forEach(staff => {
      result.push({
        id: staff.id,
        user: {
          id: staff.user.id,
          name: staff.user.name,
          email: staff.user.email
        },
        role: staff.role,
        addedAt: staff.addedAt,
        addedBy: {
          id: staff.addedBy.id,
          name: staff.addedBy.name,
          email: staff.addedBy.email
        },
        isOwner: false
      });
    });

    return result;
  }

  async addStaffMember(
    championshipId: string, 
    request: AddStaffMemberRequest, 
    addedById: string
  ): Promise<StaffMemberResponse> {

    // Verificar se o campeonato existe
    const championship = await this.championshipService.findById(championshipId);
    if (!championship) {
      throw new NotFoundException('Campeonato não encontrado');
    }

    // Verificar se o usuário tem permissão para gerenciar este campeonato
    const hasPermission = await this.hasChampionshipPermission(addedById, championshipId);
    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão para adicionar membros ao staff deste campeonato');
    }

    // Buscar usuário pelo email
    const userToAdd = await this.userService.findByEmail(request.email);
    if (!userToAdd) {
      throw new NotFoundException('Usuário com este email não encontrado');
    }

    // Verificar se o usuário não é o próprio owner
    if (userToAdd.id === championship.ownerId) {
      throw new BadRequestException('O proprietário do campeonato já tem todas as permissões');
    }

    // Verificar se já é membro do staff (ativo)
    const existingActiveStaff = await this.repository.findByUserAndChampionship(userToAdd.id, championshipId);
    if (existingActiveStaff) {
      throw new BadRequestException('Este usuário já é membro do staff deste campeonato');
    }

    // Verificar se já foi membro do staff anteriormente (incluindo inativos)
    const allStaff = await this.repository.findAll();
    const existingStaff = allStaff.find(staff => 
      staff.userId === userToAdd.id && staff.championshipId === championshipId
    );

    if (existingStaff) {
      // Se existe mas está inativo, reativar
      if (!existingStaff.isActive) {
        const updateData = {
          isActive: true,
          addedById: addedById,
          addedAt: new Date(),
          removedAt: null as any
        };
        
        const reactivatedStaff = await this.repository.update(existingStaff.id, updateData);
        if (!reactivatedStaff) {
          throw new Error('Erro ao reativar membro do staff');
        }

        // Carregar dados completos para retorno
        const fullStaffMember = await this.repository.findByIdWithRelations(existingStaff.id);
        if (!fullStaffMember) {
          throw new Error('Erro ao carregar dados do membro do staff');
        }

        return {
          id: fullStaffMember.id,
          user: {
            id: fullStaffMember.user.id,
            name: fullStaffMember.user.name,
            email: fullStaffMember.user.email
          },
          role: fullStaffMember.role,
          addedAt: fullStaffMember.addedAt,
          addedBy: {
            id: fullStaffMember.addedBy.id,
            name: fullStaffMember.addedBy.name,
            email: fullStaffMember.addedBy.email
          }
        };
      } else {
        throw new BadRequestException('Este usuário já é membro do staff deste campeonato');
      }
    }

    // Adicionar ao staff
    const savedStaffMember = await this.repository.createStaffMember({
      championshipId,
      userId: userToAdd.id,
      role: StaffRole.STAFF,
      addedById,
      addedAt: new Date(),
      isActive: true
    });

    // Carregar dados completos para retorno
    const fullStaffMember = await this.repository.findByIdWithRelations(savedStaffMember.id);
    if (!fullStaffMember) {
      throw new Error('Erro ao criar membro do staff');
    }

    return {
      id: fullStaffMember.id,
      user: {
        id: fullStaffMember.user.id,
        name: fullStaffMember.user.name,
        email: fullStaffMember.user.email
      },
      role: fullStaffMember.role,
      addedAt: fullStaffMember.addedAt,
      addedBy: {
        id: fullStaffMember.addedBy.id,
        name: fullStaffMember.addedBy.name,
        email: fullStaffMember.addedBy.email
      }
    };
  }

  async removeStaffMember(championshipId: string, staffMemberId: string, removedById: string): Promise<void> {
    // Verificar se o campeonato existe
    const championship = await this.championshipService.findById(championshipId);
    if (!championship) {
      throw new NotFoundException('Campeonato não encontrado');
    }

    // Verificar se o usuário tem permissão para gerenciar este campeonato
    const hasPermission = await this.hasChampionshipPermission(removedById, championshipId);
    if (!hasPermission) {
      throw new ForbiddenException('Você não tem permissão para remover membros do staff deste campeonato');
    }

    // Buscar membro do staff
    const staffMember = await this.repository.findById(staffMemberId);
    if (!staffMember || staffMember.championshipId !== championshipId) {
      throw new NotFoundException('Membro do staff não encontrado');
    }

    // Remover do staff
    await this.repository.removeFromStaff(staffMember.userId, championshipId);
  }

  async isUserStaffMember(userId: string, championshipId: string): Promise<boolean> {
    return this.repository.isUserStaffMember(userId, championshipId);
  }

  async getUserStaffChampionships(userId: string): Promise<string[]> {
    const staffChampionships = await this.repository.getUserStaffChampionships(userId);
    return staffChampionships.map(staff => staff.championshipId);
  }

  async hasChampionshipPermission(userId: string, championshipId: string): Promise<boolean> {
    // Verificar se é owner
    const championship = await this.championshipService.findById(championshipId);
    if (championship?.ownerId === userId) {
      return true;
    }

    // Verificar se é admin/manager global
    const user = await this.userService.findById(userId);
    if (user && ['Administrator', 'Manager'].includes(user.role)) {
      return true;
    }

    // Verificar se é membro do staff
    return this.isUserStaffMember(userId, championshipId);
  }
} 
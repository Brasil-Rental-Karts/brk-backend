import { Repository, In } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { User } from '../models/user.entity';
import { SeasonRegistration, RegistrationStatus } from '../models/season-registration.entity';
import { Championship } from '../models/championship.entity';
import { Season } from '../models/season.entity';
import { AsaasPayment, AsaasPaymentStatus } from '../models/asaas-payment.entity';
import { Category } from '../models/category.entity';
import { RedisService } from './redis.service';

export interface AdminStats {
  totalUsers: number;
  totalUsersWithRegistrations: number;
  totalConfirmedRegistrations: number;
  championshipsStats: ChampionshipStats[];
}

export interface ChampionshipStats {
  id: string;
  name: string;
  totalRegistrations: number;
  confirmedRegistrations: number;
  pendingRegistrations: number;
  cancelledRegistrations: number;
  totalUsers: number;
  confirmedUsers: number;
  pilotsEnrolled: number;
  pilotsConfirmed: number;
  pilotsPending: number;
  pilotsOverdue: number;
}

export interface PreloadCategoriesResult {
  totalCategories: number;
  totalPilots: number;
  duration: string;
}

export class AdminStatsService {
  private userRepository: Repository<User>;
  private registrationRepository: Repository<SeasonRegistration>;
  private championshipRepository: Repository<Championship>;
  private seasonRepository: Repository<Season>;
  private paymentRepository: Repository<AsaasPayment>;
  private categoryRepository: Repository<Category>;
  private redisService: RedisService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.registrationRepository = AppDataSource.getRepository(SeasonRegistration);
    this.championshipRepository = AppDataSource.getRepository(Championship);
    this.seasonRepository = AppDataSource.getRepository(Season);
    this.paymentRepository = AppDataSource.getRepository(AsaasPayment);
    this.categoryRepository = AppDataSource.getRepository(Category);
    this.redisService = RedisService.getInstance();
  }

  /**
   * Calcula estatísticas administrativas gerais
   */
  async getAdminStats(): Promise<AdminStats> {
    // Total de usuários
    const totalUsers = await this.userRepository.count({
      where: { active: true }
    });

    // Estatísticas por campeonato
    const championshipsStats = await this.getChampionshipsStats();

    // Calcular total de usuários com inscrições (únicos)
    const uniqueUsersWithRegistrations = new Set<string>();
    for (const championship of championshipsStats) {
      // Buscar todos os usuários que se inscreveram neste campeonato
      const registrations = await this.registrationRepository.find({
        where: { 
          seasonId: In(
            await this.seasonRepository.find({
              where: { championshipId: championship.id },
              select: ['id']
            }).then(seasons => seasons.map(s => s.id))
          )
        },
        select: ['userId']
      });
      
      registrations.forEach(reg => uniqueUsersWithRegistrations.add(reg.userId));
    }

    // Calcular total de pilotos confirmados (soma de todos os campeonatos)
    const totalConfirmedPilots = championshipsStats.reduce((sum, championship) => 
      sum + championship.pilotsConfirmed, 0
    );

    return {
      totalUsers,
      totalUsersWithRegistrations: uniqueUsersWithRegistrations.size,
      totalConfirmedRegistrations: totalConfirmedPilots,
      championshipsStats
    };
  }

  /**
   * Calcula estatísticas por campeonato
   */
  private async getChampionshipsStats(): Promise<ChampionshipStats[]> {
    const championships = await this.championshipRepository.find({
      order: { name: 'ASC' }
    });

    const stats: ChampionshipStats[] = [];

    for (const championship of championships) {
      // Buscar todas as temporadas do campeonato
      const seasons = await this.seasonRepository.find({
        where: { championshipId: championship.id },
        select: ['id']
      });

      if (seasons.length === 0) {
        stats.push({
          id: championship.id,
          name: championship.name,
          totalRegistrations: 0,
          confirmedRegistrations: 0,
          pendingRegistrations: 0,
          cancelledRegistrations: 0,
          totalUsers: 0,
          confirmedUsers: 0,
          pilotsEnrolled: 0,
          pilotsConfirmed: 0,
          pilotsPending: 0,
          pilotsOverdue: 0
        });
        continue;
      }

      const seasonIds = seasons.map(s => s.id);

      // Total de inscrições no campeonato
      const totalRegistrations = await this.registrationRepository.count({
        where: { seasonId: In(seasonIds) }
      });

      // Inscrições confirmadas
      const confirmedRegistrations = await this.registrationRepository.count({
        where: { 
          seasonId: In(seasonIds),
          status: RegistrationStatus.CONFIRMED
        }
      });

      // Inscrições pendentes
      const pendingRegistrations = await this.registrationRepository.count({
        where: { 
          seasonId: In(seasonIds),
          status: RegistrationStatus.PENDING
        }
      });

      // Inscrições canceladas
      const cancelledRegistrations = await this.registrationRepository.count({
        where: { 
          seasonId: In(seasonIds),
          status: RegistrationStatus.CANCELLED
        }
      });

      // Total de usuários únicos no campeonato
      const totalUsers = await this.registrationRepository
        .createQueryBuilder('reg')
        .select('COUNT(DISTINCT reg.userId)', 'count')
        .where('reg.seasonId IN (:...seasonIds)', { seasonIds })
        .getRawOne();

      // Usuários com inscrições confirmadas
      const confirmedUsers = await this.registrationRepository
        .createQueryBuilder('reg')
        .select('COUNT(DISTINCT reg.userId)', 'count')
        .where('reg.seasonId IN (:...seasonIds)', { seasonIds })
        .andWhere('reg.status = :status', { status: RegistrationStatus.CONFIRMED })
        .getRawOne();

      // Buscar registrations para calcular estatísticas de pilotos
      const registrations = await this.registrationRepository.find({
        where: { seasonId: In(seasonIds) },
        relations: ['payments']
      });

      // Calcular estatísticas de pilotos
      const pilotsEnrolled = new Set<string>(); // Todos que se inscreveram
      const pilotsConfirmed = new Set<string>(); // Pagaram tudo ou pelo menos uma parcela
      const pilotsPending = new Set<string>(); // Não pagaram nada, mas parcelas pendentes
      const pilotsOverdue = new Set<string>(); // Deixaram vencer parcelas

      for (const registration of registrations) {
        const userId = registration.userId;
        pilotsEnrolled.add(userId);

        // Verificar se é isento ou pagamento direto
        const isExemptOrDirectPayment = registration.paymentStatus === 'exempt' || registration.paymentStatus === 'direct_payment';

        const payments = registration.payments || [];
        const hasOverduePayments = payments.some(payment => 
          payment.status === AsaasPaymentStatus.OVERDUE
        );
        
        const hasPaidPayments = payments.some(payment => 
          [AsaasPaymentStatus.RECEIVED, AsaasPaymentStatus.CONFIRMED, AsaasPaymentStatus.RECEIVED_IN_CASH].includes(payment.status)
        );

        const hasPendingPayments = payments.some(payment => 
          payment.status === AsaasPaymentStatus.PENDING
        );

        // Se tem parcelas vencidas, é atrasado
        if (hasOverduePayments) {
          pilotsOverdue.add(userId);
        }
        // Se pagou pelo menos uma parcela, é isento, pagamento direto ou confirmado
        else if (hasPaidPayments || isExemptOrDirectPayment) {
          pilotsConfirmed.add(userId);
        }
        // Se não pagou nada mas tem parcelas pendentes, é pendente
        else if (hasPendingPayments) {
          pilotsPending.add(userId);
        }
      }

      stats.push({
        id: championship.id,
        name: championship.name,
        totalRegistrations,
        confirmedRegistrations,
        pendingRegistrations,
        cancelledRegistrations,
        totalUsers: parseInt(totalUsers?.count || '0'),
        confirmedUsers: parseInt(confirmedUsers?.count || '0'),
        pilotsEnrolled: pilotsEnrolled.size,
        pilotsConfirmed: pilotsConfirmed.size,
        pilotsPending: pilotsPending.size,
        pilotsOverdue: pilotsOverdue.size
      });
    }

    return stats;
  }

  /**
   * Atualiza o cache de pilotos por categoria no Redis
   */
  async updateCategoriesPilotsCache(): Promise<PreloadCategoriesResult> {
    const startTime = Date.now();
    
    // Buscar todas as categorias
    const categories = await this.categoryRepository.find({
      relations: ['season']
    });

    let totalPilots = 0;

    // Para cada categoria, buscar os pilotos inscritos
    for (const category of categories) {
      // Buscar todas as temporadas do campeonato da categoria
      const seasons = await this.seasonRepository.find({
        where: { championshipId: category.season.championshipId },
        select: ['id']
      });

      if (seasons.length === 0) {
        await this.redisService.cacheCategoryPilots(category.id, []);
        continue;
      }

      const seasonIds = seasons.map(s => s.id);

      // Buscar todas as inscrições que incluem esta categoria
      const registrations = await this.registrationRepository.find({
        where: { 
          seasonId: In(seasonIds)
        },
        relations: ['user', 'categories', 'categories.category']
      });

      // Filtrar inscrições que incluem esta categoria específica
      const categoryPilots = registrations.filter(registration =>
        registration.categories.some(rc => rc.category.id === category.id)
      );

      // Cachear os pilotos desta categoria
      await this.redisService.cacheCategoryPilots(category.id, categoryPilots);
      
      totalPilots += categoryPilots.length;
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(1);

    return {
      totalCategories: categories.length,
      totalPilots,
      duration: `${duration}s`
    };
  }
} 
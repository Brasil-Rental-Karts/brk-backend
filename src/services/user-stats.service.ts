import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database.config';
import { SeasonRegistration, RegistrationStatus } from '../models/season-registration.entity';
import { User } from '../models/user.entity';

export interface UserStats {
  memberSince: string;
  totalRegistrations: number;
  confirmedRegistrations: number;
  totalChampionships: number;
  totalSeasons: number;
  totalUpcomingRaces: number;
  registrationsByStatus: {
    confirmed: number;
    payment_pending: number;
    pending: number;
    cancelled: number;
    expired: number;
  };
  paymentsByStatus: {
    paid: number;
    pending: number;
    processing: number;
    failed: number;
    cancelled: number;
    refunded: number;
  };
}

export class UserStatsService {
  private registrationRepository: Repository<SeasonRegistration>;
  private userRepository: Repository<User>;

  constructor() {
    this.registrationRepository = AppDataSource.getRepository(SeasonRegistration);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * Calcula estatísticas completas do usuário
   */
  async getUserStats(userId: string): Promise<UserStats> {
    // Buscar dados do usuário
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar todas as inscrições do usuário
    const registrations = await this.registrationRepository.find({
      where: { userId },
      relations: ['season'],
      order: { createdAt: 'DESC' }
    });

    // Calcular estatísticas
    const memberSince = new Date(user.createdAt).getFullYear().toString();
    const totalRegistrations = registrations.length;
    const confirmedRegistrations = registrations.filter(r => r.status === RegistrationStatus.CONFIRMED).length;

    // Contar campeonatos únicos
    const championshipIds = new Set(registrations.map(r => r.season.championshipId));
    const totalChampionships = championshipIds.size;

    // Contar temporadas únicas
    const seasonIds = new Set(registrations.map(r => r.seasonId));
    const totalSeasons = seasonIds.size;

    // Contar próximas corridas (baseado em inscrições confirmadas)
    // Nota: Para uma implementação completa, seria necessário buscar as etapas futuras
    // Por enquanto, vamos usar as inscrições confirmadas como proxy
    const totalUpcomingRaces = confirmedRegistrations;

    // Estatísticas por status de inscrição
    const registrationsByStatus = {
      confirmed: registrations.filter(r => r.status === RegistrationStatus.CONFIRMED).length,
      payment_pending: registrations.filter(r => r.status === RegistrationStatus.PAYMENT_PENDING).length,
      pending: registrations.filter(r => r.status === RegistrationStatus.PENDING).length,
      cancelled: registrations.filter(r => r.status === RegistrationStatus.CANCELLED).length,
      expired: registrations.filter(r => r.status === RegistrationStatus.EXPIRED).length,
    };

    // Estatísticas por status de pagamento
    const paymentsByStatus = {
      paid: registrations.filter(r => r.paymentStatus === 'paid').length,
      pending: registrations.filter(r => r.paymentStatus === 'pending').length,
      processing: registrations.filter(r => r.paymentStatus === 'processing').length,
      failed: registrations.filter(r => r.paymentStatus === 'failed').length,
      cancelled: registrations.filter(r => r.paymentStatus === 'cancelled').length,
      refunded: registrations.filter(r => r.paymentStatus === 'refunded').length,
    };

    return {
      memberSince,
      totalRegistrations,
      confirmedRegistrations,
      totalChampionships,
      totalSeasons,
      totalUpcomingRaces,
      registrationsByStatus,
      paymentsByStatus
    };
  }

  /**
   * Calcula estatísticas básicas do usuário (versão otimizada)
   */
  async getUserBasicStats(userId: string): Promise<Partial<UserStats>> {
    // Buscar dados do usuário
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // Buscar contagem de inscrições
    const totalRegistrations = await this.registrationRepository.count({
      where: { userId }
    });

    const confirmedRegistrations = await this.registrationRepository.count({
      where: { 
        userId,
        status: RegistrationStatus.CONFIRMED
      }
    });

    // Para campeonatos únicos, precisamos fazer uma query mais complexa
    const registrationsWithSeasons = await this.registrationRepository.find({
      where: { userId },
      relations: ['season'],
      select: ['id', 'seasonId']
    });

    const championshipIds = new Set(registrationsWithSeasons.map(r => r.season.championshipId));
    const seasonIds = new Set(registrationsWithSeasons.map(r => r.seasonId));

    return {
      memberSince: new Date(user.createdAt).getFullYear().toString(),
      totalRegistrations,
      confirmedRegistrations,
      totalChampionships: championshipIds.size,
      totalSeasons: seasonIds.size,
      totalUpcomingRaces: confirmedRegistrations // Simplificado
    };
  }
} 
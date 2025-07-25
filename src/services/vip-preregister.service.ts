import { CreateVipPreregisterDto } from '../dtos/vip-preregister.dto';
import { ConflictException } from '../exceptions/conflict.exception';
import { VipPreregister } from '../models/vip-preregister.entity';
import { VipPreregisterRepository } from '../repositories/vip-preregister.repository';
import { BaseService } from './base.service';

export class VipPreregisterService extends BaseService<VipPreregister> {
  private vipPreregisterRepository: VipPreregisterRepository;

  constructor(vipPreregisterRepository: VipPreregisterRepository) {
    super(vipPreregisterRepository);
    this.vipPreregisterRepository = vipPreregisterRepository;
  }

  async createPreregister(
    data: CreateVipPreregisterDto
  ): Promise<VipPreregister> {
    // Check if email already exists
    const existingPreregister = await this.vipPreregisterRepository.findByEmail(
      data.email
    );
    if (existingPreregister) {
      throw new ConflictException(
        'Este e-mail já está cadastrado na nossa lista VIP'
      );
    }

    // Create new preregister
    return this.vipPreregisterRepository.create({
      name: data.name,
      email: data.email,
    });
  }

  async findByEmail(email: string): Promise<VipPreregister | null> {
    return this.vipPreregisterRepository.findByEmail(email);
  }

  async getAllPreregisters(): Promise<VipPreregister[]> {
    return this.vipPreregisterRepository.findAll();
  }
}

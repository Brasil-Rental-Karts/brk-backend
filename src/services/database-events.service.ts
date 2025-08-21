import dotenv from 'dotenv';
import { Client } from 'pg';

import { AppDataSource } from '../config/database.config';
import { redisConfig } from '../config/redis.config';
import { Championship } from '../models/championship.entity';
import { MemberProfile } from '../models/member-profile.entity';
import { Stage } from '../models/stage.entity';
import { User } from '../models/user.entity';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import { UserRepository } from '../repositories/user.repository';
import { RedisService } from './redis.service';
import { UserService } from './user.service';

// Load environment variables
dotenv.config();

export interface DatabaseEvent {
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  table: string;
  data: any;
}

export class DatabaseEventsService {
  private static instance: DatabaseEventsService;
  private client: Client | null = null;
  private redisService: RedisService;
  private classificationService: any;
  private userService: UserService;
  private isListening = false;

  private constructor() {
    this.redisService = RedisService.getInstance();
    this.classificationService = null; // classificação removida
    this.userService = new UserService(
      new UserRepository(AppDataSource.getRepository(User)),
      new MemberProfileRepository(AppDataSource.getRepository(MemberProfile))
    );
  }

  public static getInstance(): DatabaseEventsService {
    if (!DatabaseEventsService.instance) {
      DatabaseEventsService.instance = new DatabaseEventsService();
    }
    return DatabaseEventsService.instance;
  }

  async publishEvent(event: DatabaseEvent): Promise<boolean> {
    try {
      // Track all tables from redisConfig.trackedTables
      if (redisConfig.trackedTables.includes(event.table)) {
        // Publish the message to Redis
        const success = await this.redisService.publishMessage(event);

        return success;
      }

      return true; // Return true for non-tracked tables
    } catch (error) {
      return false;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) {
      return;
    }

    try {
      // Create a new PostgreSQL client dedicated to listening for notifications
      this.client = new Client({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USERNAME || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        database: process.env.DB_DATABASE || 'brk_competition',
        ssl:
          process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      });

      await this.client.connect();

      // Listen for database events
      this.client.query('LISTEN database_events');

      // Set up notification handler
      this.client.on('notification', async msg => {
        try {
          if (msg.channel === 'database_events' && msg.payload) {
            const payload = JSON.parse(msg.payload);

            // Check if the table is in our tracked tables
            if (redisConfig.trackedTables.includes(payload.table)) {
              // Publish the message to Redis
              const success = await this.redisService.publishMessage(payload);
            }
          }
        } catch (error) {
          // No need to log errors here, as we're not using console.error
        }
      });

      // Subscribe to Redis channel to handle caching
      await this.redisService.subscribeToChannel(
        redisConfig.channelName,
        this.handleDatabaseEvent.bind(this)
      );

      this.isListening = true;
    } catch (error) {
      // No need to log errors here, as we're not using console.error
    }
  }

  private async handleDatabaseEvent(event: any): Promise<void> {
    try {
      if (event.table === 'Championships') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the championship info with image
            if (event.data && event.data.id) {
              const championshipRepo =
                AppDataSource.getRepository(Championship);
              const fullChampionship = await championshipRepo.findOneBy({
                id: event.data.id,
              });

              if (fullChampionship) {
                await this.redisService.cacheChampionshipBasicInfo(
                  fullChampionship.id,
                  fullChampionship
                );
              }
            }
            break;
          case 'DELETE':
            // Remove championship from cache and clean up seasons index
            if (event.data && event.data.id) {
              await this.redisService.invalidateChampionshipCache(
                event.data.id
              );
              await this.redisService.invalidateChampionshipSeasonsIndex(
                event.data.id
              );
            }
            break;
        }
      }

      if (event.table === 'Seasons') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the season info with championship relationship
            if (event.data && event.data.id) {
              const seasonInfo = {
                id: event.data.id,
                name: event.data.name,
                slug: event.data.slug,
                startDate: event.data.startDate,
                endDate: event.data.endDate,
                championshipId: event.data.championshipId,
                registrationOpen: event.data.registrationOpen,
                regulationsEnabled: event.data.regulationsEnabled,
              };
              await this.redisService.cacheSeasonBasicInfo(
                event.data.id,
                seasonInfo
              );
            }
            break;
          case 'DELETE':
            // Remove season from cache and clean up related indexes
            if (event.data && event.data.id) {
              await this.redisService.invalidateSeasonCache(
                event.data.id,
                event.data.championshipId
              );
              await this.redisService.invalidateSeasonIndexes(event.data.id);
            }
            break;
        }
      }

      if (event.table === 'Categories') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the category info with season relationship
            if (event.data && event.data.id) {
              const categoryInfo = {
                id: event.data.id,
                name: event.data.name,
                ballast: event.data.ballast,
                maxPilots: event.data.maxPilots,
                minimumAge: event.data.minimumAge,
                seasonId: event.data.seasonId,
              };
              await this.redisService.cacheCategoryBasicInfo(
                event.data.id,
                categoryInfo
              );
            }
            break;
          case 'DELETE':
            // Remove category from cache and season categories index
            if (event.data && event.data.id) {
              await this.redisService.invalidateCategoryCache(
                event.data.id,
                event.data.seasonId
              );
              // Also invalidate category pilots cache
              await this.redisService.invalidateCategoryPilotsCache(
                event.data.id
              );
            }
            break;
        }
      }

      // Handle SeasonRegistrationCategory changes (when pilots are added/removed from categories)
      if (event.table === 'SeasonRegistrationCategories') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
          case 'DELETE':
            // Invalidate category pilots cache when registration categories change
            if (event.data && event.data.categoryId) {
              await this.redisService.invalidateCategoryPilotsCache(
                event.data.categoryId
              );
            }
            break;
        }
      }

      // Handle SeasonRegistration changes (when registrations are created/updated/deleted)
      if (event.table === 'SeasonRegistrations') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
          case 'DELETE':
            // Invalidate all category pilots caches when registrations change
            // This is a bit heavy-handed but ensures consistency
            const categories = await this.redisService.getSeasonCategoryIds(
              event.data?.seasonId || ''
            );
            for (const categoryId of categories) {
              await this.redisService.invalidateCategoryPilotsCache(categoryId);
            }
            break;
        }
      }

      if (event.table === 'Stages') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Check if we received a large payload notification (only ID)
            if (event.large_payload && event.data && event.data.id) {
              // Fetch the full stage data from PostgreSQL
              const stageRepo = AppDataSource.getRepository(Stage);
              const fullStage = await stageRepo.findOneBy({
                id: event.data.id,
              });

              if (fullStage) {
                const stageInfo = {
                  id: fullStage.id,
                  name: fullStage.name,
                  date: fullStage.date,
                  time: fullStage.time,
                  raceTrackId: fullStage.raceTrackId,
                  trackLayoutId: fullStage.trackLayoutId,
                  streamLink: fullStage.streamLink,
                  briefing: fullStage.briefing,
                  seasonId: fullStage.seasonId,
                  stageResults: fullStage.stage_results,
                };
                await this.redisService.cacheStageBasicInfo(
                  fullStage.id,
                  stageInfo
                );
              }
            } else if (event.data && event.data.id) {
              // Cache the stage info with season relationship (normal payload)
              const stageInfo = {
                id: event.data.id,
                name: event.data.name,
                date: event.data.date,
                time: event.data.time,
                raceTrackId: event.data.raceTrackId,
                trackLayoutId: event.data.trackLayoutId,
                streamLink: event.data.streamLink,
                briefing: event.data.briefing,
                seasonId: event.data.seasonId,
                stageResults: event.data.stage_results,
              };
              await this.redisService.cacheStageBasicInfo(
                event.data.id,
                stageInfo
              );
            }

            // NOTE: Recálculo de classificação removido daqui - agora é feito diretamente no StageService.updateStageResults()
            // para evitar duplo processamento e melhorar performance
            break;
          case 'DELETE':
            // Remove stage from cache and season stages index
            if (event.data && event.data.id) {
              await this.redisService.invalidateStageCache(
                event.data.id,
                event.data.seasonId
              );
            }

            // Se uma etapa foi deletada, apenas invalidar caches relacionados de etapa/temporada
            if (event.data && event.data.seasonId) {
              // Nenhuma ação adicional de classificação é necessária (funcionalidade removida)
            }
            break;
        }
      }

      if (event.table === 'Regulations') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the regulation info with season relationship
            if (event.data && event.data.id) {
              const regulationInfo = {
                id: event.data.id,
                title: event.data.title,
                content: event.data.content,
                order: event.data.order,
                seasonId: event.data.seasonId,
              };
              await this.redisService.cacheRegulationBasicInfo(
                event.data.id,
                regulationInfo
              );
            }
            break;
          case 'DELETE':
            // Remove regulation from cache and season regulations index
            if (event.data && event.data.id) {
              await this.redisService.invalidateRegulationCache(
                event.data.id,
                event.data.seasonId
              );
            }
            break;
        }
      }

      if (event.table === 'Users') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // Cache the user basic info whenever a user is created or updated
            if (event.data && event.data.id) {
              // Use userService to cache user with nickname from MemberProfile
              await this.userService.cacheUserBasicInfo(event.data.id);
            }
            break;
          case 'DELETE':
            // Remove user from cache
            if (event.data && event.data.id) {
              await this.redisService.invalidateUserCache(event.data.id);
            }
            break;
        }
      }

      if (event.table === 'MemberProfiles') {
        switch (event.operation) {
          case 'INSERT':
          case 'UPDATE':
            // When MemberProfile is created or updated (especially nickname), update user cache
            if (event.data && event.data.id) {
              // Use userService to recache user with updated nickname
              await this.userService.cacheUserBasicInfo(event.data.id);
            }
            break;
          case 'DELETE':
            // When MemberProfile is deleted, recache user without nickname
            if (event.data && event.data.id) {
              await this.userService.cacheUserBasicInfo(event.data.id);
            }
            break;
        }
      }
    } catch (error) {
      // No need to log errors here, as we're not using console.error
    }
  }

  async stopListening(): Promise<void> {
    if (!this.isListening || !this.client) {
      return;
    }

    try {
      // Unlisten
      this.client.query('UNLISTEN database_events');

      // End the client connection
      await this.client.end();
      this.client = null;
      this.isListening = false;
    } catch (error) {
      // No need to log errors here, as we're not using console.error
    }
  }
}

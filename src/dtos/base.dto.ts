import { validate, ValidationError } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export abstract class BaseDto {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;

  async validate(): Promise<string[]> {
    const errors = await validate(this);
    return this.formatErrors(errors);
  }

  static async validateDto<T extends BaseDto>(
    dtoClass: new () => T,
    data: Record<string, any>
  ): Promise<{ dto: T | null; errors: string[] }> {
    const dto = plainToInstance(dtoClass, data, {
      enableImplicitConversion: true,
      excludeExtraneousValues: false,
    }) as T;
    const errors = await dto.validate();
    
    if (errors.length > 0) {
      return { dto: null, errors };
    }
    
    return { dto, errors: [] };
  }

  private formatErrors(errors: ValidationError[]): string[] {
    const result: string[] = [];
    
    errors.forEach(error => {
      const constraints = error.constraints;
      if (constraints) {
        result.push(...Object.values(constraints));
      }
      
      if (error.children && error.children.length) {
        result.push(...this.formatErrors(error.children));
      }
    });
    
    return result;
  }
} 
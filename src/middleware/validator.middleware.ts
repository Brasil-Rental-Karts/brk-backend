import { Request, Response, NextFunction } from 'express';
import { BaseDto } from '../dtos/base.dto';
import { HttpException } from '../exceptions/http.exception';

export function validationMiddleware<T extends BaseDto>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      console.log('Validation middleware - Request body:', req.body);
      console.log('Validation middleware - DTO class:', dtoClass.name);
      
      const { dto, errors } = await BaseDto.validateDto(dtoClass, req.body);
      
      console.log('Validation middleware - Errors:', errors);
      
      if (errors.length > 0) {
        console.log('Validation middleware - Validation failed:', errors.join(', '));
        next(new HttpException(400, errors.join(', ')));
        return;
      }
      
      console.log('Validation middleware - Validation passed');
      // Não modificar o req.body, apenas validar
      // req.body = dto;
      next();
    } catch (error) {
      console.error('Validation middleware - Error:', error);
      next(new HttpException(500, 'Validation error occurred'));
    }
  };
} 
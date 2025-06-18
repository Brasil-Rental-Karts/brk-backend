import { Request, Response, NextFunction } from 'express';
import { BaseDto } from '../dtos/base.dto';
import { HttpException } from '../exceptions/http.exception';

export function validationMiddleware<T extends BaseDto>(dtoClass: new () => T) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { dto, errors } = await BaseDto.validateDto(dtoClass, req.body);
      
      if (errors.length > 0) {
        next(new HttpException(400, errors.join(', ')));
        return;
      }
      
      req.body = dto;
      next();
    } catch (error) {
      next(new HttpException(500, 'Validation error occurred'));
    }
  };
} 
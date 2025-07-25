import { NextFunction, Request, Response } from 'express';

import { BaseDto } from '../dtos/base.dto';
import { HttpException } from '../exceptions/http.exception';

export function validationMiddleware<T extends BaseDto>(dtoClass: new () => T) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Transformar valores numéricos antes da validação
      const transformedBody = { ...req.body };

      // Transformar batteryIndex se existir
      if (
        transformedBody.batteryIndex !== undefined &&
        transformedBody.batteryIndex !== null &&
        transformedBody.batteryIndex !== ''
      ) {
        transformedBody.batteryIndex = Number(transformedBody.batteryIndex);
      }

      // Transformar outros campos numéricos se necessário
      if (
        transformedBody.timePenaltySeconds !== undefined &&
        transformedBody.timePenaltySeconds !== null &&
        transformedBody.timePenaltySeconds !== ''
      ) {
        transformedBody.timePenaltySeconds = Number(
          transformedBody.timePenaltySeconds
        );
      }

      if (
        transformedBody.positionPenalty !== undefined &&
        transformedBody.positionPenalty !== null &&
        transformedBody.positionPenalty !== ''
      ) {
        transformedBody.positionPenalty = Number(
          transformedBody.positionPenalty
        );
      }

      const { dto, errors } = await BaseDto.validateDto(
        dtoClass,
        transformedBody
      );

      if (errors.length > 0) {
        next(new HttpException(400, errors.join(', ')));
        return;
      }
      // Atualizar o req.body com os valores transformados
      req.body = transformedBody;
      next();
    } catch (error) {
      console.error('Validation middleware - Error:', error);
      next(new HttpException(500, 'Validation error occurred'));
    }
  };
}

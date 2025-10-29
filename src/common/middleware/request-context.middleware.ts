import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RequestContext } from '../../utils/request-context';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  use(req: Request & any, _res: Response, next: NextFunction) {
    const userId: string | undefined = req.user?.id;
    RequestContext.run({ userId }, () => {
      next();
    });
  }
}



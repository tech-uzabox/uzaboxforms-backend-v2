import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { AuditLogService } from './audit-log.service';
import { RequestContext } from '../utils/request-context';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly auditLogService: AuditLogService,
    private readonly jwtService: JwtService,
  ) {}
  private readonly logger = new Logger(AuditLogInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request & any>();
    const method = (request.method || '').toUpperCase();

    // Only log mutating requests by default
    const shouldLog = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    let userId: string | undefined = request.user?.id;
    // Fallback: try to decode bearer token if guard didn't attach user
    if (!userId) {
      const authHeader: string | undefined = request.headers?.authorization;
      const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : undefined;
      // Try cookies if header missing
      const cookieToken = request.cookies?.accessToken || request.cookies?.token || request.cookies?.Authorization;
      if (token) {
        try {
          const decoded: any = this.jwtService.decode(token);
          if (decoded && typeof decoded === 'object' && decoded.sub) {
            userId = decoded.sub as string;
          }
        } catch {}
      } else if (cookieToken) {
        try {
          const decoded: any = this.jwtService.decode(cookieToken);
          if (decoded && typeof decoded === 'object' && decoded.sub) {
            userId = decoded.sub as string;
          }
        } catch {}
      }
    }
    const fullPath: string = (request.originalUrl || request.url || '') as string;
    // Normalize path: /api/v1/<resource>/...
    const resource = this.extractResourceFromPath(fullPath);

    // Skip unknown resource and auth (to avoid duplicate logs where services already log specifically)
    const blocklisted = resource === 'unknown' || resource === 'auth';
    if (blocklisted) {
      return next.handle();
    }
    const action = this.generateAction(method, resource);
    // debug removed
    const details = this.buildDetails(request);

    const start = Date.now();

    return RequestContext.run({ userId }, () =>
      next.handle().pipe(
        tap(async () => {
          if (!shouldLog) return;
          await this.auditLogService.log({
            userId,
            action,
            resource,
            status: 'SUCCESS',
            details: { ...details, path: fullPath, durationMs: Date.now() - start },
          });
        }),
        catchError((err) => {
          if (shouldLog) {
            void this.auditLogService.log({
              userId,
              action,
              resource,
              status: 'FAILURE',
              errorMessage: err?.message || 'Unknown error',
              details: { ...details, path: fullPath, durationMs: Date.now() - start },
            });
          }
          return throwError(() => err);
        }),
      )
    );
  }

  private extractResourceFromPath(url: string): string {
    try {
      const path = url.split('?')[0] || '';
      const parts = path.split('/').filter(Boolean); // ['', 'api','v1','resource'] -> ['api','v1','resource']
      // Find the segment after 'api' and version if present
      const apiIdx = parts.findIndex((p) => p.toLowerCase() === 'api');
      if (apiIdx >= 0 && parts.length > apiIdx + 2) {
        return parts[apiIdx + 2].toLowerCase();
      }
      // Fallback: first segment
      return parts[0]?.toLowerCase() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private generateAction(method: string, resource: string): string {
    return `${method}_${(resource || 'unknown').toUpperCase()}`;
  }

  private buildDetails(req: any) {
    const redact = (obj: any) => {
      const SENSITIVE_KEYS = ['password', 'newPassword', 'oldPassword', 'token', 'authorization'];
      if (!obj || typeof obj !== 'object') return obj;
      const out: any = Array.isArray(obj) ? [] : {};
      for (const [k, v] of Object.entries(obj)) {
        if (SENSITIVE_KEYS.includes(k)) {
          out[k] = '[REDACTED]';
        } else if (v && typeof v === 'object') {
          out[k] = redact(v);
        } else {
          out[k] = v;
        }
      }
      return out;
    };

    return {
      params: redact(req.params),
      query: redact(req.query),
      body: redact(req.body),
      ip: req.ip,
      userAgent: req.headers?.['user-agent'],
    };
  }
}



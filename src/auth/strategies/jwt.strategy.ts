import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from 'src/db/prisma.service';
import { JwtPayload } from '../auth.service';
import { AuthenticatedUser } from '../decorators/get-user.decorator';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          // First try to get token from cookies
          if (request.cookies && request.cookies.accessToken) {
            return request.cookies.accessToken;
          }
          // Fallback to Authorization header for backward compatibility
          return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || '',
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('User not found or token invalid.');
    }

    const { password, ...result } = user;
    return {
      ...result,
      roles: user.roles.map((r) => r.role.name),
      roleIds: user.roles.map((r) => r.role.id),
      sub: user.id,
    };
  }
}

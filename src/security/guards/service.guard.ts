import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const metadata = context.getArgByIndex(1); // gRPC metadata
    const authorization = metadata.get('authorization');

    if (!authorization) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authorization[0].replace('Bearer ', '');

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SERVICE_SECRET'),
      });

      if (payload.type !== 'service') {
        throw new UnauthorizedException('Invalid token type');
      }

      // Add service info to request for later use
      context.getArgByIndex(2).service = payload.service;
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

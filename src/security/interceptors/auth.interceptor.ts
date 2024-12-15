import { Injectable, NestInterceptor, ExecutionContext, CallHandler, UnauthorizedException } from '@nestjs/common';
import { Observable } from 'rxjs';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthInterceptor implements NestInterceptor {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
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

      // Add service info to metadata for logging
      metadata.set('service_name', payload.service);
      metadata.set('request_id', Date.now().toString());

      return next.handle();
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}

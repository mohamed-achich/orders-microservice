import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { Observable } from 'rxjs';

@Injectable()
export class ServiceAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const metadata = context.getArgByIndex(1); // Get gRPC metadata
    if (!metadata) {
      return false;
    }

    const authorization = metadata.get('authorization')[0];
    if (!authorization) {
      return false;
    }

    try {
      const token = authorization.replace('Bearer ', '');
      this.authService.verifyToken(token);
      return true;
    } catch (error) {
      return false;
    }
  }
}

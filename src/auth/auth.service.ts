import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async verifyToken(token: string): Promise<any> {
    try {
      return this.jwtService.verify(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }

  async decodeToken(token: string): Promise<any> {
    try {
      return this.jwtService.decode(token);
    } catch (error) {
      throw new UnauthorizedException('Invalid token format');
    }
  }

  async getUserIdFromToken(token: string): Promise<string> {
    const decoded = await this.decodeToken(token);
    return decoded.sub;
  }
}

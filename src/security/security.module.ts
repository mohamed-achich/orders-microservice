import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ServiceAuthGuard } from './guards/service.guard';

@Module({
  imports: [
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SERVICE_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [ServiceAuthGuard],
  exports: [ServiceAuthGuard, JwtModule],
})
export class SecurityModule {}

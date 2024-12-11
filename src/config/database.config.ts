import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  port: 5432,
  username: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  database: process.env.POSTGRES_DB || 'orders',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: true,
  retryAttempts: 5,
  retryDelay: 3000,
};

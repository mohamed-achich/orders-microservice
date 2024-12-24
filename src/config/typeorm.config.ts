import { DataSource } from 'typeorm';
import { databaseConfig } from './database.config';

export default new DataSource({
  ...databaseConfig,
  migrations: ['src/migrations/*.ts'],
  entities: ['src/**/*.entity.ts'],
} as any);

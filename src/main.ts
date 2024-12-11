import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'orders',
      protoPath: join(__dirname, './orders.proto'),
      url: '0.0.0.0:5001'
    },
  });

  await app.listen();
  console.log('Orders microservice is listening via gRPC on port 5001');
}
bootstrap();

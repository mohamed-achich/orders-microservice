import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { join } from 'path';

async function bootstrap() {
  // Create the main gRPC application
  const grpcApp = await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
    transport: Transport.GRPC,
    options: {
      package: 'orders',
      protoPath: join(__dirname, './orders.proto'),
      url: '0.0.0.0:5001'
    },
  });

  // Create a separate HTTP application just for health checks
  const httpApp = await NestFactory.create(AppModule);
  await httpApp.listen(5051);

  // Start the gRPC service
  await grpcApp.listen();
  
  console.log('Orders microservice is listening via gRPC on port 5001');
  console.log('Health check endpoint available on port 5051');
}
bootstrap();

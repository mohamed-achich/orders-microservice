import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQModule } from '@golevelup/nestjs-rabbitmq';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderSaga } from '../common/saga/order.saga';
import { SecurityModule } from '../security/security.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    SecurityModule,
    RabbitMQModule.forRoot(RabbitMQModule, {
      exchanges: [
        {
          name: 'orders_exchange',
          type: 'topic',
        },
      ],
      uri: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      connectionInitOptions: { wait: false },
      enableControllerDiscovery: true,
    }),
    RabbitMQModule.forRoot(RabbitMQModule, {
      name: 'PRODUCTS_SERVICE',
      exchanges: [
        {
          name: 'products_exchange',
          type: 'topic',
        },
      ],
      uri: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
      connectionInitOptions: { wait: false },
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderSaga],
})
export class OrdersModule {}

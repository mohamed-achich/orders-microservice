import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderSaga } from '../common/saga/order.saga';
import { rabbitmqConfig } from '../config/rabbitmq.config';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem]),
    ClientsModule.register([
      {
        name: 'ORDERS_SERVICE',
        transport: Transport.RMQ,
        options: {
          urls: [rabbitmqConfig.url],
          queue: rabbitmqConfig.queues.orders,
          queueOptions: {
            durable: true,
          },
        },
      },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderSaga],
})
export class OrdersModule {}

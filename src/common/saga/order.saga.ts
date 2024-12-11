import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AmqpConnection, RabbitSubscribe } from '@golevelup/nestjs-rabbitmq';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { BaseSaga } from './base.saga';
import { rabbitmqConfig } from '../../config/rabbitmq.config';

@Injectable()
export class OrderSaga extends BaseSaga {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly amqpConnection: AmqpConnection
  ) {
    super();
  }
  
  async start(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new Error('Order not found');
    }

    await this.reserveProducts(order);
  }

  private async reserveProducts(order: Order): Promise<void> {
    try {
      const payload = {
        orderId: order.id,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      order.status = OrderStatus.PENDING;
      await this.orderRepository.save(order);

      await this.amqpConnection.publish(
        'products_exchange',
        'order.created',
        payload
      );
    } catch (error) {
      order.status = OrderStatus.FAILED;
      order.failureReason = 'Failed to reserve products: ' + error.message;
      await this.orderRepository.save(order);
      throw error;
    }
  }

  @RabbitSubscribe({
    exchange:         'products_exchange',
    routingKey: 'products.reserved',
    queue: 'order-products-reserved',
  })
  async handleProductReserved(message: { orderId: string, success: boolean, reason?: string }) {
    const order = await this.orderRepository.findOne({ where: { id: message.orderId } });
    if (!order) {
      console.error(`Order ${message.orderId} not found for product reservation response`);
      return;
    }

    if (message.success) {
      order.status = OrderStatus.PRODUCT_RESERVED;
      await this.orderRepository.save(order);
      await this.confirmOrder(order);
    } else {
      order.status = OrderStatus.FAILED;
      order.failureReason = message.reason || 'Product reservation failed';
      await this.orderRepository.save(order);
      // Optionally implement compensation logic here
    }
  }

  private async confirmOrder(order: Order): Promise<void> {
    try {
      order.status = OrderStatus.CONFIRMED;
      await this.orderRepository.save(order);
      
      // Notify other services about order confirmation
      await this.amqpConnection.publish(
        'orders_exchange',
        'order.confirmed',
        { orderId: order.id }
      );
    } catch (error) {
      order.status = OrderStatus.FAILED;
      order.failureReason = 'Failed to confirm order: ' + error.message;
      await this.orderRepository.save(order);
      throw error;
    }
  }

  async compensate(order: Order): Promise<void> {
    try {
      await this.amqpConnection.publish(
        'products_exchange',
        'order.cancelled',
        {
          orderId: order.id,
          items: order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        }
      );

      order.status = OrderStatus.CANCELLED;
      order.failureReason = 'Order cancelled due to saga compensation';
      await this.orderRepository.save(order);
    } catch (error) {
      console.error('Failed to compensate order:', error);
      order.status = OrderStatus.FAILED;
      order.failureReason = error.message || 'Failed to compensate order';
      await this.orderRepository.save(order);
    }
  }
}

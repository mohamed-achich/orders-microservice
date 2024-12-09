import { Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from '../../orders/entities/order.entity';
import { BaseSaga } from './base.saga';
import { rabbitmqConfig } from '../../config/rabbitmq.config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class OrderSaga extends BaseSaga {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    private readonly client: ClientProxy,
  ) {
    super();
  }

  async start(orderId: string): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new Error('Order not found');
    }

    const steps = [
      () => this.reserveProducts(order),
      () => this.confirmOrder(order),
    ];

    try {
      await this.execute(steps, order);
    } catch (error) {
      // Compensation is handled in base saga
      throw error;
    }
  }

  private async reserveProducts(order: Order): Promise<void> {
    try {
      const pattern = rabbitmqConfig.patterns.orderCreated;
      const payload = {
        orderId: order.id,
        items: order.items.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
      };

      // Wait for the product service to respond
      const response = await lastValueFrom(this.client.emit(pattern, payload));
      
      if (!response || !response.success) {
        throw new Error(response?.reason || 'Failed to reserve products');
      }

      order.status = OrderStatus.PRODUCT_RESERVED;
      await this.orderRepository.save(order);
    } catch (error) {
      order.status = OrderStatus.FAILED;
      order.failureReason = error.message || 'Failed to reserve products';
      await this.orderRepository.save(order);
      throw error;
    }
  }

  private async confirmOrder(order: Order): Promise<void> {
    try {
      order.status = OrderStatus.CONFIRMED;
      await this.orderRepository.save(order);
      
      const response = await lastValueFrom(
        this.client.emit(rabbitmqConfig.patterns.orderConfirmed, {
          orderId: order.id,
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.reason || 'Failed to confirm order');
      }
    } catch (error) {
      order.status = OrderStatus.FAILED;
      order.failureReason = error.message || 'Failed to confirm order';
      await this.orderRepository.save(order);
      throw error;
    }
  }

  async compensate(order: Order): Promise<void> {
    try {
      // Release reserved products
      const response = await lastValueFrom(
        this.client.emit(rabbitmqConfig.patterns.orderCancelled, {
          orderId: order.id,
          items: order.items.map(item => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
        })
      );

      if (!response || !response.success) {
        throw new Error(response?.reason || 'Failed to release products');
      }

      // Update order status to cancelled
      order.status = OrderStatus.CANCELLED;
      order.failureReason = 'Order cancelled due to saga compensation';
      await this.orderRepository.save(order);
    } catch (error) {
      console.error('Failed to compensate order:', error);
      // Even if compensation fails, we still mark the order as failed
      order.status = OrderStatus.FAILED;
      order.failureReason = error.message || 'Failed to compensate order';
      await this.orderRepository.save(order);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderSaga } from '../common/saga/order.saga';
import { RpcException } from '@nestjs/microservices';
import { status as GRPC_STATUS } from '@grpc/grpc-js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,
    private readonly orderSaga: OrderSaga,
  ) {}

  async create(createOrderDto: CreateOrderDto): Promise<Order> {
    try {
      const order = this.orderRepository.create({
        userId: createOrderDto.userId,
        status: OrderStatus.PENDING,
        total: 0, // Will be calculated based on product prices
      });

      const savedOrder = await this.orderRepository.save(order);

      const orderItems = createOrderDto.items.map(item =>
        this.orderItemRepository.create({
          orderId: savedOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          price: 0, // Will be updated when product info is received
        }),
      );

      savedOrder.items = await this.orderItemRepository.save(orderItems);
      
      // Start the saga process
      await this.orderSaga.start(savedOrder.id);

      return savedOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new RpcException({
        code: GRPC_STATUS.INTERNAL,
        message: 'Failed to create order'
      });
    }
  }

  async findAll(): Promise<Order[]> {
    try {
      return await this.orderRepository.find();
    } catch (error) {
      console.error('Error finding orders:', error);
      throw new RpcException({
        code: GRPC_STATUS.INTERNAL,
        message: 'Failed to retrieve orders'
      });
    }
  }

  async findOne(id: string): Promise<Order> {
    try {
      const order = await this.orderRepository.findOne({ where: { id } });
      if (!order) {
        throw new RpcException({
          code: GRPC_STATUS.NOT_FOUND,
          message: `Order with ID "${id}" not found`
        });
      }
      return order;
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error finding order:', error);
      throw new RpcException({
        code: GRPC_STATUS.INTERNAL,
        message: 'Failed to retrieve order'
      });
    }
  }

  async updateStatus(id: string, status: OrderStatus, failureReason?: string): Promise<Order> {
    try {
      const order = await this.findOne(id);
      order.status = status;
      if (failureReason) {
        order.failureReason = failureReason;
      }
      return await this.orderRepository.save(order);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error updating order status:', error);
      throw new RpcException({
        code : GRPC_STATUS.INTERNAL,
        message: 'Failed to update order status'
      });
    }
  }

  async remove(id: string): Promise<void> {
    try {
      const order = await this.findOne(id);
      await this.orderRepository.remove(order);
    } catch (error) {
      if (error instanceof RpcException) {
        throw error;
      }
      console.error('Error removing order:', error);
      throw new RpcException({
        code: GRPC_STATUS.INTERNAL,
        message: 'Failed to remove order'
      });
    }
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderSaga } from '../common/saga/order.saga';

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
  }

  async findAll(): Promise<Order[]> {
    return this.orderRepository.find();
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id } });
    if (!order) {
      throw new NotFoundException(`Order with ID "${id}" not found`);
    }
    return order;
  }

  async updateStatus(id: string, status: OrderStatus, failureReason?: string): Promise<Order> {
    const order = await this.findOne(id);
    order.status = status;
    if (failureReason) {
      order.failureReason = failureReason;
    }
    return this.orderRepository.save(order);
  }

  async remove(id: string): Promise<void> {
    const order = await this.findOne(id); 
    await this.orderRepository.remove(order);
  }
}

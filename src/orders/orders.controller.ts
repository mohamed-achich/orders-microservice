import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order, OrderStatus } from './entities/order.entity';

@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @GrpcMethod('OrdersService', 'CreateOrder')
  async create(data: CreateOrderDto): Promise<Order> {
    return this.ordersService.create(data);
  }

  @GrpcMethod('OrdersService', 'FindAll')
  async findAll() {
    const orders = await this.ordersService.findAll();
    return { orders };
  }

  @GrpcMethod('OrdersService', 'FindOne')
  async findOne({ id }: { id: string }): Promise<Order> {
    return this.ordersService.findOne(id);
  }

  @GrpcMethod('OrdersService', 'UpdateStatus')
  async updateStatus(data: { id: string; status: OrderStatus }): Promise<Order> {
    return this.ordersService.updateStatus(data.id, data.status);
  }

  @GrpcMethod('OrdersService', 'Remove')
  async remove({ id }: { id: string }) {
    await this.ordersService.remove(id);
    return {};
  }
}

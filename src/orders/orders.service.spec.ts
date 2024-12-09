import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderSaga } from '../common/saga/order.saga';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let clientProxy: ClientProxy;
  let orderSaga: OrderSaga;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockClientProxy = {
    emit: jest.fn(),
  };

  const mockOrderSaga = {
    start: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: getRepositoryToken(Order),
          useValue: mockOrderRepository,
        },
        {
          provide: 'RABBITMQ_SERVICE',
          useValue: mockClientProxy,
        },
        {
          provide: OrderSaga,
          useValue: mockOrderSaga,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    clientProxy = module.get<ClientProxy>('RABBITMQ_SERVICE');
    orderSaga = module.get<OrderSaga>(OrderSaga);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createOrder', () => {
    const createOrderDto: CreateOrderDto = {
      userId: '1',
      items: [
        {
          productId: '1',
          quantity: 2,
        },
      ],
    };

    const mockOrder = {
      id: '1',
      userId: '1',
      status: OrderStatus.PENDING,
      items: [
        {
          productId: '1',
          quantity: 2,
        },
      ],
    };

    it('should create a new order', async () => {
      mockOrderRepository.create.mockReturnValue(mockOrder);
      mockOrderRepository.save.mockResolvedValue(mockOrder);
      mockOrderSaga.start.mockResolvedValue(undefined);

      const result = await service.create(createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.create).toHaveBeenCalledWith({
        userId: createOrderDto.userId,
        items: createOrderDto.items,
        status: OrderStatus.PENDING,
      });
      expect(mockOrderRepository.save).toHaveBeenCalledWith(mockOrder);
      expect(mockOrderSaga.start).toHaveBeenCalledWith(mockOrder.id);
    });

    it('should handle errors during order creation', async () => {
      mockOrderRepository.create.mockReturnValue(mockOrder);
      mockOrderRepository.save.mockRejectedValue(new Error('Database error'));

      await expect(service.create(createOrderDto)).rejects.toThrow('Database error');
    });
  });

  describe('findOne', () => {
    it('should return an order by id', async () => {
      const mockOrder = { id: '1', status: OrderStatus.PENDING };
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne('1');

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should return null if order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      const result = await service.findOne('1');

      expect(result).toBeNull();
    });
  });
});

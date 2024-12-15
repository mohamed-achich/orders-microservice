import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrdersService } from './orders.service';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrderSaga } from '../common/saga/order.saga';
import { CreateOrderDto } from './dto/create-order.dto';
import { RpcException } from '@nestjs/microservices';
import { status as GRPC_STATUS } from '@grpc/grpc-js';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let orderSaga: OrderSaga;

  const mockOrderRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockOrderItemRepository = {
    create: jest.fn(),
    save: jest.fn(),
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
          provide: getRepositoryToken(OrderItem),
          useValue: mockOrderItemRepository,
        },
        {
          provide: OrderSaga,
          useValue: mockOrderSaga,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    orderRepository = module.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = module.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
    orderSaga = module.get<OrderSaga>(OrderSaga);

    // Clear all mocks before each test
    jest.clearAllMocks();
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
      total: 0,
      items: [
        {
          id: '1',
          orderId: '1',
          productId: '1',
          quantity: 2,
          price: 0,
        },
      ],
    };

    const mockOrderItem = {
      id: '1',
      orderId: '1',
      productId: '1',
      quantity: 2,
      price: 0,
    };

    it('should create a new order', async () => {
      mockOrderRepository.create.mockReturnValue({ ...mockOrder, items: [] });
      mockOrderRepository.save.mockResolvedValue({ ...mockOrder, items: [] });
      mockOrderItemRepository.create.mockReturnValue(mockOrderItem);
      mockOrderItemRepository.save.mockResolvedValue([mockOrderItem]);
      mockOrderSaga.start.mockResolvedValue(undefined);

      const result = await service.create(createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.create).toHaveBeenCalledWith({
        userId: createOrderDto.userId,
        status: OrderStatus.PENDING,
        total: 0,
      });
      expect(mockOrderRepository.save).toHaveBeenCalled();
      expect(mockOrderItemRepository.create).toHaveBeenCalledWith({
        orderId: mockOrder.id,
        productId: createOrderDto.items[0].productId,
        quantity: createOrderDto.items[0].quantity,
        price: 0,
      });
      expect(mockOrderItemRepository.save).toHaveBeenCalled();
      expect(mockOrderSaga.start).toHaveBeenCalledWith(mockOrder.id);
    });

    it('should handle errors during order creation', async () => {
      const error = new Error('Database error');
      mockOrderRepository.save.mockRejectedValue(error);

      await expect(service.create(createOrderDto)).rejects.toThrow(
        new RpcException({
          code: GRPC_STATUS.INTERNAL,
          message: 'Failed to create order',
        })
      );
      expect(mockOrderRepository.create).toHaveBeenCalled();
      expect(mockOrderRepository.save).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    const mockOrder = {
      id: '1',
      userId: '1',
      status: OrderStatus.PENDING,
      items: [],
    };

    it('should return an order by id', async () => {
      mockOrderRepository.findOne.mockResolvedValue(mockOrder);

      const result = await service.findOne('1');

      expect(result).toEqual(mockOrder);
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should throw RpcException if order not found', async () => {
      mockOrderRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne('999')).rejects.toThrow(
        new RpcException({
          code: GRPC_STATUS.NOT_FOUND,
          message: 'Order with ID "999" not found',
        })
      );
      expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
        where: { id: '999' }
      });
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { AppModule } from '../src/app.module';
import { Order, OrderStatus } from '../src/orders/entities/order.entity';
import { CreateOrderDto } from '../src/orders/dto/create-order.dto';
import { Repository } from 'typeorm';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let orderRepository: Repository<Order>;
  let clientProxy: ClientProxy;

  const mockClientProxy = {
    emit: jest.fn().mockReturnValue({
      toPromise: () => Promise.resolve({ success: true }),
    }),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider('RABBITMQ_SERVICE')
      .useValue(mockClientProxy)
      .compile();

    app = moduleFixture.createNestApplication();
    orderRepository = moduleFixture.get<Repository<Order>>(
      getRepositoryToken(Order),
    );
    clientProxy = moduleFixture.get<ClientProxy>('RABBITMQ_SERVICE');

    await app.init();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await orderRepository.clear();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/orders (POST)', () => {
    const createOrderDto: CreateOrderDto = {
      userId: '1',
      items: [
        {
          productId: '1',
          quantity: 2,
        },
      ],
    };

    it('should create a new order', async () => {
      const response = await request(app.getHttpServer())
        .post('/orders')
        .send(createOrderDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.userId).toBe(createOrderDto.userId);
      expect(response.body.status).toBe(OrderStatus.PENDING);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0]).toMatchObject(createOrderDto.items[0]);

      // Verify the order was saved in the database
      const savedOrder = await orderRepository.findOne({
        where: { id: response.body.id },
      });
      expect(savedOrder).toBeDefined();
      expect(savedOrder.userId).toBe(createOrderDto.userId);
    });

    it('should handle invalid order data', async () => {
      const invalidOrderDto = {
        userId: '1',
        items: [], // Invalid: empty items array
      };

      await request(app.getHttpServer())
        .post('/orders')
        .send(invalidOrderDto)
        .expect(400);
    });
  });

  describe('/orders/:id (GET)', () => {
    it('should return an order by id', async () => {
      // Create a test order
      const order = await orderRepository.save({
        userId: '1',
        status: OrderStatus.PENDING,
        items: [
          {
            productId: '1',
            quantity: 2,
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/orders/${order.id}`)
        .expect(200);

      expect(response.body.id).toBe(order.id);
      expect(response.body.userId).toBe(order.userId);
      expect(response.body.status).toBe(order.status);
    });

    it('should return 404 for non-existent order', async () => {
      await request(app.getHttpServer())
        .get('/orders/non-existent-id')
        .expect(404);
    });
  });
});

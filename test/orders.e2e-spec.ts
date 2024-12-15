import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport, ClientGrpc } from '@nestjs/microservices';
import { join } from 'path';
import { firstValueFrom, Observable } from 'rxjs';
import { status } from '@grpc/grpc-js';
import { AppModule } from '../src/app.module';
import { Order, OrderStatus } from '../src/orders/entities/order.entity';
import { OrderItem } from '../src/orders/entities/order-item.entity';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';

interface CreateOrderRequest {
  userId: string;
  items: {
    productId: string;
    quantity: number;
  }[];
}

interface OrderResponse {
  id: string;
  userId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  total: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface OrdersServiceClient {
  createOrder(data: CreateOrderRequest): Observable<OrderResponse>;
  findAll(data: {}): Observable<{ orders: OrderResponse[] }>;
  findOne(data: { id: string }): Observable<OrderResponse>;
  updateStatus(data: { id: string; status: string }): Observable<OrderResponse>;
  remove(data: { id: string }): Observable<{}>;
}

describe('OrdersService (e2e)', () => {
  let app: INestApplication;
  let client: OrdersServiceClient;
  let orderRepository: Repository<Order>;
  let orderItemRepository: Repository<OrderItem>;
  let createdOrders: string[] = [];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('POSTGRES_HOST'),
            port: configService.get('POSTGRES_PORT'),
            username: configService.get('POSTGRES_USER'),
            password: configService.get('POSTGRES_PASSWORD'),
            database: configService.get('POSTGRES_DB'),
            entities: [Order, OrderItem],
            synchronize: true,
          }),
          inject: [ConfigService],
        }),
        ClientsModule.register([
          {
            name: 'ORDERS_PACKAGE',
            transport: Transport.GRPC,
            options: {
              package: 'orders',
              protoPath: join(__dirname, '../src/orders.proto'),
              url: 'localhost:5001',
            },
          },
        ]),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.connectMicroservice({
      transport: Transport.GRPC,
      options: {
        package: 'orders',
        protoPath: join(__dirname, '../src/orders.proto'),
        url: '0.0.0.0:5001',
      },
    });

    await app.startAllMicroservices();
    await app.init();

    const grpcClient = app.get<ClientGrpc>('ORDERS_PACKAGE');
    client = grpcClient.getService<OrdersServiceClient>('OrdersService');
    orderRepository = moduleFixture.get<Repository<Order>>(getRepositoryToken(Order));
    orderItemRepository = moduleFixture.get<Repository<OrderItem>>(getRepositoryToken(OrderItem));
  });

  afterAll(async () => {
    // Clean up all created orders
    for (const orderId of createdOrders) {
      try {
        await firstValueFrom<{}>(client.remove({ id: orderId }));
      } catch (error) {
        console.error(`Failed to clean up order ${orderId}:`, error);
      }
    }
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await orderItemRepository.clear();
    await orderRepository.clear();
  });

  describe('Create Order', () => {
    const createOrderRequest: CreateOrderRequest = {
      userId: '1',
      items: [
        {
          productId: '1',
          quantity: 2,
        },
      ],
    };

    it('should create a new order', async () => {
      const response = await firstValueFrom<OrderResponse>(
        client.createOrder(createOrderRequest)
      );

      expect(response).toBeDefined();
      expect(response.id).toBeDefined();
      expect(response.userId).toBe(createOrderRequest.userId);
      expect(response.status).toBe(OrderStatus.PENDING);
      expect(response.items).toHaveLength(1);
      expect(response.items[0].productId).toBe(createOrderRequest.items[0].productId);
      expect(response.items[0].quantity).toBe(createOrderRequest.items[0].quantity);
      expect(response.createdAt).toBeDefined();
      expect(response.updatedAt).toBeDefined();

      createdOrders.push(response.id);

      // Verify the order was saved in the database
      const savedOrder = await orderRepository.findOne({
        where: { id: response.id },
        relations: ['items'],
      });
      expect(savedOrder).toBeDefined();
      expect(savedOrder.userId).toBe(createOrderRequest.userId);
      expect(savedOrder.items).toHaveLength(1);
    });

    it('should handle invalid order data', async () => {
      const invalidRequest = {
        userId: '1',
        items: [], // Invalid: empty items array
      };

      try {
        await firstValueFrom(client.createOrder(invalidRequest));
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(status.INVALID_ARGUMENT);
      }
    });
  });

  describe('Find Orders', () => {
    let testOrder: OrderResponse;

    beforeAll(async () => {
      testOrder = await firstValueFrom<OrderResponse>(
        client.createOrder({
          userId: '1',
          items: [
            {
              productId: '1',
              quantity: 2,
            },
          ],
        })
      );
      createdOrders.push(testOrder.id);
    });

    it('should find all orders', async () => {
      const response = await firstValueFrom(client.findAll({}));
      expect(Array.isArray(response.orders)).toBe(true);
      expect(response.orders.length).toBeGreaterThan(0);

      const foundOrder = response.orders.find(o => o.id === testOrder.id);
      expect(foundOrder).toBeDefined();
      expect(foundOrder.userId).toBe(testOrder.userId);
      expect(foundOrder.status).toBe(testOrder.status);
    });

    it('should find an order by id', async () => {
      const response = await firstValueFrom<OrderResponse>(
        client.findOne({ id: testOrder.id })
      );

      expect(response).toBeDefined();
      expect(response.id).toBe(testOrder.id);
      expect(response.userId).toBe(testOrder.userId);
      expect(response.status).toBe(testOrder.status);
    });

    it('should fail to find non-existent order', async () => {
      try {
        await firstValueFrom(client.findOne({ id: 'non-existent-id' }));
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(status.NOT_FOUND);
      }
    });
  });

  describe('Update Order Status', () => {
    let testOrder: OrderResponse;

    beforeAll(async () => {
      testOrder = await firstValueFrom<OrderResponse>(
        client.createOrder({
          userId: '1',
          items: [
            {
              productId: '1',
              quantity: 2,
            },
          ],
        })
      );
      createdOrders.push(testOrder.id);
    });

    it('should update order status', async () => {
      const response = await firstValueFrom<OrderResponse>(
        client.updateStatus({
          id: testOrder.id,
          status: OrderStatus.CONFIRMED,
        })
      );

      expect(response).toBeDefined();
      expect(response.id).toBe(testOrder.id);
      expect(response.status).toBe(OrderStatus.CONFIRMED);

      // Verify in database
      const updatedOrder = await orderRepository.findOne({
        where: { id: testOrder.id },
      });
      expect(updatedOrder.status).toBe(OrderStatus.CONFIRMED);
    });

    it('should fail to update non-existent order', async () => {
      try {
        await firstValueFrom(
          client.updateStatus({
            id: 'non-existent-id',
            status: OrderStatus.CONFIRMED,
          })
        );
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(status.NOT_FOUND);
      }
    });
  });

  describe('Delete Order', () => {
    let testOrder: OrderResponse;

    beforeAll(async () => {
      testOrder = await firstValueFrom<OrderResponse>(
        client.createOrder({
          userId: '1',
          items: [
            {
              productId: '1',
              quantity: 2,
            },
          ],
        })
      );
      // Don't add to createdOrders as we'll delete it in the test
    });

    it('should delete an order', async () => {
      const response = await firstValueFrom<{}>(
        client.remove({ id: testOrder.id })
      );
      expect(response).toBeDefined();

      // Verify order is deleted
      try {
        await firstValueFrom(client.findOne({ id: testOrder.id }));
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(status.NOT_FOUND);
      }
    });

    it('should fail to delete non-existent order', async () => {
      try {
        await firstValueFrom(client.remove({ id: 'non-existent-id' }));
        fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.code).toBe(status.NOT_FOUND);
      }
    });
  });
});

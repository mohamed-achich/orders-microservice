

# Orders Microservice

A microservice responsible for managing orders in the e-commerce system. Built with NestJS and PostgreSQL, it provides gRPC endpoints for order management and integrates with the product service for inventory management.

## Features

- Order CRUD operations
- Order status management
- PostgreSQL integration with TypeORM
- gRPC server implementation
- Service-to-service authentication
- Event-driven inventory management with RabbitMQ
- Health checks
- Distributed transactions

## Order Schema

### Order Entity
```typescript
{
  id: string;              // UUID
  userId: string;          // User who placed the order
  status: OrderStatus;     // Current order status
  total: number;           // Total order amount
  items: OrderItem[];      // Order items
  failureReason?: string;  // Optional failure reason
  createdAt: Date;        // Creation timestamp
  updatedAt: Date;        // Last update timestamp
}
```

### Order Item Entity
```typescript
{
  id: string;         // UUID
  productId: string;  // Referenced product
  quantity: number;   // Quantity ordered
  price: number;      // Price at time of order
  orderId: string;    // Parent order reference
}
```

### Order Status Flow
```
PENDING -> PRODUCT_RESERVED -> CONFIRMED -> COMPLETED
                           -> FAILED
                           -> CANCELLED
```

## API Endpoints (gRPC)

```protobuf
service OrdersService {
  rpc CreateOrder (CreateOrderRequest) returns (Order);
  rpc FindAll (Empty) returns (OrderList);
  rpc FindOne (OrderById) returns (Order);
  rpc UpdateStatus (UpdateStatusRequest) returns (Order);
  rpc Remove (OrderById) returns (Empty);
}
```

## Setup and Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file with the following variables:
```env
# Server
PORT=5001
GRPC_PORT=5051
NODE_ENV=development

# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=orders

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672
RABBITMQ_QUEUE=orders_queue

# Services
PRODUCTS_SERVICE_URL=localhost:5050

# Security
SERVICE_AUTH_TOKEN=your_service_auth_token
```

4. Run the service:
```bash
# Development
npm run start:dev

# Production
npm run start:prod
```

## Docker Support

Build and run using Docker:

```bash
# Build the image
docker build -t orders-service .

# Run the container
docker run -p 5001:5001 -p 5051:5051 orders-service
```

Using Docker Compose:

```bash
docker-compose up
```

## Database Migrations

```bash
# Generate a migration
npm run migration:generate -- src/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert migrations
npm run migration:revert
```

## Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Test coverage
npm run test:cov
```

## Event-Driven Architecture

The service publishes and consumes events through RabbitMQ:

### Published Events
- OrderCreated
- OrderConfirmed
- OrderCancelled
- OrderCompleted
- OrderFailed

### Consumed Events
- ProductReserved
- ProductReservationFailed

## Distributed Transactions

The service implements a saga pattern for order processing:
1. Create order (PENDING)
2. Reserve products (PRODUCT_RESERVED/FAILED)
3. Confirm order (CONFIRMED)
4. Complete order (COMPLETED)

## Health Checks

The service includes health check endpoints to monitor:
- Service status
- Database connection
- RabbitMQ connection
- Product service connection

## Security

- Service-to-service authentication using tokens
- Request validation
- Error handling
- Rate limiting
- Secure configuration management

## API Documentation

The gRPC service definitions can be found in `src/orders.proto`. The service implements the following methods:

### CreateOrder
- Creates a new order
- Requires service authentication
- Input: CreateOrderRequest (userId, items[])
- Returns: Order
- Initiates saga for order processing

### FindAll
- Returns all orders for a user
- Requires service authentication
- Returns: OrderList

### FindOne
- Returns a single order by ID
- Requires service authentication
- Input: OrderById
- Returns: Order
- Throws: NotFoundException if order doesn't exist

### UpdateStatus
- Updates order status
- Requires service authentication
- Input: UpdateStatusRequest (id, status)
- Returns: Order
- Throws: NotFoundException if order doesn't exist

### Remove
- Cancels an order (if possible) or marks for deletion
- Requires service authentication
- Input: OrderById
- Returns: Empty
- Throws: NotFoundException if order doesn't exist

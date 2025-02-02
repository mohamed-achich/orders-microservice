# Orders Microservice Demo

[![CI/CD Pipeline](https://github.com/mohamed-achich/orders-microservice/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/mohamed-achich/orders-microservice/actions)

## About This Demo Project

This microservice is part of a demonstration project showcasing my implementation of a scalable microservices architecture. While it uses an e-commerce context, the focus is on demonstrating clean code, proper system design, and microservices best practices rather than implementing a full e-commerce solution.

### Related Components

- **[E-commerce Platform](https://github.com/mohamed-achich/ecommerce-deployment)** - Main deployment and infrastructure demo
- **[API Gateway](https://github.com/mohamed-achich/api-gateway)** - API management demonstration
- **[Users Service](https://github.com/mohamed-achich/users-microservice)** - Basic user management
- **[Products Service](https://github.com/mohamed-achich/products-microservice)** - Simple product catalog

## Orders Service Overview

This service demonstrates basic order processing functionality using NestJS and PostgreSQL. It showcases distributed transaction patterns, service communication, and event-driven architecture implementations.

### Key Responsibilities

- Order lifecycle management
- Payment processing integration
- Inventory coordination with Products Service
- Order status tracking and updates
- Transaction history maintenance
- Distributed transaction handling
- Customer notification management

## Overview

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
- Payment processing integration
- Order history tracking

## Technical Stack

- **Framework**: NestJS
- **Language**: TypeScript
- **Database**: PostgreSQL
- **ORM**: TypeORM
- **Communication**: gRPC
- **Message Queue**: RabbitMQ
- **Testing**: Jest
- **CI/CD**: GitHub Actions

## Related Services
- [API Gateway](https://github.com/mohamed-achich/api-gateway) - API Gateway and Authentication Service
- [Users Service](https://github.com/mohamed-achich/users-microservice) - User Management Service
- [Products Service](https://github.com/mohamed-achich/products-microservice) - Product Catalog Service
- [E-commerce Deployment](https://github.com/mohamed-achich/ecommerce-deployment) - Infrastructure and Deployment

## API Documentation

### Order Schema

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

### Order Item Schema

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

### gRPC Endpoints

```protobuf
service OrdersService {
  // Public endpoints
  rpc GetOrder (OrderById) returns (Order);
  rpc GetUserOrders (UserById) returns (OrderList);
  
  // Protected endpoints
  rpc CreateOrder (CreateOrderRequest) returns (Order);
  rpc UpdateOrder (UpdateOrderRequest) returns (Order);
  rpc CancelOrder (OrderById) returns (Order);
  rpc CompleteOrder (OrderById) returns (Order);
}
```

## Getting Started

### Prerequisites

- Node.js >= 16
- PostgreSQL >= 13
- RabbitMQ >= 3.8
- Docker (optional)

### Local Development

1. Clone the repository:
```bash
git clone https://github.com/mohamed-achich/orders-microservice.git
cd orders-microservice
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start PostgreSQL and RabbitMQ:
```bash
# Using Docker
docker-compose up -d db rabbitmq

# Or use your local instances
```

5. Run migrations:
```bash
npm run migration:run
```

6. Start the service:
```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Environment Variables

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

# Service URLs
PRODUCTS_SERVICE_URL=localhost:5001
USERS_SERVICE_URL=localhost:5000

# JWT (for authentication)
JWT_PUBLIC_KEY=your-public-key
```

### Docker Support

Build the image:
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

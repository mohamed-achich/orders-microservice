export const rabbitmqConfig = {
  url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
  queues: {
    orders: 'orders_queue',
    products: 'products_queue',
    orderSaga: 'order_saga_queue'
  },
  exchanges: {
    orders: 'orders_exchange'
  },
  patterns: {
    orderCreated: 'order.created',
    orderConfirmed: 'order.confirmed',
    orderCancelled: 'order.cancelled',
    productReserved: 'product.reserved',
    productReservationFailed: 'product.reservation.failed'
  }
};

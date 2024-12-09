import { Order } from "src/orders/entities/order.entity";

export abstract class BaseSaga {
  abstract start(orderId: string): Promise<void>;
  abstract compensate(order: Order): Promise<void>;
  
  protected async execute(steps: (() => Promise<void>)[], order: Order): Promise<void> {
    for (const step of steps) {
      try {
        await step();
      } catch (error) {
        await this.compensate(order);
        throw error;
      }
    }
  }
}

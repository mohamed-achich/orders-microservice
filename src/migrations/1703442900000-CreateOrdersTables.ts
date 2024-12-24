import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateOrdersTables1703442900000 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create order status enum
        await queryRunner.query(`
            CREATE TYPE "order_status_enum" AS ENUM (
                'PENDING',
                'PRODUCT_RESERVED',
                'CONFIRMED',
                'FAILED',
                'COMPLETED',
                'CANCELLED'
            );
        `);

        // Create orders table
        await queryRunner.query(`
            CREATE TABLE "orders" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "status" "order_status_enum" NOT NULL DEFAULT 'PENDING',
                "total" decimal(10,2) NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_orders" PRIMARY KEY ("id")
            );

            CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
        `);

        // Create order items table
        await queryRunner.query(`
            CREATE TABLE "order_items" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "productId" character varying NOT NULL,
                "quantity" integer NOT NULL,
                "price" decimal(10,2) NOT NULL,
                "orderId" uuid NOT NULL,
                CONSTRAINT "PK_order_items" PRIMARY KEY ("id"),
                CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId")
                    REFERENCES "orders"("id") ON DELETE CASCADE
            );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "order_items";`);
        await queryRunner.query(`DROP TABLE "orders";`);
        await queryRunner.query(`DROP TYPE "order_status_enum";`);
    }
}

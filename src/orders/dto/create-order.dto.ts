import { IsNotEmpty, IsUUID, IsNumber, Min, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItemDto {
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  @IsNotEmpty()
  items: OrderItemDto[];
}

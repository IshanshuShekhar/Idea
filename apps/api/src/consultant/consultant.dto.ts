import { IsString, IsOptional, IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  scheduledAt: string; // ISO-8601 string — the chosen slot

  @IsString()
  @IsOptional()
  topic?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class LogCallDto {
  @IsString()
  @IsOptional()
  bookingId?: string; // link to a booking if applicable
}

export class RescheduleBookingDto {
  @IsString()
  @IsNotEmpty()
  newScheduledAt: string; // ISO-8601 string or slot identifier
}

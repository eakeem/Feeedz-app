import { Body, Controller, Param, Post } from '@nestjs/common';
import { IsEmail, IsOptional, IsPhoneNumber, IsString } from 'class-validator';
import { TicketsService } from './tickets.service';

class TicketInterestDto {
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsOptional() @IsPhoneNumber() phone?: string;
}

@Controller('events/:eventId/ticket-interest')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  create(@Param('eventId') eventId: string, @Body() dto: TicketInterestDto) {
    return this.tickets.createInterest(eventId, dto);
  }
}
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { AuthGuard } from '../auth/supabase-jwt.guard';
import { EventsService } from './events.service';

const parishes = ['Kingston', 'St. Andrew', 'St. Catherine', 'Manchester', 'St. James', 'Westmoreland', 'St. Ann', 'St. Mary', 'Portland', 'St. Thomas', 'St. Elizabeth', 'Hanover', 'Trelawny', 'Clarendon'];
const genres = ['Dancehall', 'Reggae', 'Party', 'Concert', 'Soca', 'Afrobeat', 'Comedy', 'Cultural'];

export class CreateEventDto {
  @IsString() title!: string;
  @IsString() description!: string;
  @IsDateString() eventDate!: string;
  @IsString() startTime!: string;
  @IsString() endTime!: string;
  @IsDateString() endsAt!: string;
  @IsString() venue!: string;
  @IsIn(parishes) parish!: string;
  @IsString() address!: string;
  @IsIn(genres) genre!: string;
  @IsInt() @Min(0) priceJmd!: number;
  @IsOptional() @IsUrl() ticketUrl?: string;
  @IsOptional() @IsString() coverObjectKey?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

export class UpdateEventDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsDateString() eventDate?: string;
  @IsOptional() @IsString() startTime?: string;
  @IsOptional() @IsString() endTime?: string;
  @IsOptional() @IsDateString() endsAt?: string;
  @IsOptional() @IsString() venue?: string;
  @IsOptional() @IsIn(parishes) parish?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsIn(genres) genre?: string;
  @IsOptional() @IsInt() @Min(0) priceJmd?: number;
  @IsOptional() @IsUrl() ticketUrl?: string;
  @IsOptional() @IsString() coverObjectKey?: string;
  @IsOptional() @IsNumber() latitude?: number;
  @IsOptional() @IsNumber() longitude?: number;
}

@Controller('events')
export class EventsController {
  constructor(private readonly events: EventsService) {}

  @Get()
  list(@Query('parish') parish?: string, @Query('genre') genre?: string, @Query('q') query?: string) {
    return this.events.list({ parish, genre, query });
  }

  @Get(':id')
  find(@Param('id') id: string) {
    return this.events.findPublished(id);
  }

  @UseGuards(AuthGuard)
  @Get('promoter/mine')
  mine(@Req() request: { user: { id: string; email?: string } }) {
    return this.events.listMine(request.user);
  }

  @UseGuards(AuthGuard)
  @Post()
  create(@Req() request: { user: { id: string; email?: string } }, @Body() dto: CreateEventDto) {
    return this.events.createPendingPayment(request.user, dto);
  }

  @UseGuards(AuthGuard)
  @Patch(':id')
  update(@Req() request: { user: { id: string; email?: string } }, @Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.events.updateMine(request.user, id, dto);
  }

  @UseGuards(AuthGuard)
  @Delete(':id')
  remove(@Req() request: { user: { id: string; email?: string } }, @Param('id') id: string) {
    return this.events.deleteMine(request.user, id);
  }
}
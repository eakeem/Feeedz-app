import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { AdminController } from './admin/admin.controller';
import { AdminService } from './admin/admin.service';
import { AuthGuard } from './auth/supabase-jwt.guard';
import { CleanupService } from './cleanup/cleanup.service';
import { EventsController } from './events/events.controller';
import { EventsService } from './events/events.service';
import { PaymentsController } from './payments/payments.controller';
import { PaymentsService } from './payments/payments.service';
import { PhotosController } from './photos/photos.controller';
import { PhotosService } from './photos/photos.service';
import { PrismaService } from './prisma.service';
import { R2Service } from './storage/r2.service';
import { TicketsController } from './tickets/tickets.controller';
import { TicketsService } from './tickets/tickets.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['../../.env', '.env'] }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 120 }])
  ],
  controllers: [AdminController, EventsController, PhotosController, PaymentsController, TicketsController],
  providers: [AdminService, AuthGuard, CleanupService, EventsService, PaymentsService, PhotosService, PrismaService, R2Service, TicketsService]
})
export class AppModule {}
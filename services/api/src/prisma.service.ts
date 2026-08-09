import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Don't block startup if the database is unreachable (e.g. no .env configured yet)
    this.$connect().catch((err) => {
      console.warn('Prisma connection deferred:', err.message);
    });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
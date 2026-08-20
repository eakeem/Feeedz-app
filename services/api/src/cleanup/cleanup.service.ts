import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { R2Service } from '../storage/r2.service';

@Injectable()
export class CleanupService {
  constructor(private readonly prisma: PrismaService, private readonly r2: R2Service) {}

  @Cron(CronExpression.EVERY_HOUR)
  async deleteExpiredEvents() {
    const expiredEvents = await this.prisma.event.findMany({
      where: { deleteAfter: { lte: new Date() }, status: { not: EventStatus.DELETED } },
      include: { photos: true }
    });

    for (const event of expiredEvents) {
      await Promise.all(event.photos.map((photo: any) => this.r2.deleteObject(photo.objectKey)));
      if (event.coverObjectKey) await this.r2.deleteObject(event.coverObjectKey);
      await this.prisma.event.update({ where: { id: event.id }, data: { status: EventStatus.DELETED } });
      await this.prisma.event.delete({ where: { id: event.id } });
    }
  }
}
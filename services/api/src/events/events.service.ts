import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus } from '@prisma/client';
import { CreateEventDto, UpdateEventDto } from './events.controller';
import { PrismaService } from '../prisma.service';

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  list(filters: { parish?: string; genre?: string; query?: string }) {
    return this.prisma.event.findMany({
      where: {
        status: EventStatus.PUBLISHED,
        parish: filters.parish || undefined,
        genre: filters.genre || undefined,
        OR: filters.query ? [
          { title: { contains: filters.query, mode: 'insensitive' } },
          { venue: { contains: filters.query, mode: 'insensitive' } },
          { parish: { contains: filters.query, mode: 'insensitive' } }
        ] : undefined
      },
      orderBy: { eventDate: 'asc' },
      include: { promoter: true, photos: { where: { moderationStatus: 'APPROVED' }, take: 18, orderBy: { createdAt: 'desc' } } }
    });
  }

  async findPublished(id: string) {
    const event = await this.prisma.event.findFirst({
      where: { id, status: EventStatus.PUBLISHED },
      include: { promoter: true, photos: { where: { moderationStatus: 'APPROVED' }, orderBy: { createdAt: 'desc' } } }
    });
    if (!event) throw new NotFoundException('Event not found');
    return event;
  }

  async listMine(user: { id: string; email?: string }) {
    const promoter = await this.getPromoter(user);
    return this.prisma.event.findMany({ where: { promoterId: promoter.id }, orderBy: { createdAt: 'desc' }, include: { photos: true, payments: true } });
  }

  async createPendingPayment(user: { id: string; email?: string }, dto: CreateEventDto) {
    const promoter = await this.getPromoter(user);
    const endsAt = new Date(dto.endsAt);

    return this.prisma.event.create({
      data: {
        ...dto,
        eventDate: new Date(dto.eventDate),
        endsAt,
        deleteAfter: new Date(endsAt.getTime() + 48 * 60 * 60 * 1000),
        promoterId: promoter.id,
        status: EventStatus.PENDING_PAYMENT
      }
    });
  }

  async updateMine(user: { id: string; email?: string }, id: string, dto: UpdateEventDto) {
    const promoter = await this.getPromoter(user);
    const event = await this.prisma.event.findFirst({ where: { id, promoterId: promoter.id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status === EventStatus.PUBLISHED && event.publishedAt) throw new ForbiddenException('Published events can no longer be edited');

    const endsAt = dto.endsAt ? new Date(dto.endsAt) : event.endsAt;
    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        eventDate: dto.eventDate ? new Date(dto.eventDate) : undefined,
        endsAt,
        deleteAfter: new Date(endsAt.getTime() + 48 * 60 * 60 * 1000)
      }
    });
  }

  async deleteMine(user: { id: string; email?: string }, id: string) {
    const promoter = await this.getPromoter(user);
    const event = await this.prisma.event.findFirst({ where: { id, promoterId: promoter.id } });
    if (!event) throw new NotFoundException('Event not found');
    if (event.status === EventStatus.PUBLISHED && event.publishedAt) throw new ForbiddenException('Published events can no longer be deleted');

    return this.prisma.event.delete({ where: { id } });
  }

  private async getPromoter(user: { id: string; email?: string }) {
    return this.prisma.promoterProfile.upsert({
      where: { supabaseId: user.id },
      create: { supabaseId: user.id, email: user.email ?? `${user.id}@supabase.local`, displayName: user.email ?? 'Promoter' },
      update: {}
    });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { EventStatus, ModerationStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { R2Service } from '../storage/r2.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService, private readonly r2: R2Service) {}

  async stats() {
    const [events, revenue, promoters, uploads, reportedPhotos] = await Promise.all([
      this.prisma.event.count(),
      this.prisma.payment.aggregate({ _sum: { amountJmd: true } }),
      this.prisma.promoterProfile.count(),
      this.prisma.livePhoto.count(),
      this.prisma.livePhoto.count({ where: { moderationStatus: ModerationStatus.REPORTED } })
    ]);

    return { events, revenueJmd: revenue._sum.amountJmd ?? 0, promoters, uploads, reportedPhotos };
  }

  events() {
    return this.prisma.event.findMany({ orderBy: { createdAt: 'desc' }, include: { promoter: true, payments: true, photos: true } });
  }

  async moderateEvent(id: string, action: 'approve' | 'reject') {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Event not found');
    return this.prisma.event.update({ where: { id }, data: { status: action === 'approve' ? EventStatus.PUBLISHED : EventStatus.REJECTED, publishedAt: action === 'approve' ? new Date() : null } });
  }

  async deleteEvent(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id }, include: { photos: true } });
    if (!event) throw new NotFoundException('Event not found');
    await Promise.all(event.photos.map((photo: any) => this.r2.deleteObject(photo.objectKey)));
    if (event.coverObjectKey) await this.r2.deleteObject(event.coverObjectKey);
    return this.prisma.event.delete({ where: { id } });
  }

  payments() {
    return this.prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, include: { event: true } });
  }

  async refund(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment not found');
    return this.prisma.payment.update({ where: { id }, data: { refundedAt: new Date() } });
  }

  users() {
    return this.prisma.promoterProfile.findMany({ orderBy: { createdAt: 'desc' }, include: { events: true } });
  }

  banUser(promoterId: string) {
    return this.prisma.promoterProfile.update({ where: { id: promoterId }, data: { bannedAt: new Date() } });
  }

  unbanUser(promoterId: string) {
    return this.prisma.promoterProfile.update({ where: { id: promoterId }, data: { bannedAt: null } });
  }

  banIp(ipHash: string, reason: string) {
    return this.prisma.bannedIp.upsert({ where: { ipHash }, create: { ipHash, reason }, update: { reason } });
  }

  unbanIp(ipHash: string) {
    return this.prisma.bannedIp.delete({ where: { ipHash } });
  }

  reportedPhotos() {
    return this.prisma.livePhoto.findMany({ where: { moderationStatus: { in: [ModerationStatus.REPORTED, ModerationStatus.PENDING] } }, orderBy: { createdAt: 'desc' }, include: { event: true } });
  }

  async moderatePhoto(id: string, action: 'approve' | 'reject') {
    const photo = await this.prisma.livePhoto.findUnique({ where: { id } });
    if (!photo) throw new NotFoundException('Photo not found');
    if (action === 'reject') await this.r2.deleteObject(photo.objectKey);
    return this.prisma.livePhoto.update({ where: { id }, data: { moderationStatus: action === 'approve' ? ModerationStatus.APPROVED : ModerationStatus.REJECTED } });
  }
}

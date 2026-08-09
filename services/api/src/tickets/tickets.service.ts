import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import { PrismaService } from '../prisma.service';

@Injectable()
export class TicketsService {
  private readonly resend: Resend;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.resend = new Resend(config.getOrThrow<string>('RESEND_API_KEY'));
  }

  async createInterest(eventId: string, dto: { name: string; email: string; phone?: string }) {
    const interest = await this.prisma.ticketInterest.create({ data: { eventId, ...dto } });
    await this.resend.emails.send({
      from: this.config.getOrThrow<string>('TICKETS_FROM_EMAIL'),
      to: dto.email,
      subject: 'feeedz ticket request received',
      html: `<p>Hi ${dto.name}, your ticket request has been received. PDF e-ticket delivery will be enabled when direct ticketing launches.</p>`
    });
    return interest;
  }
}
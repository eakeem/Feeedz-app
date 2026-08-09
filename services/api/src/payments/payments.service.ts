import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventStatus } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../prisma.service';

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService) {
    this.stripe = new Stripe(config.getOrThrow<string>('STRIPE_SECRET_KEY'));
  }

  async createEventCheckout(eventId: string) {
    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: this.config.getOrThrow<string>('STRIPE_EVENT_POST_PRICE_ID'), quantity: 1 }],
      success_url: `${this.config.getOrThrow<string>('APP_ORIGIN')}/payment/success?event=${eventId}`,
      cancel_url: `${this.config.getOrThrow<string>('APP_ORIGIN')}/payment/cancel?event=${eventId}`,
      metadata: { eventId }
    });
    await this.prisma.event.update({ where: { id: eventId }, data: { stripeSessionId: session.id } });
    return { checkoutUrl: session.url };
  }

  async handleWebhook(payload: Buffer, signature: string) {
    const webhook = this.stripe.webhooks.constructEvent(payload, signature, this.config.getOrThrow<string>('STRIPE_WEBHOOK_SECRET'));
    if (webhook.type === 'checkout.session.completed') {
      const session = webhook.data.object;
      const eventId = session.metadata?.eventId;
      if (eventId) {
        await this.prisma.event.update({ where: { id: eventId }, data: { status: EventStatus.PUBLISHED, publishedAt: new Date() } });
        if (session.payment_intent && typeof session.payment_intent === 'string') {
          await this.prisma.payment.create({ data: { eventId, stripePaymentId: session.payment_intent, amountJmd: 500 } });
        }
      }
    }
    return { received: true };
  }
}
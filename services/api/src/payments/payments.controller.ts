import { Body, Controller, Headers, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/supabase-jwt.guard';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @UseGuards(AuthGuard)
  @Post('events/:eventId/checkout')
  createCheckout(@Param('eventId') eventId: string) {
    return this.payments.createEventCheckout(eventId);
  }

  @Post('stripe/webhook')
  webhook(@Req() request: { rawBody?: Buffer; body: unknown }, @Headers('stripe-signature') signature: string, @Body() body: unknown) {
    return this.payments.handleWebhook(request.rawBody ?? Buffer.from(JSON.stringify(body)), signature);
  }
}
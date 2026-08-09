# feeedz

Mobile-first event discovery, promotion, and live event photo sharing for Jamaica.

The original [index.html](index.html) remains as the visual prototype. The app scaffold in this repo keeps that neon dark party UI while splitting the production app into:

- [apps/mobile](apps/mobile): Expo iOS/Android app for guests and promoters.
- [apps/admin](apps/admin): Web dashboard for platform administration.
- [services/api](services/api): NestJS API for events, photos, payments, tickets, and admin operations.

## Production Stack

- Database: Neon Serverless Postgres via Prisma.
- Auth: Supabase Auth with JWT verification and OTP flows.
- Storage: Cloudflare R2 for covers, galleries, and live photos.
- Backend: Railway-hosted Node.js/NestJS.
- Payments: Stripe Checkout and webhooks for paid event publishing.
- Maps: Google Maps links/API integration.
- Email: Resend for e-ticket and notification email.

## Local Setup

1. Copy `.env.example` to `.env` and fill in service credentials.
2. Install dependencies from the repo root:

   ```bash
   npm install
   ```

3. Generate the Prisma client and run migrations once the Neon URL is ready:

   ```bash
   npm run prisma:generate -w @feeedz/api
   npm run prisma:migrate -w @feeedz/api
   ```

4. Start each surface:

   ```bash
   npm run mobile
   npm run api
   npm run admin
   ```

## App Store / Play Store Requirement

Use [docs/privacy-policy.md](docs/privacy-policy.md) as the required privacy policy starting point. Review it with counsel before publishing.

## Security Notes

The API scaffold includes the controls expected for production: CORS, Helmet security headers, request validation, rate limiting, JWT auth guard structure, Prisma parameterized queries, Stripe webhook verification, R2 object storage boundaries, image blankness checks, live photo caps, and scheduled event deletion support. WAF/DDoS protection should be enforced at Cloudflare/Railway edge configuration.
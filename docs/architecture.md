# feeedz Architecture

## Surfaces

- Mobile app: Expo React Native for iOS and Android. Guests browse without login. Promoters authenticate with Supabase Auth and publish after Stripe payment.
- Admin dashboard: Vite React web app for event management, payments, users/IP bans, and content moderation.
- API: NestJS on Railway, backed by Neon Postgres, Cloudflare R2, Stripe, Resend, and Google Maps links/API.

## Core Flows

1. Guest opens the app and fetches published events from `GET /v1/events`.
2. Event details use `GET /v1/events/:id`, Google/Apple Maps deep links, external ticket URLs, and ticket interest capture.
3. Promoter signs up/signs in through Supabase Auth OTP, creates an event through `POST /v1/events`, then starts Stripe Checkout through `POST /v1/payments/events/:eventId/checkout`.
4. Stripe webhook marks the event `PUBLISHED` after successful payment.
5. Live photo uploads post to `POST /v1/events/:eventId/live-photos`; the API enforces the live window, one photo per IP/event, one upload per five minutes, compression under 500kb, blank image rejection, moderation status, and FIFO cap of 200 photos.
6. Scheduled cleanup deletes event data and R2 objects 48 hours after event end.

## Production Hardening Checklist

- Configure Cloudflare WAF, bot rules, DDoS protection, and R2 bucket policies.
- Enable Railway HTTPS and locked-down environment variables.
- Use Supabase Row Level Security for auth-owned records if direct client access is introduced.
- Configure Stripe webhook raw body handling in Nest before deployment.
- Add image moderation provider callbacks before approving live photos.
- Add admin audit logs for approvals, deletes, bans, refunds, and moderation actions.
- Add database backups and GDPR/CCPA deletion jobs.
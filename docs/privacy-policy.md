# feeedz Privacy Policy

Effective date: August 8, 2026

feeedz helps people discover, promote, and experience events in Jamaica. This policy explains what data the app collects and how it is used. Review this draft with legal counsel before submitting to the App Store or Play Store.

## Data We Collect

- Guest browsing data: event views, searches, filters, approximate location if the user grants permission, and device/IP metadata for abuse prevention.
- Promoter account data: name, email, authentication identifiers, OTP verification status, event listings, payment status, and support messages.
- Event data: title, description, date/time, venue, parish, address, ticket URL, cover images, gallery images, and pricing.
- Live photo data: uploaded event photos, upload timestamp, moderation status, and hashed IP address to enforce one photo per IP per event and one upload per five minutes.
- Ticket interest data: name, email, phone number, selected event, and email delivery status.
- Admin/security data: audit logs, moderation actions, banned users/IP hashes, and fraud prevention signals.

## How We Use Data

- Show nearby, trending, weekend, and filtered events.
- Let promoters create, manage, and pay to publish events.
- Send ticket confirmations or ticket availability emails through Resend.
- Store event media in Cloudflare R2 and moderate images for unsafe or illegal content.
- Process event publishing payments through Stripe.
- Protect the platform with rate limiting, abuse detection, WAF/DDoS controls, and admin audit trails.

## Data Sharing

We share only the information needed with service providers that run feeedz: Supabase Auth, Neon Postgres, Cloudflare R2, Railway, Stripe, Google Maps, Resend, and image moderation providers. Payment card data is handled by Stripe and is not stored by feeedz.

## Retention

Published events and associated photos are automatically deleted 48 hours after the event end time unless required for fraud, legal, or accounting records. Ticket interest and promoter account data are retained while needed to provide the service or meet legal obligations.

## Your Rights

Users can request access, correction, export, deletion, or restriction of personal data. GDPR/CCPA deletion workflows should remove user PII from Supabase, Neon, R2 metadata, Resend audiences, and internal logs where legally allowed.

## Security

feeedz uses HTTPS, JWT authentication, validation, parameterized database queries, encrypted service credentials, rate limiting, moderation, CORS/CSP headers, WAF/DDoS protection, and least-privilege access controls.

## Contact

Privacy requests: privacy@feeedz.com
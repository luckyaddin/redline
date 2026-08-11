# RedLine Kuwait Logistics

Professional multi-page logistics website with a private Kuwait Operations Center.

## Platform

- Next.js 16
- Firebase Authentication
- Cloud Firestore
- Resend transactional shipment emails
- Vercel hosting

## Firebase setup

Enable Email/Password authentication in Firebase Authentication and create at least one operations user. Enable Cloud Firestore and Firebase Storage, then publish the included `firestore.rules` and `storage.rules` before using the dashboard.

## Environment variables

Copy `.env.example` to `.env.local` and provide all `NEXT_PUBLIC_FIREBASE_*` values. Add `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and optionally `RESEND_REPLY_TO` to enable shipment emails.

## Private portal

`/private/kuwait/login`

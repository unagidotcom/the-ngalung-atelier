# The Ngalung Atelier

A digital product sales and creator storefront for selling templates, files, and digital systems with customer accounts, payment handling, private delivery vaults, admin product management, analytics, and PostgreSQL persistence.

## Stack

- React 19, TypeScript, Vite, Tailwind CSS
- Express API server
- PostgreSQL persistence with Supabase-compatible SSL support
- Razorpay payment integration
- Local, Supabase Storage, or S3-compatible private product file storage

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from the template:

```bash
cp .env.example .env
```

3. Fill in the required environment values:

```bash
DATABASE_URL=
DATABASE_SSL=true
ADMIN_EMAIL=
ADMIN_PASSWORD=
SESSION_SECRET=
```

4. Run database migrations:

```bash
npm run migrate:schema
npm run migrate:data:dry-run
npm run migrate:data
```

5. Start the app locally:

```bash
npm run dev
```

The app runs on `http://localhost:3000` by default.

## Production Notes

- Keep `.env` and all real credentials out of Git.
- Set `NODE_ENV=production`.
- Configure `APP_URL` or `PUBLIC_APP_URL` to the public HTTPS domain.
- Configure Razorpay keys and webhook secret before accepting real payments.
- Use Supabase Storage or S3-compatible storage for durable private product files in production.
- Run `npm run build` before deployment.

## Useful Commands

```bash
npm run lint
npm run build
npm run migrate:schema
npm run migrate:data:dry-run
npm run migrate:data
```

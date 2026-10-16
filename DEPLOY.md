# Production Deployment Guide

**Platform:** Intelligent ERP
**Company:** Intelligent Technologies Limited


## 1. Backend (Next.js API on Vercel)
The backend is optimized for Vercel deployment.
1. Connect your GitHub repository to Vercel.
2. Select the `backend` directory as the Root Directory.
3. Vercel will automatically detect Next.js.
4. **Environment Variables Required:**
   - `DATABASE_URL` (Your production Drizzle database URL, e.g., Supabase or Neon)
   - `JWT_SECRET` (Secure random string)
   - `UPSTASH_REDIS_REST_URL` & `UPSTASH_REDIS_REST_TOKEN` (For rate limiting)
   - `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` & `AWS_REGION` (For S3 6-year archiving)

## 2. Frontend (Flutter Web on Cloudflare Pages)
The frontend is optimized for Cloudflare Pages edge delivery.
1. Run the web build locally: `flutter build web --release --web-renderer canvaskit`
2. Ensure you have the Cloudflare CLI installed: `npm install -g wrangler`
3. Deploy to Cloudflare:
   ```bash
   cd erp-frontend
   wrangler pages deploy build/web --project-name intelligent-erp-frontend
   ```

## 3. Marketing Website (Astro on Cloudflare Pages)
1. Similar to the frontend, you can link the `Website` directory to Cloudflare Pages via GitHub.
2. Build command: `npm run build`
3. Output directory: `dist`


Here is the complete, detailed plan for your ERP system's infrastructure, environment separation, and deployment strategy.

1. Technology Stack
Backend: Next.js (Vercel)
Database: Supabase PostgreSQL (Primary)
Cache/Queue: Upstash Redis (Rate limiting)
File Storage: AWS S3 (6-year archiving)
Frontend: Flutter Web (Cloudflare Pages)
Marketing Site: Astro (Cloudflare Pages)


2. Environment Separation Strategy (The "4-Layer Cake")
You must physically isolate environments to prevent configuration leaks.

A. Infrastructure Layer (Terraform)
This is the foundation. Do NOT manage this in code unless you are using Terraform Cloud/Enterprise.

Primary Infrastructure (Production):
Hosting: Vercel
Functions: Supabase Edge Functions (if using Server Actions)
Database: Supabase Production DB (e.g., supabase-prod)
Storage: AWS S3 (Production Bucket)
Testing/Staging Infrastructure:
Hosting: Vercel
Functions: Supabase Edge Functions (Staging)
Database: Supabase Sandbox DB (e.g., supabase-staging)
Storage: AWS S3 (Staging Bucket)
Development Infrastructure:
Hosting: Vercel (Local Mode) or Dedicated Dev Project
Functions: Mocked (if not using Edge Functions locally)
Database: Local Supabase Instance (via Docker)
Storage: Local MinIO or Mock

B. Backend Environment Configuration (Environment Variables)
Each environment must have its own set of secrets.

1. Production Environment
Target: Production tenants (e.g., "Al-Khaleej Hospital").

Database URL: postgresql://prod-user:prod-pass@prod-host/db
JWT Secret: Super complex, randomly generated string.
Upstash Redis: prod-redis-url
AWS S3: prod-access-key, prod-secret-key, prod-region
Feature Flags: All enabled

2. Staging Environment (Testing/Demo)
Target: Internal testing, demo accounts.

Database URL: postgresql://staging-user:staging-pass@staging-host/db
JWT Secret: Different from production (prevents cross-environment tokens).
Upstash Redis: staging-redis-url
AWS S3: staging-access-key
Feature Flags: Disabled (or restricted to "Tester" role).

3. Development Environment (Local)
Target: Your local machine.

Database URL: postgresql://postgres:postgres@localhost:5432/postgres
JWT Secret: Can be simpler for local dev, but different from Prod/Staging.
Upstash Redis: (Optional) Mock or connect to a local Redis instance.
AWS S3: Disabled or use a local S3 mock (MinIO).
Feature Flags: Enabled (You are the tester).

C. Tenant Isolation Strategy (PostgreSQL)
This is critical for a multi-tenant system.

Option 1: Separate Databases (Recommended for Scalability)
Separate DB per Tenant:

Dev: postgresql://dev_user@localhost/dev_db
Stage: postgresql://staging_user@staging-host/staging_db
Prod: postgresql://prod_user@prod-host/prod_db
Prod per Tenant: postgresql://tenant_id@prod-host/tenant_id
Architecture: [Your App] -> [Production Database Cluster]
[Tenant A DB] [Tenant B DB] [Tenant C DB]
Pros: Maximum security, simple queries. Cons: More databases to manage.
Option 2: Single Database with Row-Level Security (RLS) (Recommended for MVP)
Architecture: [Your App] -> [Single Production Database]
Tables: tenant_id (FK in every table)
Policy: Users can only query/mutate rows where tenant_id = session.user.tenant_id.
Pros: Single DB, easy migration. Cons: Complex queries, performance risk at scale.

3. Deployment Strategy
1. Infrastructure Provisioning
For Production & Staging: Create two separate projects in Supabase.
For Dev: Run Supabase locally with Docker.
2. Backend Deployment
Deploy Code: Push code to GitHub, Vercel auto-deploys.
Configure Environments: Go to Vercel Project Settings -> Environment Variables.
Add Prod Env Vars: DATABASE_URL (Production), JWT_SECRET (Production), etc.
Add Staging Env Vars: DATABASE_URL (Staging), JWT_SECRET (Staging), etc.
Add Dev Env Vars: DATABASE_URL (Local), etc.

3. Frontend Deployment
Build & Deploy:

Run flutter build web --release
Deploy the contents of build/web to Cloudflare Pages.
Configure Domains:

Primary Domain: erp.intelligentdive.com
Dev Domain: dev.erp.intelligentdive.com
Demo Domain: demo.erp.intelligentdive.com
Partner Domain: partner.erp.intelligentdive.com

VPS: https://165.73.244.224:8090/

hosting panel Cyberpanel - https://165.73.244.224:8090/
   user: Admin password: T9V8$TpDASw!
   IP: [65.73.244.224]

domain: intelligentdive.com

Database: PostgreSQL
Hosting: Cyberpanel

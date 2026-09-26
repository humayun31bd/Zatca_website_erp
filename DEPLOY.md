# Production Deployment Guide

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
   wrangler pages deploy build/web --project-name numou-erp-frontend
   ```

## 3. Marketing Website (Astro on Cloudflare Pages)
1. Similar to the frontend, you can link the `Website` directory to Cloudflare Pages via GitHub.
2. Build command: `npm run build`
3. Output directory: `dist`

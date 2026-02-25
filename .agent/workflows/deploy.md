---
description: How to deploy Smart-Menu-Pro to the internet
---

Follow these steps to deploy your application to a production environment (like Railway or Render).

### 1. Database Setup
Your database is already hosted on **Supabase**. Ensure your `DATABASE_URL` is correct.

### 2. Choose a Hosting Provider
We recommend **Railway** or **Render**. Connect your GitHub repository to the service.

### 3. Build & Start Commands
Configure the following commands in your hosting provider's dashboard:
- **Build Command**: `npm run build`
- **Start Command**: `npm run start`

### 4. Environment Variables
Add these environment variables to your service:
- `DATABASE_URL`: `postgresql://postgres.cufqqezpzvzkfpdmhcig:myDine_ResTech@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?sslmode=no-verify`
- `SESSION_SECRET`: (Generate a long random string, e.g., `openssl rand -base64 32`)
- `NODE_ENV`: `production`
- `DB_SSL_INSECURE`: `true`

### 5. Deployment
- Push your latest code to GitHub.
- The hosting service will automatically build and deploy your app.

### 6. Verify
- Visit the public URL provided by the service.
- Verify that the Landing Page loads and both portals work.

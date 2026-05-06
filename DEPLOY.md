# Deploy to Vercel (Serverless)

## 📦 Required NPM Packages

```bash
npm install axios raw-body pg
npm install -D vercel
```

**New Dependencies:**
- `axios` - HTTP client for LINE API calls (replaces @line/bot-sdk)
- `raw-body` - Read raw request body for signature verification
- `pg` - PostgreSQL client (already installed)
- `vercel` - CLI for local testing and deployment

---

## 🔧 Environment Variables

Create `.env.local` for local testing or set in Vercel Dashboard:

```bash
# LINE Messaging API Configuration
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token_here
LINE_CHANNEL_SECRET=your_channel_secret_here

# PostgreSQL Database (Supabase)
DATABASE_URL=postgresql://postgres:password@db.project-ref.supabase.co:5432/postgres

# Server Configuration
NODE_ENV=production
```

---

## 🚀 Deployment Steps

### 1. Install Vercel CLI

```bash
npm i -g vercel
```

### 2. Login to Vercel

```bash
vercel login
```

### 3. Set Environment Variables

```bash
vercel env add LINE_CHANNEL_ACCESS_TOKEN
vercel env add LINE_CHANNEL_SECRET
vercel env add DATABASE_URL
```

### 4. Deploy

```bash
vercel
```

Or for production:

```bash
vercel --prod
```

---

## 🌐 Webhook URL

After deployment, your webhook URL will be:

```
https://your-project.vercel.app/api/webhook
```

Set this in [LINE Developers Console](https://developers.line.biz/console/):

1. Go to your channel → Messaging API → Webhook URL
2. Enter: `https://your-project.vercel.app/api/webhook`
3. Click "Verify" then "Update"

---

## 🧪 Local Testing

```bash
# Install dependencies
npm install

# Test locally with Vercel CLI
vercel dev
```

The webhook will be available at `http://localhost:3000/api/webhook`

---

## 📁 Project Structure

```
line-pos-system/
├── api/
│   ├── webhook.js          # Main webhook handler (serverless)
│   └── health.js           # Health check endpoint
├── src/
│   ├── db/
│   │   └── index.js        # Database connection (serverless-optimized)
│   └── services/
│       ├── orderService.js # Business logic (unchanged)
│       └── lineService.js  # Legacy (not used in serverless)
├── vercel.json             # Vercel configuration
├── package.json            # Updated dependencies
└── DEPLOY.md               # This file
```

---

## ⚡ Serverless Changes

### What Changed

| Before (Express) | After (Serverless) |
|-----------------|-------------------|
| `app.listen()` | Export `handler` function |
| `@line/bot-sdk` middleware | `raw-body` + `crypto` signature verification |
| `body-parser` | Disabled - manual JSON parsing |
| Express router | Direct handler with switch cases |
| LINE SDK client | `axios` HTTP requests |

### Key Features Preserved

- ✅ Signature verification (X-Line-Signature)
- ✅ All event handlers (follow, message, postback)
- ✅ All business logic (orderService)
- ✅ Flex Message builders
- ✅ Database operations (PostgreSQL)
- ✅ Quick 200 response to LINE

---

## 🔒 Security Notes

1. **Signature Verification**: Every webhook request is verified using HMAC-SHA256
2. **Environment Variables**: Never commit `.env` files
3. **Database**: Use connection pooling with `max: 1` for serverless
4. **HTTPS**: Vercel provides HTTPS by default

---

## 🐛 Troubleshooting

### Issue: "no channel secret"
- **Fix**: Set `LINE_CHANNEL_SECRET` in Vercel Dashboard → Settings → Environment Variables

### Issue: Database connection errors
- **Fix**: Check `DATABASE_URL` format and ensure Supabase allows connections

### Issue: Signature verification fails
- **Fix**: Ensure `LINE_CHANNEL_SECRET` matches the one in LINE Developers Console

### Issue: Webhook not responding
- **Fix**: Check Vercel Functions logs in Dashboard → Functions

---

## 📊 Monitoring

View logs in Vercel Dashboard:
1. Go to your project
2. Click "Functions" tab
3. See real-time logs and errors

---

## 📝 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/webhook` | POST | LINE Messaging API webhook |
| `/` | GET | Health check |

---

## 🎉 Done!

Your LINE POS System is now running on Vercel Serverless Functions!

Need help? Check [Vercel Documentation](https://vercel.com/docs) or [LINE API Documentation](https://developers.line.biz/en/docs/).

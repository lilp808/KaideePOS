# LINE POS LIFF Web App

Production-ready LIFF web application for small SME POS system.

## 🚀 Features

- **Dashboard**: Today's sales, order count, top selling item
- **Menu Management**: Add, edit, delete menu items
- **Sales History**: View all orders with details
- **Mobile-First**: Optimized for smartphones
- **LINE Integration**: LIFF authentication and profile sync

## 🛠 Tech Stack

- **Frontend**: Next.js 14 + React 18
- **Styling**: Tailwind CSS with custom LINE theme colors
- **Backend**: Supabase (shared with existing bot)
- **Authentication**: LINE LIFF SDK

## 📱 Setup Instructions

### 1. Environment Variables

Create `.env.local` file:

```bash
NEXT_PUBLIC_LIFF_ID=your-liff-app-id
```

### 2. Install Dependencies

```bash
cd liff
npm install
```

### 3. Run Development

```bash
npm run dev
```

### 4. Create LIFF App

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create new LIFF app
3. Set:
   - **LIFF URL**: `https://your-domain.vercel.app/`
   - **Scope**: `profile`
   - **Bot Linking**: Link to your existing bot

### 5. Deploy to Vercel

```bash
npm run build
vercel --prod
```

## 📊 API Endpoints

The app connects to existing Supabase database:

- `GET /api/menus?userId={userId}` - Get user menus
- `POST /api/menus` - Create menu item
- `PUT /api/menus/{id}` - Update menu item
- `DELETE /api/menus/{id}` - Delete menu item
- `GET /api/orders/today?userId={userId}` - Today's stats
- `GET /api/orders?userId={userId}` - Sales history
- `POST /api/auth/sync` - Sync LIFF user with database

## 🎨 UI Components

- **Dashboard**: Real-time sales statistics
- **MenuManagement**: CRUD operations for menu items
- **SalesHistory**: Order history with expandable details
- **BottomNav**: Mobile-first navigation
- **Loading**: Consistent loading states

## 🔐 Security

- LIFF authentication only
- User ID validation
- Supabase RLS policies
- HTTPS only

## 📱 Mobile Optimization

- Large touch targets (min 44px)
- Thumb-friendly buttons
- Swipe gestures support
- Fast animations
- Minimal data usage

## 🚀 Deployment

The app is ready for production deployment on Vercel with automatic HTTPS and global CDN.

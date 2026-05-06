# LINE POS System

A production-ready, chat-based POS system for small SMEs using LINE Messaging API.

## Features

- **Button-based Interface**: No AI/NLP - all interactions through postback buttons
- **Real-time Cart**: Add items, adjust quantities, checkout instantly
- **Daily Summary**: View total sales, orders, and top-selling items
- **Auto User Onboarding**: Default menu seeded automatically for new users
- **Session Management**: Persistent shopping sessions with automatic recovery

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **LINE SDK**: @line/bot-sdk v9.x
- **Deployment**: Ready for Vercel, Railway, or VPS

## Quick Start

### 1. Database Setup

Run the schema in Supabase SQL Editor:

```sql
-- Copy contents of src/db/schema.sql
```

### 2. Environment Variables

```bash
cp .env.example .env
```

Edit `.env`:

```env
LINE_CHANNEL_ACCESS_TOKEN=your_token
LINE_CHANNEL_SECRET=your_secret
DATABASE_URL=postgresql://...
```

### 3. Install & Run

```bash
npm install
npm start
```

### 4. LINE OA Configuration

1. Go to [LINE Developers Console](https://developers.line.biz/)
2. Create a Messaging API channel
3. Set webhook URL: `https://your-domain.com/webhook`
4. Enable auto-reply: **OFF**
5. Enable greeting message: **OFF**

## Webhook Events Handled

| Event | Action |
|-------|--------|
| `follow` | Create user + seed default menu |
| `message` (text) | Process commands (`ยอดวันนี้`) or show menu |
| `postback:add_item` | Add item to cart |
| `postback:increase_qty` | +1 quantity |
| `postback:decrease_qty` | -1 quantity (removes if qty = 1) |
| `postback:checkout` | Finalize order, close session |

## Testing Webhook (curl)

```bash
# Follow event
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "follow",
      "source": {"userId": "U1234567890", "type": "user"},
      "timestamp": 1234567890
    }]
  }'

# Daily summary command
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "message",
      "source": {"userId": "U1234567890", "type": "user"},
      "message": {"type": "text", "text": "ยอดวันนี้"},
      "replyToken": "test-token"
    }]
  }'

# Add item postback (requires valid menu_id)
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "type": "postback",
      "source": {"userId": "U1234567890", "type": "user"},
      "postback": {"data": "{\"action\":\"add_item\",\"menu_id\":\"valid-uuid\"}"},
      "replyToken": "test-token"
    }]
  }'
```

## Database Schema

```
users
├── id (uuid, PK)
├── line_user_id (text, unique)
└── created_at

menus
├── id (uuid, PK)
├── user_id (FK → users)
├── name (text)
├── price (int)
├── is_active (boolean)
└── created_at

order_sessions
├── id (uuid, PK)
├── user_id (FK → users)
├── status (open/closed)
├── total (int)
└── created_at

order_items
├── id (uuid, PK)
├── session_id (FK → order_sessions)
├── menu_id (FK → menus)
├── qty (int)
├── unit_price (int)
└── created_at

orders
├── id (uuid, PK)
├── user_id (FK → users)
├── total (int)
└── created_at
```

## Flex Message Examples

### Menu Carousel

```json
{
  "type": "carousel",
  "contents": [{
    "type": "bubble",
    "size": "micro",
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {"type": "text", "text": "ชานม", "weight": "bold", "size": "md", "align": "center"},
        {"type": "text", "text": "25 บาท", "size": "sm", "color": "#666666", "align": "center"}
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [{
        "type": "button",
        "style": "primary",
        "action": {
          "type": "postback",
          "label": "เพิ่ม",
          "data": "{\"action\":\"add_item\",\"menu_id\":\"xxx\"}"
        }
      }]
    }
  }]
}
```

## Deployment

### Vercel

```bash
npm i -g vercel
vercel --prod
```

Set environment variables in Vercel Dashboard.

### Railway

1. Connect GitHub repo
2. Add PostgreSQL plugin
3. Set environment variables

## Project Structure

```
line-pos-system/
├── src/
│   ├── db/
│   │   ├── index.js        # PostgreSQL connection
│   │   └── schema.sql      # Database schema
│   ├── routes/
│   │   └── webhook.js      # LINE webhook handler
│   ├── services/
│   │   ├── lineService.js  # Flex Messages + LINE API
│   │   └── orderService.js # Business logic
│   └── server.js           # Express entry point
├── .env.example
├── package.json
└── README.md
```

## License

MIT

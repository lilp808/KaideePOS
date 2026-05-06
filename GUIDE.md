# 📘 คู่มือระบบ LINE POS - ฉบับละเอียด

## 🎯 ภาพรวมระบบ

**LINE POS System** คือระบบ Point of Sale (POS) ที่ทำงานผ่านแอป LINE โดยไม่ต้องติดตั้งแอปเพิ่ม ลูกค้าสามารถสั่งซื้อสินค้า ดูเมนู และชำระเงินผ่านการแชทใน LINE Official Account (OA)

### ✨ จุดเด่นของระบบ

- **ไม่ใช้ AI/NLP**: ลดความซับซ้อน ควบคุมได้ 100%
- **Button-based UI**: ลูกค้ากดปุ่มแทนพิมพ์ข้อความ
- **Real-time Cart**: ตะกร้าสินค้าอัพเดทแบบ real-time
- **Session Management**: จำสถานะตะกร้าได้แม้ปิดแอป
- **Auto Onboarding**: ผู้ใช้ใหม่ได้เมนูเริ่มต้นอัตโนมัติ

---

## 🏗️ สถาปัตยกรรมระบบ

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   ลูกค้า LINE    │────▶│  LINE Messaging  │────▶│  Vercel Server  │
│   (กดปุ่ม)       │     │     API          │     │   less Func     │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
                                                            │
                                                            ▼
                                                   ┌─────────────────┐
                                                   │   Supabase      │
                                                   │   PostgreSQL    │
                                                   └─────────────────┘
```

### 🔧 Technology Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Node.js + Vercel Serverless Functions |
| **Database** | PostgreSQL (Supabase) |
| **LINE API** | REST API via Axios |
| **Hosting** | Vercel (Global CDN) |
| **Security** | HMAC-SHA256 Signature Verification |

---

## 📱 ฟีเจอร์หลัก

### 1. 🎉 Follow Event (เพิ่มเพื่อน)

เมื่อลูกค้ากด "เพิ่มเพื่อน" ใน LINE OA:

```
[ระบบสร้าง User ใหม่]
        ↓
[ส่ง Flex Message ยินดีต้อนรับ]
        ↓
[Seed เมนูเริ่มต้น 5 รายการ]
        ↓
[แสดงเมนูให้ลูกค้า]
```

**เมนูเริ่มต้นที่ได้:**
- ชานมไข่มุก - 25 บาท
- ชาเขียวนม - 25 บาท
- กาแฟเย็น - 30 บาท
- โกโก้ - 30 บาท
- น้ำส้มคั้น - 35 บาท

---

### 2. 🛒 Shopping Flow (กระบวนการสั่งซื้อ)

```
┌─────────────┐
│  แสดงเมนู   │
│  (Carousel) │
└──────┬──────┘
       │ กด "เพิ่ม"
       ▼
┌─────────────┐
│  ใส่ตะกร้า   │
└──────┬──────┘
       │
       ▼
┌─────────────┐     ┌─────────────┐
│ แสดงตะกร้า  │◄────│ กด +/-      │
│  (อัพเดท)   │     │ แก้ไขจำนวน  │
└──────┬──────┘     └─────────────┘
       │ กด "จ่ายเงิน"
       ▼
┌─────────────┐
│  บันทึกออเดอร์│
│  ปิด session │
└─────────────┘
```

---

### 3. 📊 Daily Summary (สรุปยอดขาย)

พิมพ์ **"ยอดวันนี้"** ในแชท:

```
📊 สรุปยอดขายวันนี้
━━━━━━━━━━━━━━━━
ยอดขายรวม:     1,250 บาท
จำนวนออเดอร์:   8 ออเดอร์
สินค้าขายดี:    ชานมไข่มุก (15 รายการ)
```

---

## 💾 โครงสร้างฐานข้อมูล

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│    users     │         │    menus     │         │order_sessions│
├──────────────┤         ├──────────────┤         ├──────────────┤
│ id (PK)      │◄────────│ user_id (FK) │         │ id (PK)      │
│ line_user_id │         │ name         │         │ user_id (FK) │◄─┐
│ created_at   │         │ price        │         │ status       │  │
└──────────────┘         │ is_active    │         │ total        │  │
                         │ created_at   │         │ created_at   │  │
                         └──────────────┘         └──────────────┘  │
                                                          │       │
                           ┌──────────────┐              │       │
                           │ order_items  │◄─────────────┘       │
                           ├──────────────┤                        │
                           │ id (PK)      │                        │
                           │ session_id   │◄───────────────────────┘
                           │ menu_id (FK) │
                           │ qty          │
                           │ unit_price   │
                           │ created_at   │
                           └──────────────┘
                                    │
                                    ▼
                           ┌──────────────┐
                           │    orders    │
                           ├──────────────┤
                           │ id (PK)      │
                           │ user_id (FK) │
                           │ total        │
                           │ created_at   │
                           └──────────────┘
```

### ตารางรายละเอียด

#### `users` - ข้อมูลผู้ใช้
| ฟิลด์ | ประเภท | คำอธิบาย |
|-------|--------|---------|
| `id` | UUID | Primary key |
| `line_user_id` | TEXT | LINE user ID (Uxxxxxxxx) |
| `created_at` | TIMESTAMP | เวลาสร้าง |

#### `menus` - เมนูสินค้า
| ฟิลด์ | ประเภท | คำอธิบาย |
|-------|--------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id |
| `name` | TEXT | ชื่อสินค้า |
| `price` | INTEGER | ราคา (บาท) |
| `is_active` | BOOLEAN | เปิด/ปิด การแสดง |
| `created_at` | TIMESTAMP | เวลาสร้าง |

#### `order_sessions` - เซสชั่นการสั่งซื้อ
| ฟิลด์ | ประเภท | คำอธิบาย |
|-------|--------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id |
| `status` | ENUM | `open` หรือ `closed` |
| `total` | INTEGER | ยอดรวม (บาท) |
| `created_at` | TIMESTAMP | เวลาสร้าง |

**Logic:**
- `open` = กำลังสั่งซื้อ (ตะกร้ายังไม่ปิด)
- `closed` = สั่งซื้อเสร็จแล้ว
- 1 user มีได้แค่ 1 `open` session ต่อครั้ง

#### `order_items` - รายการในตะกร้า
| ฟิลด์ | ประเภท | คำอธิบาย |
|-------|--------|---------|
| `id` | UUID | Primary key |
| `session_id` | UUID | FK → order_sessions.id |
| `menu_id` | UUID | FK → menus.id |
| `qty` | INTEGER | จำนวน |
| `unit_price` | INTEGER | ราคาต่อหน่วย |
| `created_at` | TIMESTAMP | เวลาสร้าง |

#### `orders` - บันทึกออเดอร์สำเร็จ
| ฟิลด์ | ประเภท | คำอธิบาย |
|-------|--------|---------|
| `id` | UUID | Primary key |
| `user_id` | UUID | FK → users.id |
| `total` | INTEGER | ยอดรวม |
| `created_at` | TIMESTAMP | เวลาสั่งซื้อ |

---

## 🔄 กระบวนการทำงาน (State Machine)

```
                    ┌─────────────┐
                    │   START     │
                    │ (กดเพิ่ม   │
                    │  เพื่อน)    │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  CREATE USER │
                    │  SEED MENUS  │
                    └──────┬──────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                      IDLE STATE                         │
│              (รอลูกค้ากดปุ่มหรือพิมพ์)                   │
└────────────────────────┬────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ADD ITEM  │    │ ADJUST   │    │ CHECKOUT │
   │(เพิ่ม     │    │  QTY     │    │ (จ่าย    │
   │สินค้า)   │    │(+/-)     │    │ เงิน)    │
   └────┬─────┘    └────┬─────┘    └────┬─────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │  UPDATE SESSION │
              │  UPDATE ITEMS   │
              └────────┬────────┘
                       │
                       ▼
              ┌─────────────────┐
              │  SHOW UPDATED   │
              │     CART        │
              └─────────────────┘
```

---

## 🔒 ความปลอดภัย

### 1. Signature Verification (X-Line-Signature)

ทุก request จาก LINE จะมี header `x-line-signature` ที่สร้างจาก HMAC-SHA256:

```javascript
const hash = crypto
  .createHmac('sha256', CHANNEL_SECRET)
  .update(rawBody)
  .digest('base64');

if (hash !== signature) → Reject request (401)
```

**สิ่งที่ป้องกัน:**
- Fake requests จาก attacker
- Replay attacks
- Man-in-the-middle

### 2. Environment Variables

| ตัวแปร | ใช้ทำอะไร | ความสำคัญ |
|--------|-----------|-----------|
| `LINE_CHANNEL_ACCESS_TOKEN` | ส่งข้อความกลับ LINE | 🔴 สูง |
| `LINE_CHANNEL_SECRET` | Verify webhook signature | 🔴 สูง |
| `DATABASE_URL` | เชื่อมต่อ PostgreSQL | 🔴 สูง |

**ห้าม commit ลง git!** (อยู่ใน `.gitignore`)

---

## 📡 API Endpoints

### 1. Webhook Endpoint (หลัก)

```
POST /api/webhook
Headers:
  Content-Type: application/json
  X-Line-Signature: <hmac-signature>

Body:
{
  "events": [
    {
      "type": "follow|message|postback",
      "source": { "userId": "Uxxx", "type": "user" },
      "replyToken": "xxx",
      "message|postback": { ... }
    }
  ]
}

Response: 200 OK (ทันที)
```

### 2. Health Check

```
GET /

Response:
{
  "status": "OK",
  "service": "LINE POS System (Vercel Serverless)",
  "timestamp": "2026-05-06T06:41:51.351Z",
  "version": "2.0.0"
}
```

---

## 🎨 Flex Message ในระบบ

ระบบใช้ **Flex Message** ของ LINE ทั้งหมด 4 แบบ:

### 1. Welcome Message (ต้อนรับ)
- แสดงเมื่อเพิ่มเพื่อนใหม่
- มีวิธีใช้งานคร่าวๆ

### 2. Menu Carousel (เมนูสินค้า)
- แสดงสินค้าเป็น card แนวนอน
- มีปุ่ม "เพิ่ม" ใต้แต่ละรายการ

### 3. Order Summary (ตะกร้าสินค้า)
- แสดงรายการ + จำนวน + ราคา
- ปุ่ม +/- สำหรับแก้ไข
- ปุ่ม "จ่ายเงิน" สีเขียว

### 4. Daily Summary (สรุปยอด)
- แสดงยอดขายวันนี้
- จำนวนออเดอร์
- สินค้าขายดี

---

## 🚀 การ Deploy

### Prerequisites

1. GitHub account
2. Vercel account (ฟรี)
3. LINE Developers account
4. Supabase account (ฟรี)

### Step-by-Step Deployment

#### Step 1: Database Setup

1. ไปที่ [Supabase](https://supabase.com)
2. สร้าง Project ใหม่
3. ไปที่ SQL Editor
4. Run SQL จากไฟล์ `src/db/schema.sql`
5. ไปที่ Settings → Database → กด "Show password" → Copy Connection String

#### Step 2: LINE Channel Setup

1. ไปที่ [LINE Developers](https://developers.line.biz)
2. สร้าง Provider → Create Channel → Messaging API
3. Copy:
   - Channel Access Token (Long-lived)
   - Channel Secret
4. ไปที่ Messaging API → Webhook URL (ใส่ทีหลัง)

#### Step 3: Deploy to Vercel

1. Push code ขึ้น GitHub
2. ไปที่ [Vercel Dashboard](https://vercel.com)
3. Add New Project → Import from GitHub
4. Select โปรเจคนี้
5. **Framework Preset**: Other
6. Environment Variables:
   ```
   LINE_CHANNEL_ACCESS_TOKEN=xxx
   LINE_CHANNEL_SECRET=xxx
   DATABASE_URL=postgresql://...
   ```
7. Deploy

#### Step 4: Configure LINE Webhook

1. เอา URL จาก Vercel: `https://your-project.vercel.app/api/webhook`
2. ไปที่ LINE Developers → Messaging API
3. Webhook URL: ใส่ URL ข้างบน
4. Enable Webhook: **ON**
5. กด **Verify** แล้ว **Update**

---

## 🧪 การทดสอบ

### Test ผ่าน curl

```bash
# Test health check
curl https://your-project.vercel.app/

# Test webhook (จะได้ 401 เพราะไม่มี signature)
curl -X POST https://your-project.vercel.app/api/webhook \
  -H "Content-Type: application/json" \
  -d '{"events":[]}'

# Test with valid signature (ต้องมี CHANNEL_SECRET)
# ... ใช้ LINE SDK หรือสร้าง signature เอง
```

### Test บน LINE

1. เพิ่มเพื่อน LINE OA
2. ควรได้รับข้อความต้อนรับ + เมนู
3. กด "เพิ่ม" สินค้า
4. กด +/- แก้ไขจำนวน
5. กด "จ่ายเงิน"
6. พิมพ์ "ยอดวันนี้" → ดูสรุป

---

## 🐛 แก้ไขปัญหาเบื้องต้น

### ปัญหา: Webhook verification failed

**สาเหตุ:** Signature ไม่ตรง
- ตรวจสอบ `LINE_CHANNEL_SECRET` ตรงกับ LINE Console
- ตรวจสอบ webhook URL ถูกต้อง

### ปัญหา: Database connection error

**สาเหตุ:**
- Connection string ผิด
- Supabase ไม่ allow connection
- Password ผิด

**แก้ไข:**
```bash
# Test connection
psql "your-connection-string"
```

### ปัญหา: ส่งข้อความไม่ได้

**สาเหตุ:** `LINE_CHANNEL_ACCESS_TOKEN` หมดอายุ

**แก้ไข:**
1. LINE Developers → Channel → Messaging API
2. กด Issue → Copy new token
3. Update ใน Vercel Dashboard

### ปัญหา: ฟังก์ชันทำงานช้า (timeout)

Vercel Functions มี limit:
- Hobby plan: 10 seconds
- Pro plan: 30 seconds

**แก้ไข:**
- Database queries ควรจบใน 1-2 วินาที
- ใช้ indexing ถ้าข้อมูลเยอะ

---

## 📈 การพัฒนาต่อยอด

### ไอเดีย Feature ใหม่

1. **Payment Integration** - เชื่อม PromptPay/QR Code
2. **Multi-language** - รองรับ English/Thai
3. **Admin Dashboard** - ดูยอดขายแบบ realtime
4. **Inventory** - จำกัดจำนวนสินค้า
5. **Promotions** - โค้ดส่วนลด
6. **Order History** - ดูประวัติการสั่งซื้อ

### การ Scale

- Vercel auto-scales ตาม traffic
- Supabase free tier: 500MB, 2M requests/month
- ถ้า user มาก: upgrade เป็น Pro plan

---

## 📞 ติดต่อสอบถาม

หากมีปัญหาหรือต้องการพัฒนาเพิ่มเติม:

1. ดู logs ใน Vercel Dashboard → Functions
2. ตรวจสอบ LINE API Documentation
3. ตรวจสอบ Supabase Status

---

## 📚 References

- [LINE Messaging API Docs](https://developers.line.biz/en/docs/messaging-api/)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [Flex Message Simulator](https://developers.line.biz/flex-simulator/)

---

**Version**: 2.0.0 (Serverless)  
**Last Updated**: May 2026  
**Author**: AI Engineer @ AT SOKO Company

# LINE LIFF + Webhook Setup Guide

## 📱 Current URLs

- **Webhook URL**: `https://kaidee-pos.vercel.app/api/webhook`
- **LIFF App URL**: `https://kaidee-pos.vercel.app/liff`

## 🔧 LINE Developers Console Setup

### 1. Go to LINE Developers Console
Visit: https://developers.line.biz/

### 2. Select Your Channel
Choose your existing LINE Bot channel

### 3. Configure Webhook
Go to **Messaging API** tab:

1. **Webhook URL**: Set to
   ```
   https://kaidee-pos.vercel.app/api/webhook
   ```

2. **Use webhook**: Enable ✅
3. **Verify**: Click "Verify" to test connection

### 4. Create LIFF App
Go to **LIFF** tab:

1. **Add LIFF App**: Click "Add"
2. **LIFF App Settings**:
   - **LIFF name**: `ร้านค้า POS`
   - **LIFF URL**: `https://kaidee-pos.vercel.app/liff`
   - **Scope**: `profile`
   - **Bot link**: Link to your existing bot

3. **Save**: Click "Add" to create

### 5. Get LIFF ID
After creating LIFF app, you'll see:
```
LIFF ID: 1657xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 6. Set Environment Variable
Add to your Vercel project:
```
NEXT_PUBLIC_LIFF_ID=1657xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## 📱 Rich Menu Setup

Create LINE Rich Menu to open LIFF:

### Menu Structure
```
├── 🏪 เปิดร้านค้า (LIFF)
├── 📋 จัดการเมนู
├── 📊 ดูยอดขาย
└── ❓ ช่วยเหลือ
```

### Rich Menu JSON
```json
{
  "size": "sm",
  "selected": "true",
  "areas": [
    {
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 250,
        "height": 168
      },
      "action": {
        "type": "uri",
        "uri": "line://app/1657xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
      }
    }
  ]
}
```

## 🔄 Complete Flow

### User Experience
1. **User adds bot** → Gets welcome message
2. **User opens Rich Menu** → Taps "🏪 เปิดร้านค้า"
3. **LIFF opens** → Auto-login with LINE profile
4. **Dashboard loads** → User can manage menu, view sales
5. **Seamless sync** → Changes reflect in LINE chat

### Technical Flow
```
LINE Chat Bot ←→ Supabase Database ←→ LIFF Web App
     ↓                    ↓                    ↓
  Webhook              API Endpoints         LIFF SDK
```

## 🚀 Deployment Commands

### Update LIFF ID
```bash
# Set LIFF ID in Vercel
vercel env add NEXT_PUBLIC_LIFF_ID=1657xxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Redeploy
vercel --prod
```

### Verify Setup
1. Test webhook: Send message to bot
2. Test LIFF: Open Rich Menu → Tap "เปิดร้านค้า"
3. Check both work correctly

## 📞 Troubleshooting

### Webhook Issues
- Check Vercel logs for errors
- Verify webhook URL is correct
- Ensure LINE Channel Secret matches

### LIFF Issues
- Check LIFF ID is set correctly
- Verify LIFF URL is accessible
- Check browser console for errors

### Common Issues
- **CORS**: Ensure LIFF URL is HTTPS
- **Environment**: Check NEXT_PUBLIC_LIFF_ID is set
- **Permissions**: Verify LIFF scope includes `profile`

## ✅ Success Checklist

- [ ] Webhook URL configured and verified
- [ ] LIFF app created with correct URL
- [ ] NEXT_PUBLIC_LIFF_ID set in Vercel
- [ ] Rich menu configured with LIFF link
- [ ] Bot and LIFF both working
- [ ] Database sync working between both systems

Once complete, you'll have a fully integrated LINE POS system!

const getRawBody = require('raw-body');
const crypto = require('crypto');
const axios = require('axios');
const orderService = require('../src/services/orderService');

// Disable body parsing to get raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};

const LINE_CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LINE_CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;

// ============================================
// LINE API Helper
// ============================================

async function lineApiRequest(method, endpoint, data = null) {
  const url = `https://api.line.me/v2/bot${endpoint}`;
  const headers = {
    'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  };

  try {
    const response = await axios({
      method,
      url,
      headers,
      data,
      timeout: 10000,
    });
    return response.data;
  } catch (error) {
    console.error(`LINE API Error (${endpoint}):`, error.response?.data || error.message);
    throw error;
  }
}

async function replyMessage(replyToken, messages) {
  const msgArray = Array.isArray(messages) ? messages : [messages];
  return lineApiRequest('post', '/message/reply', {
    replyToken,
    messages: msgArray,
  });
}

async function pushMessage(userId, messages) {
  const msgArray = Array.isArray(messages) ? messages : [messages];
  return lineApiRequest('post', '/message/push', {
    to: userId,
    messages: msgArray,
  });
}

// ============================================
// Signature Verification
// ============================================

function verifySignature(body, signature) {
  if (!LINE_CHANNEL_SECRET) {
    console.error('LINE_CHANNEL_SECRET not set');
    return false;
  }
  
  const hash = crypto
    .createHmac('sha256', LINE_CHANNEL_SECRET)
    .update(body)
    .digest('base64');
  
  return hash === signature;
}

// ============================================
// Flex Message Builders (from lineService)
// ============================================

function buildMenuFlexMessage(menus) {
  const bubbles = menus.map(menu => ({
    type: 'bubble',
    size: 'micro',
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: menu.name,
          weight: 'bold',
          size: 'md',
          align: 'center'
        },
        {
          type: 'text',
          text: `${menu.price} บาท`,
          size: 'sm',
          color: '#666666',
          align: 'center',
          margin: 'sm'
        }
      ],
      spacing: 'sm',
      paddingAll: '10px'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          style: 'primary',
          action: {
            type: 'postback',
            label: 'เพิ่ม',
            data: JSON.stringify({
              action: 'add_item',
              menu_id: menu.id
            }),
            displayText: `เพิ่ม ${menu.name}`
          },
          height: 'sm'
        }
      ],
      paddingAll: '0px'
    }
  }));

  return {
    type: 'flex',
    altText: 'เมนูร้านค้า',
    contents: {
      type: 'carousel',
      contents: bubbles.length > 0 ? bubbles : [{
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'ไม่มีเมนู',
              align: 'center'
            }
          ]
        }
      }]
    }
  };
}

function buildOrderSummaryFlexMessage(items, total, sessionId) {
  if (items.length === 0) {
    return {
      type: 'flex',
      altText: 'ตะกร้าสินค้าว่าง',
      contents: {
        type: 'bubble',
        body: {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'ตะกร้าสินค้าว่าง',
              weight: 'bold',
              size: 'lg',
              align: 'center'
            },
            {
              type: 'text',
              text: 'เลือกสินค้าจากเมนูด้านล่าง',
              size: 'sm',
              color: '#666666',
              align: 'center',
              margin: 'md'
            }
          ]
        }
      }
    };
  }

  const itemContents = items.flatMap(item => [
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: item.name,
          size: 'sm',
          flex: 3
        },
        {
          type: 'text',
          text: `x${item.qty}`,
          size: 'sm',
          flex: 1,
          align: 'center'
        },
        {
          type: 'text',
          text: `${item.qty * item.unit_price} บาท`,
          size: 'sm',
          flex: 2,
          align: 'right'
        }
      ]
    },
    {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'button',
          style: 'secondary',
          height: 'sm',
          action: {
            type: 'postback',
            label: '-',
            data: JSON.stringify({
              action: 'decrease_qty',
              menu_id: item.menu_id,
              session_id: sessionId
            })
          },
          margin: 'none'
        },
        {
          type: 'button',
          style: 'primary',
          height: 'sm',
          action: {
            type: 'postback',
            label: '+',
            data: JSON.stringify({
              action: 'increase_qty',
              menu_id: item.menu_id,
              session_id: sessionId
            })
          },
          margin: 'sm'
        }
      ],
      margin: 'sm',
      spacing: 'sm'
    },
    {
      type: 'separator',
      margin: 'md'
    }
  ]);

  return {
    type: 'flex',
    altText: 'สรุปรายการสั่งซื้อ',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'รายการสั่งซื้อ',
            weight: 'bold',
            size: 'lg',
            align: 'center'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: itemContents
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'รวมทั้งหมด',
                weight: 'bold',
                size: 'md'
              },
              {
                type: 'text',
                text: `${total} บาท`,
                weight: 'bold',
                size: 'lg',
                align: 'right',
                color: '#00B900'
              }
            ],
            margin: 'md'
          },
          {
            type: 'button',
            style: 'primary',
            action: {
              type: 'postback',
              label: 'จ่ายเงิน',
              data: JSON.stringify({
                action: 'checkout',
                session_id: sessionId
              }),
              displayText: 'จ่ายเงิน'
            },
            color: '#00B900',
            height: 'md'
          }
        ]
      }
    }
  };
}

function buildWelcomeMessage() {
  return {
    type: 'flex',
    altText: 'ยินดีต้อนรับสู่ระบบ POS',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: 'ยินดีต้อนรับ! 🎉',
            weight: 'bold',
            size: 'xl',
            align: 'center'
          },
          {
            type: 'text',
            text: 'ระบบ POS ร้านค้าของคุณพร้อมใช้งานแล้ว',
            size: 'sm',
            color: '#666666',
            align: 'center',
            margin: 'md',
            wrap: true
          },
          {
            type: 'separator',
            margin: 'lg'
          },
          {
            type: 'text',
            text: 'วิธีใช้งาน:',
            weight: 'bold',
            size: 'md',
            margin: 'lg'
          },
          {
            type: 'text',
            text: '• แตะปุ่มเมนูเพื่อเพิ่มสินค้า\n• ใช้ +/- แก้ไขจำนวน\n• แตะ จ่ายเงิน เมื่อสั่งเสร็จ\n• พิมพ์ "ยอดวันนี้" เพื่อดูสรุป',
            size: 'sm',
            color: '#666666',
            margin: 'sm',
            wrap: true
          }
        ]
      }
    }
  };
}

function buildDailySummaryMessage({ totalSales, orderCount, topItem }) {
  const topItemText = topItem 
    ? `${topItem.name} (${topItem.qty} รายการ)`
    : 'ไม่มีข้อมูล';

  return {
    type: 'flex',
    altText: 'สรุปยอดขายวันนี้',
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '📊 สรุปยอดขายวันนี้',
            weight: 'bold',
            size: 'lg',
            align: 'center'
          }
        ]
      },
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'ยอดขายรวม',
                size: 'md',
                flex: 2
              },
              {
                type: 'text',
                text: `${totalSales} บาท`,
                size: 'lg',
                weight: 'bold',
                flex: 3,
                align: 'right',
                color: '#00B900'
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: 'จำนวนออเดอร์',
                size: 'md',
                flex: 2
              },
              {
                type: 'text',
                text: `${orderCount} ออเดอร์`,
                size: 'md',
                flex: 3,
                align: 'right'
              }
            ]
          },
          {
            type: 'separator'
          },
          {
            type: 'box',
            layout: 'vertical',
            contents: [
              {
                type: 'text',
                text: 'สินค้าขายดี',
                size: 'md'
              },
              {
                type: 'text',
                text: topItemText,
                size: 'sm',
                color: '#666666',
                margin: 'sm'
              }
            ]
          }
        ]
      }
    }
  };
}

function buildCheckoutCompleteMessage(orderTotal) {
  return {
    type: 'flex',
    altText: 'สั่งซื้อสำเร็จ',
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'text',
            text: '✅ สั่งซื้อสำเร็จ',
            weight: 'bold',
            size: 'xl',
            align: 'center',
            color: '#00B900'
          },
          {
            type: 'text',
            text: `ยอดรวม: ${orderTotal} บาท`,
            size: 'md',
            align: 'center',
            margin: 'md'
          },
          {
            type: 'text',
            text: 'ขอบคุณที่ใช้บริการ!',
            size: 'sm',
            color: '#666666',
            align: 'center',
            margin: 'sm'
          }
        ]
      }
    }
  };
}

// ============================================
// Event Handlers
// ============================================

async function handleFollow(event) {
  const lineUserId = event.source.userId;
  
  try {
    const { userId, isNew } = await orderService.findOrCreateUser(lineUserId);
    
    if (isNew) {
      console.log(`[FOLLOW] New user created: ${lineUserId}`);
    } else {
      console.log(`[FOLLOW] Existing user re-followed: ${lineUserId}`);
    }
    
    // Send welcome message on every follow (including block/unblock)
    const welcomeMsg = buildWelcomeMessage();
    await replyMessage(event.replyToken, welcomeMsg);
    
    // Send menu
    const menus = await orderService.getUserMenus(userId);
    const menuMsg = buildMenuFlexMessage(menus);
    await pushMessage(lineUserId, menuMsg);
  } catch (error) {
    console.error('[FOLLOW] Error:', error);
    throw error;
  }
}

async function handleMessage(event) {
  const lineUserId = event.source.userId;
  const text = event.message.text.trim();
  
  try {
    // Check for "ยอดวันนี้" command
    if (text === 'ยอดวันนี้') {
      const userId = await orderService.getUserByLineId(lineUserId);
      
      if (!userId) {
        await replyMessage(event.replyToken, {
          type: 'text',
          text: 'กรุณาเพิ่มเพื่อนก่อนใช้งานระบบ'
        });
        return;
      }
      
      const summary = await orderService.getDailySummary(userId);
      const summaryMsg = buildDailySummaryMessage(summary);
      await replyMessage(event.replyToken, summaryMsg);
      return;
    }
    
    // Default: show menu and current cart
    let userId = await orderService.getUserByLineId(lineUserId);
    if (!userId) {
      const result = await orderService.findOrCreateUser(lineUserId);
      userId = result.userId;
    }
    
    const { sessionId } = await orderService.getOrCreateActiveSession(userId);
    const items = await orderService.getSessionItems(sessionId);
    
    const menus = await orderService.getUserMenus(userId);
    const menuMsg = buildMenuFlexMessage(menus);
    
    const total = items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
    const summaryMsg = buildOrderSummaryFlexMessage(items, total, sessionId);
    
    await replyMessage(event.replyToken, [summaryMsg, menuMsg]);
    
  } catch (error) {
    console.error('[MESSAGE] Error:', error);
    throw error;
  }
}

async function handlePostback(event) {
  const lineUserId = event.source.userId;
  const data = JSON.parse(event.postback.data);
  const { action } = data;
  
  try {
    const userId = await orderService.getUserByLineId(lineUserId);
    
    if (!userId) {
      await replyMessage(event.replyToken, {
        type: 'text',
        text: 'กรุณาเพิ่มเพื่อนก่อนใช้งานระบบ'
      });
      return;
    }
    
    const { sessionId } = await orderService.getOrCreateActiveSession(userId);
    
    switch (action) {
      case 'add_item':
        await handleAddItem(event.replyToken, sessionId, data.menu_id, userId);
        break;
        
      case 'increase_qty':
        await handleIncreaseQty(event.replyToken, sessionId, data.menu_id, userId);
        break;
        
      case 'decrease_qty':
        await handleDecreaseQty(event.replyToken, sessionId, data.menu_id, userId);
        break;
        
      case 'checkout':
        await handleCheckout(event.replyToken, sessionId, userId, lineUserId);
        break;
        
      default:
        console.log(`[POSTBACK] Unknown action: ${action}`);
    }
  } catch (error) {
    console.error('[POSTBACK] Error:', error);
    await replyMessage(event.replyToken, {
      type: 'text',
      text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
    });
  }
}

async function handleAddItem(replyToken, sessionId, menuId, userId) {
  const result = await orderService.addItemToSession(sessionId, menuId);
  const items = await orderService.getSessionItems(sessionId);
  const menu = await orderService.getMenuById(menuId);
  
  const summaryMsg = buildOrderSummaryFlexMessage(items, result.total, sessionId);
  const confirmMsg = {
    type: 'text',
    text: `เพิ่ม ${menu.name} ในตะกร้าแล้ว`
  };
  
  await replyMessage(replyToken, [confirmMsg, summaryMsg]);
}

async function handleIncreaseQty(replyToken, sessionId, menuId, userId) {
  const result = await orderService.increaseItemQty(sessionId, menuId);
  const items = await orderService.getSessionItems(sessionId);
  
  const summaryMsg = buildOrderSummaryFlexMessage(items, result.total, sessionId);
  await replyMessage(replyToken, summaryMsg);
}

async function handleDecreaseQty(replyToken, sessionId, menuId, userId) {
  const result = await orderService.decreaseItemQty(sessionId, menuId);
  const items = await orderService.getSessionItems(sessionId);
  
  const summaryMsg = buildOrderSummaryFlexMessage(items, result.total, sessionId);
  await replyMessage(replyToken, summaryMsg);
}

async function handleCheckout(replyToken, sessionId, userId, lineUserId) {
  const checkout = await orderService.checkoutSession(sessionId, userId);
  
  if (!checkout.success) {
    await replyMessage(replyToken, {
      type: 'text',
      text: 'ไม่สามารถชำระเงินได้ ตะกร้าว่างเปล่า'
    });
    return;
  }
  
  const completeMsg = buildCheckoutCompleteMessage(checkout.total);
  await replyMessage(replyToken, completeMsg);
  
  const { sessionId: newSessionId } = await orderService.getOrCreateActiveSession(userId);
  const items = await orderService.getSessionItems(newSessionId);
  const summaryMsg = buildOrderSummaryFlexMessage(items, 0, newSessionId);
  
  await pushMessage(lineUserId, summaryMsg);
}

// ============================================
// Main Handler
// ============================================

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Validate environment variables
  if (!LINE_CHANNEL_ACCESS_TOKEN || !LINE_CHANNEL_SECRET) {
    console.error('[WEBHOOK] Missing environment variables');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // Get raw body for signature verification
    const rawBody = await getRawBody(req, {
      length: req.headers['content-length'],
      limit: '1mb',
      encoding: 'utf8',
    });

    // Verify signature
    const signature = req.headers['x-line-signature'];
    if (!signature || !verifySignature(rawBody, signature)) {
      console.error('[WEBHOOK] Invalid signature');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Parse JSON body
    const body = JSON.parse(rawBody);
    const events = body.events || [];

    console.log(`[WEBHOOK] Received ${events.length} events`);

    // Respond immediately to LINE (200 OK)
    res.status(200).end();

    // Process events asynchronously
    for (const event of events) {
      // Fire and forget - don't block response
      (async () => {
        try {
          console.log(`[WEBHOOK] Processing ${event.type} event from ${event.source?.userId}`);
          
          switch (event.type) {
            case 'follow':
              await handleFollow(event);
              break;
              
            case 'message':
              if (event.message?.type === 'text') {
                await handleMessage(event);
              }
              break;
              
            case 'postback':
              await handlePostback(event);
              break;
              
            default:
              console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
          }
        } catch (error) {
          console.error(`[WEBHOOK] Error processing ${event.type}:`, error);
        }
      })();
    }

  } catch (error) {
    console.error('[WEBHOOK] Fatal error:', error);
    // If headers not sent, send error response
    if (!res.headersSent) {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

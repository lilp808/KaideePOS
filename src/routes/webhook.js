const express = require('express');
const { middleware } = require('@line/bot-sdk');
const lineService = require('../services/lineService');
const orderService = require('../services/orderService');

const router = express.Router();

// LINE SDK middleware configuration
const lineConfig = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
};

// ============================================
// Middleware
// ============================================

// Apply LINE SDK middleware for signature verification
router.use(middleware(lineConfig));

// ============================================
// Event Handlers
// ============================================

/**
 * Handle follow event - new user adds LINE OA
 */
async function handleFollow(event) {
    const lineUserId = event.source.userId;
    
    try {
        // Create user and seed default menu
        const { userId, isNew } = await orderService.findOrCreateUser(lineUserId);
        
        if (isNew) {
            console.log(`New user created: ${lineUserId}`);
            
            // Send welcome message
            const welcomeMsg = lineService.buildWelcomeMessage();
            await lineService.replyMessage(event.replyToken, welcomeMsg);
            
            // Get and send menu
            const menus = await orderService.getUserMenus(userId);
            const menuMsg = lineService.buildMenuFlexMessage(menus);
            await lineService.pushMessage(lineUserId, menuMsg);
        }
    } catch (error) {
        console.error('Error handling follow event:', error);
        throw error;
    }
}

/**
 * Handle message event - text commands
 */
async function handleMessage(event) {
    const lineUserId = event.source.userId;
    const text = event.message.text.trim();
    
    try {
        // Check for "ยอดวันนี้" command
        if (text === 'ยอดวันนี้') {
            const userId = await orderService.getUserByLineId(lineUserId);
            
            if (!userId) {
                await lineService.replyMessage(event.replyToken, {
                    type: 'text',
                    text: 'กรุณาเพิ่มเพื่อนก่อนใช้งานระบบ'
                });
                return;
            }
            
            const summary = await orderService.getDailySummary(userId);
            const summaryMsg = lineService.buildDailySummaryMessage(summary);
            await lineService.replyMessage(event.replyToken, summaryMsg);
            return;
        }
        
        // Default: show menu and current cart
        const userId = await orderService.getUserByLineId(lineUserId);
        if (!userId) {
            await orderService.findOrCreateUser(lineUserId);
        }
        
        const finalUserId = await orderService.getUserByLineId(lineUserId);
        
        // Get current session and items
        const { sessionId } = await orderService.getOrCreateActiveSession(finalUserId);
        const items = await orderService.getSessionItems(sessionId);
        
        // Send menu
        const menus = await orderService.getUserMenus(finalUserId);
        const menuMsg = lineService.buildMenuFlexMessage(menus);
        
        // Send order summary
        const total = items.reduce((sum, item) => sum + (item.qty * item.unit_price), 0);
        const summaryMsg = lineService.buildOrderSummaryFlexMessage(items, total, sessionId);
        
        await lineService.replyMessage(event.replyToken, [summaryMsg, menuMsg]);
        
    } catch (error) {
        console.error('Error handling message event:', error);
        throw error;
    }
}

/**
 * Handle postback event - button actions
 */
async function handlePostback(event) {
    const lineUserId = event.source.userId;
    const data = JSON.parse(event.postback.data);
    const { action } = data;
    
    try {
        const userId = await orderService.getUserByLineId(lineUserId);
        
        if (!userId) {
            await lineService.replyMessage(event.replyToken, {
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
                console.log(`Unknown action: ${action}`);
        }
    } catch (error) {
        console.error('Error handling postback event:', error);
        
        // Send error message to user
        await lineService.replyMessage(event.replyToken, {
            type: 'text',
            text: 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง'
        });
    }
}

// ============================================
// Action Handlers
// ============================================

async function handleAddItem(replyToken, sessionId, menuId, userId) {
    // Add item to session
    const result = await orderService.addItemToSession(sessionId, menuId);
    
    // Get updated items and menu info
    const items = await orderService.getSessionItems(sessionId);
    const menu = await orderService.getMenuById(menuId);
    
    // Build updated summary
    const summaryMsg = lineService.buildOrderSummaryFlexMessage(items, result.total, sessionId);
    
    // Send confirmation
    const confirmMsg = {
        type: 'text',
        text: `เพิ่ม ${menu.name} ในตะกร้าแล้ว`
    };
    
    await lineService.replyMessage(replyToken, [confirmMsg, summaryMsg]);
}

async function handleIncreaseQty(replyToken, sessionId, menuId, userId) {
    const result = await orderService.increaseItemQty(sessionId, menuId);
    const items = await orderService.getSessionItems(sessionId);
    
    const summaryMsg = lineService.buildOrderSummaryFlexMessage(items, result.total, sessionId);
    await lineService.replyMessage(replyToken, summaryMsg);
}

async function handleDecreaseQty(replyToken, sessionId, menuId, userId) {
    const result = await orderService.decreaseItemQty(sessionId, menuId);
    const items = await orderService.getSessionItems(sessionId);
    
    const summaryMsg = lineService.buildOrderSummaryFlexMessage(items, result.total, sessionId);
    await lineService.replyMessage(replyToken, summaryMsg);
}

async function handleCheckout(replyToken, sessionId, userId, lineUserId) {
    // Process checkout
    const checkout = await orderService.checkoutSession(sessionId, userId);
    
    if (!checkout.success) {
        await lineService.replyMessage(replyToken, {
            type: 'text',
            text: 'ไม่สามารถชำระเงินได้ ตะกร้าว่างเปล่า'
        });
        return;
    }
    
    // Send completion message
    const completeMsg = lineService.buildCheckoutCompleteMessage(checkout.total);
    await lineService.replyMessage(replyToken, completeMsg);
    
    // Get new session and send updated cart (should be empty)
    const { sessionId: newSessionId } = await orderService.getOrCreateActiveSession(userId);
    const items = await orderService.getSessionItems(newSessionId);
    const summaryMsg = lineService.buildOrderSummaryFlexMessage(items, 0, newSessionId);
    
    await lineService.pushMessage(lineUserId, summaryMsg);
}

// ============================================
// Webhook Endpoint
// ============================================

router.post('/', async (req, res) => {
    const events = req.body.events;
    
    // Respond immediately to LINE
    res.status(200).end();
    
    // Process events asynchronously
    for (const event of events) {
        try {
            switch (event.type) {
                case 'follow':
                    await handleFollow(event);
                    break;
                    
                case 'message':
                    if (event.message.type === 'text') {
                        await handleMessage(event);
                    }
                    break;
                    
                case 'postback':
                    await handlePostback(event);
                    break;
                    
                default:
                    console.log(`Unhandled event type: ${event.type}`);
            }
        } catch (error) {
            console.error(`Error processing ${event.type} event:`, error);
        }
    }
});

module.exports = router;

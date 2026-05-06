const { messagingApi } = require('@line/bot-sdk');
const { MessagingApiClient } = messagingApi;

const client = new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
});

// ============================================
// Flex Message Builders
// ============================================

/**
 * Build menu Flex Message with product buttons
 * @param {Array} menus - Array of menu objects {id, name, price}
 */
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

/**
 * Build order summary Flex Message
 * @param {Array} items - Array of {name, qty, unit_price, menu_id}
 * @param {number} total - Total price
 * @param {string} sessionId - Session ID
 */
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

    // Build item rows
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

/**
 * Build welcome message for new users
 */
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

/**
 * Build daily summary message
 */
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

/**
 * Build checkout complete message
 */
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
// API Functions
// ============================================

async function replyMessage(replyToken, messages) {
    const msgArray = Array.isArray(messages) ? messages : [messages];
    try {
        await client.replyMessage({
            replyToken,
            messages: msgArray
        });
        console.log('Message sent successfully');
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
}

async function pushMessage(userId, messages) {
    const msgArray = Array.isArray(messages) ? messages : [messages];
    try {
        await client.pushMessage({
            to: userId,
            messages: msgArray
        });
        console.log('Push message sent successfully');
    } catch (error) {
        console.error('Error pushing message:', error);
        throw error;
    }
}

module.exports = {
    client,
    replyMessage,
    pushMessage,
    buildMenuFlexMessage,
    buildOrderSummaryFlexMessage,
    buildWelcomeMessage,
    buildDailySummaryMessage,
    buildCheckoutCompleteMessage
};

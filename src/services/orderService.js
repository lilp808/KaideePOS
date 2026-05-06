const db = require('../db');

// ============================================
// User Management
// ============================================

async function findOrCreateUser(lineUserId) {
    // Try to find existing user
    const findQuery = 'SELECT id FROM users WHERE line_user_id = $1';
    const findResult = await db.query(findQuery, [lineUserId]);
    
    if (findResult.rows.length > 0) {
        return { userId: findResult.rows[0].id, isNew: false };
    }
    
    // Create new user (default menu will be seeded via trigger)
    const insertQuery = 'INSERT INTO users (line_user_id) VALUES ($1) RETURNING id';
    const insertResult = await db.query(insertQuery, [lineUserId]);
    
    return { userId: insertResult.rows[0].id, isNew: true };
}

async function getUserByLineId(lineUserId) {
    const query = 'SELECT id FROM users WHERE line_user_id = $1';
    const result = await db.query(query, [lineUserId]);
    return result.rows[0]?.id || null;
}

// ============================================
// Menu Management
// ============================================

async function getUserMenus(userId, activeOnly = true) {
    const query = activeOnly 
        ? 'SELECT id, name, price FROM menus WHERE user_id = $1 AND is_active = true ORDER BY created_at'
        : 'SELECT id, name, price, is_active FROM menus WHERE user_id = $1 ORDER BY created_at';
    const result = await db.query(query, [userId]);
    return result.rows;
}

async function getMenuById(menuId) {
    const query = 'SELECT id, name, price FROM menus WHERE id = $1';
    const result = await db.query(query, [menuId]);
    return result.rows[0] || null;
}

// ============================================
// Session Management
// ============================================

async function getOrCreateActiveSession(userId) {
    // Find existing open session
    const findQuery = `
        SELECT id, total 
        FROM order_sessions 
        WHERE user_id = $1 AND status = 'open'
        LIMIT 1
    `;
    const findResult = await db.query(findQuery, [userId]);
    
    if (findResult.rows.length > 0) {
        return {
            sessionId: findResult.rows[0].id,
            total: findResult.rows[0].total,
            isNew: false
        };
    }
    
    // Create new session
    const insertQuery = `
        INSERT INTO order_sessions (user_id, status, total) 
        VALUES ($1, 'open', 0) 
        RETURNING id, total
    `;
    const insertResult = await db.query(insertQuery, [userId]);
    
    return {
        sessionId: insertResult.rows[0].id,
        total: insertResult.rows[0].total,
        isNew: true
    };
}

async function getSessionItems(sessionId) {
    const query = `
        SELECT 
            oi.menu_id,
            oi.qty,
            oi.unit_price,
            m.name
        FROM order_items oi
        JOIN menus m ON oi.menu_id = m.id
        WHERE oi.session_id = $1
        ORDER BY oi.created_at
    `;
    const result = await db.query(query, [sessionId]);
    return result.rows;
}

// ============================================
// Cart Operations
// ============================================

async function addItemToSession(sessionId, menuId, qty = 1) {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get menu price
        const menuQuery = 'SELECT price FROM menus WHERE id = $1';
        const menuResult = await client.query(menuQuery, [menuId]);
        
        if (menuResult.rows.length === 0) {
            throw new Error('Menu not found');
        }
        
        const unitPrice = menuResult.rows[0].price;
        
        // Check if item already exists in session
        const checkQuery = `
            SELECT id, qty FROM order_items 
            WHERE session_id = $1 AND menu_id = $2
        `;
        const checkResult = await client.query(checkQuery, [sessionId, menuId]);
        
        let itemTotal = qty * unitPrice;
        
        if (checkResult.rows.length > 0) {
            // Update existing item
            const existingId = checkResult.rows[0].id;
            const newQty = checkResult.rows[0].qty + qty;
            
            const updateQuery = `
                UPDATE order_items 
                SET qty = $1, updated_at = NOW()
                WHERE id = $2
            `;
            await client.query(updateQuery, [newQty, existingId]);
        } else {
            // Insert new item
            const insertQuery = `
                INSERT INTO order_items (session_id, menu_id, qty, unit_price)
                VALUES ($1, $2, $3, $4)
            `;
            await client.query(insertQuery, [sessionId, menuId, qty, unitPrice]);
        }
        
        // Update session total
        const updateSessionQuery = `
            UPDATE order_sessions 
            SET total = total + $1, updated_at = NOW()
            WHERE id = $2
            RETURNING total
        `;
        const updateResult = await client.query(updateSessionQuery, [itemTotal, sessionId]);
        
        await client.query('COMMIT');
        
        return { total: updateResult.rows[0].total };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function increaseItemQty(sessionId, menuId) {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get current item
        const getQuery = `
            SELECT id, qty, unit_price 
            FROM order_items 
            WHERE session_id = $1 AND menu_id = $2
        `;
        const getResult = await client.query(getQuery, [sessionId, menuId]);
        
        if (getResult.rows.length === 0) {
            throw new Error('Item not found in session');
        }
        
        const item = getResult.rows[0];
        const newQty = item.qty + 1;
        
        // Update quantity
        const updateItemQuery = `
            UPDATE order_items 
            SET qty = $1, updated_at = NOW()
            WHERE id = $2
        `;
        await client.query(updateItemQuery, [newQty, item.id]);
        
        // Update session total
        const updateSessionQuery = `
            UPDATE order_sessions 
            SET total = total + $1, updated_at = NOW()
            WHERE id = $2
            RETURNING total
        `;
        const updateResult = await client.query(updateSessionQuery, [item.unit_price, sessionId]);
        
        await client.query('COMMIT');
        
        return { total: updateResult.rows[0].total };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function decreaseItemQty(sessionId, menuId) {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get current item
        const getQuery = `
            SELECT id, qty, unit_price 
            FROM order_items 
            WHERE session_id = $1 AND menu_id = $2
        `;
        const getResult = await client.query(getQuery, [sessionId, menuId]);
        
        if (getResult.rows.length === 0) {
            throw new Error('Item not found in session');
        }
        
        const item = getResult.rows[0];
        
        if (item.qty <= 1) {
            // Remove item if qty would become 0
            const deleteQuery = 'DELETE FROM order_items WHERE id = $1';
            await client.query(deleteQuery, [item.id]);
        } else {
            // Decrease quantity
            const newQty = item.qty - 1;
            const updateItemQuery = `
                UPDATE order_items 
                SET qty = $1, updated_at = NOW()
                WHERE id = $2
            `;
            await client.query(updateItemQuery, [newQty, item.id]);
        }
        
        // Update session total
        const updateSessionQuery = `
            UPDATE order_sessions 
            SET total = total - $1, updated_at = NOW()
            WHERE id = $2
            RETURNING total
        `;
        const updateResult = await client.query(updateSessionQuery, [item.unit_price, sessionId]);
        
        await client.query('COMMIT');
        
        return { total: updateResult.rows[0].total };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// ============================================
// Checkout
// ============================================

async function checkoutSession(sessionId, userId) {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Get session details
        const sessionQuery = `
            SELECT total FROM order_sessions 
            WHERE id = $1 AND user_id = $2 AND status = 'open'
        `;
        const sessionResult = await client.query(sessionQuery, [sessionId, userId]);
        
        if (sessionResult.rows.length === 0) {
            throw new Error('Session not found or already closed');
        }
        
        const total = sessionResult.rows[0].total;
        
        if (total === 0) {
            throw new Error('Cannot checkout empty cart');
        }
        
        // Create order record
        const orderQuery = `
            INSERT INTO orders (user_id, total) 
            VALUES ($1, $2) 
            RETURNING id
        `;
        await client.query(orderQuery, [userId, total]);
        
        // Close session
        const closeQuery = `
            UPDATE order_sessions 
            SET status = 'closed', updated_at = NOW()
            WHERE id = $1
        `;
        await client.query(closeQuery, [sessionId]);
        
        // Create new session for next order
        const newSessionQuery = `
            INSERT INTO order_sessions (user_id, status, total)
            VALUES ($1, 'open', 0)
            RETURNING id
        `;
        await client.query(newSessionQuery, [userId]);
        
        await client.query('COMMIT');
        
        return { total, success: true };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

// ============================================
// Daily Summary
// ============================================

async function getDailySummary(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get total sales and order count
    const summaryQuery = `
        SELECT 
            COALESCE(SUM(total), 0) as total_sales,
            COUNT(*) as order_count
        FROM orders
        WHERE user_id = $1 AND created_at >= $2
    `;
    const summaryResult = await db.query(summaryQuery, [userId, today]);
    
    // Get top selling item
    const topItemQuery = `
        SELECT 
            m.name,
            SUM(oi.qty) as qty
        FROM orders o
        JOIN order_items oi ON o.id = oi.session_id
        JOIN menus m ON oi.menu_id = m.id
        WHERE o.user_id = $1 AND o.created_at >= $2
        GROUP BY m.id, m.name
        ORDER BY qty DESC
        LIMIT 1
    `;
    const topItemResult = await db.query(topItemQuery, [userId, today]);
    
    return {
        totalSales: parseInt(summaryResult.rows[0].total_sales),
        orderCount: parseInt(summaryResult.rows[0].order_count),
        topItem: topItemResult.rows[0] || null
    };
}

module.exports = {
    findOrCreateUser,
    getUserByLineId,
    getUserMenus,
    getMenuById,
    getOrCreateActiveSession,
    getSessionItems,
    addItemToSession,
    increaseItemQty,
    decreaseItemQty,
    checkoutSession,
    getDailySummary
};

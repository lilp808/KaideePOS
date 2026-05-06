const supabase = require('./supabaseClient');

// ============================================
// User Management
// ============================================

async function findOrCreateUser(lineUserId) {
    // Try to find existing user
    const { data: existingUser, error: findError } = await supabase
        .from('users')
        .select('id')
        .eq('line_user_id', lineUserId)
        .single();
    
    if (findError && findError.code !== 'PGRST116') {
        throw findError;
    }
    
    if (existingUser) {
        return { userId: existingUser.id, isNew: false };
    }
    
    // Create new user
    const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({ line_user_id: lineUserId })
        .select('id')
        .single();
    
    if (insertError) {
        throw insertError;
    }
    
    return { userId: newUser.id, isNew: true };
}

async function getUserByLineId(lineUserId) {
    const { data, error } = await supabase
        .from('users')
        .select('id')
        .eq('line_user_id', lineUserId)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    
    return data?.id || null;
}

// ============================================
// Menu Management
// ============================================

async function getUserMenus(userId, activeOnly = true) {
    let query = supabase
        .from('menus')
        .select('id, name, price')
        .eq('user_id', userId);
    
    if (activeOnly) {
        query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.order('created_at');
    
    if (error) {
        throw error;
    }
    
    return data || [];
}

async function getMenuById(menuId) {
    const { data, error } = await supabase
        .from('menus')
        .select('id, name, price')
        .eq('id', menuId)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        throw error;
    }
    
    return data || null;
}

// ============================================
// Session Management
// ============================================

async function getOrCreateActiveSession(userId) {
    // Find existing open session
    const { data: existingSession, error: findError } = await supabase
        .from('order_sessions')
        .select('id, total')
        .eq('user_id', userId)
        .eq('status', 'open')
        .limit(1)
        .single();
    
    if (findError && findError.code !== 'PGRST116') {
        throw findError;
    }
    
    if (existingSession) {
        return {
            sessionId: existingSession.id,
            total: existingSession.total,
            isNew: false
        };
    }
    
    // Create new session
    const { data: newSession, error: insertError } = await supabase
        .from('order_sessions')
        .insert({
            user_id: userId,
            status: 'open',
            total: 0
        })
        .select('id, total')
        .single();
    
    if (insertError) {
        throw insertError;
    }
    
    return {
        sessionId: newSession.id,
        total: newSession.total,
        isNew: true
    };
}

async function getSessionItems(sessionId) {
    const { data, error } = await supabase
        .from('order_items')
        .select(`
            menu_id,
            qty,
            unit_price,
            menus(name)
        `)
        .eq('session_id', sessionId)
        .order('created_at');
    
    if (error) {
        throw error;
    }
    
    // Flatten the nested data structure
    return (data || []).map(item => ({
        menu_id: item.menu_id,
        qty: item.qty,
        unit_price: item.unit_price,
        name: item.menus.name
    }));
}

// ============================================
// Cart Operations
// ============================================

async function addItemToSession(sessionId, menuId, qty = 1) {
    // Get menu price first
    const { data: menu, error: menuError } = await supabase
        .from('menus')
        .select('price')
        .eq('id', menuId)
        .single();
    
    if (menuError || !menu) {
        throw new Error('Menu not found');
    }
    
    const unitPrice = menu.price;
    const itemTotal = qty * unitPrice;
    
    // Check if item already exists
    const { data: existingItem, error: checkError } = await supabase
        .from('order_items')
        .select('id, qty')
        .eq('session_id', sessionId)
        .eq('menu_id', menuId)
        .single();
    
    let updateResult;
    
    if (existingItem) {
        // Update existing item
        const newQty = existingItem.qty + qty;
        const { data, error } = await supabase
            .from('order_items')
            .update({ qty: newQty, updated_at: new Date().toISOString() })
            .eq('id', existingItem.id)
            .select()
            .single();
        
        if (error) throw error;
        updateResult = data;
    } else {
        // Insert new item
        const { data, error } = await supabase
            .from('order_items')
            .insert({
                session_id: sessionId,
                menu_id: menuId,
                qty: qty,
                unit_price: unitPrice
            })
            .select()
            .single();
        
        if (error) throw error;
        updateResult = data;
    }
    
    // Update session total
    const { data: updatedSession, error: sessionError } = await supabase
        .from('order_sessions')
        .update({ 
            total: supabase.rpc('increment', { current_total: 0, increment: itemTotal }),
            updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select('total')
        .single();
    
    if (sessionError) {
        // Fallback: get current total and update manually
        const { data: currentSession } = await supabase
            .from('order_sessions')
            .select('total')
            .eq('id', sessionId)
            .single();
        
        const newTotal = (currentSession?.total || 0) + itemTotal;
        
        const { data: finalSession, error: finalError } = await supabase
            .from('order_sessions')
            .update({ 
                total: newTotal,
                updated_at: new Date().toISOString()
            })
            .eq('id', sessionId)
            .select('total')
            .single();
        
        if (finalError) throw finalError;
        return { total: finalSession.total };
    }
    
    return { total: updatedSession.total };
}

async function increaseItemQty(sessionId, menuId) {
    // Get current item
    const { data: currentItem, error: getError } = await supabase
        .from('order_items')
        .select('id, qty, unit_price')
        .eq('session_id', sessionId)
        .eq('menu_id', menuId)
        .single();
    
    if (getError || !currentItem) {
        throw new Error('Item not found in session');
    }
    
    const newQty = currentItem.qty + 1;
    
    // Update quantity
    const { error: updateError } = await supabase
        .from('order_items')
        .update({ qty: newQty, updated_at: new Date().toISOString() })
        .eq('id', currentItem.id);
    
    if (updateError) throw updateError;
    
    // Update session total
    const { data: currentSession } = await supabase
        .from('order_sessions')
        .select('total')
        .eq('id', sessionId)
        .single();
    
    const newTotal = (currentSession?.total || 0) + currentItem.unit_price;
    
    const { data: updatedSession, error: sessionError } = await supabase
        .from('order_sessions')
        .update({ 
            total: newTotal,
            updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select('total')
        .single();
    
    if (sessionError) throw sessionError;
    
    return { total: updatedSession.total };
}

async function decreaseItemQty(sessionId, menuId) {
    // Get current item
    const { data: currentItem, error: getError } = await supabase
        .from('order_items')
        .select('id, qty, unit_price')
        .eq('session_id', sessionId)
        .eq('menu_id', menuId)
        .single();
    
    if (getError || !currentItem) {
        throw new Error('Item not found in session');
    }
    
    if (currentItem.qty <= 1) {
        // Remove item if qty would become 0
        const { error: deleteError } = await supabase
            .from('order_items')
            .delete()
            .eq('id', currentItem.id);
        
        if (deleteError) throw deleteError;
    } else {
        // Decrease quantity
        const newQty = currentItem.qty - 1;
        const { error: updateError } = await supabase
            .from('order_items')
            .update({ qty: newQty, updated_at: new Date().toISOString() })
            .eq('id', currentItem.id);
        
        if (updateError) throw updateError;
    }
    
    // Update session total
    const { data: currentSession } = await supabase
        .from('order_sessions')
        .select('total')
        .eq('id', sessionId)
        .single();
    
    const newTotal = (currentSession?.total || 0) - currentItem.unit_price;
    
    const { data: updatedSession, error: sessionError } = await supabase
        .from('order_sessions')
        .update({ 
            total: newTotal,
            updated_at: new Date().toISOString()
        })
        .eq('id', sessionId)
        .select('total')
        .single();
    
    if (sessionError) throw sessionError;
    
    return { total: updatedSession.total };
}

// ============================================
// Checkout
// ============================================

async function checkoutSession(sessionId, userId) {
    // Get session details
    const { data: session, error: sessionError } = await supabase
        .from('order_sessions')
        .select('total')
        .eq('id', sessionId)
        .eq('user_id', userId)
        .eq('status', 'open')
        .single();
    
    if (sessionError || !session) {
        throw new Error('Session not found or already closed');
    }
    
    const total = session.total;
    
    if (total === 0) {
        throw new Error('Cannot checkout empty cart');
    }
    
    // Create order record
    const { error: orderError } = await supabase
        .from('orders')
        .insert({
            user_id: userId,
            total: total
        });
    
    if (orderError) throw orderError;
    
    // Close session
    const { error: closeError } = await supabase
        .from('order_sessions')
        .update({ 
            status: 'closed', 
            updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
    
    if (closeError) throw closeError;
    
    // Create new session for next order
    const { data: newSession, error: newSessionError } = await supabase
        .from('order_sessions')
        .insert({
            user_id: userId,
            status: 'open',
            total: 0
        })
        .select('id')
        .single();
    
    if (newSessionError) throw newSessionError;
    
    return { total, success: true };
}

// ============================================
// Daily Summary
// ============================================

async function getDailySummary(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    
    // Get total sales and order count
    const { data: summaryData, error: summaryError } = await supabase
        .from('orders')
        .select('total')
        .eq('user_id', userId)
        .gte('created_at', todayISO);
    
    if (summaryError) throw summaryError;
    
    const orders = summaryData || [];
    const totalSales = orders.reduce((sum, order) => sum + order.total, 0);
    const orderCount = orders.length;
    
    // Get top selling item
    const { data: topItemData, error: topItemError } = await supabase
        .from('order_items')
        .select(`
            menus(name),
            qty
        `)
        .eq('orders.user_id', userId)
        .gte('orders.created_at', todayISO);
    
    if (topItemError) throw topItemError;
    
    // Aggregate quantities by menu name
    const itemAggregates = {};
    (topItemData || []).forEach(item => {
        const name = item.menus.name;
        if (name) {
            itemAggregates[name] = (itemAggregates[name] || 0) + item.qty;
        }
    });
    
    // Find top item
    let topItem = null;
    let maxQty = 0;
    for (const [name, qty] of Object.entries(itemAggregates)) {
        if (qty > maxQty) {
            maxQty = qty;
            topItem = { name, qty };
        }
    }
    
    return {
        totalSales,
        orderCount,
        topItem
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

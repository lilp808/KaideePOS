import { supabase } from '../../../src/services/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Get today's date at midnight
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayISO = today.toISOString()

    // Get today's orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('total')
      .eq('user_id', userId)
      .gte('created_at', todayISO)

    if (ordersError) {
      console.error('Failed to fetch orders:', ordersError)
      return res.status(500).json({ error: 'Failed to fetch orders' })
    }

    const totalSales = (orders || []).reduce((sum, order) => sum + order.total, 0)
    const orderCount = (orders || []).length

    // Get top selling item today
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        menus!inner(name),
        qty
      `)
      .eq('orders.user_id', userId)
      .gte('orders.created_at', todayISO)

    if (itemsError) {
      console.error('Failed to fetch order items:', itemsError)
      return res.status(500).json({ error: 'Failed to fetch order items' })
    }

    // Aggregate quantities by menu name
    const itemAggregates = {}
    ;(orderItems || []).forEach(item => {
      const name = item.menus?.name
      if (name) {
        itemAggregates[name] = (itemAggregates[name] || 0) + item.qty
      }
    })

    // Find top item
    let topItem = null
    let maxQty = 0
    for (const [name, qty] of Object.entries(itemAggregates)) {
      if (qty > maxQty) {
        maxQty = qty
        topItem = { name, qty }
      }
    }

    res.status(200).json({
      totalSales,
      orderCount,
      topItem
    })
  } catch (error) {
    console.error('Today stats error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

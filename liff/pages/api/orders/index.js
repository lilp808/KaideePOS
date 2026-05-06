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

    const { data, error } = await supabase
      .from('orders')
      .select(`
        id,
        total,
        created_at
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch orders:', error)
      return res.status(500).json({ error: 'Failed to fetch orders' })
    }

    res.status(200).json(data || [])
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

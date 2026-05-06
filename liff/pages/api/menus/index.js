import { supabase } from '../../../src/services/supabaseClient'

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return handleGet(req, res)
  } else if (req.method === 'POST') {
    return handlePost(req, res)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handleGet(req, res) {
  try {
    const { userId } = req.query

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    const { data, error } = await supabase
      .from('menus')
      .select('id, name, price, is_active, created_at')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Failed to fetch menus:', error)
      return res.status(500).json({ error: 'Failed to fetch menus' })
    }

    res.status(200).json(data || [])
  } catch (error) {
    console.error('Get menus error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handlePost(req, res) {
  try {
    const { userId, name, price } = req.body

    if (!userId || !name || !price) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data, error } = await supabase
      .from('menus')
      .insert({
        user_id: userId,
        name,
        price: parseFloat(price),
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create menu:', error)
      return res.status(500).json({ error: 'Failed to create menu' })
    }

    res.status(201).json(data)
  } catch (error) {
    console.error('Create menu error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

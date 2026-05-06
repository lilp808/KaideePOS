import { supabase } from '../../../../src/services/supabaseClient'

export default async function handler(req, res) {
  const { id } = req.query

  if (req.method === 'PUT') {
    return handlePut(req, res, id)
  } else if (req.method === 'DELETE') {
    return handleDelete(req, res, id)
  } else {
    return res.status(405).json({ error: 'Method not allowed' })
  }
}

async function handlePut(req, res, id) {
  try {
    const { name, price } = req.body

    if (!name || !price) {
      return res.status(400).json({ error: 'Missing required fields' })
    }

    const { data, error } = await supabase
      .from('menus')
      .update({
        name,
        price: parseFloat(price),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Failed to update menu:', error)
      return res.status(500).json({ error: 'Failed to update menu' })
    }

    res.status(200).json(data)
  } catch (error) {
    console.error('Update menu error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function handleDelete(req, res, id) {
  try {
    const { error } = await supabase
      .from('menus')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete menu:', error)
      return res.status(500).json({ error: 'Failed to delete menu' })
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Delete menu error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

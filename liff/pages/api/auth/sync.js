import { supabase } from '../../../src/services/supabaseClient'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { userId } = req.body

    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' })
    }

    // Check if user exists, create if not
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('line_user_id', userId)
      .single()

    if (!existingUser) {
      const { error } = await supabase
        .from('users')
        .insert({ line_user_id: userId })
      
      if (error) {
        console.error('Failed to create user:', error)
        return res.status(500).json({ error: 'Failed to sync user' })
      }
    }

    res.status(200).json({ success: true })
  } catch (error) {
    console.error('Sync error:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
}

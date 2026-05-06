const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('[SUPABASE] Missing environment variables');
    throw new Error('Missing Supabase configuration');
}

// Create Supabase client with service role key for server-side operations
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// Test connection
supabase.from('users').select('id').limit(1).then(({ error }) => {
    if (error) {
        console.error('[SUPABASE] Connection test failed:', error.message);
    } else {
        console.log('[SUPABASE] Connection successful');
    }
}).catch(err => {
    console.error('[SUPABASE] Connection test error:', err.message);
});

module.exports = supabase;

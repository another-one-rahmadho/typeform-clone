import { createClient } from '@supabase/supabase-js';

// Use placeholders if environment variables are missing to prevent crash on initialization.
// Supabase calls will fail gracefully with connection errors instead of crashing the app.
const supabaseUrl = process.env.SUPABASE_URL || 'https://ewpsamrnuklxnfbwvywb.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'sb_publishable_a35fY9H2cVtCbbT0WAY3bg_ljLLuehL';

if (supabaseUrl === 'https://placeholder.supabase.co') {
  console.warn("Supabase URL or Key is missing. Please set SUPABASE_URL and SUPABASE_KEY in your environment.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
import { createClient } from '@supabase/supabase-js';

// Note: Replace these with your actual Supabase project URL and anon key by creating a .env file based on .env.example
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

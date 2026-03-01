import { createClient } from '@supabase/supabase-js';

// These look for the variables in your .env file
const supabaseUrl = "https://tryftldbkflbrwjfzcet.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyeWZ0bGRia2ZsYnJ3amZ6Y2V0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzODA1ODYsImV4cCI6MjA4Nzk1NjU4Nn0.jv1MU2LbUUK4UFsYPcuKDGayYrx5urk3UWyOky2JUBU";

export const supabase = createClient(supabaseUrl, supabaseKey);
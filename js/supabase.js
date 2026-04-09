import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm'

const supabaseUrl = 'https://ksojywxntuadxuyyhvqd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtzb2p5d3hudHVhZHh1eXlodnFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MTE4MDAsImV4cCI6MjA4OTM4NzgwMH0.z7NfQtM9eb9oE_2I49llLLd2Chl77-1VXVhViQkKVpk'

export const supabase = createClient(supabaseUrl, supabaseKey)
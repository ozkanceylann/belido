// =============================
//  SUPABASE CONFIG – TEK NOKTA
// =============================

const SUPABASE_URL = "https://dnicipqyxoadjcizpvxy.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuaWNpcHF5eG9hZGpjaXpwdnh5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI4MTcwNzcsImV4cCI6MjA3ODM5MzA3N30._Roo83R-khWLoiEadVoRMmAnGR1AD4Z_0_5OwbemCwk";

// Supabase client oluştur (global)
const { createClient } = supabase;
const supa = createClient(SUPABASE_URL, SUPABASE_ANON);

// Uygulamada her yerden doğrudan "supa" kullanılacak.

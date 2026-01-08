const SUPABASE_URL = "https://ayvxqdcntwthqjfzfjlf.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5dnhxZGNudHd0aHFqZnpmamxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5OTI3ODgsImV4cCI6MjA3OTU2ODc4OH0.H30uQ6EZc-8ZIUB39SCt_Fs6o2lNA4yalvqqqUxLsrg";
window.supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
);

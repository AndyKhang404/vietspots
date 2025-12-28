-- Create trigger to auto-create profile when a new auth user is created
-- Idempotent: drop existing trigger then create
-- Run this in Supabase SQL editor or via psql as a DB superuser

DROP TRIGGER IF EXISTS create_profile_after_auth_user ON auth.users;

CREATE TRIGGER create_profile_after_auth_user
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

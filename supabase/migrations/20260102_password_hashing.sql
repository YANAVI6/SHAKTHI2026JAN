-- Migration to move password hashing to the database
-- This avoids browser compatibility issues with bcryptjs and is more secure.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Function to hash a password
CREATE OR REPLACE FUNCTION public.hash_password(password text)
RETURNS text AS $$
BEGIN
    RETURN crypt(password, gen_salt('bf', 10));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to verify a password
CREATE OR REPLACE FUNCTION public.verify_password(password text, hash text)
RETURNS boolean AS $$
BEGIN
    RETURN hash = crypt(password, hash);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for clarity
COMMENT ON FUNCTION public.hash_password(text) IS 'Hashes a plaintext password using bcrypt algorithm via pgcrypto.';
COMMENT ON FUNCTION public.verify_password(text, text) IS 'Verifies a plaintext password against a bcrypt hash.';

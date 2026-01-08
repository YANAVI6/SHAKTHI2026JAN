/*
  ===============================================================================
  INITIAL SUPER ADMIN SEED
  ===============================================================================
  Run this in your Supabase SQL Editor to create your first administrative account.
  
  IMPORTANT: 
  The username is 'shakthiadmin' and the password is 'Arqpn2492n'.
*/

INSERT INTO super_admins (username, password_hash)
VALUES (
  'shakthiadmin', 
  -- Secure hash for 'Arqpn2492n'
  '$2a$10$oWdDSPuwcYmHeKtBG9O5WOsTbyBEaPIaNnxO.X0UofibDHj0ijb/K' 
)
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Verification query
SELECT * FROM super_admins WHERE username = 'shakthiadmin';

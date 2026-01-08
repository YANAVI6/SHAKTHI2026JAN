-- Add profile fields to employees table
ALTER TABLE "employees"
ADD COLUMN IF NOT EXISTS "dob" DATE,
ADD COLUMN IF NOT EXISTS "gender" TEXT,
ADD COLUMN IF NOT EXISTS "address" TEXT,
ADD COLUMN IF NOT EXISTS "city" TEXT,
ADD COLUMN IF NOT EXISTS "state" TEXT,
ADD COLUMN IF NOT EXISTS "email" TEXT; -- Adding email as it might be useful distinct from mobile

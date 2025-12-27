/*
  # Fix assigned_employee_id to be nullable
  
  1. Changes
    - Alter `assigned_employee_id` column in `customer_cases` table to be nullable
    - This allows cases to be unassigned (set to null)
  
  2. Rationale
    - Cases need to be unassigned and returned to the pool
    - NOT NULL constraint was preventing unassignment operations
*/

-- Make assigned_employee_id nullable to allow unassignment
ALTER TABLE customer_cases 
  ALTER COLUMN assigned_employee_id DROP NOT NULL;

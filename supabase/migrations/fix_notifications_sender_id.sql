-- Migration: Make sender_id nullable in notifications table
-- This allows admin users (who are not in employees table) to send notifications

ALTER TABLE notifications ALTER COLUMN sender_id DROP NOT NULL;

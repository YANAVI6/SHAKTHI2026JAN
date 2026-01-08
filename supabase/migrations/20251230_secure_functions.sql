-- SECURITY FIX: Set search_path to '' for all functions to prevent search path hijacking
-- Remediation for lint warning: function_search_path_mutable

-- Corrected signatures based on database schema

-- 1. update_updated_at_column
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';

-- 2. normalize_and_validate_subdomain (Trigger function, no args)
ALTER FUNCTION public.normalize_and_validate_subdomain() SET search_path = '';

-- 3. update_user_activity_updated_at
ALTER FUNCTION public.update_user_activity_updated_at() SET search_path = '';

-- 4. log_security_event (Full signature required)
ALTER FUNCTION public.log_security_event(uuid, uuid, text, text, text, uuid, text, boolean, text, jsonb) SET search_path = '';

-- 5. validate_subdomain_format
ALTER FUNCTION public.validate_subdomain_format(text) SET search_path = '';

-- 6. update_chat_channels_updated_at
ALTER FUNCTION public.update_chat_channels_updated_at() SET search_path = '';

-- 7. update_chat_messages_updated_at
ALTER FUNCTION public.update_chat_messages_updated_at() SET search_path = '';

-- 8. update_chat_user_status_updated_at
ALTER FUNCTION public.update_chat_user_status_updated_at() SET search_path = '';

-- 9. cleanup_old_typing_indicators
ALTER FUNCTION public.cleanup_old_typing_indicators() SET search_path = '';

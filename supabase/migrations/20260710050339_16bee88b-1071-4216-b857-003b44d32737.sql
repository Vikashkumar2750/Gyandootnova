
DELETE FROM public.ai_provider_settings WHERE provider = 'anthropic';
INSERT INTO public.ai_provider_settings (provider, enabled, priority, encrypted_key, key_last4, health_status)
VALUES ('openrouter', true, 10, NULL, NULL, 'unknown')
ON CONFLICT (provider) DO UPDATE SET enabled = EXCLUDED.enabled, priority = EXCLUDED.priority;

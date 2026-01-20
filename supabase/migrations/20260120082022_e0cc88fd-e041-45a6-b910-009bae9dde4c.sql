-- Create Company One
INSERT INTO public.companies (name, domain, status, subscription_type)
VALUES ('Company One', 'companyone.com', 'active', 'trial')
ON CONFLICT DO NOTHING;
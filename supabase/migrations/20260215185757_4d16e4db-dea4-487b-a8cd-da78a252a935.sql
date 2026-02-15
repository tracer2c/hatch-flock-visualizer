
ALTER TABLE public.role_permissions
ADD COLUMN can_write boolean NOT NULL DEFAULT true;

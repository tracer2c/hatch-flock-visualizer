-- Link rohithgummadi3@gmail.com to Company One as company_admin

-- Update user profile to Company One
UPDATE public.user_profiles 
SET company_id = '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9'
WHERE id = 'b6c16539-5bea-4134-98a9-65db50570a54';

-- Update user role assignment to Company One
UPDATE public.user_roles 
SET company_id = '07d3ce2e-28be-4e92-bd3b-84bd4d5053b9'
WHERE user_id = 'b6c16539-5bea-4134-98a9-65db50570a54';
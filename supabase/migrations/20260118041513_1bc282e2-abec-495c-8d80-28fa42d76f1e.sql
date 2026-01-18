-- Centralized audit log for all user actions
CREATE TABLE user_activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Timestamp
  created_at timestamp with time zone DEFAULT now(),
  
  -- User identification
  user_id uuid REFERENCES auth.users(id),
  user_email text,
  
  -- Session & Device info
  session_id text,
  ip_address inet,
  user_agent text,
  
  -- Action details
  action_type text NOT NULL,
  action_category text NOT NULL,
  
  -- Resource affected
  resource_type text,
  resource_id uuid,
  resource_name text,
  
  -- Change details (for CRUD operations)
  old_values jsonb,
  new_values jsonb,
  
  -- Context
  page_path text,
  notes text,
  
  -- Company scoping
  company_id uuid REFERENCES companies(id)
);

-- Indexes for efficient querying
CREATE INDEX idx_activity_log_user ON user_activity_log(user_id);
CREATE INDEX idx_activity_log_timestamp ON user_activity_log(created_at DESC);
CREATE INDEX idx_activity_log_action ON user_activity_log(action_type);
CREATE INDEX idx_activity_log_resource ON user_activity_log(resource_type, resource_id);
CREATE INDEX idx_activity_log_ip ON user_activity_log(ip_address);
CREATE INDEX idx_activity_log_company ON user_activity_log(company_id);

-- Enable RLS
ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Only company admins can view logs
CREATE POLICY "Admins can view company logs"
  ON user_activity_log FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND has_role(auth.uid(), 'company_admin')
  );

-- Authenticated users can insert their own logs
CREATE POLICY "Users can insert own logs"
  ON user_activity_log FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());
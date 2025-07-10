-- Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create API keys table
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE
);

-- Create API usage table
CREATE TABLE IF NOT EXISTS api_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key VARCHAR(255) NOT NULL,
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint VARCHAR(255) NOT NULL,
    method VARCHAR(10) NOT NULL,
    status_code INTEGER NOT NULL,
    request_count INTEGER DEFAULT 1,
    response_time_ms INTEGER,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    cost_usd DECIMAL(10, 6) DEFAULT 0,
    tokens_used INTEGER DEFAULT 0,
    model_used VARCHAR(100),
    trace_id VARCHAR(255),
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_usage_org_id ON api_usage(org_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_timestamp ON api_usage(timestamp);
CREATE INDEX IF NOT EXISTS idx_api_usage_api_key ON api_usage(api_key);
CREATE INDEX IF NOT EXISTS idx_api_usage_trace_id ON api_usage(trace_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_org_id ON api_keys(org_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_method ON api_usage(method);
CREATE INDEX IF NOT EXISTS idx_api_usage_status_code ON api_usage(status_code);
CREATE INDEX IF NOT EXISTS idx_api_usage_endpoint ON api_usage(endpoint);

-- Insert sample organizations
INSERT INTO organizations (name, slug) VALUES 
('Demo Organization', 'demo-org'),
('Test Company', 'test-company'),
('Development Team', 'dev-team')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample API keys
INSERT INTO api_keys (key_hash, org_id, name) 
SELECT 
    'demo-key-hash-' || substr(md5(random()::text), 1, 8),
    o.id,
    'Demo API Key'
FROM organizations o
WHERE o.slug = 'demo-org'
ON CONFLICT (key_hash) DO NOTHING;

-- Insert sample API usage data
INSERT INTO api_usage (
    api_key, org_id, endpoint, method, status_code, request_count, 
    response_time_ms, timestamp, cost_usd, tokens_used, model_used, trace_id
)
SELECT 
    'demo-key-' || substr(md5(random()::text), 1, 8),
    o.id,
    '/api/v1/chat/completions',
    'POST',
    200,
    1,
    (100 + random() * 900)::INTEGER,
    NOW() - (random() * INTERVAL '30 days'),
    (random() * 0.1)::DECIMAL(10, 6),
    (50 + random() * 200)::INTEGER,
    'gpt-4',
    'trace-' || substr(md5(random()::text), 1, 12)
FROM organizations o, generate_series(1, 100)
WHERE o.slug = 'demo-org'; 
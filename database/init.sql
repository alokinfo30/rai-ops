-- Create database
-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(80) UNIQUE NOT NULL,
    email VARCHAR(120) UNIQUE NOT NULL,
    password_hash VARCHAR(200) NOT NULL,
    company VARCHAR(100),
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- Create ai_tests table
CREATE TABLE IF NOT EXISTS ai_tests (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    test_name VARCHAR(200) NOT NULL,
    test_type VARCHAR(50),
    target_system VARCHAR(200),
    status VARCHAR(50) DEFAULT 'pending',
    results JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP
);

-- Create compliance_logs table
CREATE TABLE IF NOT EXISTS compliance_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100),
    resource VARCHAR(200),
    status VARCHAR(50),
    details JSONB,
    ip_address VARCHAR(50),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create model_drift table
CREATE TABLE IF NOT EXISTS model_drift (
    id SERIAL PRIMARY KEY,
    model_name VARCHAR(200),
    metric_name VARCHAR(100),
    baseline_value FLOAT,
    current_value FLOAT,
    drift_score FLOAT,
    alert_threshold FLOAT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY,
    severity VARCHAR(50),
    message VARCHAR(500),
    resolved BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create expert_sessions table
CREATE TABLE IF NOT EXISTS expert_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    expert_name VARCHAR(200),
    domain VARCHAR(200),
    knowledge_graph JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_ai_tests_user_id ON ai_tests(user_id);
CREATE INDEX idx_ai_tests_status ON ai_tests(status);
CREATE INDEX idx_compliance_logs_user_id ON compliance_logs(user_id);
CREATE INDEX idx_compliance_logs_timestamp ON compliance_logs(timestamp);
CREATE INDEX idx_model_drift_model_name ON model_drift(model_name);
CREATE INDEX idx_model_drift_created_at ON model_drift(created_at);
CREATE INDEX idx_alerts_timestamp ON alerts(timestamp);
CREATE INDEX idx_expert_sessions_user_id ON expert_sessions(user_id);

-- Create view for recent activity
CREATE OR REPLACE VIEW recent_activity AS
SELECT 
    'test' as activity_type,
    test_name as description,
    status,
    created_at
FROM ai_tests
UNION ALL
SELECT 
    'compliance' as activity_type,
    action as description,
    status,
    timestamp as created_at
FROM compliance_logs
ORDER BY created_at DESC
LIMIT 50;

-- Grant permissions
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO current_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO current_user;
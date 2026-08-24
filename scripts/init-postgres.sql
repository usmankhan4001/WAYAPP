-- WAYAPP V4.0 PostgreSQL Hardening Script
-- Execute this script manually or mount it to /docker-entrypoint-initdb.d/

-- Revoke public schema access to prevent unauthorized cross-schema attacks
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO wayapp;

-- Set connection limits for the application user
ALTER ROLE wayapp CONNECTION LIMIT 100;

-- Enable query logging for DDL (migrations) to provide an audit trail
ALTER SYSTEM SET log_statement = 'ddl';
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;

-- Set conservative resource limits for typical 1-2GB RAM containers
ALTER SYSTEM SET max_connections = 120;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET work_mem = '4MB';
ALTER SYSTEM SET effective_cache_size = '768MB';

-- Reload config
SELECT pg_reload_conf();

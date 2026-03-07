#!/bin/bash
# VPS Health Check Script
# Run this after reboot to verify all services are running

echo "=== VPS HEALTH CHECK AFTER REBOOT ==="
echo ""

echo "1. Checking Supabase Services..."
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep supabase

echo ""
echo "2. Checking PostgreSQL..."
docker exec supabase_db_shakthi pg_isready -U postgres

echo ""
echo "3. Checking PostgREST API..."
curl -s http://localhost:8000 > /dev/null && echo "✅ PostgREST is responding" || echo "❌ PostgREST is down"

echo ""
echo "4. Checking Application (Port 8181)..."
curl -s http://localhost:8181 > /dev/null && echo "✅ Application is responding" || echo "❌ Application is down"

echo ""
echo "5. Checking Caddy (SSL)..."
systemctl status caddy --no-pager | grep "Active:"

echo ""
echo "6. Database Connection Test..."
docker exec supabase_db_shakthi psql -U postgres -d postgres -c "SELECT COUNT(*) as total_cases FROM customer_cases;" 2>/dev/null

echo ""
echo "7. Disk Space..."
df -h | grep -E "Filesystem|/$"

echo ""
echo "8. Memory Usage..."
free -h

echo ""
echo "=== HEALTH CHECK COMPLETE ==="

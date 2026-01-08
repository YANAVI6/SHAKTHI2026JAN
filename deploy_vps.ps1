# Shakthi CRM VPS Deployment Script (PowerShell)

$VPS_IP = "76.13.16.234"
$VPS_USER = "root"
$VPS_PATH = "/var/www/shakthi"
$LOCAL_DIST = "dist.tar.gz"

Write-Host "🚀 Starting Deployment to $VPS_IP..." -ForegroundColor Cyan

# 1. Compress local dist (already done, but re-ensuring)
if (Test-Path "dist") {
    Write-Host "📦 Compressing dist folder..."
    tar -czf $LOCAL_DIST -C dist .
} else {
    Write-Error "Error: dist folder not found. Run 'npm run build' first."
    exit
}

# 2. Upload to VPS
Write-Host "📤 Uploading to VPS..."
scp $LOCAL_DIST ${VPS_USER}@${VPS_IP}:/tmp/dist.tar.gz

# 3. Extract and update on VPS
Write-Host "🔧 Updating files on VPS..."
$REMOTE_COMMAND = @"
    # Create backup
    mkdir -p ${VPS_PATH}_backup
    cp -r ${VPS_PATH}/* ${VPS_PATH}_backup/ 2>/dev/null || true
    
    # Extract new files
    tar -xzf /tmp/dist.tar.gz -C ${VPS_PATH}
    
    # Cleanup tmp
    rm /tmp/dist.tar.gz
    
    # Restart Nginx
    systemctl restart nginx
    
    echo '✅ VPS Update Complete!'
"@

ssh ${VPS_USER}@${VPS_IP} $REMOTE_COMMAND

Write-Host "🏁 Deployment Finished!" -ForegroundColor Green

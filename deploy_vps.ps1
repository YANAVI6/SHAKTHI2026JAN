# Shakthi CRM VPS Deployment Script (PowerShell)

$VPS_IP = "76.13.16.234"
$VPS_USER = "root"
$VPS_PATH = "/var/www/shakthi"
$LOCAL_DIST = "dist.tar.gz"

Write-Host "Starting Deployment to $VPS_IP..."

# 1. Compress local dist
if (Test-Path "dist") {
    Write-Host "Compressing dist folder..."
    if (Test-Path $LOCAL_DIST) { Remove-Item $LOCAL_DIST }
    tar -czf $LOCAL_DIST -C dist .
} else {
    Write-Error "Error: dist folder not found. Run 'npm run build' first."
    exit
}

# 2. Upload to VPS
Write-Host "Uploading to VPS..."
scp $LOCAL_DIST ${VPS_USER}@${VPS_IP}:/tmp/dist.tar.gz

# 3. Extract and update on VPS (Targeting the /dist folder)
Write-Host "Updating files on VPS..."
$REMOTE_COMMAND = "mkdir -p ${VPS_PATH}/dist && tar -xzf /tmp/dist.tar.gz -C ${VPS_PATH}/dist && rm /tmp/dist.tar.gz && systemctl restart nginx && echo 'VPS Update Complete!'"

ssh ${VPS_USER}@${VPS_IP} $REMOTE_COMMAND

Write-Host "Deployment Finished!"

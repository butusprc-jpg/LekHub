param([string]$Target="LekHub-restored")
git clone https://github.com/butusprc-jpg/LekHub.git $Target
Set-Location $Target
git checkout 4da51eb0ce41f1cde572db586f778caab8932a54
Write-Host "Clone complete."
Write-Host "Copy LATEST_OVERLAY over this folder, preserving paths."
Write-Host "Then run: npm install; npm run build"

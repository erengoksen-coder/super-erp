$ErrorActionPreference = "Stop"

$nodeVersion = "v23.9.0"
$nodeZip = "node-$nodeVersion-win-x64.zip"
$nodeDir = "node_bin"
$extractedPath = "$PWD\$nodeDir\node-$nodeVersion-win-x64"

if (-Not (Test-Path "$extractedPath\node.exe")) {
    Write-Output "Downloading Node.js $nodeVersion..."
    Invoke-WebRequest -Uri "https://nodejs.org/dist/$nodeVersion/$nodeZip" -OutFile $nodeZip
    Write-Output "Extracting Node.js..."
    if (Test-Path $nodeDir) { Remove-Item -Recurse -Force $nodeDir }
    Expand-Archive -Path $nodeZip -DestinationPath $nodeDir -Force
    Remove-Item $nodeZip -Force
}

$env:Path = "$extractedPath;" + $env:Path
Write-Output "Node version: $(node -v)"
Write-Output "NPM version: $(npm -v)"

Write-Output "Installing dependencies..."
npm install

Write-Output "Starting development server..."
npm run dev

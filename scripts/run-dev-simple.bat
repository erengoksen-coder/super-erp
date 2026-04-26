@echo off
cd /d "%~dp0.."
if exist .next\dev\lock del /f /q .next\dev\lock
echo "Starting..." takilirsa: scripts\run-dev-clean.bat ile temiz baslatin.
echo.
npm run dev:simple
pause

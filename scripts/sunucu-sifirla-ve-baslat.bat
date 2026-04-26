@echo off
cd /d "%~dp0.."
powershell -ExecutionPolicy Bypass -File "%~dp0sunucu-sifirla-ve-baslat.ps1"
pause

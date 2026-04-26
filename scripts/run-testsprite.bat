@echo off
cd /d "%~dp0.."
title TestSprite - SUPER ERP
echo.
echo TestSprite MCP sunucusu genelde Cursor icinden calisir.
echo Terminalden calistirmak icin API key gerekir.
echo.
if "%TESTSPRITE_API_KEY%"=="" (
  echo TESTSPRITE_API_KEY ortam degiskeni bos. Cursor MCP'deki key'i kullanin.
  echo.
  echo Cursor'da TestSprite calistirmak icin:
  echo  1. Yeni bir sohbet acin
  echo  2. "TestSprite bootstrap yap ve frontend testlerini calistir" yazin
  echo  3. MCP bagliysa araclar calisacaktir
  echo.
  pause
  exit /b 1
)
echo Sunucu http://localhost:3000 calisiyor olmali.
echo TestSprite calistiriliyor...
echo.
npx -y @testsprite/testsprite-mcp@latest generateCodeAndExecute
echo.
pause

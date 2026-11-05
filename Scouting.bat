@echo off
title Scouting
cd /d "%~dp0"

REM -- MongoDB (servico automatico; garante que esta a correr) --
net start MongoDB >nul 2>&1

REM -- Se ja estiver aberta na porta 4000, so abre o navegador --
netstat -ano | find ":4000" | find "LISTENING" >nul
if not errorlevel 1 (
  echo   A plataforma ja esta aberta. A abrir o navegador...
  start "" http://localhost:4000
  timeout /t 2 >nul
  exit /b 0
)

echo.
echo   ============================================
echo    Plataforma de Scouting
echo   ============================================
echo.
echo   A arrancar... o navegador abre sozinho quando estiver pronto.
echo   (Pode demorar cerca de 20s.)
echo.
echo   Para FECHAR a plataforma, fecha esta janela.
echo.

REM -- Construir a interface na 1a utilizacao --
if not exist "client\dist\index.html" (
  echo   Primeira utilizacao: a construir a interface...
  call npm run build
)

REM -- Abre o navegador assim que o servidor responder (ate 45s) --
start "" powershell -NoProfile -WindowStyle Hidden -Command "for($i=0;$i -lt 90;$i++){ try{ [void](Invoke-WebRequest 'http://localhost:4000/api/health' -UseBasicParsing -TimeoutSec 1); Start-Process 'http://localhost:4000'; break }catch{ Start-Sleep -Milliseconds 500 } }"

REM -- Arranca o servidor diretamente --
cd /d "%~dp0server"
node src\index.js

echo.
echo   A plataforma parou. Podes fechar esta janela.
pause

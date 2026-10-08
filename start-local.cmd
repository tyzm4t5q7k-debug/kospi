@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS, then run this file again.
  pause
  exit /b 1
)
if not exist node_modules\next\dist\bin\next (
  call npm ci
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
node scripts\open-stock-lab.cjs
if errorlevel 1 pause

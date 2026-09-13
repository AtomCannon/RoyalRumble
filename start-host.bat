@echo off
REM Double-click this on Windows to start the Punchma host.
cd /d "%~dp0"
where node >nul 2>nul || (echo Node.js is not installed. Get it from https://nodejs.org and try again. & pause & exit /b 1)
node server.js
pause

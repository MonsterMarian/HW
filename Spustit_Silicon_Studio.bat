@echo off
title SILICON LOGIC STUDIO [LAUNCHER]
cd /d "%~dp0\silicon-logic-studio"
start "" "%~dp0\silicon-logic-studio\node_modules\electron\dist\electron.exe" "%~dp0\silicon-logic-studio\electron\main.js"
exit /b 0

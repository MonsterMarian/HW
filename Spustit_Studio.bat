@echo off
title SILICON // LOGIC STUDIO
cd /d "%~dp0silicon-logic-studio"
start "" "http://localhost:5173"
npm run dev

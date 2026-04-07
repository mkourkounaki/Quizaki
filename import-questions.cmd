@echo off
REM Χωρίς npm.ps1 (PowerShell ExecutionPolicy) — καλεί απευθείας το Node
cd /d "%~dp0"
node scripts\xlsx-to-csvRaw.mjs %*

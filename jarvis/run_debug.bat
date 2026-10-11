@echo off
rem Runs JARVIS with a console window so you can see errors.
cd /d "%~dp0"
".venv\Scripts\python.exe" -m jarvis %*
pause

@echo off
rem Re-creates the JARVIS shortcuts on the desktop and in the Start menu.
cd /d "%~dp0"
".venv\Scripts\python.exe" tools\make_shortcut.py
pause

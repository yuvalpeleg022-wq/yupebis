@echo off
setlocal
cd /d "%~dp0"
title J.A.R.V.I.S installer
echo.
echo   =============================================
echo     J.A.R.V.I.S  -  installing (5-15 minutes)
echo   =============================================
echo.

set "PY="
py -3.12 -V >nul 2>&1 && set "PY=py -3.12"
if not defined PY (py -3.11 -V >nul 2>&1 && set "PY=py -3.11")
if not defined PY (python -V >nul 2>&1 && set "PY=python")
if not defined PY (
  echo Python was not found - installing Python 3.12 with winget...
  winget install -e --id Python.Python.3.12 --accept-package-agreements --accept-source-agreements
  echo.
  echo Python installed. Close this window and run install.bat again.
  pause
  exit /b 0
)

if not exist ".venv\Scripts\python.exe" (
  echo [1/4] creating virtual environment...
  %PY% -m venv .venv || goto :fail
)
echo [2/4] upgrading pip...
".venv\Scripts\python.exe" -m pip install --upgrade pip wheel >nul
echo [3/4] installing packages (torch is large, be patient)...
".venv\Scripts\python.exe" -m pip install -r requirements.txt || goto :fail
echo [4/4] creating desktop + start-menu shortcuts...
".venv\Scripts\python.exe" tools\make_shortcut.py

echo.
echo   Done!  Open "JARVIS" from your desktop.
echo   First launch downloads the speech models (~500MB) and asks you to record your voice.
echo.
pause
exit /b 0

:fail
echo.
echo   Installation failed - see the messages above.
pause
exit /b 1

@echo off
chcp 65001 >nul
if "%~1"=="" (
  echo Drag a video file onto this run.bat
  pause
  exit /b 1
)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0render.ps1" -Video "%~1"
pause

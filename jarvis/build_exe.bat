@echo off
rem Builds a standalone dist\JARVIS\JARVIS.exe (no Python needed on the target PC).
cd /d "%~dp0"
".venv\Scripts\python.exe" -m pip install pyinstaller || exit /b 1
".venv\Scripts\python.exe" -m PyInstaller --noconfirm --clean --windowed --name JARVIS ^
  --icon assets\icon.ico ^
  --add-data "jarvis\hud;jarvis\hud" ^
  --add-data "jarvis\default_config.yaml;jarvis" ^
  --add-data "jarvis\default_commands.yaml;jarvis" ^
  --add-data "assets;assets" ^
  --collect-all faster_whisper --collect-all ctranslate2 ^
  --collect-all speechbrain --collect-all sounddevice --collect-all _sounddevice_data ^
  --collect-all edge_tts --collect-submodules pyttsx3 --collect-all yt_dlp ^
  --hidden-import jarvis.voice.audio --hidden-import jarvis.voice.stt ^
  --hidden-import jarvis.voice.speaker --hidden-import jarvis.voice.tts ^
  main.py
echo.
echo Built: dist\JARVIS\JARVIS.exe
pause

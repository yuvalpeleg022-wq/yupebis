"""Creates Desktop + Start Menu shortcuts that launch JARVIS without a console window."""
import base64
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
pythonw = Path(sys.executable).with_name("pythonw.exe")
icon = root / "assets" / "icon.ico"


def ps_quote(p) -> str:
    return "'" + str(p).replace("'", "''") + "'"


# Ask Windows for the real folders: the Desktop is often redirected to OneDrive
# (e.g. C:\Users\name\OneDrive\שולחן העבודה), so %USERPROFILE%\Desktop can be wrong.
script = f"""
$ErrorActionPreference = 'Stop'
$folders = @([Environment]::GetFolderPath('Desktop'), [Environment]::GetFolderPath('Programs'))
$shell = New-Object -ComObject WScript.Shell
foreach ($f in $folders) {{
  if (-not $f) {{ continue }}
  New-Item -ItemType Directory -Force -Path $f | Out-Null
  $s = $shell.CreateShortcut((Join-Path $f 'JARVIS.lnk'))
  $s.TargetPath = {ps_quote(pythonw)}
  $s.Arguments = '-m jarvis'
  $s.WorkingDirectory = {ps_quote(root)}
  $s.IconLocation = {ps_quote(icon)}
  $s.Description = 'J.A.R.V.I.S'
  $s.Save()
  Write-Output ('shortcut: ' + (Join-Path $f 'JARVIS.lnk'))
}}
"""
# -EncodedCommand (UTF-16LE base64) keeps Hebrew paths and quotes intact
encoded = base64.b64encode(script.encode("utf-16-le")).decode()
r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-EncodedCommand", encoded])
if r.returncode != 0:
    print("Could not create the shortcuts. You can always start JARVIS with run.bat")

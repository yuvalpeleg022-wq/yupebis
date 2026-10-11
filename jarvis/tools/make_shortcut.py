"""Creates Desktop + Start Menu shortcuts that launch JARVIS without a console window."""
import os
import subprocess
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
pythonw = Path(sys.executable).with_name("pythonw.exe")
icon = root / "assets" / "icon.ico"
targets = [
    Path(os.environ["USERPROFILE"]) / "Desktop" / "JARVIS.lnk",
    Path(os.environ["APPDATA"]) / "Microsoft" / "Windows" / "Start Menu" / "Programs" / "JARVIS.lnk",
]
for lnk in targets:
    lnk.parent.mkdir(parents=True, exist_ok=True)
    ps = (
        "$s=(New-Object -ComObject WScript.Shell).CreateShortcut('{lnk}');"
        "$s.TargetPath='{t}';$s.Arguments='-m jarvis';$s.WorkingDirectory='{w}';"
        "$s.IconLocation='{i}';$s.Description='J.A.R.V.I.S';$s.Save()"
    ).format(lnk=lnk, t=pythonw, w=root, i=icon)
    subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=False)
    print("shortcut:", lnk)

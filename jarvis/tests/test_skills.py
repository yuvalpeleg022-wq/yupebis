import os
import sys
import unittest
from unittest import mock

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jarvis import config as C  # noqa: E402
from jarvis.actions import apps, installer  # noqa: E402
from jarvis.brain import intents, skills  # noqa: E402


class Ctx:
    def __init__(self):
        self.cfg = C._read_yaml(C.DEFAULT_CONFIG)
        self.app_index = apps.AppIndex([
            apps.App("Google Chrome", r"C:\chrome.lnk", "lnk"),
            apps.App("Word", r"C:\word.lnk", "lnk"),
            apps.App("WordPad", r"C:\wordpad.lnk", "lnk"),
            apps.App("Spotify", "shell:AppsFolder\\Spotify", "uwp"),
            apps.App("Visual Studio Code", r"C:\code.lnk", "lnk"),
            apps.App("calculator", "calc.exe", "builtin"),
        ])
        self.app_index.updated = 9e18
        self.logs = []

    def log(self, m, level="info"):
        self.logs.append(m)


class SkillTests(unittest.TestCase):
    def setUp(self):
        self.ctx = Ctx()
        self.opened, self.launched = [], []
        p1 = mock.patch.object(skills.web, "open_url", side_effect=self.opened.append)
        p2 = mock.patch.object(skills.apps, "launch", side_effect=lambda a: self.launched.append(a.name))
        p3 = mock.patch.object(skills.web, "first_result", side_effect=lambda q: self.opened.append("first:" + q))
        for p in (p1, p2, p3):
            p.start()
            self.addCleanup(p.stop)

    def run_text(self, text):
        return skills.handle(intents.parse(text), self.ctx)

    def test_open_site(self):
        self.run_text("פתח את גוגל")
        self.assertEqual(self.opened, ["https://www.google.com"])
        self.assertEqual(self.launched, [])

    def test_open_app_hebrew_alias(self):
        self.run_text("תפתח את כרום")
        self.assertEqual(self.launched, ["Google Chrome"])

    def test_word_not_wordpad(self):
        self.run_text("פתח וורד")
        self.assertEqual(self.launched, ["Word"])

    def test_vscode(self):
        self.run_text("פתח את וי אס קוד")
        self.assertEqual(self.launched, ["Visual Studio Code"])

    def test_web_fallback(self):
        reply = self.run_text("פתח וואטסאפ")
        self.assertEqual(self.opened, ["https://web.whatsapp.com"])
        self.assertIn("לא מותקן", reply)

    def test_unknown_goes_to_web(self):
        self.run_text("פתח את האתר של עיריית תל אביב")
        self.assertTrue(self.opened and self.opened[0].startswith("first:"))

    def test_custom_command(self):
        cmds = C._read_yaml(C.DEFAULT_COMMANDS)
        self.assertIsNotNone(skills.match_custom("בוקר טוב", cmds))
        self.assertIsNotNone(skills.match_custom("יאללה מצב משחק", cmds))
        self.assertIsNone(skills.match_custom("פתח כרום", cmds))


class WingetParse(unittest.TestCase):
    def test_table(self):
        out = ("   - \r  \\ \r"
               "Name                 Id                     Version      Match           Source\n"
               "--------------------------------------------------------------------------------\n"
               "Discord              Discord.Discord        1.0.9165                     winget\n"
               "Discord PTB          Discord.Discord.PTB    1.0.1100     Tag: discord    winget\n"
               "Discord              XPDC2RH70K22MN         Unknown                      msstore\n")
        pkgs = installer.parse_table(out)
        self.assertEqual([p.id for p in pkgs], ["Discord.Discord", "Discord.Discord.PTB", "XPDC2RH70K22MN"])
        self.assertEqual(pkgs[0].source, "winget")
        self.assertEqual(installer.best_match("discord", pkgs).id, "Discord.Discord")


if __name__ == "__main__":
    unittest.main()

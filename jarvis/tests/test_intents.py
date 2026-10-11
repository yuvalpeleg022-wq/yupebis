"""Run: python -m unittest discover -s tests   (from the jarvis/ folder)"""
import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from jarvis.brain.intents import answer_yes_no, parse  # noqa: E402
from jarvis.brain.text import strip_wake  # noqa: E402

WAKE = ["ג'רוויס", "ג'ארביס", "ג'רביס", "jarvis"]

CASES = [
    ("פתח את גוגל", "open", {"target": "גוגל"}),
    ("תפתח לי את כרום בבקשה", "open", {"target": "כרום"}),
    ("open spotify", "open", {"target": "spotify"}),
    ("פתח יוטיוב", "open", {"target": "youtube"}),
    ("תנגן ביוטיוב את השיר האחרון של עומר אדם", "youtube", {"query": "האחרון של עומר אדם"}),
    ("פתח ביוטיוב סרטון של מיסטר ביסט", "youtube", {"query": "מיסטר ביסט"}),
    ("play despacito on youtube", "youtube", {"query": "despacito"}),
    ("תשים לי שיר של אייל גולן", "youtube", {"query": "אייל גולן"}),
    ("חפש ביוטיוב מתכון לפיצה", "youtube_search", {"query": "מתכון לפיצה"}),
    ("חפש בגוגל איך מכינים פיצה", "search", {"query": "איך מכינים פיצה"}),
    ("מה זה בינה מלאכותית", "search", None),
    ("תתקין את דיסקורד", "install", {"name": "דיסקורד"}),
    ("תוריד לי את ספוטיפיי", "install", {"name": "ספוטיפיי"}),
    ("install vlc", "install", {"name": "vlc"}),
    ("תסיר את זום", "uninstall", {"name": "זום"}),
    ("תגביר את הווליום", "volume", None),
    ("תוריד את הווליום", "volume", None),
    ("תשתיק", "mute", None),
    ("השיר הבא", "media", {"key": "next"}),
    ("מה השעה", "time", None),
    ("איזה יום היום", "date", None),
    ("תנעל את המחשב", "lock", None),
    ("תצלם מסך", "screenshot", None),
    ("כבה את המחשב", "shutdown", None),
    ("תפעיל מחדש את המחשב", "restart_pc", None),
    ("סגור את כרום", "close", {"name": "כרום"}),
    ("פתח את ההורדות", "folder", {"folder": "downloads"}),
    ("פתח את תיקיית המסמכים", "folder", {"folder": "documents"}),
    ("שנה צבע לכחול", "theme", {"theme": "cyan"}),
    ("מצב זהב", "theme", {"theme": "gold"}),
    ("פתח את קובץ ההגדרות", "edit_config", None),
    ("טען מחדש", "reload", None),
    ("למד את הקול שלי", "enroll", None),
    ("תודה", "thanks", None),
    ("מה אתה יודע לעשות", "help", None),
    ("פתח ynet.co.il", "open", {"target": "ynet.co.il"}),
    ("כרום", "maybe_open", {"target": "כרום"}),
]


class IntentTests(unittest.TestCase):
    def test_cases(self):
        for text, name, args in CASES:
            with self.subTest(text=text):
                it = parse(text)
                self.assertEqual(it.name, name, f"{text!r} → {it}")
                if args is not None:
                    self.assertEqual(it.args, {**it.args, **args} if "steps" in it.args else args, f"{text!r} → {it}")

    def test_volume_direction(self):
        self.assertEqual(parse("תגביר את הווליום").args["dir"], "up")
        self.assertEqual(parse("תוריד את הווליום").args["dir"], "down")

    def test_wake(self):
        for t in ["ג'רוויס פתח כרום", "היי ג׳רוויס, פתח כרום", "jarvis פתח כרום", "גרוויס פתח כרום", "ג'ארביס פתח כרום"]:
            rest, found = strip_wake(t, WAKE)
            self.assertTrue(found, t)
            self.assertEqual(rest, "פתח כרום", t)
        self.assertFalse(strip_wake("פתח כרום", WAKE)[1])
        self.assertFalse(strip_wake("גרביים חדשות", WAKE)[1])

    def test_yes_no(self):
        self.assertTrue(answer_yes_no("כן"))
        self.assertTrue(answer_yes_no("כן בבקשה"))
        self.assertTrue(answer_yes_no("yes"))
        self.assertFalse(answer_yes_no("לא"))
        self.assertFalse(answer_yes_no("תבטל"))
        self.assertIsNone(answer_yes_no("פתח כרום"))


if __name__ == "__main__":
    unittest.main()

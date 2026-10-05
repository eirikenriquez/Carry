"""Integration checks against the actual bundled SQLite asset and its source."""

import sqlite3
import unittest
from xml.etree import ElementTree
from zipfile import ZipFile

from build_bible import OUTPUT, SOURCE


class BibleDataTests(unittest.TestCase):
    def setUp(self):
        self.database = sqlite3.connect(f"{OUTPUT.as_uri()}?mode=ro", uri=True)
        self.addCleanup(self.database.close)

    def test_complete_catalogue_and_integrity(self):
        self.assertEqual(self.database.execute("PRAGMA integrity_check").fetchone()[0], "ok")
        self.assertEqual(self.database.execute("PRAGMA foreign_key_check").fetchall(), [])
        self.assertEqual(self.database.execute("SELECT COUNT(*) FROM books").fetchone()[0], 66)
        self.assertEqual(self.database.execute("SELECT SUM(chapter_count) FROM books").fetchone()[0], 1189)
        self.assertEqual(self.database.execute("SELECT COUNT(*) FROM verses").fetchone()[0], 31103)

    def test_every_imported_verse_matches_the_pinned_source(self):
        with ZipFile(SOURCE) as archive:
            entries = ElementTree.fromstring(archive.read("engwebp_vpl.xml"))
        expected = [
            (f"{v.attrib['b']}.{v.attrib['c']}.{v.attrib['v']}", "".join(v.itertext()).strip())
            for v in entries
        ]
        actual = self.database.execute("SELECT key, text FROM verses ORDER BY verse_order").fetchall()
        self.assertEqual(actual, expected)

if __name__ == '__main__':
    unittest.main()

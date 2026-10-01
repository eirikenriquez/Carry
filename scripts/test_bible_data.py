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

    def test_representative_first_last_and_selected_verses(self):
        rows = dict(self.database.execute(
            "SELECT key, text FROM verses WHERE key IN ('GEN.1.1', 'JAS.1.19', 'REV.22.21')"
        ))
        self.assertEqual(rows['GEN.1.1'], 'In the beginning, God created the heavens and the earth.')
        self.assertIn('swift to hear, slow to speak', rows['JAS.1.19'])
        self.assertIn('grace', rows['REV.22.21'])

    def test_publisher_empty_entries_are_preserved(self):
        empty_keys = self.database.execute("SELECT key FROM verses WHERE text = '' ORDER BY verse_order").fetchall()
        self.assertEqual(empty_keys, [('LUK.17.36',), ('ACT.8.37',), ('ACT.15.34',), ('ACT.24.7',), ('ROM.16.25',)])


if __name__ == '__main__':
    unittest.main()

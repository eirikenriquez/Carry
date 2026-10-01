"""Build the bundled SQLite Bible from the pinned eBible.org XML archive."""

import hashlib
import sqlite3
from pathlib import Path
from xml.etree import ElementTree
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "bible" / "engwebp_vpl.zip"
OUTPUT = ROOT / "assets" / "bible" / "web-2026-09-28.db"
SOURCE_HASH = "7d2e0b91ba43e2500fcab9c64d9db1962750deeff4e1186aed4c30220f5689be"

BOOK_NAMES = [
    "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua",
    "Judges", "Ruth", "1 Samuel", "2 Samuel", "1 Kings", "2 Kings",
    "1 Chronicles", "2 Chronicles", "Ezra", "Nehemiah", "Esther", "Job",
    "Psalms", "Proverbs", "Ecclesiastes", "Song of Solomon", "Isaiah",
    "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
    "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai",
    "Zechariah", "Malachi", "Matthew", "Mark", "Luke", "John", "Acts",
    "Romans", "1 Corinthians", "2 Corinthians", "Galatians", "Ephesians",
    "Philippians", "Colossians", "1 Thessalonians", "2 Thessalonians",
    "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
    "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
]


def build_bible():
    archive = SOURCE.read_bytes()
    if hashlib.sha256(archive).hexdigest() != SOURCE_HASH:
        raise ValueError("Bible source archive differs from the pinned version.")

    with ZipFile(SOURCE) as source:
        verses = ElementTree.fromstring(source.read("engwebp_vpl.xml"))

    books = list(dict.fromkeys(verse.attrib["b"] for verse in verses))
    if len(books) != 66 or len(verses) != 31103:
        raise ValueError("Unexpected source book or verse count.")

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    # Build in memory so a failed import cannot overwrite the existing asset.
    database = sqlite3.connect(":memory:")
    database.executescript("""
        CREATE TABLE metadata (name TEXT PRIMARY KEY, value TEXT NOT NULL);
        CREATE TABLE books (
            id TEXT PRIMARY KEY, name TEXT NOT NULL,
            book_order INTEGER NOT NULL UNIQUE, chapter_count INTEGER NOT NULL
        );
        CREATE TABLE verses (
            key TEXT PRIMARY KEY, book_id TEXT NOT NULL REFERENCES books(id),
            chapter INTEGER NOT NULL, verse INTEGER NOT NULL, text TEXT NOT NULL,
            verse_order INTEGER NOT NULL UNIQUE,
            UNIQUE(book_id, chapter, verse)
        );
        CREATE INDEX chapter_lookup ON verses(book_id, chapter, verse);
        PRAGMA user_version = 1;
    """)
    database.executemany("INSERT INTO metadata VALUES (?, ?)", [
        ("dataset", "engwebp-2026-09-28"),
        ("source_sha256", SOURCE_HASH),
    ])

    for order, (book, name) in enumerate(zip(books, BOOK_NAMES), start=1):
        chapters = {int(v.attrib["c"]) for v in verses if v.attrib["b"] == book}
        if chapters != set(range(1, max(chapters) + 1)):
            raise ValueError(f"Unexpected chapter sequence in {book}.")
        database.execute("INSERT INTO books VALUES (?, ?, ?, ?)",
                         (book, name, order, len(chapters)))

    for order, entry in enumerate(verses, start=1):
        book, chapter, verse = entry.attrib["b"], int(entry.attrib["c"]), int(entry.attrib["v"])
        text = "".join(entry.itertext()).strip()
        # Five verse entries are intentionally empty in the publisher's source.
        if chapter < 1 or verse < 1:
            raise ValueError(f"Invalid verse in {book} {chapter}:{verse}.")
        database.execute("INSERT INTO verses VALUES (?, ?, ?, ?, ?, ?)",
                         (f"{book}.{chapter}.{verse}", book, chapter, verse, text, order))

    database.commit()
    if database.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
        raise ValueError("Generated database failed SQLite integrity check.")
    with sqlite3.connect(OUTPUT) as target:
        database.backup(target)
    database.close()
    print(f"Built {OUTPUT.name}: {len(books)} books, {len(verses)} verses.")


if __name__ == "__main__":
    build_bible()

from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path
from unittest import mock


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

import build_site  # noqa: E402


class BuildSiteTests(unittest.TestCase):
    def test_legacy_404_is_only_written_when_absent(self) -> None:
        with tempfile.TemporaryDirectory(
            prefix="okf-build-site-"
        ) as temporary:
            output = Path(temporary)
            target = output / "404.html"
            canonical = b"canonical Svelte 404\n"
            target.write_bytes(canonical)

            with mock.patch.object(build_site, "OUT", output):
                build_site.write_legacy_404_if_absent()
                self.assertEqual(canonical, target.read_bytes())

                target.unlink()
                build_site.write_legacy_404_if_absent()

            self.assertIn(
                'http-equiv="refresh"',
                target.read_text(encoding="utf-8"),
            )


if __name__ == "__main__":
    unittest.main()

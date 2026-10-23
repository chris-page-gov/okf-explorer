"""Exercise source-text containment in the generated compatibility viewer."""

import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))
import update_viewer


class ViewerScriptContainmentTests(unittest.TestCase):
    def test_source_html_cannot_end_the_embedded_graph_script(self):
        graph = {"nodes": [{"body": '</ScRiPt><script>throw Error("source ran")</script>&<>\u2028\u2029£'}]}
        rendered = update_viewer.rendered_viewer(graph)
        encoded = rendered.split("const G=", 1)[1].split(";\nconst COL=", 1)[0]
        self.assertEqual(json.loads(encoded), graph)
        self.assertNotIn("<", encoded)
        self.assertNotIn("&", encoded)
        self.assertNotIn("\u2028", encoded)
        self.assertNotIn("\u2029", encoded)


if __name__ == "__main__":
    unittest.main()

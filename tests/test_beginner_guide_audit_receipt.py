import base64
import json
import unittest

from scripts.audit_beginner_guide_sources import classification
from scripts.build_beginner_guide_audit_receipt import ENGINES, browser_observations, source_summary


class BeginnerGuideAuditReceiptTest(unittest.TestCase):
    def setUp(self):
        self.base = "https://guide.example.test/explorer/docs/beginners/"
        self.route = self.base + "index.html"
        self.references = {self.route: ["beginner-guide", "choose-a-chapter"]}
        self.digest = "a" * 64
        self.identity = {"commit": "b" * 40, "identity_sha256": "c" * 64, "manifest_sha256": "d" * 64}

    def browser_report(self, *, declared_identity=None):
        cases = []
        for project, engine in ENGINES.items():
            attachment = {
                "project": project, "engine": engine, "guide_base": self.base,
                "publication": declared_identity or self.identity, "cross_references_sha256": self.digest,
                "chapters": [{"route": self.route, "headings": self.references[self.route]}],
            }
            body = base64.b64encode(json.dumps(attachment).encode()).decode()
            cases.append({"results": [{"status": "passed", "attachments": [{"name": "observed-guide-fragments", "body": body}]}]})
        return {"suites": [{"suites": [{"specs": [{"tests": cases}]}]}]}

    def test_browser_observations_require_the_exact_identity_and_table_of_contents(self):
        report = self.browser_report()
        verified = browser_observations(report, self.identity, self.references, self.base, self.digest)
        self.assertEqual(list(ENGINES), [row["project"] for row in verified])
        with self.assertRaisesRegex(ValueError, "exact chapter and fragment set"):
            browser_observations(report, self.identity, {}, self.base, self.digest)
        shifted = {**self.identity, "manifest_sha256": "f" * 64}
        with self.assertRaisesRegex(ValueError, "exact deployed candidate"):
            browser_observations(self.browser_report(declared_identity=shifted), self.identity, self.references, self.base, self.digest)

    def test_unreviewed_source_failure_stays_open(self):
        url = "https://www.w3.org/TR/skos-reference/"
        kind, dereference = classification(url)
        record = {
            "requested_url": url, "classification": kind, "dereference": dereference,
            "guide_pages": ["index.html"], "tool": "fixture", "observed_at": "2026-11-18T14:00:00Z",
            "status": "http-error", "http_status": 403,
        }
        source = {"cross_references_sha256": self.digest, "observations": True, "sources": [record]}
        self.assertEqual([url], source_summary(source, self.digest, {"index.html"}, {})["exceptions_open"])
        self.assertEqual([], source_summary(source, self.digest, {"index.html"}, {url: "Reviewed publisher restriction"})["exceptions_open"])

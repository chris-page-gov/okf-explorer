from hashlib import sha256
import json
import unittest

from rdflib import Graph, PROV, RDF, URIRef

from scripts.export_site_provenance import REPOSITORY, export_site_provenance


def candidate_evidence() -> tuple[bytes, bytes]:
    commit = "a" * 40
    identity = json.dumps({
        "schema": "okf-publication-deployment-identity.v1",
        "repository": {"url": REPOSITORY, "metadata": "unused fixture material"},
        "commit": commit,
        "materials": [{"path": "okf.publication.json", "sha256": "b" * 64}],
    }).encode("utf-8")
    receipt = json.dumps({
        "schema": "okf-site-candidate-receipt.v1",
        "publication_identity": {
            "path": "okf-publication-identity.json",
            "commit": commit,
            "bytes": len(identity),
            "sha256": sha256(identity).hexdigest(),
        },
        "explorer": {"manifest_sha256": "c" * 64},
        "site": {"tree_sha256": "d" * 64},
    }).encode("utf-8")
    return receipt, identity


class ExportSiteProvenanceTest(unittest.TestCase):
    def test_exports_reproducible_scoped_prov_graph(self):
        receipt, identity = candidate_evidence()
        content = export_site_provenance(receipt, identity)
        self.assertEqual(content, export_site_provenance(receipt, identity))
        graph = Graph().parse(data=content.decode("utf-8"), format="nt")
        activity, = graph.subjects(RDF.type, PROV.Activity)
        agent, = graph.objects(activity, PROV.wasAssociatedWith)
        self.assertIn((agent, RDF.type, PROV.SoftwareAgent), graph)
        self.assertEqual(len(set(graph.objects(activity, PROV.used))), 3)
        self.assertIn((URIRef(f"urn:okf:sha256:{'d' * 64}"), PROV.wasGeneratedBy, activity), graph)
        self.assertIn((URIRef(f"urn:okf:sha256:{sha256(identity).hexdigest()}"), PROV.wasGeneratedBy, activity), graph)
        self.assertEqual(list(graph.objects(activity, PROV.endedAtTime)), [])
        self.assertNotIn(b"unused fixture material", content)

    def test_rejects_identity_bytes_with_same_fields_but_a_different_digest(self):
        receipt, identity = candidate_evidence()
        with self.assertRaisesRegex(ValueError, "does not bind"):
            export_site_provenance(receipt, identity.replace(b"unused", b"edited"))

    def test_exports_only_the_bound_live_verification_observation(self):
        receipt, identity = candidate_evidence()
        binding = json.loads(receipt)["publication_identity"]
        verified = {
            "schema": "okf-live-deployment-verification-receipt.v1",
            "observed_at": "2026-11-18T18:04:21.485Z",
            "repository": {"url": REPOSITORY},
            "expected_commit": binding["commit"],
            "candidate_identity": binding,
            "deployed_identity": {"commit": binding["commit"], "sha256": binding["sha256"]},
            "deployed_contract": {"sha256": "b" * 64},
            "browser": {"console_policy": "no-errors", "console_errors": [], "page_errors": []},
            "result": "passed",
        }
        raw = json.dumps(verified).encode()
        content = export_site_provenance(receipt, identity, raw)
        graph = Graph().parse(data=content.decode(), format="nt")
        activity = URIRef(f"urn:okf:site-verification:{sha256(raw).hexdigest()}")
        result, = graph.subjects(PROV.wasGeneratedBy, activity)
        self.assertEqual(len(list(graph.objects(result, PROV.generatedAtTime))), 1)
        self.assertIn((activity, PROV.used, URIRef(f"urn:okf:sha256:{binding['sha256']}")), graph)
        verified["deployed_identity"] = {"commit": "f" * 40, "sha256": binding["sha256"]}
        with self.assertRaisesRegex(ValueError, "does not match"):
            export_site_provenance(receipt, identity, json.dumps(verified).encode())

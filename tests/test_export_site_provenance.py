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

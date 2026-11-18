from hashlib import sha256
import json
import unittest

from rdflib import Graph, PROV, RDF, URIRef

from scripts.export_site_provenance import GITHUB_API, PUBLICATION, REPOSITORY, export_site_provenance


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
        job_url = f"{REPOSITORY}/actions/runs/123/job/456"
        deployment = {
            "run_id": 123, "run_attempt": 1, "id": 456, "name": "deploy", "workflow_name": "Publish GitHub Pages",
            "status": "completed", "conclusion": "success", "head_sha": binding["commit"],
            "head_branch": "main", "html_url": job_url, "run_url": f"{GITHUB_API}/actions/runs/123",
            "steps": [{
                "name": "Deploy to GitHub Pages", "conclusion": "success",
                "started_at": "2026-11-18T18:03:00Z", "completed_at": "2026-11-18T18:04:00Z",
            }],
            "runner_name": "unused runner metadata",
        }
        delivery = export_site_provenance(receipt, identity, raw, deployment_bytes=json.dumps(deployment).encode())
        material = Graph().parse(data=delivery, format="nt")
        site, = material.subjects(PROV.atLocation, URIRef(PUBLICATION))
        self.assertIn((site, PROV.wasGeneratedBy, URIRef(job_url)), material)
        self.assertIn((activity, PROV.used, site), material)
        self.assertNotIn(b"unused runner metadata", delivery)
        build = {
            **deployment, "id": 455, "name": "build", "html_url": f"{REPOSITORY}/actions/runs/123/job/455",
            "steps": [
                {"name": "Validate OKF bundle and conformance", "conclusion": "success", "number": 11,
                 "started_at": "2026-11-18T18:01:00Z", "completed_at": "2026-11-18T18:02:00Z"},
                {"name": "Build componentised static Site", "conclusion": "success", "number": 12,
                 "started_at": "2026-11-18T18:02:00Z", "completed_at": "2026-11-18T18:02:30Z"},
            ],
        }
        validated = export_site_provenance(
            receipt, identity, raw, deployment_bytes=json.dumps(deployment).encode(),
            build_bytes=json.dumps(build).encode(),
        )
        material = Graph().parse(data=validated, format="nt")
        conformance = URIRef(f"{build['html_url']}#step:11:1")
        self.assertIn((conformance, PROV.wasAssociatedWith,
                       URIRef(f"{REPOSITORY}/blob/{binding['commit']}/scripts/check_okf.py")), material)
        assembly, = material.subjects(PROV.wasInformedBy, conformance)
        self.assertEqual(len(list(material.objects(assembly, PROV.startedAtTime))), 1)
        build["run_attempt"] = 2
        with self.assertRaisesRegex(ValueError, "deployed Pages run attempt"):
            export_site_provenance(receipt, identity, raw, deployment_bytes=json.dumps(deployment).encode(),
                                   build_bytes=json.dumps(build).encode())
        deployment["steps"][0]["completed_at"] = "2026-11-18T18:05:00Z"
        with self.assertRaisesRegex(ValueError, "before the live observation"):
            export_site_provenance(receipt, identity, raw, deployment_bytes=json.dumps(deployment).encode())
        verified["deployed_identity"] = {"commit": "f" * 40, "sha256": binding["sha256"]}
        with self.assertRaisesRegex(ValueError, "does not match"):
            export_site_provenance(receipt, identity, json.dumps(verified).encode())

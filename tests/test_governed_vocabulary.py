from hashlib import sha256
import json
from pathlib import Path
import sys
import unittest

from rdflib import DCTERMS, Graph, Literal, RDF, SKOS, URIRef

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from build_site import heading_slug  # noqa: E402
from scripts.build_governed_vocabulary_examples import example  # noqa: E402


PROFILE = ROOT / "profiles" / "governed-vocabulary" / "v1"
BASE = "https://chris-page-gov.github.io/okf-explorer/profile/governed-vocabulary/v1/#"


class GovernedVocabularyTest(unittest.TestCase):
    def test_registry_binds_the_exact_vocabulary_and_resolvable_members(self):
        registry = json.loads((PROFILE / "registry.json").read_text(encoding="utf-8"))
        self.assertEqual(registry["schema"], "okf-governed-vocabulary.v1")
        self.assertEqual(registry["path"], "vocabulary.ttl")
        self.assertEqual(registry["media_type"], "text/turtle")
        raw = (PROFILE / registry["path"]).read_bytes()
        self.assertEqual(len(raw), registry["bytes"])
        self.assertEqual(sha256(raw).hexdigest(), registry["sha256"])

        graph = Graph().parse(data=raw.decode("utf-8"), format="turtle")
        expected_schemes = {
            "topic": URIRef(BASE + "topics"),
            "format": URIRef(BASE + "formats"),
            "licence": URIRef(BASE + "licences"),
        }
        self.assertEqual(expected_schemes, {
            key: URIRef(iri) for key, iri in registry["schemes"].items()
        })
        self.assertEqual(set(expected_schemes.values()), set(graph.subjects(RDF.type, SKOS.ConceptScheme)))
        heading_ids = {
            URIRef(BASE + heading_slug(line.lstrip("# ")))
            for line in (PROFILE / "index.md").read_text(encoding="utf-8").splitlines()
            if line.startswith(("## ", "### "))
        }
        self.assertLessEqual(set(expected_schemes.values()), heading_ids)
        mapping = {
            "education": ("topic", "education", "https://www.gov.uk/browse/education"),
            "csv": ("format", "text/csv", "https://www.iana.org/assignments/media-types/text/csv"),
            "cc-by-40": ("licence", "CC-BY-4.0", "https://creativecommons.org/licenses/by/4.0/"),
        }
        self.assertEqual({URIRef(BASE + key) for key in mapping}, set(graph.subjects(RDF.type, SKOS.Concept)))
        for name, (scheme_key, notation, source) in mapping.items():
            with self.subTest(concept=name):
                concept = URIRef(BASE + name)
                scheme = expected_schemes[scheme_key]
                self.assertIn(concept, heading_ids)
                self.assertEqual(list(graph.objects(concept, SKOS.inScheme)), [scheme])
                self.assertEqual(list(graph.objects(concept, SKOS.notation)), [Literal(notation)])
                self.assertEqual(list(graph.objects(concept, DCTERMS.source)), [URIRef(source)])
                self.assertIn((scheme, SKOS.hasTopConcept, concept), graph)
                labels = list(graph.objects(concept, SKOS.prefLabel))
                self.assertEqual(len(labels), 1)
                self.assertEqual(labels[0].language, "en-GB")
        self.assertEqual(len(set(graph.objects(None, SKOS.notation))), len(mapping))
        expected_mappings = {
            (URIRef(BASE + "education"), SKOS.broadMatch, URIRef("https://www.gov.uk/education")),
            (
                URIRef(BASE + "csv"),
                SKOS.closeMatch,
                URIRef("http://publications.europa.eu/resource/authority/file-type/CSV"),
            ),
            (URIRef(BASE + "cc-by-40"), SKOS.exactMatch, URIRef("https://spdx.org/licenses/CC-BY-4.0")),
        }
        predicates = [SKOS.broadMatch, SKOS.narrowMatch, SKOS.relatedMatch, SKOS.closeMatch, SKOS.exactMatch]
        actual_mappings = {
            triple for predicate in predicates for triple in graph.triples((None, predicate, None))
        }
        self.assertEqual(expected_mappings, actual_mappings)

    def test_reader_and_validation_examples_match_their_pinned_inputs(self):
        shapes = (PROFILE / "shapes.ttl").read_bytes()
        for name, missing_label in (("vocabulary", False), ("missing-csv-label", True)):
            graph = Graph().parse(PROFILE / "vocabulary.ttl", format="turtle")
            for path, body in example(graph, shapes, missing_label=missing_label).items():
                with self.subTest(example=name, path=path):
                    self.assertEqual((PROFILE / "examples" / name / path).read_bytes(), body)

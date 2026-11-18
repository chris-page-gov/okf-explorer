from hashlib import sha256
import json
from pathlib import Path
import sys
import unittest

from rdflib import DCAT, DCTERMS, FOAF, Graph, Literal, PROV, RDF, URIRef, XSD

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from export_dcat_ap import PROFILE, export_catalogue  # noqa: E402


CATALOGUE = "https://catalogue.example.test/catalogue"
DATASET = "https://catalogue.example.test/dataset/counts"
LANDING_PAGE = DATASET + "/about"
DISTRIBUTION = DATASET + "/csv"
THEME = "http://publications.europa.eu/resource/authority/data-theme/EDUC"
LICENCE = "https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/"
MEDIA_TYPE = "https://www.iana.org/assignments/media-types/text/csv"
SOURCE = "https://bundle.example.test/records/counts.md"


def example():
    return {
        "schema": "okf-dcat-ap-input.v1",
        "language": "en-GB",
        "catalogue": {
            "id": CATALOGUE,
            "title": "Public-service catalogue",
            "description": "A representative metadata catalogue.",
            "publisher": {"id": "https://catalogue.example.test/publisher", "name": "Example publisher"},
            "source_record": "https://bundle.example.test/okf-bundle.json",
        },
        "datasets": [{
            "id": DATASET,
            "title": "Pupil counts",
            "description": "Counts by reporting area.",
            "landing_page": LANDING_PAGE,
            "source_record": SOURCE,
            "themes": [{"id": THEME, "label": "Education, culture and sport"}],
            "distributions": [{
                "id": DISTRIBUTION,
                "title": "Counts by reporting area (CSV)",
                "access_url": DATASET,
                "download_url": DISTRIBUTION,
                "source_record": SOURCE + "#downloads",
                "licence": LICENCE,
                "media_type": MEDIA_TYPE,
                "bytes": 32,
            }],
        }],
    }


class ExportDcatApTest(unittest.TestCase):
    def test_projects_a_deterministic_source_linked_catalogue(self):
        raw = json.dumps(example()).encode()
        result = export_catalogue(raw)
        self.assertEqual(result, export_catalogue(raw))
        graph = Graph().parse(data=result, format="nt")
        catalogue, dataset, distribution = map(URIRef, (CATALOGUE, DATASET, DISTRIBUTION))
        self.assertIn((catalogue, DCTERMS.conformsTo, PROFILE), graph)
        self.assertIn((catalogue, PROV.wasDerivedFrom, URIRef(f"urn:okf:sha256:{sha256(raw).hexdigest()}")), graph)
        self.assertIn((catalogue, DCAT.dataset, dataset), graph)
        self.assertIn((dataset, RDF.type, DCAT.Dataset), graph)
        self.assertIn((dataset, PROV.wasDerivedFrom, URIRef(SOURCE)), graph)
        self.assertIn((dataset, DCAT.landingPage, URIRef(LANDING_PAGE)), graph)
        self.assertIn((URIRef(LANDING_PAGE), RDF.type, FOAF.Document), graph)
        self.assertIn((dataset, DCAT.distribution, distribution), graph)
        self.assertIn((dataset, DCAT.theme, URIRef(THEME)), graph)
        self.assertIn((distribution, DCAT.accessURL, dataset), graph)
        self.assertIn((distribution, DCTERMS.license, URIRef(LICENCE)), graph)
        self.assertIn((distribution, DCAT.mediaType, URIRef(MEDIA_TYPE)), graph)
        self.assertIn((distribution, DCAT.byteSize, Literal(32, datatype=XSD.nonNegativeInteger)), graph)

    def test_requires_evidenced_rights_to_emit_a_licence_and_retains_unique_ids(self):
        doc = example()
        del doc["datasets"][0]["distributions"][0]["licence"]
        graph = Graph().parse(data=export_catalogue(json.dumps(doc).encode()), format="nt")
        self.assertEqual(list(graph.objects(URIRef(DISTRIBUTION), DCTERMS.license)), [])
        doc["datasets"].append(doc["datasets"][0])
        with self.assertRaisesRegex(ValueError, "Duplicate catalogue"):
            export_catalogue(json.dumps(doc).encode())

    def test_rejects_incomplete_metadata_and_signed_resource_links(self):
        doc = example()
        distribution = doc["datasets"][0]["distributions"][0]
        distribution["access_url"] += "?access_token=fixture-only"
        with self.assertRaisesRegex(ValueError, "credential"):
            export_catalogue(json.dumps(doc).encode())
        del distribution["access_url"]
        with self.assertRaisesRegex(ValueError, "access_url"):
            export_catalogue(json.dumps(doc).encode())

    def test_keeps_distributions_and_source_metadata_per_catalogue_record(self):
        doc = example()
        template = doc["datasets"][0]
        distribution = template["distributions"][0]
        doc["datasets"] = []
        for index in range(192):
            record = f"{DATASET}/{index}"
            origin = f"https://bundle.example.test/catalogue/item-{index}"
            doc["datasets"].append({
                **template,
                "id": record,
                "source_record": origin,
                "distributions": [{**distribution, "id": record + "/csv", "source_record": origin + "#data"}],
            })
        graph = Graph().parse(data=export_catalogue(json.dumps(doc).encode()), format="nt")
        self.assertEqual(len(set(graph.objects(URIRef(CATALOGUE), DCAT.dataset))), 192)
        for index in range(192):
            record = f"{DATASET}/{index}"
            output = URIRef(record + "/csv")
            self.assertEqual(list(graph.objects(URIRef(record), DCAT.distribution)), [output])
            self.assertIn((output, PROV.wasDerivedFrom, URIRef(f"https://bundle.example.test/catalogue/item-{index}#data")), graph)

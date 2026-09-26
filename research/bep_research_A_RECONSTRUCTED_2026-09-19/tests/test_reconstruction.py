"""Tests of reconstructed artefacts only; no execution of the Ask OKF engine."""
from __future__ import annotations
import copy,hashlib,json,subprocess,sys,tempfile,unittest,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'scripts'))
from validate_bep import check,seal,identity,strict_loads,canonical_bytes
from check_no_ui_tokens import scan
from rewrite_citations import rewrite

class PackageTests(unittest.TestCase):
    def setUp(self): self.good=json.loads((ROOT/'examples/valid-minimal.json').read_text())
    def core(self):return copy.deepcopy(self.good['core'])
    def test_valid_prose(self): self.assertEqual(check(self.good),[])
    def test_valid_numeric(self): self.assertEqual(check(json.loads((ROOT/'examples/valid-numeric-observation.json').read_text())),[])
    def test_valid_api(self): self.assertEqual(check(json.loads((ROOT/'examples/valid-api-capability.json').read_text())),[])
    def test_valid_insufficient(self): self.assertEqual(check(json.loads((ROOT/'examples/valid-insufficient.json').read_text())),[])
    def test_missing_provenance(self):
        errs=check(json.loads((ROOT/'examples/invalid-missing-provenance.json').read_text()))
        self.assertIn('schema:core/evidence/0/provenance:minItems',errs)
    def test_literal_tampering(self):
        c=self.core();c['evidence'][0]['text']+=' altered';self.assertIn('literal_hash:e:rule',check(seal(c)))
    def test_package_hash_tampering(self):
        p=copy.deepcopy(self.good);p['package_id']='sha256:'+'0'*64;self.assertIn('package_hash',check(p))
    def test_exception_removed(self):
        c=self.core();c['evidence'].pop();errs=check(seal(c));self.assertIn('unsupported_sufficiency',errs);self.assertIn('declared_coverage_mismatch',errs)
    def test_duplicate_evidence(self):
        c=self.core();c['evidence'].append(copy.deepcopy(c['evidence'][0]));self.assertIn('duplicate_evidence_id',check(seal(c)))
    def test_unknown_source(self):
        c=self.core();c['evidence'][0]['provenance'][0]['source_id']='source:absent';self.assertIn('unknown_source:e:rule',check(seal(c)))
    def test_synthetic_cannot_claim_official(self):
        c=self.core();c['evidence'][0]['assertion_status']='official';self.assertIn('synthetic_official_authority:e:rule',check(seal(c)))
    def test_ambiguity_blocks_sufficient(self):
        c=self.core();c['request']['ambiguities']=['Two possible rooms'];self.assertIn('unsupported_sufficiency',check(seal(c)))
    def test_unknown_terms_block_sufficient(self):
        c=self.core();c['request']['unresolved']=['unknown-term'];self.assertIn('unsupported_sufficiency',check(seal(c)))
    def test_budget_omission_blocks_sufficient(self):
        c=self.core();c['omissions']=[{'code':'budget_omitted','detail':'Required qualification omitted','blocking':True}];self.assertIn('unsupported_sufficiency',check(seal(c)))
    def test_no_requirements_cannot_claim_sufficient(self):
        c=self.core();c['requirements']=[];self.assertIn('unsupported_sufficiency',check(seal(c)))
    def test_alternative_support_set(self):
        c=self.core();c['requirements'][0]['alternatives'].append({'all_of':['e:rule','e:condition']});c['evidence'].pop();self.assertEqual(check(seal(c)),[])
    def test_declared_conflict(self):
        c=self.core();c['conflicts']=[{'evidence_ids':['e:rule','e:exception'],'detail':'Explicitly declared synthetic conflict'}];c['coverage']['evidential_status']='conflicting';self.assertEqual(check(seal(c)),[])
    def test_conflict_not_hidden(self):
        c=self.core();c['conflicts']=[{'evidence_ids':['e:rule','e:exception'],'detail':'Synthetic'}];self.assertIn('conflict_status_mismatch',check(seal(c)))
    def test_unknown_relationship_endpoint(self):
        c=self.core();c['relationships']=[{'id':'edge:1','source':'e:rule','target':'e:missing','predicate':'urn:requires','assertion_status':'normalized','provenance':[{'source_id':'source:1','locator':'synthetic'}]}];self.assertIn('relationship_endpoint_missing',check(seal(c)))
    def test_record_budget(self):
        c=self.core();c['budget']['max_records']=1;self.assertIn('record_budget',check(seal(c)))
    def test_full_package_byte_budget(self):
        c=self.core();c['budget']['max_bytes']=1024;self.assertIn('wire_byte_budget',check(seal(c)))
    def test_closed_schema(self):
        c=self.core();c['silent_extra']=True;self.assertTrue(any('additionalProperties' in e for e in check(seal(c))))
    def test_no_generated_answer(self):
        c=self.core();c['ai_answer']='yes';self.assertTrue(check(seal(c)))
    def test_duplicate_json_keys_rejected(self):
        with self.assertRaises(ValueError):strict_loads('{"x":1,"x":2}')
    def test_nonfinite_json_rejected(self):
        with self.assertRaises(ValueError):strict_loads('{"x":NaN}')
    def test_identity_repeatable(self):self.assertEqual(identity(self.core()),identity(self.core()))
    def test_object_key_order_does_not_change_id(self):
        c=self.core();self.assertEqual(identity(c),identity(dict(reversed(list(c.items())))))
    def test_array_order_is_identity_relevant(self):
        c=self.core();c['evidence'].reverse();self.assertNotEqual(identity(c),self.good['package_id'])
    def test_source_hashes_match_actual_fixture_files(self):
        for name,pkg in [('club.txt','valid-minimal.json'),('observations.txt','valid-numeric-observation.json'),('api.txt','valid-api-capability.json')]:
            source=json.loads((ROOT/'examples'/pkg).read_text())['core']['sources'][0]
            self.assertEqual(source['source_sha256'],hashlib.sha256((ROOT/'synthetic_sources'/name).read_bytes()).hexdigest())
    def test_source_literals_exist_exactly(self):
        for pkg in ['valid-minimal.json','valid-numeric-observation.json','valid-api-capability.json']:
            data=json.loads((ROOT/'examples'/pkg).read_text());name=data['core']['sources'][0]['url'].rsplit('/',1)[1];raw=(ROOT/'synthetic_sources'/name).read_text()
            for e in data['core']['evidence']:self.assertIn(e['text'],raw)

class CitationTests(unittest.TestCase):
    @staticmethod
    def token():return chr(0xE200)+'cite'+chr(0xE202)+'turn9search1'+chr(0xE201)
    def test_scanner_clean(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'clean.md';p.write_text('A stable citation [S01].');self.assertEqual(scan(p),[])
    def test_scanner_detects_wrappers(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.md';p.write_text(self.token());self.assertTrue(scan(p))
    def test_scanner_reads_zip_members(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.zip'
            with zipfile.ZipFile(p,'w',zipfile.ZIP_DEFLATED) as z:z.writestr('a.md',self.token())
            self.assertTrue(scan(p))
    def test_scanner_rejects_unsafe_archive_paths(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/'bad.zip'
            with zipfile.ZipFile(p,'w') as z:z.writestr('../a.md','ordinary text')
            self.assertTrue(scan(p))
    def test_rewriter_uses_exact_map(self):self.assertEqual(rewrite('Claim '+self.token(),{self.token():'[S01]'}),'Claim [S01]')
    def test_rewriter_fails_unmapped(self):
        with self.assertRaises(ValueError):rewrite(self.token(),{})
    def test_rewriter_fails_partial_wrapper(self):
        with self.assertRaises(ValueError):rewrite(chr(0xE200)+'unfinished',{})

class CanonicalTests(unittest.TestCase):pass
vectors=json.loads((ROOT/'canonicalisation-vectors.json').read_text())['vectors']
for vector in vectors:
    def test(self,v=vector):
        p=subprocess.run(['node',str(ROOT/'scripts/canonical_json.mjs')],input=v['input_json'].encode(),capture_output=True,timeout=10)
        if 'expected_error' in v:self.assertNotEqual(p.returncode,0);self.assertIn(v['expected_error'],p.stderr.decode())
        else:self.assertEqual(p.returncode,0,p.stderr);self.assertEqual(p.stdout,v['expected_utf8'].encode())
    setattr(CanonicalTests,'test_'+vector['id'],test)

if __name__=='__main__': unittest.main()

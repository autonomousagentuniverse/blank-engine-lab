"""Regression tests: verified MIRA defects and absent evidence must never become passes."""
import copy,importlib.util,json,unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
module=ROOT/'experiments/anatomical-contract/evaluate.py'
spec=importlib.util.spec_from_file_location('anatomy_audit',module)
m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)

class ContractTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  cls.contract=json.loads((ROOT/'character-pipeline/contracts/human-anatomy.v1.json').read_text())
  base=ROOT/'reference/reports'
  cls.comp=json.loads((base/'reference-vs-mira.json').read_text())
  cls.blink=json.loads((base/'mira-blink-probe.json').read_text())
 def test_complete_contract(self):
  m.validate_contract(self.contract)
  self.assertEqual(len(self.contract['relationships']),11)
 def test_mira_actual_failed_dependencies(self):
  r=m.audit_candidate(self.comp,self.blink)
  self.assertEqual(m.verdict(r)['dynamic_fail'],3)
  for s in ('lid_deform_attachment','brow_face_coupling','scalp_hair_coupling'):
   self.assertEqual(r[s]['state'],'dynamic_fail')
 def test_unknown_does_not_become_pass(self):
  r=m.audit_candidate(self.comp,self.blink)
  for s in ('skin_regional_reflectance','lid_globe_contact','rigged_export_parity'):
   self.assertEqual(r[s]['state'],'unverified')
  self.assertFalse(m.verdict(r)['ready_for_visual_review'])
 def test_preserve_positive_but_do_not_overclaim(self):
  r=m.audit_candidate(self.comp,self.blink)
  self.assertEqual(r['head_rig_expression']['state'],'dynamic_pass')
  self.assertNotEqual(r['lid_deform_attachment']['state'],'dynamic_pass')
 def test_wrong_source_sha_rejected(self):
  bad=copy.deepcopy(self.blink);bad['candidate_sha256']='0'*64
  with self.assertRaises(AssertionError):m.audit_candidate(self.comp,bad)
 def test_missing_edge_rejected(self):
  bad=copy.deepcopy(self.contract);bad['relationships'].pop()
  with self.assertRaises(AssertionError):m.validate_contract(bad)
 def test_fake_node_rejected(self):
  bad=copy.deepcopy(self.contract);bad['relationships'][0]['from']='fiction'
  with self.assertRaises(AssertionError):m.validate_contract(bad)

if __name__=='__main__':unittest.main()

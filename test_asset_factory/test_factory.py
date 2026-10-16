"""Contract tests for headless Blender asset-factory job specification.
No source network, Blender, WebGL or user keys required for preflight.
"""
import copy,importlib.util,io,json,unittest
from contextlib import redirect_stdout
from pathlib import Path
FILE=Path(__file__).resolve().parents[1]/"experiments"/"asset-factory"/"build.py"
module_spec=importlib.util.spec_from_file_location("asset_factory_build",FILE)
import sys
factory=importlib.util.module_from_spec(module_spec)
sys.modules[module_spec.name]=factory
module_spec.loader.exec_module(factory)
JOB=Path(__file__).resolve().parents[1]/"asset-specs"/"einar-head-v1.json"
class FactoryContractTests(unittest.TestCase):
 def setUp(self):self.job=factory.load_spec(JOB)
 def test_spec_accepts_real_source(self):
  self.assertEqual(self.job['source']['sha256'],factory.SOURCE_SHA)
  self.assertEqual(self.job['source']['credit'],factory.CREDIT)
 def test_plan_completely_headless(self):
  stages=[name for name,_,_ in factory.stages()]
  self.assertEqual(stages,[
   'download_official_source','validate_restore_63_textures',
   'build_geometry_pbr_roughness','verify_glb_material_maps',
   'unchanged_engine_regression','blank_engine_webgl_five_view_proof','evidence_contact_sheet'])
  with redirect_stdout(io.StringIO()) as cap:out=factory.run(self.job,execute=False)
  self.assertEqual(out,0)
  self.assertIn('"no_deploy": true',cap.getvalue())
  self.assertIn('"human_approval_required": true',cap.getvalue())
 def test_deterministic_build_id(self):
  self.assertEqual(factory.build_id(self.job),factory.build_id(json.loads(json.dumps(self.job))))
  t=copy.deepcopy(self.job);t['asset_id']='another-einar'
  self.assertNotEqual(factory.build_id(self.job),factory.build_id(t))
 def test_reject_unpinned_url(self):
  x=copy.deepcopy(self.job);x['source']['url']='https://attacker.example/einar.zip'
  with self.assertRaises(factory.InvalidSpec):factory.load_spec(self._write_temp(x))
 def test_reject_unsafe_path(self):
  x=copy.deepcopy(self.job);x['asset_id']='../../outside'
  with self.assertRaises(factory.InvalidSpec):factory.load_spec(self._write_temp(x))
 def test_reject_unapproved_publish(self):
  x=copy.deepcopy(self.job);x['output']['publication']='auto-deploy'
  with self.assertRaises(factory.InvalidSpec):factory.load_spec(self._write_temp(x))
 def test_reject_missing_roughness_gate(self):
  x=copy.deepcopy(self.job);x['quality']['require_skin_roughness']=False
  with self.assertRaises(factory.InvalidSpec):factory.load_spec(self._write_temp(x))
 def test_reject_blink_hair_claim(self):
  x=copy.deepcopy(self.job);x['output']['components'].append('blink')
  with self.assertRaises(factory.InvalidSpec):factory.load_spec(self._write_temp(x))
 def test_reject_unsupported_spec_format(self):
  x=copy.deepcopy(self.job);x['template']='arbitrary-script'
  with self.assertRaises(factory.InvalidSpec):factory.load_spec(self._write_temp(x))
 def _write_temp(self,d):
  import tempfile
  p=Path(tempfile.mkdtemp())/'spec.json';p.write_text(json.dumps(d));self.addCleanup(lambda:p.unlink(missing_ok=True));return p
if __name__=='__main__':unittest.main()

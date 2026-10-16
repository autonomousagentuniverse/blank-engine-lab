"""Offline fail-closed validation tests for Blank Engine automated Blender factory."""
import importlib.util,json,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
F=Path(__file__).resolve().parents[1]/"scripts"/"asset_factory.py"
spec=importlib.util.spec_from_file_location("asset_factory",F)
factory=importlib.util.module_from_spec(spec)
spec.loader.exec_module(factory)
MANIFEST=Path(__file__).resolve().parents[1]/"assets/specs/einar-static-hero.json"

class FactorySafetyTests(unittest.TestCase):
 def setUp(self):self.valid=json.loads(MANIFEST.read_text())
 def inspect(self,modified):
  with tempfile.TemporaryDirectory() as tmp:
   p=Path(tmp)/"fixture.json";p.write_text(json.dumps(modified))
   return factory.read_profile(p)
 def test_valid_manifest(self):
  v=self.inspect(self.valid)
  self.assertEqual(v["source"]["sha256"],"3cbb5a1dd9ffd3ca39edab420a83ea7f7db337b435a78ef27a0c87ff3e6977f7")
  self.assertFalse(v["publish"])
 def test_reject_unknown_generator(self):
  self.valid["adapter"]="arbitrary-script-execution"
  with self.assertRaisesRegex(ValueError,"Unsupported"):self.inspect(self.valid)
 def test_reject_unknown_asset_kind(self):
  self.valid["asset"]["kind"]="scene"
  with self.assertRaisesRegex(ValueError,"Only character"):self.inspect(self.valid)
 def test_reject_unlicensed(self):
  self.valid["license"]["id"]="proprietary"
  with self.assertRaisesRegex(ValueError,"licensed"):self.inspect(self.valid)
 def test_reject_deployment(self):
  self.valid["publish"]=True
  with self.assertRaisesRegex(ValueError,"publishing"):self.inspect(self.valid)
 def test_reject_unreviewed(self):
  self.valid["visual_approval_required"]=False
  with self.assertRaisesRegex(ValueError,"approval"):self.inspect(self.valid)
 def test_reject_different_publisher(self):
  self.valid["source"]["url"]="https://example.com/download.zip"
  with self.assertRaisesRegex(ValueError,"official Blender Studio"):self.inspect(self.valid)
 def test_reject_url_secrets(self):
  self.valid["source"]["url"]+="?secret=test"
  with self.assertRaisesRegex(ValueError,"Credentials"):self.inspect(self.valid)
 def test_reject_unpinned_archive(self):
  self.valid["source"]["sha256"]="none"
  with self.assertRaisesRegex(ValueError,"pinned SHA256"):self.inspect(self.valid)
 def test_reject_path_escape(self):
  self.valid["asset"]["id"]="../../malicious"
  with self.assertRaisesRegex(ValueError,"Unsafe asset ID"):self.inspect(self.valid)
 def test_reject_nonstandard_artifact_path(self):
  self.valid["outputs"]["runtime_glb"]="../../secret.bin"
  with self.assertRaisesRegex(ValueError,"output paths"):self.inspect(self.valid)
 def test_no_runtime_success_when_stage_fails(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=Path(tmp)
   with patch.object(factory,"get_archive",side_effect=RuntimeError("source blocked")):
    with self.assertRaisesRegex(RuntimeError,"source blocked"):
     factory.run(self.valid,root,{"restore":1})
   report=json.loads((root/"factory-report.json").read_text())
   self.assertEqual(report["status"],"BLOCKED")
   self.assertFalse(report["production_published"])
   self.assertEqual(report["visual_approval"],"BLOCKED_REQUIRES_HUMAN_REVIEW")
 def test_source_archive_checksum_fail_closed(self):
  with tempfile.TemporaryDirectory() as tmp:
   sample=Path(tmp)/"bad.zip";sample.write_bytes(b"not the publisher archive")
   with patch.object(factory,"SOURCE_ZIP",sample):
    self.assertFalse(factory.verify_download(self.valid))
if __name__=="__main__":unittest.main()

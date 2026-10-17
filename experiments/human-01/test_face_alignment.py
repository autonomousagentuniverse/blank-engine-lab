"""Pinned actual-GLB regression. Runs after headless Blender HUMAN-01 generation."""
import hashlib,json,tempfile,unittest
from pathlib import Path
from face_alignment import candidate,read_glb,pick_mesh,position_accessor

FIXTURE=Path('artifacts/human-01/human-01.glb')

@unittest.skipUnless(FIXTURE.exists(),'HUMAN-01 generated fixture unavailable')
class RealFaceAlignmentTests(unittest.TestCase):
    def test_eye_edit_changes_no_other_binary_bytes(self):
        original=FIXTURE.read_bytes()
        with tempfile.TemporaryDirectory() as folder:
            output=Path(folder)/'eye.glb';report=Path(folder)/'report.json'
            outcome=candidate(FIXTURE,output,report)
            self.assertTrue(outcome['source_remains_immutable'])
            self.assertEqual(hashlib.sha256(FIXTURE.read_bytes()).digest(),hashlib.sha256(original).digest())
            self.assertTrue(.002<=outcome['measured']['eye_inset_m']<=.035)
            self.assertFalse(outcome['measured']['teeth_repaired'])
            self.assertFalse(outcome['measured']['hair_repaired'])
            _,left_doc,left=read_glb(FIXTURE)
            _,right_doc,right=read_glb(output)
            for key in ('meshes','nodes','skins','materials','textures','images','animations'):
                self.assertEqual(left_doc.get(key,[]),right_doc.get(key,[]))
            _,eye=pick_mesh(left_doc,'high-poly')
            start,stride,count=position_accessor(left_doc,left,eye)
            allowed=set()
            for i in range(count):
                allowed.update(range(start+i*stride,start+i*stride+12))
            differences=[i for i,(a,b) in enumerate(zip(left,right)) if a!=b]
            self.assertTrue(differences,'No eye vertex adjustment')
            self.assertTrue(all(i in allowed for i in differences),'Non-eye vertex data changed')
            self.assertEqual(len(left),len(right))
            self.assertEqual(json.loads(report.read_text())['candidate_sha256'],
                             hashlib.sha256(output.read_bytes()).hexdigest())

if __name__=='__main__':unittest.main()

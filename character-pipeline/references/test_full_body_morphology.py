"""Synthetic geometry tests. NOT equivalent to real Blender render approval."""
import math
import unittest
from full_body_morphology import BANDS, CONTROL_DEFAULTS, validate_values, warp_xyz

B = (-0.8, -0.2, 0.0, 0.8, 0.2, 1.84)

class BodyMorphologyMathTests(unittest.TestCase):
    def setUp(self):
        self.base = CONTROL_DEFAULTS.copy()

    def sample(self, values, t, x=.4):
        return warp_xyz((x, .1, t * 1.84), bounds=B, values=values)

    def test_neutral_is_identity(self):
        for z in (0, .3, .6, 1.1, 1.5, 1.84):
            self.assertEqual(warp_xyz((.4, .1, z), bounds=B, values=self.base), (.4, .1, z))

    def test_shoulder_waist_hip_change_in_requested_directions(self):
        for name, (t, _) in BANDS.items():
            hi = self.base.copy(); hi[name] += .2
            lo = self.base.copy(); lo[name] -= .2
            self.assertGreater(self.sample(hi, t)[0], self.sample(self.base, t)[0] + .02)
            self.assertLess(self.sample(lo, t)[0], self.sample(self.base, t)[0] - .02)
            self.assertEqual(self.sample(hi, t)[1:], (.1, t * 1.84))

    def test_feet_shins_and_face_not_distorted(self):
        v = {'morphology.shoulder_width':.72,
             'morphology.waist_width':.16,'morphology.hip_width':.74}
        for t in (0., .05, .12, .99, 1.):
            self.assertLess(abs(self.sample(v, t)[0] - .4), .0005)

    def test_symmetric_left_and_right(self):
        v = {'morphology.shoulder_width':.74,
             'morphology.waist_width':.16,'morphology.hip_width':.73}
        for t in (.3, .5, .6, .8, 1.):
            self.assertAlmostEqual(self.sample(v,t,-.4)[0], -self.sample(v,t,.4)[0])

    def test_invalid_or_missing_controls_fail_closed(self):
        for value in (-.1, 1.1, None, float('nan'), True, float('inf')):
            v=self.base.copy();v['morphology.hip_width']=value
            with self.assertRaises(ValueError):validate_values(v)
        with self.assertRaises(ValueError):validate_values({'morphology.hip_width':.5})

    def test_invalid_body_height_rejected(self):
        with self.assertRaises(ValueError):
            warp_xyz((0,0,1),bounds=(0,0,0,1,1,.8),values=self.base)

if __name__=='__main__':
    unittest.main()

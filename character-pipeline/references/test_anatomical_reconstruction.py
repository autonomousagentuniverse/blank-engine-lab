import sys,unittest,pathlib
sys.path.insert(0,str(pathlib.Path(__file__).parent))
from rebuild_body_anatomy import monotone_profile,smooth,PROFILE_NAMES,X_ENVELOPE,Y_ENVELOPE

class TestRigSpline(unittest.TestCase):
    def test_profile_is_exact_at_landmarks(self):
        z=[.42,.73,.95,1.13,1.31,1.46,1.58]
        for i,point in enumerate(z):
            self.assertAlmostEqual(monotone_profile(point,z,X_ENVELOPE),X_ENVELOPE[i])
    def test_outside_clamped(self):
        z=[.42,.73,.95,1.13,1.31,1.46,1.58]
        self.assertEqual(monotone_profile(.0,z,X_ENVELOPE),X_ENVELOPE[0])
        self.assertEqual(monotone_profile(5,z,X_ENVELOPE),X_ENVELOPE[-1])
    def test_smooth_has_0_end_derivative(self):
        self.assertAlmostEqual(smooth(1e-6),0,places=8)
        self.assertAlmostEqual(smooth(1-1e-6),1,places=8)
    def test_reject_unordered(self):
        with self.assertRaises(ValueError):monotone_profile(1,[0,1,1],[1,2,3])
    def test_cage_is_not_old_three_control_bands(self):
        self.assertEqual(len(PROFILE_NAMES),7)
        self.assertEqual(len(X_ENVELOPE),7)
        self.assertEqual(len(Y_ENVELOPE),7)
        self.assertLess(min(X_ENVELOPE),.9)
        self.assertEqual(X_ENVELOPE[-1],1.)
if __name__=="__main__":unittest.main()

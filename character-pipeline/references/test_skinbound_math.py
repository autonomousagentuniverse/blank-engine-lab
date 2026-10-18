#!/usr/bin/env python3
"""Offline skin-bound follicle math contract. No Blender or source mesh needed.

A PASS is algebraic preflight, not measured rigged Blender attachment.
"""
import math
import random
import unittest

def plus(a,b): return tuple(x+y for x,y in zip(a,b))
def minus(a,b): return tuple(x-y for x,y in zip(a,b))
def dot(a,b): return sum(x*y for x,y in zip(a,b))
def point(tri,w): return tuple(sum(w[i]*tri[i][d] for i in range(3)) for d in range(3))
def bary(p,a,b,c):
    u=minus(b,a);v=minus(c,a);w=minus(p,a)
    uu=dot(u,u);uv=dot(u,v);vv=dot(v,v);wu=dot(w,u);wv=dot(w,v)
    det=uu*vv-uv*uv
    if det<=1e-15: raise ValueError("DEGENERATE_FACE")
    y=(vv*wu-uv*wv)/det;z=(uu*wv-uv*wu)/det
    return (1-y-z,y,z)
def weights(sources,bs,bones):
    a={}
    for src,b in zip(sources,bs):
        for k,w in src.items():
            if k in bones:a[k]=a.get(k,0)+b*w
    den=sum(a.values())
    if not (.97<=den<=1.03):raise ValueError("MISSING_BONE_WEIGHTS")
    return {k:w/den for k,w in a.items()}
def skin(p,bone):
    if bone=="neck_01":return p
    if bone!="head":raise ValueError(bone)
    theta=math.radians(22);x,y,z=p
    return (x*math.cos(theta)+z*math.sin(theta),y,-x*math.sin(theta)+z*math.cos(theta))
def original(tri,sources,bs):
    posed=[tuple(sum(w*skin(p,b)[d] for b,w in sw.items()) for d in range(3)) for p,sw in zip(tri,sources)]
    return point(posed,bs)
def transfer(tri,sources,bs):
    p=point(tri,bs);w=weights(sources,bs,{"head","neck_01"})
    return tuple(sum(v*skin(p,b)[d] for b,v in w.items()) for d in range(3))
def separation_mm(a,b):return 1000*math.sqrt(dot(minus(a,b),minus(a,b)))

class SkinboundMath(unittest.TestCase):
    def test_barycentric_random_10000(self):
        rng=random.Random(123)
        for _ in range(10000):
            a=(rng.uniform(-.1,.1),rng.uniform(-.1,.1),rng.uniform(1.5,1.85))
            b=plus(a,(.01+rng.random()*.012,0,0))
            c=plus(a,(0,.01+rng.random()*.012,0))
            i=rng.random();j=rng.random()*(1-i);ws=(i,j,1-i-j)
            self.assertLess(max(abs(x-y) for x,y in zip(bary(point((a,b,c),ws),a,b,c),ws)),1e-11)
    def test_non_bone_masks(self):
        sources=[{"head":1,"body":1,"scalp":1},{"head":.75,"neck_01":.25,"body":1},{"head":.6,"neck_01":.4,"scalp":1}]
        w=weights(sources,(.2,.3,.5),{"head","neck_01"})
        self.assertEqual(set(w),{"head","neck_01"})
        self.assertAlmostEqual(sum(w.values()),1.0)
    def test_degenerate_rejected(self):
        with self.assertRaises(ValueError):
            bary((0,0,0),(0,0,0),(.01,0,0),(.02,0,0))
    def test_uniform_bone_weights_exact(self):
        tri=((0,0,1.68),(.018,0,1.68),(0,.018,1.68))
        src=[{"head":.65,"neck_01":.35}]*3
        self.assertLess(separation_mm(original(tri,src,(.2,.3,.5)),transfer(tri,src,(.2,.3,.5))),1e-7)
    def test_varying_bone_weights_not_exact(self):
        tri=((0,0,1.68),(.018,0,1.68),(0,.018,1.68))
        src=[{"head":1},{"head":0,"neck_01":1},{"head":.65,"neck_01":.35}]
        gap=separation_mm(original(tri,src,(.2,.3,.5)),transfer(tri,src,(.2,.3,.5)))
        print("SYNTHETIC_WEIGHT_GRADIENT_GAP_MM",round(gap,5))
        self.assertGreater(gap,.1)
        self.assertLess(gap,5)

if __name__=="__main__":unittest.main(verbosity=2)

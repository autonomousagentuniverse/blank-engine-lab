#!/usr/bin/env python3
"""Fail-closed source/pose anatomical relationship contract; never a photoreal approval.
Einar: authenticated historic Blender metadata, not a fresh dynamic reference test.
MIRA05: authentic previous Blender head translation and Eyes_Closed_Max evidence.
"""
import json,gzip,argparse
from pathlib import Path
from collections import Counter

EINAR_SHA='1c6663da0a2e9d6822978467c244e9186edc76083bae2414e02f9e695e711f7b'
MIRA_SHA='9b57bc2aaa1ba0cfec213eb1035f517dfbcebf5fb43443cc85618f42bb39791e'
REQUIRED={'head_rig_expression','lid_deform_attachment','lid_globe_contact',
 'cornea_eye_optics','meniscus_lid_coupling','eyelash_lid_coupling',
 'brow_face_coupling','scalp_hair_coupling','hair_regional_groom',
 'skin_regional_reflectance','rigged_export_parity'}

def validate_contract(contract):
 assert contract['schema']=='blank.human.anatomical-dependency-contract.v1'
 rows=contract['relationships']
 assert len(rows)==len(REQUIRED) and {r['id'] for r in rows}==REQUIRED
 assert all(r['required'] and r['from'] in contract['nodes']
    and r['to'] in contract['nodes'] and r['proof'] for r in rows)

def ev(state,why):return {'state':state,'evidence':why}
def empty():return {id:ev('unverified','Insufficient measured evidence for this relationship') for id in REQUIRED}

def audit_reference(doc):
 assert doc['source_unchanged'] and doc['blend_sha256']==EINAR_SHA
 objs={x['name']:x for x in doc['objects']}
 mats={x['name']:x for x in doc['facial_material_shader_graphs']}
 head=objs['GEO-einar_head']
 mods=lambda name:{m['type'] for m in objs[name]['modifiers']} if name in objs else set()
 matches=lambda part,mod:any(part in name.lower() and mod in mods(name) for name in objs)
 r=empty()
 if 'ARMATURE' in mods('GEO-einar_head') and any('Blink' in k for k in head['shape_keys']):
  r['head_rig_expression']=ev('structural_evidence','Audited head Armature and blink shape keys, dynamic pose not evaluated')
  r['lid_deform_attachment']=ev('structural_evidence','Audited head eyelid blink controls, lid-margin deformation unmeasured')
 if any('cornea' in n.lower() and o['type']=='MESH' for n,o in objs.items()) and any('eye_sphere' in n.lower() for n in objs):
  r['cornea_eye_optics']=ev('structural_evidence','Distinct eye spheres and cornea meshes, optical agreement unmeasured')
 if matches('meniscus','SURFACE_DEFORM') or matches('meniscus','SHRINKWRAP'):
  r['meniscus_lid_coupling']=ev('structural_evidence','Deforming meniscus surface topology exists, evaluated blink unmeasured')
 if matches('eyelash','SURFACE_DEFORM'):
  r['eyelash_lid_coupling']=ev('structural_evidence','Eyelash surface-deformation object exists, evaluated follow unmeasured')
 if matches('eyebrows.proxy','SURFACE_DEFORM'):
  r['brow_face_coupling']=ev('structural_evidence','Deformable eyebrow proxy exists, evaluated follow unmeasured')
 if any('hair' in n.lower() and 'proxy' in n.lower() and 'SURFACE_DEFORM' in mods(n) for n in objs):
  r['scalp_hair_coupling']=ev('structural_evidence','Hair surface-deformation proxy exists, evaluated follow unmeasured')
 mat=mats.get('einar.skin')
 if mat and any('image' in n for n in mat['nodes']) and mat['links']:
  r['skin_regional_reflectance']=ev('structural_evidence','Linked image-backed skin shader exists, calibrated skin BRDF unmeasured')
 return r

def audit_candidate(comp,blink):
 assert comp['candidate']['blend_sha256']==MIRA_SHA
 assert blink['candidate_sha256']==MIRA_SHA
 assert blink['shape_key']=='Eyes_Closed_Max' and blink['orbital_max_displacement_mm']>1
 r=empty()
 r['head_rig_expression']=ev('dynamic_pass','Real Blender Eyes_Closed_Max deforms 1996 orbital vertices, not proof of lid closure')
 curves=blink['static_generated_curves']
 if curves['MIRA05_SourceFittedLidContact']['max_root_movement_mm']<.01:
  r['lid_deform_attachment']=ev('dynamic_fail','Measured face moves up to %.5fmm but lid-contact roots stay fixed' % blink['orbital_max_displacement_mm'])
 if curves['MIRA05_IndividualBrowStrands']['max_root_movement_mm']<.01:
  r['brow_face_coupling']=ev('dynamic_fail','2600 eyebrow strand roots stay fixed under actual expression deformation')
 hair=comp['candidate']['movement_follow_probes']['MIRA05_ActualScalpFibers']
 if hair['expected_if_bound_median_mm']>5 and hair['attachment_follow_ratio_median']<.01:
  r['scalp_hair_coupling']=ev('dynamic_fail','Real Blender 20mm head translation: hair roots move 0mm')
 r['hair_regional_groom']=ev('unverified','Global 2D tip-direction histograms exist but no source-anchored regional 3D groom validation')
 r['skin_regional_reflectance']=ev('unverified','Inherited UV maps and scalar adjustments; no calibrated regional reflectance measurement')
 r['cornea_eye_optics']=ev('unverified','Original eye shells retained; 3D refractive/clearance calibration absent')
 r['meniscus_lid_coupling']=ev('unverified','Contact ribbons do not validate a separate deformation-coupled tear meniscus')
 return r

def verdict(results):
 c=Counter(v['state'] for v in results.values())
 return {x:c[x] for x in ('dynamic_pass','dynamic_fail','structural_evidence','unverified')} | {
 'ready_for_visual_review':all(v['state']=='dynamic_pass' for v in results.values())}

def evaluate(contract,ref,comp,blink):
 validate_contract(contract)
 er,cr=audit_reference(ref),audit_candidate(comp,blink)
 result={'schema':'blank.human.anatomy-contract-evaluation.v1',
  'reference':{'name':'Einar Blender Studio v1 CC-BY','source_sha256':EINAR_SHA,'relationships':er,'summary':verdict(er)},
  'candidate':{'name':'MIRA05 full one-shot A Vitruvian-derived CC0','source_sha256':MIRA_SHA,'relationships':cr,'summary':verdict(cr)},
  'release_allowed':False,'new_human_generated':False,'photoreal_accepted':False,
  'limits':['Einar source graph authenticated in prior Blender run; Einar poses not tested in this run',
   'Einar is realism-oriented, not photographically calibrated ground truth',
   'MIRA head-translation and blink observations come from prior verified Blender executions',
   'Source component counts and modifiers alone are never dynamic or visual acceptance',
   'Actual lid-globe clearance, skin BRDF, hair physics and WebGL parity are unmeasured']}
 assert result['candidate']['summary']['dynamic_fail']==3
 assert not result['reference']['summary']['ready_for_visual_review']
 assert not result['candidate']['summary']['ready_for_visual_review']
 return result

def main():
 a=argparse.ArgumentParser()
 for arg in ('contract','einar-graph','mira-comparison','mira-blink','output'):
  a.add_argument('--'+arg,required=True)
 opts=a.parse_args()
 load=lambda p:json.loads(Path(p).read_text())
 ref=json.loads(gzip.decompress(Path(opts.einar_graph).read_bytes()))
 result=evaluate(load(opts.contract),ref,load(opts.mira_comparison),load(opts.mira_blink))
 dest=Path(opts.output);dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(json.dumps(result,indent=2)+'\n')
 print('HUMAN_CONTRACT_AUDIT',json.dumps({k:result[k]['summary'] for k in ('reference','candidate')}),flush=True)

if __name__=='__main__':main()

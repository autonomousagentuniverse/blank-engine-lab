#!/usr/bin/env python3
"""Matched Chrome screenshot analysis. Diagnostic only, not human visual approval."""
import json
from pathlib import Path
from PIL import Image
import numpy as np
folder=Path('artifacts/eye-v10')
before=np.asarray(Image.open(folder/'eye-v10-before-macro.png').convert('RGB')).astype('int16')
after=np.asarray(Image.open(folder/'eye-v10-after-macro.png').convert('RGB')).astype('int16')
if before.shape!=(642,630,3) or after.shape!=before.shape:raise ValueError('Different viewport shape')
changed=np.any(np.abs(after-before)>8,axis=2)
# These are broad screen-space eye patches, not precise anatomical segmentation.
rois={'left_eye':(193,294,293,362),'right_eye':(337,294,446,362)}
results={}
for label,(x1,y1,x2,y2) in {**rois,'outside_eye_boxes':(0,0,630,642)}.items():
    crop0=before[y1:y2,x1:x2];crop1=after[y1:y2,x1:x2]
    diff=changed[y1:y2,x1:x2]
    red=lambda a: (a[:,:,0]>95)&(a[:,:,0]>1.4*a[:,:,1])&(a[:,:,0]>1.30*a[:,:,2])
    n0=int(red(crop0).sum());n1=int(red(crop1).sum())
    results[label]={'pixels':int(diff.size),'changed_gt8':int(diff.sum()),'change_fraction':round(float(diff.mean()),5),
      'red_heuristic_before':n0,'red_heuristic_after':n1,'red_pixel_reduction':n0-n1}
# Outside-eye means mask the two eye boxes, not crop the full viewport.
outside=changed.copy()
for (x1,y1,x2,y2) in rois.values():outside[y1:y2,x1:x2]=False
results['outside_eye_boxes']['changed_gt8']=int(outside.sum())
results['outside_eye_boxes']['pixels']=int(outside.size-sum((y2-y1)*(x2-x1) for x1,y1,x2,y2 in rois.values()))
results['outside_eye_boxes']['change_fraction']=round(results['outside_eye_boxes']['changed_gt8']/results['outside_eye_boxes']['pixels'],5)
if int(changed.sum())>before.shape[0]*before.shape[1]*.15:raise ValueError('Camera or environment mismatch; too many pixels changed')
if int(changed.sum())==0:print('EYE_V10_VISUAL_NO_EFFECT; bounded texture patch does not reach screenshot')
else:print('EYE_V10_VISUAL_PIXEL_DIFFERENCE',int(changed.sum()))
composite=Image.new('RGB',(1260,642))
composite.paste(Image.fromarray(before.astype('uint8')), (0,0))
composite.paste(Image.fromarray(after.astype('uint8')), (630,0))
composite.save(folder/'v7-v10-matched-comparison.png')
data={'schema':'blank.eye.v10.chrome-comparison.v1','status':'visual_review_blocked_pending_human',
      'notes':['Eye boxes are fixed screenshot rectangles, not accurate eyelid segmentation','Red heuristic is not independent proof of anatomical repair','Out-of-eye check requires manual inspection for shared UV islands','No claim of physical Android GPU validation'],
      'statistics':results}
(folder/'chrome-comparison.json').write_text(json.dumps(data,indent=2)+'\n')
print('EYE_V10_IMAGE_METRICS',json.dumps(data))

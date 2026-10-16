/** Isolated character review presets and explicit visual acceptance gate. */
export const REVIEW_VIEWS=Object.freeze({
 front:{title:'Full body · front',position:[0,1.55,3.8],target:[0,.98,0]},
 threeQuarter:{title:'Three-quarter',position:[2.75,1.65,3.45],target:[0,1.02,0]},
 side:{title:'Full body · side',position:[3.85,1.55,0],target:[0,.98,0]},
 back:{title:'Full body · rear',position:[0,1.55,-3.8],target:[0,.98,0]},
 face:{title:'Face close-up',position:[0,1.7,1.26],target:[0,1.61,0]}
});
export const LIGHT_PRESETS=Object.freeze({
 neutral:{label:'Neutral inspection',bg:0x60656c,ambient:1.2,key:2.45,rim:.65,fill:.9,exposure:.95},
 portrait:{label:'Portrait studio',bg:0x242b38,ambient:1.3,key:3.05,rim:1.0,fill:1.45,exposure:1.0},
 daylight:{label:'Daylight',bg:0xa9b9cc,ambient:1.6,key:3.2,rim:.55,fill:1.1,exposure:1.05}
});
export const REVIEW_REQUIREMENTS=Object.freeze([
 'Face and eye detail in close-up',
 'Head and scalp realism',
 'Collar, seams and clothing fit',
 'Hands and shoe silhouette',
 'No clipping in front/side/rear views'
]);
export function auditStaticReview({captures=[],reviewed=[]}={}){
 const allViews=['front','threeQuarter','side','back','face'];
 const missing=allViews.filter(v=>!captures.includes(v));
 const rejected=REVIEW_REQUIREMENTS.filter((_,i)=>!reviewed.includes(i));
 return {structuralOnly:true,complete:!missing.length&&!rejected.length,missingViews:missing,unreviewed:rejected,photorealistic:false};
}

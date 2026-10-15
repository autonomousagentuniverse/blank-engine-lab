// Blank Engine GameSpec compiler and deterministic world generator
export const VERSION = 1;
export const DEFAULT_SPEC = Object.freeze({
  version: VERSION, title: 'Neon Frontier', time: 'night', theme: 'cyan',
  seed: 42, buildings: 18, robots: 7, mission: 'Reach the golden beacon',
});
const themes = ['cyan','violet','amber','emerald'];
function number(value, fallback, min, max) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : fallback;
}
export function validateSpec(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('GameSpec must be an object');
  if (raw.version !== VERSION) throw Error(`Unsupported GameSpec version: ${String(raw.version)}`);
  if (raw.time !== 'day' && raw.time !== 'night') throw Error('Time must be day or night');
  if (!themes.includes(raw.theme)) throw Error('Theme must be cyan, violet, amber or emerald');
  for (const [key, lo, hi] of [['buildings',0,150],['robots',0,80],['seed',0,999999]]) {
    if (!Number.isInteger(raw[key]) || raw[key] < lo || raw[key] > hi) throw Error(`${key} must be an integer from ${lo} to ${hi}`);
  }
  if (typeof raw.title !== 'string' || raw.title.trim().length < 1 || raw.title.length > 70) throw Error('Title must be 1–70 characters');
  if (typeof raw.mission !== 'string' || raw.mission.length > 160) throw Error('Mission must be under 160 characters');
  return {
    version:VERSION,title:raw.title.trim(), time:raw.time,theme:raw.theme,
    seed:raw.seed,buildings:raw.buildings,robots:raw.robots, mission:raw.mission
  };
}
export function compilePrompt(text, current) {
  if (typeof text !== 'string' || !text.trim()) throw Error('Enter a game-editing command.');
  if (text.length > 500) throw Error('Commands must be 500 characters or fewer.');
  const input = text.toLowerCase().replace(/\s+/g,' ').trim();
  const next = {...validateSpec(current)};
  let applied = [];
  if (/\b(night|dark|midnight|sunset)\b/.test(input)) { next.time='night'; applied.push('Set nighttime'); }
  if (/\b(day|daylight|sunny|morning|sunrise)\b/.test(input)) { next.time='day'; applied.push('Set daytime'); }
  for (const theme of themes) if (new RegExp(`\\b${theme}\\b`).test(input)) { next.theme=theme; applied.push(`Set ${theme} palette`); break; }
  const count = (key) => {
    const re = key === 'robots' ? /\b(\d+)\s*(?:robots?|enemies?|drones?)\b/ : /\b(\d+)\s*(?:buildings?|towers?|skyscrapers?)\b/;
    const m = input.match(re); return m ? Number(m[1]) : null;
  };
  for(const [key, plural, limit] of [['robots', /\b(robots?|enemies?|drones?)\b/,80],['buildings',/\b(buildings?|towers?|skyscrapers?)\b/,150]]) {
    if (!plural.test(input)) continue;
    if (/\b(remove all|clear|delete all|no|zero)\b/.test(input)) { next[key]=0; applied.push(`Removed all ${key}`); continue; }
    const n=count(key);
    if (n !== null && /\b(add|spawn|create|put|more|increase)\b/.test(input)) {
      next[key]=Math.min(limit,next[key]+n);applied.push(`Added ${next[key]-current[key]} ${key}`);
    } else if (n !== null && /\b(set|exactly|make|have)\b/.test(input)) {
      next[key]=Math.min(limit,n); applied.push(`Set ${key} to ${next[key]}`);
    } else if (/\b(add|spawn|create|more)\b/.test(input)) {
      next[key]=Math.min(limit,next[key]+(key==='robots'?3:5));applied.push(`Increased ${key}`);
    }
  }
  if (/\b(new layout|regenerate|shuffle|randomize)\b/.test(input)) { next.seed=(next.seed+1171)%1000000; applied.push('Regenerated layout'); }
  const title = text.match(/(?:name|title|call)\s+(?:the\s+)?(?:game\s+)?["']([^"']{1,70})["']/i);
  if (title) {next.title=title[1].trim();applied.push('Renamed game');}
  const mission = text.match(/(?:mission|objective)\s*(?:to|:|is)\s+(.{3,150})/i);
  if(mission) {next.mission=mission[1].trim().replace(/[.!]$/,'');applied.push('Updated mission');}
  if (!applied.length) return {spec:validateSpec(next), applied:[], message:'This command is not supported by the deterministic compiler yet. Try adding robots, buildings, changing time or theme.'};
  return {spec:validateSpec(next), applied, message:applied.join(' · ')};
}
export function seededRandom(seed) { let state=seed>>>0; return () => {state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;}; }
export function worldLayout(spec) {
  const data=validateSpec(spec), rnd=seededRandom(data.seed);
  const positions=[];
  for(let i=0; i<data.buildings; i++) {
    let x,z,tries=0;
    do {x=(rnd()-.5)*110;z=(rnd()-.5)*110;tries++;}
    while(tries<40 && ((x*x+z*z)<140 || (x-27)**2+(z-25)**2<140));
    positions.push({x,z,height:6+rnd()*26,width:3+rnd()*6});
  }
  const robots=[];
  for(let i=0;i<data.robots;i++) {
    const a=rnd()*Math.PI*2, d=14+rnd()*30;
    robots.push({x:Math.cos(a)*d,z:Math.sin(a)*d,phase:rnd()*Math.PI*2});
  }
  return {buildings:positions,robots};
}

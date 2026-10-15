#!/usr/bin/env node
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {inspectLabGlb,HERO_REFERENCE} from '../character-lab/character-spec.mjs';
const path=process.argv[2];if(!path)throw Error('Pass an existing self-contained hero.glb path');
const b=readFileSync(path);if(b.length!==HERO_REFERENCE.bytes)throw Error('Reference byte size does not match the pinned source');
const inspect=inspectLabGlb(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
const actualGitBlob=createHash('sha1').update(Buffer.from(`blob ${b.length}\0`)).update(b).digest('hex');
if(actualGitBlob!==HERO_REFERENCE.pinnedBlob)throw Error('Upstream Git blob hash mismatch');
console.log(JSON.stringify({asset:HERO_REFERENCE.name,source:HERO_REFERENCE.source,license:HERO_REFERENCE.license,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),gitBlob:actualGitBlob,skins:inspect.skins,bones:inspect.bones,meshes:inspect.meshes,materialSlots:inspect.materialSlots,clips:inspect.animationNames},null,2));

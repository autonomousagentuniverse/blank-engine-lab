# Alpha 0.6 — KTX2 compressed PBR (development)

**Status:** unshipped, GitHub-only. The user must approve major Alpha 0.6 Vercel deployment.

## Offline workflow

Use Khronos KTX-Software's `ktx` CLI (installed separately, never fetched at runtime):

```bash
node scripts/encode-ktx2.mjs assets/steel-color.png assets/steel-color.ktx2
node scripts/encode-ktx2.mjs assets/steel-normal.png assets/steel-normal.ktx2 --normal --high
node scripts/encode-ktx2.mjs assets/steel-orm.png assets/steel-orm.ktx2 --orm --high
```

The helper runs `ktx create` with BasisLZ for color, or UASTC + Zstd for data maps. These transcode to hardware formats chosen by the browser. Input should be RGBA PNG (sRGB for albedo and linear for normal/ORM). Include generated mipmaps. No external sidecars or user URLs.

## Browser

In **PBR MATERIALS**, choose a target surface, select local KTX2 or PNG/JPEG/WebP color/normal/ORM maps, optionally a raster **Color fallback**, then import. Real KTX2Loader dynamically detects the renderer's compressed texture support and transcodes via pinned Three.js WASM. Malformed headers and oversized textures are rejected before GPU allocation. If transcoding fails, an explicit local raster fallback may be used; otherwise the prior material stays intact. Uploaded textures remain session-local.

**Limitations:** texture source 2048px per side, 5 MiB per slot, 10 MiB per imported set, 32 MiB estimated GPU payload across authored surfaces, 8M input pixels. GPU estimates are derived from actual transcoded mip byte lengths where possible and do not include driver overhead. Mobile resolutions of 1024px or less are recommended. KTX2 orientation/UV convention must be validated by the author, especially for normal maps. Fallback files increase network/transfer bytes when both formats are shipped. This is a decoding pipeline, not AI-generated texture art.

## QA

Run `npm test`, `node scripts/encode-ktx2.mjs a.png b.ktx2 --dry-run`, and the one-time real-Chrome KTX2 integration with an upstream sample. Review actual screenshot for orientation and quality; validate on physical Android/iOS before release. Do **not** claim compression savings until an actual before/after GPU-format comparison is measured.

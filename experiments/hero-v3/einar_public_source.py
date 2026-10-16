#!/usr/bin/env python3
"""Official-source Einar v1 asset resolver. Read-only and credential-free.

This stage deliberately doesn't assume an official download archive's URL.
It inspects only Blender Studio's public character page; blocked downloads
and subscription/login requirements must be documented, never bypassed.
"""
from html.parser import HTMLParser
from pathlib import Path
from urllib import request,parse,error
import hashlib,json,re,os,sys,time
URL="https://studio.blender.org/characters/einar/v1/"
OUT=Path("artifacts/hero-v3-einar");OUT.mkdir(parents=True,exist_ok=True)
USER_AGENT="Mozilla/5.0 (compatible; BlankEngine-LicensedAssetAudit/1.0)"
class Extract(HTMLParser):
    def __init__(self):
        super().__init__();self.anchors=[];self.scripts=[];self.meta=[];self.current=None
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=="a":self.current={"href":a.get("href",""),"text":""};self.anchors.append(self.current)
        if tag=="meta":self.meta.append({k:a.get(k) for k in ("name","property","content") if k in a})
        if tag=="script" and "src" in a:self.scripts.append(a["src"])
    def handle_endtag(self,tag):
        if tag=="a":self.current=None
    def handle_data(self,data):
        if self.current:self.current["text"]+=data.strip()[:300]
def clean(url):
    u=parse.urlsplit(url)
    # Query may contain temporary signature/auth; NEVER print or archive it.
    return parse.urlunsplit((u.scheme,u.netloc,u.path,"",""))
def official(url):
    try:
        u=parse.urlsplit(url)
        host=u.hostname or ""
        return u.scheme=="https" and (host=="blender.org" or host.endswith(".blender.org"))
    except:return False
def load(url):
    rq=request.Request(url,headers={"User-Agent":USER_AGENT,"Accept":"text/html"})
    with request.urlopen(rq,timeout=28) as r:
        raw=r.read(2_000_000)
        return raw,r.status,r.url,r.headers.get("content-type","")
def main():
    result={"schema":"blank.hero-v3.einar-public-source.v1","canonical_page":URL,
      "publisher":"Blender Studio","published_license":"CC-BY (official public character page)",
      "required_attribution":"Einar Rig (CC-BY) Blender Foundation | studio.blender.org",
      "download_retrieved":False,"source_hash_verified":False,"source_texture_verified":False,
      "rig_and_blink_verified":False,"threejs_glb_verified":False,
      "visual_approval":"BLOCKED","status":"unresolved",
      "download_candidates":[],"http_requests":[],"notes":[]}
    try:
        body,status,finalurl,ctype=load(URL)
        result["http_requests"].append({"url":URL,"status":status,"final_url":clean(finalurl),
                                         "content_type":ctype,"response_bytes":len(body)})
        parser=Extract();html=body.decode("utf-8","replace");parser.feed(html)
        result["page_sha256"]=hashlib.sha256(body).hexdigest()
        result["page_title"]=re.findall(r"<title[^>]*>(.*?)</title>",html,re.I|re.S)[:1]
        for a in parser.anchors:
            href=a["href"]
            if not href:continue
            absurl=parse.urljoin(finalurl,href)
            if not official(absurl):continue
            rawtext=a["text"].strip().lower()
            if re.search(r"download|\.zip(?:\?|$)|\.blend(?:\?|$)|\.7z(?:\?|$)|einar",href,re.I) or "download" in rawtext:
                result["download_candidates"].append({"url":clean(absurl),"label":a["text"][:100],"type":"anchor"})
        # Some public pages have a file in a JSON-LD/script string rather than an anchor.
        for s in set(re.findall(r'(https?:\\?/\\?/[^"\'\s<>]+?\.(?:zip|blend|7z|tar\.gz)(?:\?[^"\'\s<>]*)?)',html,re.I)):
            normalized=s.replace("\\/","/")
            if official(normalized):result["download_candidates"].append({"url":clean(normalized),"label":"","type":"embedded-url"})
        # No trust in third-party mirrors or guessed file URLs.
        unique={c["url"]:c for c in result["download_candidates"]}
        result["download_candidates"]=list(unique.values())[:60]
        binaries=[c for c in result["download_candidates"] if re.search(r"\.(zip|blend|7z|tar\.gz)$",parse.urlsplit(c["url"]).path,re.I)]
        for c in binaries[:8]:
            try:
                rq=request.Request(c["url"],method="HEAD",headers={"User-Agent":USER_AGENT})
                with request.urlopen(rq,timeout=25) as r:
                    c["head_status"]=r.status
                    c["head_content_type"]=r.headers.get("content-type","")
                    c["head_length"]=r.headers.get("content-length")
                    c["head_redirect"]=clean(r.url)
            except Exception as e:
                c["head_error"]=type(e).__name__+" "+str(getattr(e,"code",""))[:10]
        # Only if a named, direct, public Blender domain archive can be corroborated.
        good=[c for c in binaries if c.get("head_status")==200 and
              (c.get("head_content_type","").split(";")[0].strip() in
               ["application/octet-stream","application/zip","application/x-zip-compressed","application/x-blender","binary/octet-stream"])]
        if good:
            result["status"]="DIRECT_PUBLIC_BINARY_FOUND_REQUIRES_SOURCE_HASH_AND_RIG_INSPECTION"
            result["direct_public_binary"]=good[0]
        else:
            result["status"]="BLOCKED_NO_VERIFIABLE_DIRECT_PUBLIC_DOWNLOAD"
            result["notes"].append("Publisher's character page was inspected but no verified unauthenticated official ZIP/BLEND binary is available through the page HTML.")
    except Exception as e:
        result["status"]="BLOCKED_OFFICIAL_PAGE_UNREACHABLE"
        result["notes"].append("Official page request failed: "+type(e).__name__+"; HTTP code="+str(getattr(e,"code","unknown")))
    result["next_action"]=("If a direct public asset is verified, download in a separate capacity-bounded job and hash/inspect before exporting. "
       "Otherwise obtain Einar via the publisher's authorized download control; never fabricate an asset or use unauthorised mirrors.")
    (OUT/"source-resolution.json").write_text(json.dumps(result,indent=2)+"\n")
    print("HERO_V3_EINAR_SOURCE_GATE "+result["status"])
    print("HERO_V3_DOWNLOAD_CANDIDATES "+str(len(result["download_candidates"])))
    for c in result["download_candidates"][:12]:
        print("CANDIDATE "+c["url"]+" HTTP "+str(c.get("head_status","unchecked")))
    # A BLOCKED source is a valid *audit* outcome, not successful character construction.
    if result["status"].startswith("BLOCKED"):print("HERO_V3_ASSET_INSPECTION_NOT_PERFORMED")
if __name__=="__main__":main()

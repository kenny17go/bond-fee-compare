#!/usr/bin/env python3
import json, os, hashlib, datetime, re
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
fees_path=os.path.join(ROOT,"data","fees.json")
status_path=os.path.join(ROOT,"data","source_status.json")

with open(fees_path,encoding="utf-8") as f:
    data=json.load(f)
try:
    with open(status_path,encoding="utf-8") as f:
        old=json.load(f)
except FileNotFoundError:
    old={"sources":{}}

def normalize(b):
    # Remove volatile whitespace and obvious timestamps before hashing.
    s=b.decode("utf-8","ignore")
    s=re.sub(r"\s+"," ",s)
    s=re.sub(r"\b20\d{2}[-/.]\d{1,2}[-/.]\d{1,2}\b","<DATE>",s)
    return s.encode("utf-8")

result={"checked_at":datetime.datetime.now(datetime.timezone.utc).isoformat(),"sources":{}}
for p in data["platforms"]:
    name,url=p["name"],p["source"]
    prev=old.get("sources",{}).get(name,{})
    item={"url":url,"changed":False,"ok":False,"last_hash":prev.get("last_hash"),"http_status":None,"error":None}
    try:
        req=Request(url,headers={"User-Agent":"Mozilla/5.0 BondFeeCompare/1.0"})
        with urlopen(req,timeout=25) as r:
            body=r.read()
            item["http_status"]=getattr(r,"status",200)
        h=hashlib.sha256(normalize(body)).hexdigest()
        item["ok"]=True
        item["changed"]=bool(prev.get("last_hash") and prev["last_hash"]!=h)
        item["last_hash"]=h
    except Exception as e:
        item["error"]=str(e)
    result["sources"][name]=item

with open(status_path,"w",encoding="utf-8") as f:
    json.dump(result,f,ensure_ascii=False,indent=2)

changed=[k for k,v in result["sources"].items() if v.get("changed")]
print("Changed:", ", ".join(changed) if changed else "none")

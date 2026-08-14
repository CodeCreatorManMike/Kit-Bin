from __future__ import annotations
import argparse,json
from collections import defaultdict
from datetime import date,timedelta
from seo_common import SupabaseREST,weighted_position,windows
def aggregate(rows, keys):
    groups=defaultdict(list)
    for r in rows: groups[tuple(r[k] for k in keys)].append(r)
    out=[]
    for key,rs in groups.items():
        imp=sum(r["impressions"] for r in rs); clicks=sum(r["clicks"] for r in rs)
        out.append({**dict(zip(keys,key)),"clicks":clicks,"impressions":imp,"ctr":clicks/imp if imp else 0,"position":weighted_position(rs)})
    return out
def classify(current, previous):
    prev={ (r.get("query"),r.get("page")):r for r in previous}; out=[]
    for r in current:
        p=prev.get((r.get("query"),r.get("page")),{}); labels=[]; imp=r["impressions"]
        if imp>=50 and 4<=r["position"]<=10: labels += ["POSITION_4_10","CTR_OPPORTUNITY"] if r["ctr"]<.03 else ["POSITION_4_10"]
        if imp>=30 and 11<=r["position"]<=20: labels += ["POSITION_11_20","STRIKING_DISTANCE"]
        if imp>=100 and r["ctr"]<.02: labels.append("HIGH_IMPRESSIONS_LOW_CTR")
        if not p and imp>=20: labels.append("NEW_QUERY")
        elif p and imp>=20:
            if imp>=p["impressions"]*1.5: labels.append("GROWING_QUERY")
            if p["impressions"]>=20 and imp<=p["impressions"]*.6: labels.append("DECLINING_QUERY")
        if labels: out.append({**r,"classifications":sorted(set(labels)),"confidence":"high" if imp>=100 else "medium","score":round(imp*max(0,21-r["position"])*(1-r["ctr"]),2)})
    return sorted(out,key=lambda x:x["score"],reverse=True)
def build_context(db=None):
    db=db or SupabaseREST(); latest=db.request("GET","gsc_daily",params={"select":"data_date","order":"data_date.desc","limit":"1"})
    if not latest: raise RuntimeError("No Search Console data")
    anchor=date.fromisoformat(latest[0]["data_date"]); start=anchor-timedelta(days=55)
    rows=db.request("GET","gsc_daily",params={"select":"data_date,query,page,clicks,impressions,ctr,position","data_date":f"gte.{start}","order":"data_date.asc"})
    ws=windows(anchor); grouped={}
    for name,(a,b) in ws.items(): grouped[name]=aggregate([r for r in rows if a<=date.fromisoformat(r["data_date"])<=b],["query","page"])
    changes=db.request("GET","seo_changes",params={"select":"*","order":"created_at.desc","limit":"100"}); runs=db.request("GET","seo_runs",params={"select":"*","order":"started_at.desc","limit":"20"})
    cutoff=anchor-timedelta(days=14); cooldown={c["page_url"] for c in changes if date.fromisoformat(c["created_at"][:10])>cutoff}
    candidates=[c for c in classify(grouped["last_28"],grouped["previous_28"]) if c["page"] not in cooldown]
    return {"anchor_date":anchor.isoformat(),"windows":{k:[str(a),str(b)] for k,(a,b) in ws.items()},"candidates":candidates[:25],"cooldown_pages":sorted(cooldown),"recent_runs":runs[:5]}
if __name__=="__main__": print(json.dumps(build_context(),indent=2))

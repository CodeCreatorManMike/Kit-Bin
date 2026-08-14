from __future__ import annotations
import argparse, hashlib
from datetime import date, datetime, timedelta, timezone
from googleapiclient.discovery import build
from auth_google import credentials
from seo_common import SupabaseREST, env, row_id

DIMENSIONS=["date","query","page","country","device"]
def select_site(service):
    sites=[x["siteUrl"] for x in service.sites().list().execute().get("siteEntry",[])]
    configured=env("GSC_SITE_URL")
    for candidate in (configured,"sc-domain:kit-bin.com","https://kit-bin.com/","https://www.kit-bin.com/"):
        if candidate in sites:return candidate
    raise RuntimeError("No accessible Kit-Bin Search Console property; accessible properties: "+", ".join(sites))

def fetch_pages(service, site, start, end, row_limit=25000):
    offset=0
    while True:
        body={"startDate":start.isoformat(),"endDate":end.isoformat(),"dimensions":DIMENSIONS,
              "type":"web","dataState":"final","rowLimit":row_limit,"startRow":offset}
        rows=service.searchanalytics().query(siteUrl=site,body=body).execute().get("rows",[])
        if not rows:return
        yield rows
        if len(rows)<row_limit:return
        offset += row_limit

def convert(api_row, site):
    dims=dict(zip(DIMENSIONS,api_row.get("keys",[])))
    r={"property":site,"data_date":dims.get("date", ""),"query":dims.get("query","") or "",
       "page":dims.get("page","") or "","country":dims.get("country","") or "",
       "device":dims.get("device","") or "","search_type":"web","clicks":int(api_row.get("clicks",0)),
       "impressions":int(api_row.get("impressions",0)),"ctr":float(api_row.get("ctr",0)),
       "position":float(api_row.get("position",0)),"collected_at":datetime.now(timezone.utc).isoformat()}
    r["row_id"]=row_id(r); return r

def range_for(args):
    # Search Console final data commonly lags; never request the most recent two days.
    end=date.today()-timedelta(days=3)
    if args.date:
        start=end=date.fromisoformat(args.date)
    else:start=end-timedelta(days=(args.days or int(__import__('os').getenv('GSC_ROLLING_DAYS','10')))-1)
    return start,end

def run(args, service=None, db=None):
    start,end=range_for(args); service=service or build("searchconsole","v1",credentials=credentials())
    site=select_site(service); db=db or SupabaseREST(); runrec=None; total=0
    if not args.dry_run:
        runrec=db.request("POST","gsc_ingest_runs",data={"started_at":datetime.now(timezone.utc).isoformat(),"status":"running","days_requested":(end-start).days+1},prefer="return=representation")[0]
    try:
        for page in fetch_pages(service,site,start,end):
            rows=[convert(r,site) for r in page]; total += len(rows)
            if not args.dry_run: db.upsert("gsc_daily",rows)
        if runrec: db.request("PATCH","gsc_ingest_runs",params={"id":f"eq.{runrec['id']}"},data={"finished_at":datetime.now(timezone.utc).isoformat(),"status":"success","rows_upserted":total,"error":None},prefer="return=minimal")
        print(f"PASS: property={site} range={start}..{end} rows={'would-upsert' if args.dry_run else 'upserted'}:{total}")
    except Exception as e:
        if runrec:
            db.request("PATCH","gsc_ingest_runs",params={"id":f"eq.{runrec['id']}"},data={"finished_at":datetime.now(timezone.utc).isoformat(),"status":"failed","rows_upserted":total,"error":str(e)[:1000]},prefer="return=minimal")
        raise
    return total

def parser():
    p=argparse.ArgumentParser(); g=p.add_mutually_exclusive_group(); g.add_argument("--days",type=int); g.add_argument("--date"); p.add_argument("--dry-run",action="store_true"); return p
if __name__=="__main__": run(parser().parse_args())

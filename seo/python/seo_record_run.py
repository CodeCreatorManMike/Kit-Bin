import argparse
from datetime import datetime,timezone
from seo_common import SupabaseREST
def start(anchor): return SupabaseREST().request("POST","seo_runs",data={"started_at":datetime.now(timezone.utc).isoformat(),"status":"running","gsc_anchor_date":anchor,"pages_considered":0,"pages_changed":0},prefer="return=representation")[0]
def finish(run_id,**fields):
    fields["finished_at"]=datetime.now(timezone.utc).isoformat(); SupabaseREST().request("PATCH","seo_runs",params={"id":f"eq.{run_id}"},data=fields,prefer="return=representation")

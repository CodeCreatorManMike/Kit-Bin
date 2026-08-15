import argparse,json
from datetime import datetime,timezone
from seo_common import SupabaseREST
def start(anchor): return SupabaseREST().request("POST","seo_runs",data={"started_at":datetime.now(timezone.utc).isoformat(),"status":"running","gsc_anchor_date":anchor,"pages_considered":0,"pages_changed":0},prefer="return=representation")[0]
def finish(run_id,**fields):
    fields["finished_at"]=datetime.now(timezone.utc).isoformat(); SupabaseREST().request("PATCH","seo_runs",params={"id":f"eq.{run_id}"},data=fields,prefer="return=representation")
def main():
    p=argparse.ArgumentParser(); sub=p.add_subparsers(dest="command",required=True)
    a=sub.add_parser("start"); a.add_argument("--anchor",required=True)
    n=sub.add_parser("no-change"); n.add_argument("--anchor",required=True); n.add_argument("--summary",required=True); n.add_argument("--pages-considered",type=int,default=0); n.add_argument("--status",default="success_no_change")
    f=sub.add_parser("finish"); f.add_argument("--id",required=True); f.add_argument("--status",required=True); f.add_argument("--summary",required=True); f.add_argument("--pages-considered",type=int,default=0); f.add_argument("--pages-changed",type=int,default=0); f.add_argument("--deploy-status",default="not_deployed"); f.add_argument("--git-commit") ; f.add_argument("--error")
    args=p.parse_args()
    if args.command=="start": print(start(args.anchor)["id"])
    elif args.command=="no-change":
        r=start(args.anchor); finish(r["id"],status=args.status,summary=args.summary,pages_considered=args.pages_considered,pages_changed=0,deploy_status="not_deployed",error=None); print(r["id"])
    else:
        finish(args.id,status=args.status,summary=args.summary,pages_considered=args.pages_considered,pages_changed=args.pages_changed,deploy_status=args.deploy_status,git_commit=args.git_commit,error=args.error); print(args.id)
if __name__=="__main__":main()

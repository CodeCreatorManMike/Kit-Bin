import argparse,json
from seo_common import SupabaseREST
def record(**fields): return SupabaseREST().request("POST","seo_changes",data=fields,prefer="return=representation")[0]
def main():
    p=argparse.ArgumentParser(); p.add_argument("--seo-run-id",required=True);p.add_argument("--page-url",required=True);p.add_argument("--change-type",required=True);p.add_argument("--reason",required=True);p.add_argument("--evidence-json",required=True);p.add_argument("--before-summary",required=True);p.add_argument("--after-summary",required=True);p.add_argument("--git-commit",required=True);p.add_argument("--deployed-at",required=True);a=p.parse_args()
    r=record(seo_run_id=a.seo_run_id,page_url=a.page_url,change_type=a.change_type,reason=a.reason,evidence=json.loads(a.evidence_json),before_summary=a.before_summary,after_summary=a.after_summary,git_commit=a.git_commit,deployed_at=a.deployed_at,evaluation_status="pending",rolled_back=False);print(r["id"])
if __name__=="__main__":main()

from datetime import date,datetime,timezone
from googleapiclient.discovery import build
from auth_google import credentials
from collector import select_site
from seo_common import SupabaseREST
def main():
    errors=[]
    try: site=select_site(build("searchconsole","v1",credentials=credentials(False))); print(f"PASS: Google {site}")
    except Exception as e: errors.append("Google: "+str(e)); print("FAIL: Google")
    try:
        db=SupabaseREST(); latest=db.request("GET","gsc_daily",params={"select":"data_date","order":"data_date.desc","limit":"1"}); runs=db.request("GET","gsc_ingest_runs",params={"select":"status,finished_at","order":"started_at.desc","limit":"20"})
        print(f"PASS: Supabase latest_data={latest[0]['data_date'] if latest else 'none'} recent_failures={sum(r['status']=='failed' for r in runs)}")
        if not latest or (date.today()-date.fromisoformat(latest[0]['data_date'])).days>7: errors.append("Search Console dataset is stale")
    except Exception as e: errors.append("Supabase: "+str(e)); print("FAIL: Supabase")
    raise SystemExit(1 if errors else 0)
if __name__=="__main__":main()

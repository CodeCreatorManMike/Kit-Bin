from seo_common import SupabaseREST
def main():
    db=SupabaseREST(); failed=False
    for table in ("gsc_daily","gsc_ingest_runs","seo_runs","seo_changes"):
        try: db.request("GET",table,params={"select":"*","limit":"1"}); print(f"PASS: {table} reachable")
        except Exception as e: failed=True; print(f"FAIL: {table}: {type(e).__name__}")
    raise SystemExit(1 if failed else 0)
if __name__=="__main__":main()

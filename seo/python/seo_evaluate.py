from datetime import date,timedelta
from seo_common import SupabaseREST,weighted_position
def metrics(db,page,a,b):
    rows=db.select_all("gsc_daily",params={"select":"data_date,clicks,impressions,position","page":f"eq.{page}","and":f"(data_date.gte.{a},data_date.lte.{b})"})
    rows=[r for r in rows if date.fromisoformat(r.get("data_date",str(a)))<=b] if rows and "data_date" in rows[0] else rows
    imp=sum(r["impressions"] for r in rows); clicks=sum(r["clicks"] for r in rows)
    return {"clicks":clicks,"impressions":imp,"ctr":clicks/imp if imp else 0,"position":weighted_position(rows)}
def main():
    db=SupabaseREST(); changes=db.request("GET","seo_changes",params={"select":"*","rolled_back":"eq.false","order":"created_at.asc"}); latest=db.request("GET","gsc_daily",params={"select":"data_date","order":"data_date.desc","limit":"1"})
    if not latest:return
    anchor=date.fromisoformat(latest[0]["data_date"])
    for c in changes:
        deployed=date.fromisoformat((c.get("deployed_at") or c["created_at"])[:10])
        for days,field in ((7,"result_7d"),(28,"result_28d")):
            if not c.get(field) and anchor>=deployed+timedelta(days=days-1):
                before=metrics(db,c["page_url"],deployed-timedelta(days=days),deployed-timedelta(days=1)); after=metrics(db,c["page_url"],deployed,deployed+timedelta(days=days-1))
                delta={k:after[k]-before[k] for k in before}; pct={k:(delta[k]/before[k]*100 if before[k] else None) for k in before}
                result={"before":before,"after":after,"absolute_change":delta,"percentage_change":pct,"caveat":"Observed correlation; other factors may explain changes."}
                db.request("PATCH","seo_changes",params={"id":f"eq.{c['id']}"},data={field:result,"evaluation_status":f"{days}d_complete"},prefer="return=minimal")
if __name__=="__main__":main()

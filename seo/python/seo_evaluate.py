from datetime import date,timedelta
from seo_common import SupabaseREST,weighted_position
def metrics(db,page,a,b):
    rows=db.request("GET","gsc_daily",params={"select":"data_date,clicks,impressions,position","page":f"eq.{page}","data_date":f"gte.{a}"})
    rows=[r for r in rows if date.fromisoformat(r.get("data_date",str(a)))<=b] if rows and "data_date" in rows[0] else rows
    imp=sum(r["impressions"] for r in rows); clicks=sum(r["clicks"] for r in rows)
    return {"clicks":clicks,"impressions":imp,"ctr":clicks/imp if imp else 0,"position":weighted_position(rows)}
def main():
    db=SupabaseREST(); changes=db.request("GET","seo_changes",params={"select":"*","rolled_back":"eq.false","order":"created_at.asc"}); today=date.today()
    for c in changes:
        deployed=date.fromisoformat((c.get("deployed_at") or c["created_at"])[:10])
        for days,field in ((7,"result_7d"),(28,"result_28d")):
            if not c.get(field) and today>=deployed+timedelta(days=days*2):
                before=metrics(db,c["page_url"],deployed-timedelta(days=days),deployed-timedelta(days=1)); after=metrics(db,c["page_url"],deployed+timedelta(days=days),deployed+timedelta(days=days*2-1))
                result={"before":before,"after":after,"caveat":"Observed correlation; other factors may explain changes."}
                db.request("PATCH","seo_changes",params={"id":f"eq.{c['id']}"},data={field:result,"evaluation_status":f"{days}d_complete"},prefer="return=minimal")
if __name__=="__main__":main()

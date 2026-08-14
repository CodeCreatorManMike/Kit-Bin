from datetime import date,timedelta
from googleapiclient.discovery import build
from auth_google import credentials
from collector import select_site
def main():
    s=build("searchconsole","v1",credentials=credentials()); site=select_site(s); d=date.today()-timedelta(days=7)
    rows=s.searchanalytics().query(siteUrl=site,body={"startDate":d.isoformat(),"endDate":d.isoformat(),"dimensions":["date"],"type":"web","dataState":"final","rowLimit":10}).execute().get("rows",[])
    print(f"PASS: property={site} date={d} rows={len(rows)} clicks={sum(x.get('clicks',0) for x in rows):.0f} impressions={sum(x.get('impressions',0) for x in rows):.0f}")
if __name__=="__main__":main()

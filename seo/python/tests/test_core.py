from datetime import date
from types import SimpleNamespace
from seo_common import row_id,weighted_position,windows
from collector import convert,fetch_pages
from seo_context import classify
def test_row_id_deterministic():
    r={"property":"p","search_type":"web","data_date":"2026-01-01","query":"q","page":"u","country":"gbr","device":"mobile"}; assert row_id(r)==row_id(dict(r))
def test_normalization():
    r=convert({"keys":["2026-01-01","q","u","gbr","mobile"],"clicks":2,"impressions":10,"ctr":.2,"position":4},"p"); assert r["clicks"]==2 and len(r["row_id"])==64
def test_weighted_position(): assert weighted_position([{"position":2,"impressions":10},{"position":10,"impressions":30}])==8
def test_windows(): assert windows(date(2026,1,28))["last_7"]==(date(2026,1,22),date(2026,1,28))
def test_opportunity_threshold_and_cooldown_input():
    assert classify([{"query":"q","page":"p","clicks":1,"impressions":100,"ctr":.01,"position":7}],[])[0]["confidence"]=="high"
    assert classify([{"query":"q","page":"p","clicks":0,"impressions":3,"ctr":0,"position":7}],[])==[]
class Req:
    def __init__(self,x):self.x=x
    def execute(self):return self.x
class SA:
    def __init__(self):self.n=0
    def query(self,**kw):self.n+=1; return Req({"rows":[{}]*2} if self.n==1 else {"rows":[]})
class Service:
    def __init__(self):self.sa=SA()
    def searchanalytics(self):return self.sa
def test_pagination_and_empty(): assert sum(map(len,fetch_pages(Service(),"p",date.today(),date.today(),2)))==2
def test_batching():
    from seo_common import SupabaseREST
    x=object.__new__(SupabaseREST); calls=[]; x.request=lambda *a,**k:calls.append(k["data"]); x.upsert("t",list(range(11)),5); assert list(map(len,calls))==[5,5,1]
def test_select_all_paginates():
    from seo_common import SupabaseREST
    x=object.__new__(SupabaseREST); pages=[[1,2],[3]]; x.request=lambda *a,**k:pages.pop(0); assert x.select_all("t",page_size=2)==[1,2,3]
def test_empty_response_stops_pagination(): assert list(fetch_pages(Service(),"p",date.today(),date.today(),3))==[[{},{}]]

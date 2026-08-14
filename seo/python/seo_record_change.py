from seo_common import SupabaseREST
def record(**fields): return SupabaseREST().request("POST","seo_changes",data=fields,prefer="return=representation")[0]

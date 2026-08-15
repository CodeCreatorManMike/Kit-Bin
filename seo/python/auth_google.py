from __future__ import annotations
import json, os
from pathlib import Path
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from seo_common import ROOT, SCOPE

def credentials(interactive=True):
    token, client = ROOT/"token.json", ROOT/"credentials.json"
    creds = None
    if token.exists():
        try: creds = Credentials.from_authorized_user_file(token, SCOPE)
        except Exception: creds = None
    if creds and creds.expired and creds.refresh_token:
        creds.refresh(Request())
    if not creds or not creds.valid:
        if not interactive: raise RuntimeError("Google token unavailable or invalid; run auth_google.py interactively")
        doc = json.loads(client.read_text())
        if "installed" not in doc: raise RuntimeError("credentials.json must be a Desktop/installed OAuth client; Web clients are intentionally rejected")
        creds = InstalledAppFlow.from_client_secrets_file(str(client), SCOPE).run_local_server(
            host="127.0.0.1", port=0, open_browser=True, access_type="offline",
            prompt="select_account consent")
    token.write_text(creds.to_json()); os.chmod(token, 0o600)
    return creds

if __name__ == "__main__": credentials(True); print("PASS: Google credentials stored securely")

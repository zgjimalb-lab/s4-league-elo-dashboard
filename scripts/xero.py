"""Minimaler Client für die Xero API (https://xero.gg/settings/api/documentation)."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE_URL = "https://xero.gg/api"
REQUEST_PAUSE_SEC = 3  # die API antwortet bei schnellen Folge-Requests mit "Please try again in a few seconds."
MAX_RETRIES = 4


def load_env_file(path: Path) -> None:
    """Liest KEY=VALUE-Zeilen (z.B. aus .env.local) in os.environ, ohne bestehende Variablen zu überschreiben."""
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())


class XeroClient:
    def __init__(self, access_key_id: str, secret_access_key: str):
        self.headers = {
            "x-api-access-key-id": access_key_id,
            "x-api-secret-access-key": secret_access_key,
            "User-Agent": "s4-league-elo-dashboard",
        }
        self._last_request = 0.0

    @classmethod
    def from_env(cls) -> "XeroClient":
        key_id = os.environ.get("XERO_ACCESS_KEY_ID")
        secret = os.environ.get("XERO_SECRET_ACCESS_KEY")
        if not key_id or not secret:
            raise SystemExit("XERO_ACCESS_KEY_ID und XERO_SECRET_ACCESS_KEY müssen gesetzt sein (lokal in .env.local).")
        return cls(key_id, secret)

    def _get(self, path: str, params: dict) -> dict:
        url = f"{BASE_URL}{path}?{urllib.parse.urlencode(params)}"
        for attempt in range(1, MAX_RETRIES + 1):
            wait = self._last_request + REQUEST_PAUSE_SEC - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            self._last_request = time.monotonic()
            request = urllib.request.Request(url, headers=self.headers)
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    body = json.load(response)
            except urllib.error.HTTPError as error:
                try:
                    body = json.loads(error.read() or b"{}")
                except json.JSONDecodeError:
                    body = {"text": f"HTTP {error.code}"}
            if "matches" in body:
                return body
            if "try again" not in str(body.get("text", "")).lower():
                raise RuntimeError(f"{path}: {body}")
            time.sleep(REQUEST_PAUSE_SEC * attempt)  # Rate-Limit: länger warten und erneut versuchen
        raise RuntimeError(f"{path}: nach {MAX_RETRIES} Versuchen keine Antwort ({body})")

    def own_matches(self, limit: int = 100, skip: int = 0) -> list[dict]:
        """Matches des Key-Besitzers, neueste zuerst."""
        return self._get("/match/self", {"players": 1, "limit": limit, "skip": skip})["matches"]

    def player_matches(self, name: str, limit: int = 25) -> list[dict]:
        """Letzte Matches eines beliebigen Spielers, neueste zuerst."""
        return self._get(f"/match/player/{urllib.parse.quote(name, safe='')}", {"players": 1, "limit": limit})["matches"]

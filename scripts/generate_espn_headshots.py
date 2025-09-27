#!/usr/bin/env python3
"""Generate ESPN headshot URL mappings for Pulse mock NFL players.

The script loads the 2,400+ mocked NFL players from the pulse mock cassettes,
enriches them with ESPN player ids sourced from the public Sleeper API, and
emits a JSON artifact that maps PrizePicks player ids to ESPN headshot URLs.

Usage:
    python scripts/generate_espn_headshots.py [--output public/espn-headshots.json]

If the Sleeper API cannot be reached, the script still produces an artifact
with fallback headshots so the UI can degrade gracefully.
"""

from __future__ import annotations

import argparse
import json
import logging
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, Iterable, List, Optional

import yaml

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))
PULSE_SRC = ROOT / "pulse-mock"
if str(PULSE_SRC) not in sys.path:
    sys.path.insert(0, str(PULSE_SRC))

try:
    import requests
except ModuleNotFoundError as exc:  # pragma: no cover - helpful error for users
    raise SystemExit(
        "requests is required. Install it via `pip install requests` before running this script."
    ) from exc

SLEEPER_PLAYERS_URL = "https://api.sleeper.app/v1/players/nfl"
ESPN_HEADSHOT_URL = "https://a.espncdn.com/i/headshots/nfl/players/full/{espn_id}.png"
ESPN_CFB_HEADSHOT_URL = "https://a.espncdn.com/i/headshots/college-football/players/full/{espn_id}.png"
FALLBACK_HEADSHOT = "https://a.espncdn.com/i/headshots/nfl/players/full/default.png"
SPORTSDATA_API_KEY = os.getenv("a20433dc663d4b3ab74f6a88981a9284")
SPORTSDATA_ENDPOINT = os.getenv(
    "SPORTSDATA_PLAYERS_URL",
    "https://api.sportsdata.io/v3/nfl/scores/json/Players",
)


def normalise(text: str) -> str:
    return " ".join(text.lower().strip().split())


@dataclass
class PlayerRecord:
    prizepicks_id: str
    full_name: str
    team: Optional[str]
    position: Optional[str]


@dataclass
class SleeperRecord:
    espn_id: Optional[str]
    full_name: str
    team: Optional[str]
    position: Optional[str]
    is_college: bool = False

    @classmethod
    def from_dict(cls, payload: Dict[str, object]) -> "SleeperRecord":
        full_name = payload.get("full_name") or ""
        # Sleeper sometimes omits full_name but has separate fields
        if not full_name:
            first = payload.get("first_name") or ""
            last = payload.get("last_name") or ""
            full_name = f"{first} {last}".strip()

        espn_id = payload.get("espn_id") or payload.get("espn_player_id")
        # Sleeper returns ints or strings; coerce to str for URL formatting
        if isinstance(espn_id, int):
            espn_id = str(espn_id)

        return cls(
            espn_id=espn_id if isinstance(espn_id, str) and espn_id.strip() else None,
            full_name=full_name,
            team=(payload.get("team") or payload.get("fantasy_positions") or None),
            position=(payload.get("position") or None),
            is_college=bool(payload.get("college")) and not payload.get("team"),
        )

    def headshot_url(self) -> Optional[str]:
        if not self.espn_id:
            return None
        template = ESPN_CFB_HEADSHOT_URL if self.is_college else ESPN_HEADSHOT_URL
        return template.format(espn_id=self.espn_id)


def load_pulse_players() -> List[PlayerRecord]:
    cassette_dir = PULSE_SRC / "pulse_mock" / "cassettes"
    if not cassette_dir.exists():
        raise SystemExit(f"Cassette directory not found: {cassette_dir}")

    players: Dict[str, PlayerRecord] = {}

    for cassette in sorted(cassette_dir.glob("*.yml")) + sorted(cassette_dir.glob("*.yaml")):
        try:
            with cassette.open("r", encoding="utf-8") as fh:
                data = yaml.safe_load(fh)
        except yaml.YAMLError as exc:  # pragma: no cover - defensive logging
            logging.warning("Skipping %s due to YAML error: %s", cassette.name, exc)
            continue

        interactions = data.get("interactions") if isinstance(data, dict) else None
        if not interactions:
            continue

        for interaction in interactions:
            response = interaction.get("response", {}) if isinstance(interaction, dict) else {}
            body = response.get("body")
            if isinstance(body, dict):
                body = body.get("string")
            if not isinstance(body, str):
                continue
            try:
                payload = json.loads(body)
            except json.JSONDecodeError:
                continue

            candidate_rows: List[Dict[str, object]] = []
            if isinstance(payload, list):
                candidate_rows = [row for row in payload if isinstance(row, dict) and row.get("id")]
            elif isinstance(payload, dict) and payload.get("id"):
                candidate_rows = [payload]
            else:
                continue

            for row in candidate_rows:
                player_id = row.get("id")
                if not isinstance(player_id, str):
                    continue
                first = row.get("first_name") or ""
                last = row.get("last_name") or ""
                if not first and not last:
                    continue  # skip non-player records
                full_name = f"{first} {last}".strip()
                team = None
                team_data = row.get("team")
                if isinstance(team_data, dict):
                    team = (
                        team_data.get("abbreviation")
                        or team_data.get("name")
                        or team_data.get("market")
                    )
                players[player_id] = PlayerRecord(
                    prizepicks_id=player_id,
                    full_name=full_name,
                    team=team,
                    position=row.get("position"),
                )

    return list(players.values())


def fetch_sleeper_players() -> Dict[str, SleeperRecord]:
    logging.info("Fetching Sleeper NFL player dataset …")
    response = requests.get(SLEEPER_PLAYERS_URL, timeout=60)
    response.raise_for_status()
    payload = response.json()

    records: Dict[str, SleeperRecord] = {}
    if isinstance(payload, dict):
        for value in payload.values():
            if not isinstance(value, dict):
                continue
            record = SleeperRecord.from_dict(value)
            if not record.full_name:
                continue
            key = normalise(record.full_name)
            records.setdefault(key, record)
    else:
        logging.warning("Unexpected Sleeper payload structure; got %s", type(payload))
    logging.info("Loaded %d Sleeper records", len(records))
    return records


def fetch_sportsdata_players() -> Dict[str, str]:
    if not SPORTSDATA_API_KEY:
        logging.warning("SPORTSDATA_API_KEY not set; skipping SportsData.io enrichment")
        return {}

    logging.info("Fetching SportsData.io NFL player dataset …")
    response = requests.get(
        SPORTSDATA_ENDPOINT,
        headers={"Ocp-Apim-Subscription-Key": SPORTSDATA_API_KEY},
        timeout=60,
    )
    response.raise_for_status()
    payload = response.json()

    records: Dict[str, str] = {}
    if isinstance(payload, list):
        for row in payload:
            if not isinstance(row, dict):
                continue
            first = row.get("FirstName") or ""
            last = row.get("LastName") or ""
            full_name = f"{first} {last}".strip()
            photo = row.get("PhotoUrl")
            if not full_name or not isinstance(photo, str) or not photo.strip():
                continue
            records[normalise(full_name)] = photo
    logging.info("Loaded %d SportsData.io records", len(records))
    return records


def match_player(
    player: PlayerRecord,
    sleeper_index: Dict[str, SleeperRecord],
    sportsdata_index: Dict[str, str],
) -> Dict[str, Optional[str]]:
    name_key = normalise(player.full_name)

    sportsdata_headshot = sportsdata_index.get(name_key)
    if sportsdata_headshot:
        return {
            "espn_id": None,
            "headshot": sportsdata_headshot,
            "confidence": "sportsdata",
        }

    match = sleeper_index.get(name_key)

    if match and match.espn_id:
        return {
            "espn_id": match.espn_id,
            "headshot": match.headshot_url() or FALLBACK_HEADSHOT,
            "confidence": "exact-name",
        }

    # Attempt secondary heuristics: strip suffixes like Jr., Sr., III
    stripped_name = (
        name_key.replace(" jr", "").replace(" sr", "").replace(" iii", "").replace(" ii", "")
    ).strip()

    sportsdata_headshot = sportsdata_index.get(stripped_name)
    if sportsdata_headshot:
        return {
            "espn_id": None,
            "headshot": sportsdata_headshot,
            "confidence": "sportsdata-suffix-stripped",
        }

    if stripped_name and stripped_name != name_key:
        match = sleeper_index.get(stripped_name)
        if match and match.espn_id:
            return {
                "espn_id": match.espn_id,
                "headshot": match.headshot_url() or FALLBACK_HEADSHOT,
                "confidence": "name-with-suffix-stripped",
            }

    return {
        "espn_id": None,
        "headshot": FALLBACK_HEADSHOT,
        "confidence": "fallback",
    }


def build_headshot_map(players: Iterable[PlayerRecord]) -> Dict[str, Dict[str, Optional[str]]]:
    try:
        sleeper_index = fetch_sleeper_players()
    except Exception as exc:  # pragma: no cover - network exceptions
        logging.error("Failed to fetch Sleeper dataset: %s", exc)
        sleeper_index = {}

    try:
        sportsdata_index = fetch_sportsdata_players()
    except Exception as exc:  # pragma: no cover - network exceptions
        logging.error("Failed to fetch SportsData.io dataset: %s", exc)
        sportsdata_index = {}

    enriched: Dict[str, Dict[str, Optional[str]]] = {}
    stats = {"total_players": 0, "matched": 0, "fallback": 0}

    for player in players:
        stats["total_players"] += 1
        if not player.prizepicks_id:
            continue

        metadata = match_player(player, sleeper_index, sportsdata_index)
        if metadata["confidence"] != "fallback":
            stats["matched"] += 1
        else:
            stats["fallback"] += 1

        enriched[player.prizepicks_id] = {
            "full_name": player.full_name,
            "team": player.team,
            "position": player.position,
            **metadata,
        }

    logging.info(
        "Matched %d/%d players (fallback for %d)",
        stats["matched"],
        stats["total_players"],
        stats["fallback"],
    )
    enriched["_stats"] = stats
    return enriched


def write_output(data: Dict[str, Dict[str, Optional[str]]], destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, sort_keys=True)
    logging.info("Wrote %s", destination)


def parse_args(argv: List[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate ESPN headshot mapping for Pulse mock players")
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("data/espn-headshots.json"),
        help="Destination JSON file",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Enable debug logging",
    )
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format="%(levelname)s %(message)s")

    players = load_pulse_players()
    logging.info("Loaded %d PrizePicks players from Pulse mock", len(players))

    headshot_map = build_headshot_map(players)
    write_output(headshot_map, args.output)
    return 0


if __name__ == "__main__":  # pragma: no branch
    raise SystemExit(main())

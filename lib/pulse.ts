const BASE = "/api/pulse";

export type League = { id: string; name: string };
export type Team = { id: string; market?: string; name?: string; abbreviation?: string };
export type Player = { id: string; first_name?: string; last_name?: string; position?: string; team_id?: string };

export async function getLeagues(): Promise<League[]> {
  const res = await fetch(`${BASE}/v1/leagues`);
  if (!res.ok) throw new Error("Failed to fetch leagues");
  return res.json();
}

export async function getTeams(league: string): Promise<Team[]> {
  const res = await fetch(`${BASE}/v1/leagues/${encodeURIComponent(league)}/teams`);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

export async function getPlayers(league: string): Promise<Player[]> {
  const res = await fetch(`${BASE}/v1/leagues/${encodeURIComponent(league)}/players`);
  if (!res.ok) throw new Error("Failed to fetch players");
  return res.json();
}



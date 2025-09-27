export async function explainLLM(entity_key: string, features: Record<string, number>) {
  const res = await fetch("/api/llm", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ entity_key, features }),
  });
  if (!res.ok) throw new Error("LLM error");
  return res.json();
}



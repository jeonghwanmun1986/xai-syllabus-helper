// POST /api/suggest
// body: { dept, name, desc, totalWeeks }
// returns: { tools: [{name, use, reason}], recommendedWeeks: [n,n,n,n,n], rationale: "..." }
//
// Requires the ANTHROPIC_API_KEY environment variable to be set in the
// Vercel project (Project Settings -> Environment Variables). The key is
// never exposed to the browser -- this function runs server-side only.

var WEEKS_TARGET = 5;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "missing_api_key", message: "ANTHROPIC_API_KEY가 설정되지 않았습니다. Vercel 프로젝트 환경변수에 추가해주세요." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const dept = String((body && body.dept) || "").slice(0, 200);
  const name = String((body && body.name) || "").slice(0, 200);
  const desc = String((body && body.desc) || "").slice(0, 500);
  const totalWeeks = Math.max(8, Math.min(20, Number((body && body.totalWeeks) || 15)));

  if (!dept || !name) {
    res.status(400).json({ error: "invalid_request", message: "학과와 교과목명이 필요합니다." });
    return;
  }

  const prompt =
    "당신은 한국 대학의 NCS 기반 교육과정 설계를 돕는 전문가입니다.\n" +
    "아래 교과목에 AI 활용 수업을 도입하려고 합니다.\n\n" +
    "- 학과: " + dept + "\n" +
    "- 교과목명: " + name + "\n" +
    "- 교과목 설명(있는 경우): " + (desc || "없음") + "\n" +
    "- 총 강의 주차 수: " + totalWeeks + "주\n\n" +
    "이 교과목의 특성에 맞는 AI 활용 아이디어를 제안하세요.\n" +
    "다음 JSON 형식으로만 답하세요 (다른 설명 텍스트 없이):\n" +
    '{\n' +
    '  "tools": [ {"name": "AI 툴 이름", "use": "이 교과목에서 어떻게 활용하는지 1문장", "reason": "추천 이유 1문장"} ],\n' +
    '  "recommendedWeeks": [숫자, 숫자, 숫자, 숫자, 숫자],\n' +
    '  "rationale": "왜 이 주차들을 추천하는지 2~3문장"\n' +
    '}\n' +
    "tools는 3~4개, recommendedWeeks는 1~" + totalWeeks + " 범위에서 서로 다른 " + WEEKS_TARGET + "개를 학기 전반에 걸쳐 분산해서 고르세요.";

  try {
    const data = await callClaude(apiKey, prompt, 1200);
    if (Array.isArray(data && data.recommendedWeeks)) {
      data.recommendedWeeks = data.recommendedWeeks
        .map(Number)
        .filter(function (n) { return n >= 1 && n <= totalWeeks; })
        .slice(0, WEEKS_TARGET);
    }
    res.status(200).json(data);
  } catch (e) {
    res.status(502).json({ error: "upstream_error", message: String((e && e.message) || e) });
  }
};

async function callClaude(apiKey, prompt, maxTokens) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: maxTokens || 1200,
      messages: [{ role: "user", content: prompt }]
    })
  });
  if (!resp.ok) {
    const t = await resp.text().catch(function () { return ""; });
    throw new Error("Anthropic API " + resp.status + ": " + t.slice(0, 300));
  }
  const json = await resp.json();
  const text = (json.content || []).map(function (b) { return b.text || ""; }).join("");
  return parseJsonLoose(text);
}

function parseJsonLoose(text) {
  try { return JSON.parse(text); } catch (e) { /* fall through */ }
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) {
    try { return JSON.parse(fence[1]); } catch (e) { /* fall through */ }
  }
  const start = text.search(/[\{\[]/);
  const endBrace = text.lastIndexOf("}");
  const endBracket = text.lastIndexOf("]");
  const end = Math.max(endBrace, endBracket);
  if (start !== -1 && end !== -1 && end > start) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) { /* fall through */ }
  }
  throw new Error("AI 응답을 JSON으로 해석하지 못했습니다.");
}

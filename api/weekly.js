// POST /api/weekly
// body: { dept, name, desc, totalWeeks, weeks: [n,n,n,n,n], toolNames: "A, B, C" }
// returns: [ {week, expectedTopic, suggestion}, ... ]  (length == weeks.length)
//
// Requires the ANTHROPIC_API_KEY environment variable (see api/suggest.js).

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
  const weeks = Array.isArray(body && body.weeks)
    ? body.weeks.map(Number).filter(function (n) { return n >= 1 && n <= totalWeeks; }).slice(0, WEEKS_TARGET)
    : [];
  const toolNames = String((body && body.toolNames) || "").slice(0, 300);

  if (!dept || !name || weeks.length !== WEEKS_TARGET) {
    res.status(400).json({ error: "invalid_request", message: "학과, 교과목명과 정확히 " + WEEKS_TARGET + "개의 주차가 필요합니다." });
    return;
  }
  const sortedWeeks = weeks.slice().sort(function (a, b) { return a - b; });

  const prompt =
    "당신은 한국 대학의 NCS 교과목에 AI 활용을 제안하는 전문가입니다.\n" +
    "아래 교과목의 지정된 주차마다, 그 주차에 일반적으로 다뤄질 만한 학습 내용을 예상하고, AI를 어떻게 활용하면 좋을지 한두 문장으로 제안하세요. 교수님이 기존 강의계획서에 그대로 덧붙여 적을 수 있도록 간결하게 작성하세요.\n\n" +
    "- 학과: " + dept + "\n" +
    "- 교과목명: " + name + "\n" +
    "- 교과목 설명(있는 경우): " + (desc || "없음") + "\n" +
    "- 총 강의 주차 수: " + totalWeeks + "주\n" +
    "- 대상 주차: " + sortedWeeks.join(", ") + "주차\n" +
    "- 참고할 추천 AI 툴(자유롭게 선택 가능): " + (toolNames || "자유 선택") + "\n\n" +
    "각 주차마다 다음을 작성하세요:\n" +
    '1. expectedTopic: 그 주차에 일반적으로 다뤄질 만한 학습 내용을 5~15자 내외로 짧게 (예: "포인터와 배열 활용")\n' +
    "2. suggestion: 학과 특성·교과목명 특성·추천 AI 툴을 반영해 이 주차에 AI를 어떻게 활용하면 좋을지 한두 문장으로 제안 (교수님이 강의계획서에 그대로 붙여넣을 수 있는 문장체로, '~한다' 또는 '~하도록 한다'로 끝내기)\n\n" +
    "다음 JSON 배열 형식으로만 답하세요 (다른 설명 없이), week 오름차순으로 " + sortedWeeks.length + "개 항목:\n" +
    '[ {"week": 숫자, "expectedTopic": "...", "suggestion": "..."}, ... ]';

  try {
    const data = await callClaude(apiKey, prompt, 2000);
    if (!Array.isArray(data) || !data.length) throw new Error("empty_result");
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
      max_tokens: maxTokens || 2000,
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

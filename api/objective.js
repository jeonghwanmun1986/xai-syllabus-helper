// POST /api/objective
// body: { dept, name, desc, credit, hours, toolNames }
// returns: { text: "..." }  (a single-paragraph 교육목표)
//
// Requires the GEMINI_API_KEY environment variable (see api/suggest.js).

var MODEL = "gemini-2.5-flash";

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "missing_api_key", message: "GEMINI_API_KEY가 설정되지 않았습니다. Vercel 프로젝트 환경변수에 추가해주세요." });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const dept = String((body && body.dept) || "").slice(0, 200);
  const name = String((body && body.name) || "").slice(0, 200);
  const desc = String((body && body.desc) || "").slice(0, 500);
  const credit = String((body && body.credit) || "").slice(0, 20);
  const hours = String((body && body.hours) || "").slice(0, 20);
  const toolNames = String((body && body.toolNames) || "").slice(0, 300);

  if (!dept || !name) {
    res.status(400).json({ error: "invalid_request", message: "학과와 교과목명이 필요합니다." });
    return;
  }

  const prompt =
    "당신은 한국 대학의 X+AI 사업 강의계획서 교육목표를 작성하는 전문가입니다.\n" +
    "아래 교과목의 교육목표를 한 문단으로 작성하세요.\n\n" +
    "- 학과: " + dept + "\n" +
    "- 교과목명: " + name + "\n" +
    (credit ? "- 학점: " + credit + "\n" : "") +
    (hours ? "- 시수: " + hours + "\n" : "") +
    "- 교과목 설명(있는 경우): " + (desc || "없음") + "\n" +
    "- 참고할 추천 AI 툴(있으면): " + (toolNames || "없음") + "\n\n" +
    "다음 두 예시와 같은 문체·구조로 작성하세요 (라벨 '(예시)'는 붙이지 마세요):\n" +
    "(예시1) 인공지능의 기본 개념과 머신러닝·딥러닝의 원리, 생성형 AI의 작동 방식과 활용 범위 등 AI 기초 이론을 30시간 학습하고, 실습용 PC와 생성형 AI 도구(ChatGPT 등) 및 노코드 AI 플랫폼 활용을 통해 실생활·전공 문제에 AI를 적용하는 기초 역량을 학습함\n" +
    "(예시2) 전기·전자 회로와 신호, 전력 시스템 등 전기공학의 기본 원리에 더해 데이터 기반 예측·진단 등 AI 융합 적용 방법을 45시간 학습하고, 실습용 PC와 Python(NumPy·scikit-learn), MATLAB·Simulink, 회로 시뮬레이션 소프트웨어 활용을 통해 전기공학 문제를 AI로 해결하는 과정을 학습함\n\n" +
    "위 예시처럼 '핵심 학습내용을 N시간 학습하고, 실습용 PC와 [구체적 도구]를 활용하여 [적용 내용]을 학습함' 구조의 한 문단(전체 3~4문장 이내, '~함'으로 끝나는 문어체)으로 작성하세요. 문단 텍스트만 출력하고 다른 설명은 덧붙이지 마세요.";

  try {
    const text = await callGeminiText(apiKey, prompt, 700);
    res.status(200).json({ text: text.trim() });
  } catch (e) {
    res.status(502).json({ error: "upstream_error", message: String((e && e.message) || e) });
  }
};

async function callGeminiText(apiKey, prompt, maxTokens) {
  const url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent";
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: maxTokens || 700 }
    })
  });
  if (!resp.ok) {
    const t = await resp.text().catch(function () { return ""; });
    throw new Error("Gemini API " + resp.status + ": " + t.slice(0, 300));
  }
  const json = await resp.json();
  const candidate = (json.candidates || [])[0];
  const text = ((candidate && candidate.content && candidate.content.parts) || [])
    .map(function (p) { return p.text || ""; }).join("");
  if (!text) throw new Error("empty_response");
  return text;
}

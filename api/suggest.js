// POST /api/suggest
// body: { dept, name, desc, totalWeeks }
// returns: { tools: [{name, use, reason}], recommendedWeeks: [n,n,n,n,n], rationale: "..." }
//
// Fully rule-based (template) generator -- no external AI API, no API key,
// no cost. Tool suggestions are chosen by matching department/course
// keywords against a fixed lookup table (see api/_lib/templates.js).

var tpl = require("./_lib/templates");
var WEEKS_TARGET = 5;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "method_not_allowed" });
    return;
  }

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const dept = String((body && body.dept) || "").slice(0, 200);
  const name = String((body && body.name) || "").slice(0, 200);
  const totalWeeks = Math.max(8, Math.min(20, Number((body && body.totalWeeks) || 15)));

  if (!dept || !name) {
    res.status(400).json({ error: "invalid_request", message: "학과와 교과목명이 필요합니다." });
    return;
  }

  try {
    const tools = tpl.matchTools(dept, name).slice(0, 4);
    const recommendedWeeks = tpl.spreadWeeks(totalWeeks, WEEKS_TARGET);
    const rationale =
      dept + " 특성과 '" + name + "' 교과목 내용을 고려해, 학기 초반에는 개념 이해, 중반에는 실습 적용, " +
      "후반에는 프로젝트 완성 단계에 AI 활용이 자연스럽게 연결되도록 " + recommendedWeeks.join(", ") +
      "주차에 배치했습니다. 총 " + totalWeeks + "주 중 5개 주차를 학기 전반에 고르게 분산한 결과입니다.";

    res.status(200).json({ tools: tools, recommendedWeeks: recommendedWeeks, rationale: rationale });
  } catch (e) {
    res.status(500).json({ error: "internal_error", message: String((e && e.message) || e) });
  }
};

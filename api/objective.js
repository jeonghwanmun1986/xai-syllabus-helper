// POST /api/objective
// body: { dept, name, desc, credit, hours, toolNames }
// returns: { text: "..." }  (a single-paragraph 교육목표)
//
// Fully rule-based (template) generator -- no external AI API, no API key,
// no cost. Fills a fixed sentence template with department/course details.

var tpl = require("./_lib/templates");

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
  const desc = String((body && body.desc) || "").slice(0, 500);
  const credit = String((body && body.credit) || "").slice(0, 20);
  const hours = String((body && body.hours) || "").slice(0, 20);
  const toolNames = String((body && body.toolNames) || "").slice(0, 300);

  if (!dept || !name) {
    res.status(400).json({ error: "invalid_request", message: "학과와 교과목명이 필요합니다." });
    return;
  }

  try {
    var coreTopic = desc
      ? (desc.length > 60 ? desc.slice(0, 60) + "…" : desc)
      : (name + "의 핵심 이론과 실무 활용 방법");

    var hoursNum = Number(hours) || (Number(credit) ? Number(credit) * 15 : 0);
    var hoursPhrase = hoursNum > 0 ? (hoursNum + "시간 학습하고,") : "학기 동안 체계적으로 학습하고,";

    var toolsPhrase = toolNames || tpl.matchTools(dept, name).slice(0, 3).map(function (t) { return t.name; }).join(", ");

    var text =
      coreTopic + "을 " + hoursPhrase + " 실습용 PC와 " + toolsPhrase + " 활용을 통해 " +
      dept + " 전공 실무 및 " + name + " 관련 문제에 AI를 적용하는 기초 역량을 학습함";

    res.status(200).json({ text: text });
  } catch (e) {
    res.status(500).json({ error: "internal_error", message: String((e && e.message) || e) });
  }
};

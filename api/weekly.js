// POST /api/weekly
// body: { dept, name, desc, totalWeeks, weeks: [n,n,n,n,n], toolNames: "A, B, C" }
// returns: [ {week, expectedTopic, suggestion}, ... ]  (length == weeks.length)
//
// Fully rule-based (template) generator -- no external AI API, no API key,
// no cost. Picks a topic label and a sentence template based on how far
// into the semester each selected week falls.

var tpl = require("./_lib/templates");
var WEEKS_TARGET = 5;

var TOPIC_LABELS = {
  early: ["기초 개념 이해", "기본 이론과 배경", "핵심 용어와 원리 정리"],
  mid: ["실습 및 응용", "사례 분석과 적용 연습", "실무 데이터 다루기"],
  late: ["심화 프로젝트", "결과물 제작 및 발표 준비", "종합 실습과 피드백"]
};

var VERB_TEMPLATES = [
  "{tool}로 {topic} 관련 예시를 함께 만들어보고 결과를 비교·분석하도록 한다.",
  "{tool}를 활용해 관련 자료를 요약·정리한 뒤 발표 자료에 반영하도록 한다.",
  "{tool}로 초안을 생성한 후 학생들이 직접 검토·수정하며 개선점을 찾도록 한다.",
  "{tool}를 활용해 실습 결과를 점검하고 개선 아이디어를 도출하도록 한다.",
  "{tool}로 관련 사례를 조사한 뒤 토의 자료로 활용하도록 한다."
];

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
  const weeks = Array.isArray(body && body.weeks)
    ? body.weeks.map(Number).filter(function (n) { return n >= 1 && n <= totalWeeks; }).slice(0, WEEKS_TARGET)
    : [];
  const toolNamesRaw = String((body && body.toolNames) || "").slice(0, 300);

  if (!dept || !name || weeks.length !== WEEKS_TARGET) {
    res.status(400).json({ error: "invalid_request", message: "학과, 교과목명과 정확히 " + WEEKS_TARGET + "개의 주차가 필요합니다." });
    return;
  }
  const sortedWeeks = weeks.slice().sort(function (a, b) { return a - b; });

  try {
    var toolList = toolNamesRaw
      ? toolNamesRaw.split(",").map(function (s) { return s.trim(); }).filter(Boolean)
      : tpl.matchTools(dept, name).map(function (t) { return t.name; });
    if (!toolList.length) toolList = tpl.DEFAULT_TOOLS.map(function (t) { return t.name; });

    var result = sortedWeeks.map(function (week, idx) {
      var frac = week / totalWeeks;
      var band = frac < 0.35 ? "early" : (frac < 0.7 ? "mid" : "late");
      var labels = TOPIC_LABELS[band];
      var topicLabel = labels[idx % labels.length];
      var expectedTopic = name + " " + topicLabel;
      if (expectedTopic.length > 15) expectedTopic = topicLabel; // keep it short per spec (5~15자 내외)

      var tool = toolList[idx % toolList.length];
      var verbTpl = VERB_TEMPLATES[idx % VERB_TEMPLATES.length];
      var suggestion = verbTpl.replace("{tool}", tool).replace("{topic}", topicLabel);

      return { week: week, expectedTopic: expectedTopic, suggestion: suggestion };
    });

    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: "internal_error", message: String((e && e.message) || e) });
  }
};

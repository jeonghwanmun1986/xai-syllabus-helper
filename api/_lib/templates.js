// Shared rule-based ("template") content generator.
// No external AI API, no API key, no network calls -- runs entirely offline.
// This trades quality/variety for zero cost and zero setup: every response
// is assembled from fixed sentence templates + keyword-matched tool lists.

var CATEGORIES = [
  {
    keywords: ["간호", "보건", "응급구조", "치위생", "재활", "방사선", "임상병리", "작업치료", "물리치료", "안경"],
    tools: [
      { name: "ChatGPT", use: "임상 사례나 간호과정 시나리오를 정리하고 질의응답하는 데 활용", reason: "복잡한 사례를 빠르게 요약·정리해 학습 시간을 줄여줌" },
      { name: "NotebookLM", use: "진료지침·논문 자료를 업로드해 핵심 내용을 요약·정리하는 데 활용", reason: "방대한 전공 자료를 짧은 시간에 소화할 수 있음" },
      { name: "Perplexity", use: "최신 임상 가이드라인이나 연구 동향을 검색하고 출처를 확인하는 데 활용", reason: "출처가 명확한 최신 정보를 빠르게 찾을 수 있음" }
    ]
  },
  {
    keywords: ["디자인", "미디어", "영상", "방송", "공연", "음악", "K-POP", "실용음악", "연기", "사진", "만화", "애니메이션", "콘텐츠"],
    tools: [
      { name: "이미지 생성 AI(Midjourney 등)", use: "작품 시안이나 콘셉트 이미지를 빠르게 시각화하는 데 활용", reason: "아이디어를 텍스트에서 바로 이미지로 확인할 수 있어 기획 속도가 빨라짐" },
      { name: "ChatGPT", use: "기획안, 대본, 콘티 초안을 작성하고 다듬는 데 활용", reason: "초안 작성 시간을 줄이고 다양한 아이디어를 빠르게 비교할 수 있음" },
      { name: "Canva AI", use: "포스터·카드뉴스 등 결과물을 손쉽게 디자인하는 데 활용", reason: "디자인 도구 숙련도와 무관하게 완성도 있는 결과물을 만들 수 있음" }
    ]
  },
  {
    keywords: ["컴퓨터", "소프트웨어", "정보", "IT", "AI", "전자", "전기", "기계", "자동차", "스마트", "반도체", "드론", "로봇"],
    tools: [
      { name: "GitHub Copilot / ChatGPT", use: "코드 작성과 디버깅을 보조하고 오류 원인을 설명받는 데 활용", reason: "반복적인 코드 작성 시간을 줄이고 오류를 빠르게 해결할 수 있음" },
      { name: "NotebookLM", use: "강의자료·매뉴얼을 업로드해 핵심 개념을 요약·질의응답하는 데 활용", reason: "방대한 기술 문서를 효율적으로 학습할 수 있음" },
      { name: "Perplexity", use: "최신 기술 동향이나 스펙 정보를 검색하고 비교하는 데 활용", reason: "빠르게 변화하는 기술 정보를 신뢰도 있게 확인할 수 있음" }
    ]
  },
  {
    keywords: ["경영", "세무", "회계", "유통", "무역", "마케팅", "비서", "사회복지", "행정", "금융", "부동산", "호텔", "관광"],
    tools: [
      { name: "ChatGPT", use: "보고서·기획서 초안을 작성하고 논리를 보완하는 데 활용", reason: "문서 작성 시간을 줄이고 표현을 다듬는 데 도움이 됨" },
      { name: "노코드 AI 플랫폼", use: "코딩 없이 데이터 분석·자동화 워크플로우를 구성해보는 데 활용", reason: "비전공자도 AI 활용 역량을 실습으로 익힐 수 있음" },
      { name: "Perplexity", use: "시장 동향이나 통계 자료를 조사하고 출처를 확인하는 데 활용", reason: "근거 있는 자료를 빠르게 수집할 수 있음" }
    ]
  },
  {
    keywords: ["조리", "제과", "제빵", "외식", "영양", "바리스타", "푸드"],
    tools: [
      { name: "ChatGPT", use: "메뉴 개발 아이디어와 레시피 구성을 제안받는 데 활용", reason: "다양한 조합의 아이디어를 짧은 시간에 얻을 수 있음" },
      { name: "이미지 생성 AI", use: "완성 메뉴의 플레이팅 시안을 미리 시각화하는 데 활용", reason: "실습 전 결과물을 예측하고 계획을 세울 수 있음" },
      { name: "노코드 AI 플랫폼", use: "원가 계산이나 메뉴 데이터를 자동화해보는 데 활용", reason: "반복 계산 업무를 줄이고 데이터 감각을 익힐 수 있음" }
    ]
  },
  {
    keywords: ["건축", "실내", "토목", "환경", "조경"],
    tools: [
      { name: "이미지 생성 AI", use: "설계 콘셉트나 공간 시안을 빠르게 시각화하는 데 활용", reason: "초기 아이디어를 시각적으로 빠르게 검토할 수 있음" },
      { name: "ChatGPT", use: "설계 근거나 보고서 문구를 정리하는 데 활용", reason: "설계 의도를 명확한 문장으로 정리하는 데 도움이 됨" },
      { name: "NotebookLM", use: "관련 법규·자재 자료를 업로드해 요약·검색하는 데 활용", reason: "방대한 규정·자료를 빠르게 확인할 수 있음" }
    ]
  }
];

var DEFAULT_TOOLS = [
  { name: "ChatGPT", use: "수업 자료나 활동 아이디어의 초안을 작성하는 데 활용", reason: "준비 시간을 줄이고 다양한 아이디어를 얻을 수 있음" },
  { name: "노코드 AI 플랫폼", use: "코딩 없이 간단한 자동화나 데이터 정리를 실습해보는 데 활용", reason: "비전공자도 AI 활용 경험을 쌓을 수 있음" },
  { name: "NotebookLM", use: "전공 자료를 업로드해 핵심 내용을 요약·질의응답하는 데 활용", reason: "학습 자료를 효율적으로 소화할 수 있음" }
];

function matchTools(dept, name) {
  var hay = String(dept || "") + " " + String(name || "");
  for (var i = 0; i < CATEGORIES.length; i++) {
    var cat = CATEGORIES[i];
    for (var j = 0; j < cat.keywords.length; j++) {
      if (hay.indexOf(cat.keywords[j]) !== -1) return cat.tools;
    }
  }
  return DEFAULT_TOOLS;
}

// Spread `count` distinct weeks evenly across 1..total (avoids clustering).
function spreadWeeks(total, count) {
  var weeks = [];
  var used = {};
  for (var i = 0; i < count; i++) {
    var frac = (i + 1) / (count + 1);
    var w = Math.round(frac * total);
    w = Math.max(1, Math.min(total, w));
    while (used[w] && w < total) w++;
    while (used[w] && w > 1) w--;
    used[w] = true;
    weeks.push(w);
  }
  return weeks.sort(function (a, b) { return a - b; });
}

module.exports = { CATEGORIES: CATEGORIES, DEFAULT_TOOLS: DEFAULT_TOOLS, matchTools: matchTools, spreadWeeks: spreadWeeks };

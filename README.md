# AI 활용 강의계획서 도우미 (GitHub + Vercel 배포판)

연성대학교 X+AI 사업 — AID 지정 교과목의 강의계획서에 AI 활용 수업을 반영하도록 돕는 도구입니다.
`courses.json`에 전체 38개 학과 · 218개 AID 대상 교과목이 이미 들어 있습니다.

## 왜 직접 배포해야 하나요

이 세션에는 GitHub·Vercel 계정에 접근할 수 있는 인증 수단이 없어서, 저(Claude)가 대신 푸시·배포할 수 없습니다.
아래 순서대로 하면 2~3분이면 끝납니다 (평소 Netlify/GitHub Pages에 올리시던 방식과 동일합니다).

## 1. GitHub에 올리기

이 폴더 전체를 다운로드한 뒤, 새 저장소를 만들어 올립니다.

```bash
cd xai-syllabus-helper
git init
git add .
git commit -m "AI 활용 강의계획서 도우미 초기 배포"
git branch -M main
git remote add origin https://github.com/<본인계정>/xai-syllabus-helper.git
git push -u origin main
```

(GitHub 웹사이트에서 "New repository"로 빈 저장소를 먼저 만들어두세요.)

## 2. Vercel에 배포하기

1. https://vercel.com 에서 로그인 후 **Add New → Project**
2. 방금 만든 GitHub 저장소를 선택하고 **Import**
3. Framework Preset은 **Other**로 두고 그대로 **Deploy** (별도 빌드 설정 불필요)
4. 배포가 끝나면 `https://xai-syllabus-helper-xxxx.vercel.app` 같은 주소가 생깁니다

## 3. AI 기능 켜기 (선택, 강력 추천)

"AI 활용 제안 받기"와 "강의계획서 문구 생성" 버튼이 동작하려면 Google Gemini API 키가 필요합니다. 신용카드 등록 없이 무료로 발급받을 수 있습니다 (단, 하루 요청 횟수 제한이 있고, 무료 등급 사용 내용은 Google이 서비스 개선에 활용할 수 있습니다 — 자세한 내용은 발급 페이지의 약관을 확인하세요).

1. https://aistudio.google.com/apikey 에서 Google 계정으로 로그인 후 **Create API key**로 키를 발급받습니다
2. Vercel 프로젝트 → **Settings → Environment Variables**
3. Key: `GEMINI_API_KEY`, Value: 발급받은 키 → **Save**
4. **Deployments** 탭에서 최신 배포를 **Redeploy**

키를 설정하지 않아도 학과·교과목 조회, 관리자 화면, 이력 내보내기는 정상 동작합니다. AI 버튼만 안내 메시지를 보여줍니다.

## 사용 흐름 (학과장 화면)

1. **학과·교과목 선택** — 학과와 AID 대상 교과목을 고릅니다. 학점·시수(선택)와 총 강의 주차를 입력할 수 있습니다.
2. **AI 활용 아이디어 제안** — 교과목 특성에 맞는 AI 툴 3~4개와, AI 활용을 넣기 좋은 5개 주차 패턴을 추천받습니다.
3. **교과목 교육목표 작성** — X+AI 사업 서식(예시 문체)에 맞춘 교육목표 문단을 생성합니다. 바로 편집 후 복사할 수 있습니다.
4. **AI 활용 반영 주차(5개)와 제안 문구** — "패턴으로 5개 선택"(2번 추천 기반) 또는 "랜덤으로 5개 선택" 버튼으로 주차를 고르고(직접 클릭해 바꿀 수도 있음), 각 주차에 예상 학습내용과 AI 활용 제안 한두 문장을 생성합니다.

교수님은 3번의 교육목표와 4번의 주차별 제안 문장을 기존 강의계획서에 그대로 옮겨 적어 보완하시면 됩니다.

## 파일 구성

```
index.html          전체 UI (학과장 화면 / 관리자 화면)
courses.json         38개 학과 · 218개 AID 대상 교과목 (공식 목록, 저장소에서 직접 편집)
api/suggest.js        AI 툴 추천 + 추천 5개 주차 패턴 (Vercel 서버리스 함수)
api/objective.js      교육목표 문단 생성 (Vercel 서버리스 함수)
api/weekly.js          선택한 5개 주차의 예상 학습내용 + AI 활용 제안 문장 생성 (Vercel 서버리스 함수)
```

## 데이터 관리 방식 (중요)

이 정적 배포판에는 서버 데이터베이스가 없습니다.

- **공식 교과목 목록**: `courses.json`이 기준입니다. 목록을 바꾸려면 이 파일을 직접 수정해 GitHub에 커밋하거나, 앱의 관리자 화면에서 편집 후 "courses.json 내보내기"로 받은 파일로 교체·커밋하세요. 커밋하면 모든 사용자에게 반영됩니다.
- **관리자 화면에서 즉석으로 추가/수정/삭제한 내용**은 그 브라우저에만 저장됩니다 (다른 사람에게는 보이지 않음). 공식 반영은 위 방법으로 해주세요.
- **생성 이력**(어떤 교과목의 몇 주차를 언제 생성했는지)도 브라우저별로만 저장됩니다. "이력 내보내기"로 JSON 백업이 가능합니다.

여러 학과장이 공유하는 실시간 저장소가 필요하시면, Vercel Postgres/KV 같은 데이터베이스를 붙이거나, 지금처럼 [Claude 아티팩트 버전](#)을 함께 쓰시는 것을 추천드립니다 — 그 버전은 모든 방문자가 같은 데이터를 실시간으로 보고 편집할 수 있습니다.

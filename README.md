# 매장 스케줄링 자동화 (독립 웹앱)

Excel + VBA로 만들었던 스케줄 자동배정 로직(휴무/휴일 자동배정, 근무 자동배정, 매장별 설정,
공휴일·이슈일·개인지정태그, 태그 기반 계산)을 그대로 옮긴 독립 실행형 웹앱입니다.

- **프론트엔드**: React + Vite (`client/`)
- **백엔드**: Node.js 내장 기능만 사용 (`server/`) — **별도 설치 패키지가 없습니다.**
  express, DB 서버 등이 전혀 없어서 어떤 Node 호스팅에도 그대로 올라갑니다.
- **데이터 저장**: `server/data/db.json` 파일 하나 (백업 = 이 파일 복사)
- **인증**: 비밀번호 2단계
  - `ADMIN_PASSWORD`(관리자) — 매장 생성/삭제/이름변경 + 데이터 조회/수정
  - `STAFF_PASSWORD`(직원) — 매장 데이터 조회/수정만 가능 (매장 생성·삭제 불가)

---

## 1. 로컬에서 실행해보기

Node.js 18 이상이 설치되어 있어야 합니다.

```bash
# 1) 의존성 설치 (최초 1회)
npm run install:all

# 2) 비밀번호 설정 (.env 파일 생성)
cp .env.example .env
# .env 파일을 열어서 ADMIN_PASSWORD / STAFF_PASSWORD를 원하는 값으로 수정하세요

# 3-A) 개발 모드로 실행 (터미널 2개 필요 - 코드 수정하면 바로 반영됨)
#   터미널 1:
npm run dev:server
#   터미널 2:
npm run dev:client
# 브라우저에서 http://localhost:5173 접속

# 3-B) 운영 모드로 실행 (터미널 1개, 실제 배포와 동일한 방식)
npm run build          # 프론트엔드를 client/dist 로 빌드
npm start              # 서버 1개가 API + 화면을 모두 서빙
# 브라우저에서 http://localhost:4000 접속
```

---

## 2. 배포하기 (매장에서 접속할 수 있게 만들기)

이 프로젝트는 **Node.js 서버 1개**만 실행하면 됩니다(빌드된 화면 + API를 같은 포트에서 같이 서빙).
아래 중 편한 방법을 고르시면 됩니다.

### 방법 A. Render / Railway / Fly.io 같은 PaaS (가장 쉬움, 무료 플랜 있음)

1. 이 프로젝트 폴더를 GitHub 저장소에 올립니다.
2. Render(또는 Railway 등)에서 "New Web Service" → 방금 만든 저장소 선택
3. 빌드 명령어: `npm run install:all && npm run build`
4. 시작 명령어: `npm start`
5. 환경변수(Environment Variables)에 `ADMIN_PASSWORD`, `STAFF_PASSWORD` 추가
6. **중요**: `server/data` 폴더에 데이터가 저장되는데, 대부분의 PaaS는 재배포 시 파일이 초기화됩니다.
   Render 기준으로는 "Disks" 메뉴에서 영구 디스크를 추가하고 마운트 경로를 `/app/server/data`로 지정하세요.
   (또는 환경변수 `DATA_DIR`을 그 디스크 경로로 지정)
7. 배포가 끝나면 제공되는 URL(예: `https://xxx.onrender.com`)을 매장에 공유하면 됩니다.

### 방법 B. Docker (자체 서버/VPS가 있는 경우)

```bash
docker build -t schedule-webapp .
docker run -d -p 4000:4000 \
  -e ADMIN_PASSWORD=원하는관리자비번 \
  -e STAFF_PASSWORD=원하는직원비번 \
  -v $(pwd)/data:/app/server/data \
  --name schedule-webapp \
  schedule-webapp
```

`-v $(pwd)/data:/app/server/data` 부분이 데이터를 서버 밖(호스트)에 영구 저장해줍니다.
이 폴더(`./data/db.json`)만 정기적으로 백업하면 됩니다.

### 방법 C. 일반 VPS (Node.js가 설치된 서버)에 직접 배포

```bash
git clone <이 저장소 주소>
cd schedule-webapp
npm run install:all
npm run build
cp .env.example .env   # 비밀번호 설정
# 계속 켜두려면 pm2 같은 프로세스 매니저 사용 권장
npm install -g pm2
pm2 start server/index.js --name schedule-webapp
pm2 save
```

Nginx 등으로 80/443 포트를 4000번으로 리버스 프록시하면 도메인 연결도 가능합니다.

---

## 3. 데이터 백업 / 관리

- 모든 데이터는 `server/data/db.json` 파일 하나에 들어있습니다.
- 백업: 이 파일을 그대로 복사해두면 됩니다.
- 매장 추가/삭제, 비밀번호 변경 등은 관리자(`ADMIN_PASSWORD`)로 로그인하면 화면에서 바로 할 수 있습니다.
- 비밀번호를 바꾸고 싶으면 배포 환경의 `ADMIN_PASSWORD` / `STAFF_PASSWORD` 환경변수만 바꾸고 재시작하면 됩니다
  (기존에 로그인해 있던 브라우저는 다음 요청부터 다시 로그인해야 합니다).

---

## 4. 폴더 구조

```
schedule-webapp/
  server/          Node.js API 서버 (의존성 없음)
    index.js        HTTP 서버 + 라우팅
    db.js            JSON 파일 저장소
    auth.js          비밀번호 인증
    seed.js          신규 매장 기본값
    data/db.json     실제 데이터 (최초 실행 시 자동 생성)
  client/          React 프론트엔드
    src/
      App.jsx         전체 화면/탭 구성
      logic.js         자동배정 알고리즘 (휴무/휴일, 근무형태, 검증)
      api.js           서버 API 호출
  Dockerfile
  .env.example
```

## 5. 자동배정 로직 커스터마이즈

`client/src/logic.js` 하나에 계산 로직이 전부 모여 있습니다.
연속근무 판단 방식, 근무형태 배정 우선순위 등을 바꾸고 싶으면 이 파일만 수정하면 됩니다.

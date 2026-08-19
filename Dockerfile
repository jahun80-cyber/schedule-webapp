# 프론트엔드 빌드
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# 서버 의존성 설치 (Supabase 연동으로 @supabase/supabase-js가 추가됨)
FROM node:20-alpine AS server-build
WORKDIR /app/server
COPY server/package.json ./
RUN npm install

# 최종 실행 이미지
FROM node:20-alpine
WORKDIR /app
COPY --from=server-build /app/server/node_modules ./server/node_modules
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV PORT=4000
EXPOSE 4000

# 데이터는 이제 Supabase(외부 DB)에 저장되므로 영구 볼륨이 필요 없습니다.
# 실행 시 SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSWORD / STAFF_PASSWORD 환경변수를 전달하세요.

CMD ["node", "server/index.js"]

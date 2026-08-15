# 프론트엔드 빌드
FROM node:20-alpine AS client-build
WORKDIR /app/client
COPY client/package.json ./
RUN npm install
COPY client/ ./
RUN npm run build

# 최종 실행 이미지 (서버는 의존성이 없어 설치 단계가 필요 없습니다)
FROM node:20-alpine
WORKDIR /app
COPY server/ ./server/
COPY --from=client-build /app/client/dist ./client/dist

ENV PORT=4000
EXPOSE 4000

# 데이터를 영구 볼륨에 저장하려면 실행 시 -v 옵션으로 /app/server/data를 마운트하세요
VOLUME ["/app/server/data"]

CMD ["node", "server/index.js"]

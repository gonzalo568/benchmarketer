FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm install -ws

RUN npm run build -w @benchmarketer/shared -w @benchmarketer/api

EXPOSE 3001

CMD ["npm", "start", "-w", "@benchmarketer/api"]

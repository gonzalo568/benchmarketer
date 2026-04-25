FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
COPY packages/shared ./packages/shared
COPY apps/dashboard ./apps/dashboard

RUN npm install -ws && npm run build -w @benchmarketer/dashboard

RUN npm install -ws -w @benchmarketer/dashboard

EXPOSE 3000

CMD ["npm", "run", "preview", "-w", "@benchmarketer/dashboard"]

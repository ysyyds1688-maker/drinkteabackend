FROM node:20-alpine
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /app

# 安裝 PostgreSQL 客戶端，用於在後台執行 pg_dump 備份
RUN apk add --no-cache postgresql15-client

COPY package*.json ./

RUN npm ci --include=dev

COPY . .

RUN npm install -g typescript

RUN npm run build

RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 8080

# 添加健康檢查
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
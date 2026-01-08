FROM node:20-alpine
LABEL "language"="nodejs"
LABEL "framework"="express"

WORKDIR /app

COPY package*.json ./

RUN npm ci --include=dev

COPY . .

ENV PATH="/app/node_modules/.bin:$PATH"

RUN npm run build

RUN mkdir -p /app/data && chmod 777 /app/data

EXPOSE 8080

# 添加健康檢查
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

CMD ["npm", "start"]
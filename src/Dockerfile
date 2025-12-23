# 使用 Node.js 官方映像
FROM node:20-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package 檔案
COPY package*.json ./

# 安裝依賴
RUN npm ci --only=production

# 複製專案檔案
COPY . .

# 建置 TypeScript
RUN npm run build

# 暴露端口
EXPOSE 3001

# 啟動應用程式
CMD ["npm", "start"]


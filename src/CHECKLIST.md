# 📋 GitHub 上傳檢查清單

## ✅ 需要上傳的檔案（在 backend/ 資料夾內）

### 必須上傳 ✅

- [x] `src/` - 所有原始碼資料夾
  - [x] `src/db/` - 資料庫相關
  - [x] `src/models/` - 資料模型
  - [x] `src/routes/` - API 路由（包含後台管理系統）
    - [x] `src/routes/admin.ts` ⭐ **後台管理系統**
    - [x] `src/routes/profiles.ts`
    - [x] `src/routes/articles.ts`
    - [x] `src/routes/gemini.ts`
  - [x] `src/types.ts`
  - [x] `src/server.ts`
- [x] `package.json`
- [x] `package-lock.json`
- [x] `tsconfig.json`
- [x] `README.md`
- [x] `API.md`
- [x] `Dockerfile`
- [x] `.dockerignore`
- [x] `.gitignore`
- [x] `zeabur.json`

### 建議上傳（文檔）

- [x] `GIT_UPLOAD_GUIDE.md` - 本指南
- [x] `STRUCTURE.md` - 專案結構說明
- [x] `CHECKLIST.md` - 本檢查清單

### 根目錄檔案（與 backend 平行）

- [x] `.zeabur.yaml` - Zeabur 部署配置（在根目錄）

---

## ❌ 不需要上傳的檔案（會被 .gitignore 自動忽略）

- [ ] `node_modules/` - npm install 會自動安裝
- [ ] `dist/` - npm run build 會自動產生
- [ ] `data/` - 資料庫檔案，部署時自動建立
- [ ] `.env` - 敏感資訊，在 Zeabur 設定環境變數
- [ ] `*.log` - 日誌檔案
- [ ] `.DS_Store` - 系統檔案

---

## 🎯 後台管理系統位置

**後台管理系統檔案**：`backend/src/routes/admin.ts`

**後台管理系統 API 路由**：`/api/admin/*`

包含功能：
- ✅ 上架新茶 (`POST /api/admin/profiles`)
- ✅ 編輯茶茶 (`PUT /api/admin/profiles/:id`)
- ✅ 下架茶茶 (`DELETE /api/admin/profiles/:id`)
- ✅ 發布新文章 (`POST /api/admin/articles`)
- ✅ 編輯文章 (`PUT /api/admin/articles/:id`)
- ✅ 批量操作 (`POST /api/admin/*/batch`)
- ✅ 統計資訊 (`GET /api/admin/stats`)

---

## 📝 上傳步驟

### 1. 進入 backend 資料夾

```bash
cd backend
```

### 2. 初始化 Git（如果還沒有）

```bash
git init
```

### 3. 檢查要上傳的檔案

```bash
git status
```

應該看到：
- ✅ `src/` 資料夾
- ✅ `package.json`
- ✅ `tsconfig.json`
- ✅ 其他配置檔案
- ❌ **不應該看到** `node_modules/`, `dist/`, `.env`, `data/`

### 4. 加入所有檔案

```bash
git add .
```

`.gitignore` 會自動過濾掉不需要的檔案。

### 5. 提交

```bash
git commit -m "Initial commit: Backend API with admin system"
```

### 6. 連接到 GitHub

```bash
# 在 GitHub 建立新的 Repository，然後：
git remote add origin https://github.com/your-username/your-repo.git
git branch -M main
git push -u origin main
```

---

## 🔍 驗證

上傳後，GitHub Repository 應該包含：

```
your-repo/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   ├── models/
│   │   ├── routes/
│   │   │   ├── admin.ts          ⭐ 後台管理系統
│   │   │   ├── profiles.ts
│   │   │   ├── articles.ts
│   │   │   └── gemini.ts
│   │   ├── types.ts
│   │   └── server.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── README.md
│   ├── API.md
│   ├── .gitignore
│   └── zeabur.json
└── .zeabur.yaml
```

**不應該包含：**
- ❌ `node_modules/`
- ❌ `dist/`
- ❌ `.env`
- ❌ `data/`

---

## ✅ 完成檢查

- [ ] 所有 `src/` 下的檔案都已上傳
- [ ] `package.json` 已上傳
- [ ] `tsconfig.json` 已上傳
- [ ] `.gitignore` 已上傳
- [ ] `zeabur.json` 已上傳
- [ ] `.zeabur.yaml` 已上傳（根目錄）
- [ ] `node_modules/` **沒有**上傳
- [ ] `dist/` **沒有**上傳
- [ ] `.env` **沒有**上傳
- [ ] `data/` **沒有**上傳

---

## 🚀 下一步

1. ✅ 上傳到 GitHub（完成上述步驟）
2. 📦 在 Zeabur Dashboard 選擇你的 GitHub Repository
3. ⚙️ 設定環境變數（`GEMINI_API_KEY` 等）
4. 🎉 部署完成！

詳細說明請參考：
- `GIT_UPLOAD_GUIDE.md` - 完整上傳指南
- `STRUCTURE.md` - 專案結構說明
- `API.md` - API 文檔


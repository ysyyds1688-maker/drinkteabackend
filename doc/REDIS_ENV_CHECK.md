# Redis 環境變數配置檢查

## ✅ 當前配置狀態

根據您的 Zeabur 環境變數配置：

### 已設置的變數

1. **REDIS_URL** ✅ **最重要**
   - 值：`redis://:6tzTqAH90051r287lcVuXg4BJMGF3RLE@cgk1.clusters.zeabur.com:24516`
   - 狀態：✅ 已設置（Private）
   - **這是完整的連接字串，系統會優先使用這個**

2. **REDIS_HOST**
   - 值：`cgk1.clusters.zeabur.com`
   - 狀態：✅ 已設置（Private）
   - 用途：備用配置（如果 REDIS_URL 不存在時使用）

3. **REDIS_PORT**
   - 值：`24516`
   - 狀態：✅ 已設置（Private）
   - 用途：備用配置（如果 REDIS_URL 不存在時使用）

4. **REDIS_PASSWORD**
   - 值：`${PASSWORD}` ⚠️
   - 狀態：Exposed
   - **問題**：使用了動態引用 `${PASSWORD}`，這可能不正確

## 🔍 配置邏輯

系統會按以下順序讀取 Redis 配置：

1. **優先使用 `REDIS_URL`**（如果存在）
2. 如果沒有 `REDIS_URL`，才會使用個別配置：
   - `REDIS_HOST` + `REDIS_PORT` + `REDIS_PASSWORD`

## ✅ 建議配置

### 方案 1：只使用 REDIS_URL（推薦）✅

**保留**：
- ✅ `REDIS_URL=redis://:6tzTqAH90051r287lcVuXg4BJMGF3RLE@cgk1.clusters.zeabur.com:24516`

**可以刪除**（因為 REDIS_URL 已設置，這些不會被使用）：
- ⚠️ `REDIS_HOST`（可選，保留作為備用也可以）
- ⚠️ `REDIS_PORT`（可選，保留作為備用也可以）
- ⚠️ `REDIS_PASSWORD`（建議刪除，因為使用了錯誤的動態引用）

### 方案 2：使用個別配置（如果不想用 REDIS_URL）

如果刪除 `REDIS_URL`，需要確保：
- ✅ `REDIS_HOST=cgk1.clusters.zeabur.com`
- ✅ `REDIS_PORT=24516`
- ⚠️ `REDIS_PASSWORD` 需要修改為實際密碼值：`6tzTqAH90051r287lcVuXg4BJMGF3RLE`
  - 目前是 `${PASSWORD}`，這不會正確工作

## 🎯 推薦做法

**建議使用方案 1**：
1. ✅ 保留 `REDIS_URL`（已經正確設置）
2. ⚠️ 刪除或修正 `REDIS_PASSWORD`（因為使用了 `${PASSWORD}` 動態引用，這可能不正確）
3. ✅ `REDIS_HOST` 和 `REDIS_PORT` 可以保留作為備用，也可以刪除

## ⚠️ 注意事項

1. **REDIS_PASSWORD 的問題**：
   - 當前值：`${PASSWORD}`（動態引用）
   - 這可能不會正確工作，因為系統會嘗試查找名為 `PASSWORD` 的環境變數
   - 如果 `REDIS_URL` 已設置，這個變數不會被使用，所以問題不大
   - 但為了避免混淆，建議刪除或修正

2. **重複變數**：
   - 有兩個 `REDIS_HOST` 和 `REDIS_PORT` 條目
   - 建議只保留一個

3. **REDIS_URL 格式**：
   - 當前格式：`redis://:password@host:port` ✅ 正確
   - 密碼前有冒號是正確的格式

## ✅ 最終建議

**當前配置可以工作**，因為 `REDIS_URL` 已正確設置。但為了清理和避免混淆：

1. ✅ **保留** `REDIS_URL`（最重要）
2. ⚠️ **刪除** `REDIS_PASSWORD`（因為使用了錯誤的動態引用，且不會被使用）
3. ✅ **保留或刪除** `REDIS_HOST` 和 `REDIS_PORT`（不會被使用，但保留作為備用也可以）

## 🔍 驗證步驟

配置完成後：
1. 重新部署後端服務
2. 查看日誌，應該看到：`✅ Redis 連接成功`
3. 測試發送驗證碼，確認驗證碼存儲在 Redis 中


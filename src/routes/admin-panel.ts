import express from 'express';

const router = express.Router();

// 後台管理系統頁面
router.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>茶王 - 後台管理系統</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            color: #333;
        }
        .header {
            background: #1a1a1a;
            color: white;
            padding: 1rem 2rem;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header h1 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        .container {
            max-width: 1400px;
            margin: 2rem auto;
            padding: 0 2rem;
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: white;
            padding: 1.5rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .stat-card h3 {
            font-size: 0.875rem;
            color: #666;
            margin-bottom: 0.5rem;
        }
        .stat-card .value {
            font-size: 2rem;
            font-weight: 600;
            color: #1a1a1a;
        }
        .tabs {
            display: flex;
            gap: 1rem;
            margin-bottom: 1rem;
            border-bottom: 2px solid #e0e0e0;
        }
        .tab {
            padding: 1rem 2rem;
            background: none;
            border: none;
            cursor: pointer;
            font-size: 1rem;
            color: #666;
            border-bottom: 2px solid transparent;
            margin-bottom: -2px;
        }
        .tab.active {
            color: #1a1a1a;
            border-bottom-color: #1a1a1a;
            font-weight: 600;
        }
        .content {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .btn {
            padding: 0.75rem 1.5rem;
            background: #1a1a1a;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
            font-weight: 500;
            margin-right: 0.5rem;
        }
        .btn:hover {
            background: #333;
        }
        .btn-success {
            background: #10b981;
        }
        .btn-success:hover {
            background: #059669;
        }
        .btn-danger {
            background: #ef4444;
        }
        .btn-danger:hover {
            background: #dc2626;
        }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th, td {
            padding: 1rem;
            text-align: left;
            border-bottom: 1px solid #e0e0e0;
        }
        th {
            font-weight: 600;
            color: #666;
            font-size: 0.875rem;
        }
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.5);
            z-index: 1000;
            overflow-y: auto;
        }
        .modal.active {
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 2rem;
        }
        .modal-content {
            background: white;
            border-radius: 8px;
            padding: 2rem;
            max-width: 600px;
            width: 100%;
            max-height: 90vh;
            overflow-y: auto;
        }
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
        }
        .modal-header h2 {
            font-size: 1.5rem;
            font-weight: 600;
        }
        .close-btn {
            background: none;
            border: none;
            font-size: 1.5rem;
            cursor: pointer;
            color: #666;
        }
        .form-group {
            margin-bottom: 1.5rem;
        }
        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #333;
        }
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 0.875rem;
        }
        .form-group textarea {
            min-height: 100px;
            resize: vertical;
        }
        .form-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 1rem;
        }
        .hidden {
            display: none;
        }
        .loading {
            opacity: 0.6;
            pointer-events: none;
        }
        .ai-parse-section {
            background: #f8f9fa;
            padding: 1.5rem;
            border-radius: 8px;
            margin-bottom: 1.5rem;
            border: 2px dashed #e0e0e0;
        }
        .ai-parse-section label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 600;
            color: #333;
        }
        .ai-parse-section textarea {
            width: 100%;
            min-height: 100px;
            padding: 0.75rem;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 0.875rem;
            margin-bottom: 0.5rem;
        }
        .ai-parse-btn {
            background: #fbbf24;
            color: #1a1a1a;
            border: none;
            padding: 0.75rem 1.5rem;
            border-radius: 6px;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        .ai-parse-btn:hover:not(:disabled) {
            background: #f59e0b;
        }
        .ai-parse-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .upload-area {
            border: 4px dashed #e0e0e0;
            border-radius: 12px;
            padding: 2rem;
            text-align: center;
            background: #f8f9fa;
            cursor: pointer;
            transition: all 0.3s;
            margin-bottom: 1rem;
        }
        .upload-area.dragging {
            border-color: #fbbf24;
            background: #fef3c7;
        }
        .upload-area:hover {
            border-color: #d1d5db;
        }
        .upload-icon {
            font-size: 3rem;
            margin-bottom: 0.5rem;
        }
        .gallery-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .gallery-item {
            position: relative;
            aspect-ratio: 1;
            border-radius: 8px;
            overflow: hidden;
            border: 2px solid #e0e0e0;
            cursor: pointer;
        }
        .gallery-item.cover {
            border-color: #fbbf24;
            border-width: 3px;
        }
        .gallery-item img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .gallery-item .delete-btn {
            position: absolute;
            top: 4px;
            right: 4px;
            width: 24px;
            height: 24px;
            background: rgba(239, 68, 68, 0.9);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
        }
        .gallery-item .cover-badge {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(251, 191, 36, 0.9);
            color: #1a1a1a;
            text-align: center;
            padding: 4px;
            font-size: 10px;
            font-weight: 600;
        }
        .addon-services {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .addon-tag {
            background: #fef3c7;
            color: #92400e;
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.875rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .addon-tag .remove-btn {
            background: none;
            border: none;
            color: #92400e;
            cursor: pointer;
            font-weight: bold;
            padding: 0;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .addon-input-group {
            display: flex;
            gap: 0.5rem;
        }
        .addon-input-group input {
            flex: 1;
        }
        .price-help {
            background: #f0f9ff;
            border: 1px solid #bae6fd;
            border-radius: 8px;
            padding: 1rem;
            margin-top: 0.5rem;
            font-size: 0.875rem;
        }
        .price-help-title {
            font-weight: 600;
            color: #0369a1;
            margin-bottom: 0.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        .price-help-content {
            color: #0c4a6e;
            line-height: 1.6;
        }
        .price-help-list {
            margin-top: 0.5rem;
            padding-left: 1.5rem;
        }
        .price-help-list li {
            margin-bottom: 0.25rem;
        }
        .price-range {
            display: inline-block;
            background: #dbeafe;
            padding: 0.25rem 0.5rem;
            border-radius: 4px;
            font-weight: 600;
            color: #1e40af;
        }
        .price-input-wrapper {
            position: relative;
        }
        .price-suggestion-btn {
            position: absolute;
            right: 8px;
            top: 50%;
            transform: translateY(-50%);
            background: #fbbf24;
            color: #1a1a1a;
            border: none;
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: background 0.3s;
        }
        .price-suggestion-btn:hover {
            background: #f59e0b;
        }
        .price-input-wrapper input {
            padding-right: 100px;
        }
        .login-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .login-box {
            background: white;
            padding: 2rem;
            border-radius: 12px;
            max-width: 400px;
            width: 90%;
            box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .login-box h2 {
            margin-bottom: 1.5rem;
            text-align: center;
            color: #1a1a1a;
        }
        .login-form-group {
            margin-bottom: 1.5rem;
        }
        .login-form-group label {
            display: block;
            margin-bottom: 0.5rem;
            font-weight: 500;
            color: #333;
        }
        .login-form-group input {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid #e0e0e0;
            border-radius: 6px;
            font-size: 0.875rem;
        }
        .login-btn {
            width: 100%;
            padding: 0.75rem;
            background: #1a1a1a;
            color: white;
            border: none;
            border-radius: 6px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            margin-top: 0.5rem;
        }
        .login-btn:hover {
            background: #333;
        }
        .login-error {
            background: #fee;
            color: #c33;
            padding: 0.75rem;
            border-radius: 6px;
            margin-bottom: 1rem;
            font-size: 0.875rem;
            display: none;
        }
        .login-error.show {
            display: block;
        }
        .user-info {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-left: auto;
        }
        .logout-btn {
            padding: 0.5rem 1rem;
            background: #ef4444;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.875rem;
        }
        .logout-btn:hover {
            background: #dc2626;
        }
    </style>
</head>
<body>
    <!-- 登录覆盖层 -->
    <div id="loginOverlay" class="login-overlay">
        <div class="login-box">
            <h2>🔐 後台管理系統登入</h2>
            <div id="loginError" class="login-error"></div>
            <form id="loginForm" onsubmit="handleLogin(event)">
                <div class="login-form-group">
                    <label>Email</label>
                    <input type="email" id="loginEmail" placeholder="admin@test.com" required />
                </div>
                <div class="login-form-group">
                    <label>密碼</label>
                    <input type="password" id="loginPassword" placeholder="請輸入密碼" required />
                </div>
                <button type="submit" class="login-btn">登入</button>
            </form>
            <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #e0e0e0; font-size: 0.75rem; color: #666; text-align: center;">
                <p style="margin-bottom: 0.5rem;"><strong>測試帳號：</strong></p>
                <p>Admin: admin@test.com / admin123</p>
            </div>
        </div>
    </div>

    <div class="header">
        <div style="display: flex; align-items: center; justify-content: space-between;">
            <h1>🍵 茶王 - 後台管理系統</h1>
            <div class="user-info" id="userInfo" style="display: none;">
                <span id="userEmail"></span>
                <button class="logout-btn" onclick="handleLogout()">登出</button>
            </div>
        </div>
    </div>
    <div class="container">
        <div class="stats" id="stats">
            <div class="stat-card">
                <h3>總 Profiles</h3>
                <div class="value" id="totalProfiles">-</div>
            </div>
            <div class="stat-card">
                <h3>可用 Profiles</h3>
                <div class="value" id="availableProfiles">-</div>
            </div>
            <div class="stat-card">
                <h3>總 Articles</h3>
                <div class="value" id="totalArticles">-</div>
            </div>
            <div class="stat-card">
                <h3>總瀏覽次數</h3>
                <div class="value" id="totalViews">-</div>
            </div>
            <div class="stat-card">
                <h3>總用戶數</h3>
                <div class="value" id="totalUsers">-</div>
            </div>
            <div class="stat-card">
                <h3>小姐數</h3>
                <div class="value" id="totalProviders">-</div>
            </div>
            <div class="stat-card">
                <h3>客戶數</h3>
                <div class="value" id="totalClients">-</div>
            </div>
            <div class="stat-card">
                <h3>總預約數</h3>
                <div class="value" id="totalBookings">-</div>
            </div>
            <div class="stat-card">
                <h3>待處理預約</h3>
                <div class="value" id="pendingBookings">-</div>
            </div>
            <div class="stat-card">
                <h3>國家 / 國籍篩選</h3>
                <div>
                    <select id="nationalityFilter" onchange="loadProfiles()" style="padding: 0.5rem 0.75rem; border-radius: 999px; border: 1px solid #e5e7eb; font-size: 0.875rem;">
                        <option value="">全部</option>
                        <option value="🇹🇼">🇹🇼 台灣</option>
                        <option value="🇯🇵">🇯🇵 日本</option>
                        <option value="🇰🇷">🇰🇷 韓國</option>
                        <option value="🇭🇰">🇭🇰 香港</option>
                        <option value="🇨🇳">🇨🇳 中國</option>
                        <option value="🇹🇭">🇹🇭 泰國</option>
                        <option value="🇻🇳">🇻🇳 越南</option>
                        <option value="🇲🇾">🇲🇾 馬來西亞</option>
                        <option value="🇸🇬">🇸🇬 新加坡</option>
                    </select>
                </div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('profiles')">高級茶管理</button>
            <button class="tab" onclick="showTab('provider-profiles')">Provider 管理</button>
            <button class="tab" onclick="showTab('articles')">Articles 管理</button>
            <button class="tab" onclick="showTab('users')">用戶管理</button>
            <button class="tab" onclick="showTab('bookings')">預約管理</button>
        </div>

        <div class="content">
            <div id="profiles-tab">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>高級茶管理（嚴選好茶）</h2>
                    <button class="btn btn-success" onclick="showProfileForm()">+ 新增高級茶</button>
                </div>
                <div id="profiles-list"></div>
            </div>

            <div id="provider-profiles-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>Provider 管理（茶茶上架）</h2>
                </div>
                <div id="provider-profiles-list"></div>
            </div>

            <div id="articles-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>Articles 管理</h2>
                    <button class="btn btn-success" onclick="showArticleForm()">+ 新增 Article</button>
                </div>
                <div id="articles-list"></div>
            </div>

            <div id="users-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>用戶管理</h2>
                    <button class="btn btn-success" onclick="exportUsers()">📥 導出用戶資料</button>
                </div>
                <div id="users-list"></div>
            </div>

            <div id="bookings-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>預約管理</h2>
                </div>
                <div id="bookings-list"></div>
            </div>
        </div>
    </div>

    <!-- Profile 表單 Modal -->
    <div id="profileModal" class="modal">
        <div class="modal-content" style="max-width: 900px;">
            <div class="modal-header">
                <h2 id="profileModalTitle">⚡ 快速上架</h2>
                <button class="close-btn" onclick="closeProfileModal()">&times;</button>
            </div>
            <form id="profileForm" onsubmit="saveProfile(event)">
                <input type="hidden" id="profileId" />
                
                <!-- AI 智慧填單 (僅新增時顯示) -->
                <div id="aiParseSection" class="ai-parse-section">
                    <label>🤖 AI 智慧填單 (貼上 Line 文案)</label>
                    <textarea id="aiParseText" placeholder="在此貼上廣告文案..."></textarea>
                    <button type="button" class="ai-parse-btn" id="aiParseBtn" onclick="parseProfileWithAI()">
                        <span id="aiParseBtnText">解析</span>
                    </button>
                </div>

                <!-- 照片管理 -->
                <div class="form-group">
                    <label>📸 照片管理 (第一張為封面)</label>
                    <div class="upload-area" id="uploadArea" 
                         ondrop="handleDrop(event)" 
                         ondragover="handleDragOver(event)" 
                         ondragleave="handleDragLeave(event)"
                         onclick="document.getElementById('fileInput').click()">
                        <div class="upload-icon" id="uploadIcon">📤</div>
                        <p style="font-weight: 600; color: #666; margin: 0;">拖曳或點擊上傳</p>
                    </div>
                    <input type="file" id="fileInput" multiple accept="image/*" style="display: none;" onchange="handleFileSelect(event)" />
                    <div class="gallery-grid" id="galleryGrid"></div>
                </div>

                <div class="form-row">
                    <div class="form-group">
                        <label>姓名 *</label>
                        <input type="text" id="profileName" required />
                    </div>
                    <div class="form-group">
                        <label>國家/國籍 * (emoji 國旗)</label>
                        <select id="profileNationalitySelect" required onchange="handleNationalityChange()">
                            <option value="">請選擇國家</option>
                            <option value="🇹🇼">🇹🇼 台灣</option>
                            <option value="🇯🇵">🇯🇵 日本</option>
                            <option value="🇰🇷">🇰🇷 韓國</option>
                            <option value="🇭🇰">🇭🇰 香港</option>
                            <option value="🇨🇳">🇨🇳 中國</option>
                            <option value="🇹🇭">🇹🇭 泰國</option>
                            <option value="🇻🇳">🇻🇳 越南</option>
                            <option value="🇲🇾">🇲🇾 馬來西亞</option>
                            <option value="🇸🇬">🇸🇬 新加坡</option>
                            <option value="custom">自訂 / 其他</option>
                        </select>
                        <input type="text" id="profileNationalityCustom" placeholder="🇹🇼 或其他 emoji／文字" style="margin-top: 0.5rem; display: none;" />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>年齡 *</label>
                        <input type="number" id="profileAge" required />
                    </div>
                    <div class="form-group">
                        <label>身高 (cm) *</label>
                        <input type="number" id="profileHeight" required />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>體重 (kg) *</label>
                        <input type="number" id="profileWeight" required />
                    </div>
                    <div class="form-group">
                        <label>罩杯 *</label>
                        <input type="text" id="profileCup" placeholder="D" required />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>城市 *</label>
                        <input type="text" id="profileLocation" placeholder="台北市" required />
                    </div>
                    <div class="form-group">
                        <label>行政區</label>
                        <input type="text" id="profileDistrict" placeholder="大安區" />
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>類型 *</label>
                        <select id="profileType" required>
                            <option value="outcall">外送</option>
                            <option value="incall">定點</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>價格 (NT$) *</label>
                        <div style="margin-bottom: 0.75rem;">
                            <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer; font-weight: 500; color: #333;">
                                <input type="checkbox" id="priceInquiryOnly" onchange="togglePriceInput()" style="width: 18px; height: 18px; cursor: pointer;" />
                                <span>私訊詢問（勾選後將隱藏價格，改為顯示「私訊詢問」）</span>
                            </label>
                        </div>
                        <div class="price-input-wrapper">
                            <input type="number" id="profilePrice" placeholder="請輸入底價" required />
                            <button type="button" class="price-suggestion-btn" onclick="showPriceGuide()" title="查看價格參考">💡 價格參考</button>
                        </div>
                        <div class="price-help" id="priceHelp" style="display: none;">
                            <div class="price-help-title">
                                💰 價格設定參考指南
                            </div>
                            <div class="price-help-content">
                                <p><strong>此價格為「一節/50分鐘/1S」的底價</strong>，系統會自動計算兩節價格（底價 × 2 - 500）。</p>
                                <p style="margin-top: 0.5rem;"><strong>常見價格範圍參考：</strong></p>
                                <ul class="price-help-list">
                                    <li><span class="price-range">3,000 - 4,500</span> 一般服務（基本條件）</li>
                                    <li><span class="price-range">4,500 - 6,000</span> 中階服務（條件較好）</li>
                                    <li><span class="price-range">6,000 - 8,000</span> 高階服務（優質條件）</li>
                                    <li><span class="price-range">8,000 - 12,000</span> 頂級服務（極佳條件）</li>
                                    <li><span class="price-range">12,000+</span> 超頂級服務（特殊條件）</li>
                                </ul>
                                <div id="priceStats" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #bae6fd;"></div>
                                <p style="margin-top: 0.75rem; font-size: 0.8rem; color: #64748b;">
                                    <strong>💡 定價建議：</strong><br>
                                    • 外送通常比定點高 <span class="price-range">500-1,000</span><br>
                                    • 考慮年齡、身材、服務項目等因素<br>
                                    • 可參考同類型其他 Profile 的價格（見下方統計）<br>
                                    • 加值服務會額外加價，不包含在底價內<br>
                                    • <strong>建議：</strong>先參考市場價格，再根據實際條件調整
                                </p>
                                <div style="margin-top: 1rem; padding: 0.75rem; background: #fef3c7; border-radius: 6px; border-left: 3px solid #f59e0b;">
                                    <strong style="color: #92400e;">⚠️ 避免低估或高估：</strong>
                                    <ul style="margin-top: 0.5rem; padding-left: 1.5rem; color: #78350f; font-size: 0.85rem;">
                                        <li>低估：可能吸引過多詢問但品質不符預期</li>
                                        <li>高估：可能減少詢問量，影響曝光</li>
                                        <li>建議：參考同類型 Profile 的價格範圍，設定在合理區間內</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="form-group">
                    <label>標籤 (用逗號分隔)</label>
                    <input type="text" id="profileTags" placeholder="氣質高雅, 鄰家清新" />
                    <div style="margin-top: 0.75rem; font-size: 0.8rem; color: #6b7280;">
                        點選下列快速標籤可自動加入 / 移除：
                    </div>
                    <div class="addon-services" id="bodyTypeQuickTags" style="margin-top: 0.5rem;">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">身材條件</div>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('纖細')">纖細</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('勻稱')">勻稱</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('肉感')">肉感</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('豐滿')">豐滿</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('模特兒')">模特兒</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('長腿')">長腿</button>
                    </div>
                    <div class="addon-services" id="personalityQuickTags" style="margin-top: 0.5rem;">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">風格特質</div>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('氣質')">氣質</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('鄰家')">鄰家</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('性感')">性感</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('溫柔')">溫柔</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('活潑')">活潑</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('御姐')">御姐</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag('學生')">學生</button>
                    </div>
                </div>
                <div class="form-group">
                    <label>基本服務 (用逗號分隔)</label>
                    <input type="text" id="profileBasicServices" placeholder="聊天, 按摩" />
                </div>
                
                <!-- 加值服務 -->
                <div class="form-group">
                    <label>💎 加值服務 (AI 自動提取)</label>
                    <div class="addon-services" id="addonServicesList"></div>
                    <div class="addon-input-group">
                        <input type="text" id="newAddonService" placeholder="手動新增，如: 毒龍+5000" />
                        <button type="button" class="btn" onclick="addAddonService()">新增</button>
                    </div>
                </div>
                
                <!-- 作品影片（僅嚴選好茶） -->
                <div class="form-group" id="videosSection">
                    <label>🎬 作品影片（可添加多部，每部需包含連結和番號）</label>
                    <div id="videosList" style="margin-bottom: 1rem;"></div>
                    <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-bottom: 0.5rem;">
                        <div style="display: flex; gap: 0.5rem; align-items: flex-end;">
                            <input type="text" id="newVideoUrl" placeholder="影片連結 URL（輸入後點擊「自動解析」）" style="flex: 2;" />
                            <button type="button" id="autoParseVideoBtn" class="btn" onclick="autoParseVideo()" style="background: #10b981; color: white; white-space: nowrap;">自動解析</button>
                        </div>
                        <div style="display: flex; gap: 0.5rem;">
                            <input type="text" id="newVideoCode" placeholder="番號（如：SSIS-123，可自動填入）" style="flex: 1;" />
                            <input type="text" id="newVideoTitle" placeholder="影片標題（選填，可自動填入）" style="flex: 1;" />
                            <button type="button" class="btn" onclick="addVideo()">新增影片</button>
                        </div>
                    </div>
                </div>
                
                <input type="hidden" id="profileImageUrl" />
                <input type="hidden" id="profileGallery" />
                <div class="form-group">
                    <label>可用狀態</label>
                    <select id="profileIsAvailable">
                        <option value="true">可用</option>
                        <option value="false">不可用</option>
                    </select>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="button" class="btn" onclick="closeProfileModal()">取消</button>
                    <button type="submit" class="btn btn-success">保存</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Article 表單 Modal -->
    <div id="articleModal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="articleModalTitle">新增 Article</h2>
                <button class="close-btn" onclick="closeArticleModal()">&times;</button>
            </div>
            <form id="articleForm" onsubmit="saveArticle(event)">
                <input type="hidden" id="articleId" />
                <div class="form-group">
                    <label>標題 *</label>
                    <input type="text" id="articleTitle" required />
                </div>
                <div class="form-group">
                    <label>摘要 *</label>
                    <textarea id="articleSummary" required></textarea>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>標籤 *</label>
                        <select id="articleTag" required>
                            <option value="外送茶">外送茶</option>
                            <option value="定點茶">定點茶</option>
                            <option value="新手必看">新手必看</option>
                            <option value="防雷專區">防雷專區</option>
                            <option value="老司機心得">老司機心得</option>
                            <option value="高端服務">高端服務</option>
                            <option value="預約須知">預約須知</option>
                            <option value="會員專屬">會員專屬</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>日期 *</label>
                        <input type="date" id="articleDate" required />
                    </div>
                </div>
                <div class="form-group">
                    <label>封面圖片 URL *</label>
                    <input type="text" id="articleImageUrl" required />
                </div>
                <div class="form-group">
                    <label>內容</label>
                    <textarea id="articleContent" style="min-height: 200px;"></textarea>
                </div>
                <div style="display: flex; gap: 1rem; margin-top: 1.5rem;">
                    <button type="button" class="btn" onclick="closeArticleModal()">取消</button>
                    <button type="submit" class="btn btn-success">保存</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;
        let currentEditingProfileId = null;
        let currentEditingArticleId = null;
        let profileGallery = [];
        let profileAddonServices = [];
        let parsedPrices = null; // 儲存 AI 解析出的 prices（包含兩節價格）
        let isDragging = false;
        let isParsing = false;

        // 檢查登入狀態
        function checkAuth() {
            const token = localStorage.getItem('auth_token');
            if (!token) {
                document.getElementById('loginOverlay').style.display = 'flex';
                document.querySelector('.container').style.display = 'none';
                return false;
            }
            document.getElementById('loginOverlay').style.display = 'none';
            document.querySelector('.container').style.display = 'block';
            // 顯示用戶信息
            try {
                const user = JSON.parse(localStorage.getItem('user_info') || '{}');
                if (user.email) {
                    document.getElementById('userEmail').textContent = user.email;
                    document.getElementById('userInfo').style.display = 'flex';
                }
            } catch (e) {}
            return true;
        }

        // 處理登入
        async function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');

            try {
                const res = await fetch(API_BASE + '/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || '登入失敗');
                }

                // 檢查是否為 admin
                if (data.user.role !== 'admin') {
                    throw new Error('只有管理員可以登入後台系統');
                }

                // 保存 token 和用戶信息
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));

                // 隱藏登入界面
                checkAuth();
                
                // 載入數據
                loadStats();
                loadProfiles();
            } catch (error) {
                errorDiv.textContent = error.message;
                errorDiv.classList.add('show');
                setTimeout(() => {
                    errorDiv.classList.remove('show');
                }, 5000);
            }
        }

        // 處理登出
        function handleLogout() {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            checkAuth();
        }

        // 頁面載入時檢查登入狀態
        window.addEventListener('DOMContentLoaded', () => {
            if (checkAuth()) {
                loadStats();
                loadProfiles();
            }
        });

        // 載入統計資訊
        async function loadStats() {
            try {
                const res = await fetch(API_BASE + '/api/admin/stats');
                const stats = await res.json();
                document.getElementById('totalProfiles').textContent = stats.profiles.total;
                document.getElementById('availableProfiles').textContent = stats.profiles.available;
                document.getElementById('totalArticles').textContent = stats.articles.total;
                document.getElementById('totalViews').textContent = stats.articles.totalViews.toLocaleString();
            } catch (error) {
                console.error('載入統計失敗:', error);
            }
        }

        // 載入高級茶 Profiles（只顯示後台管理員上架的，userId為空）
        async function loadProfiles() {
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles');
                let profiles = await res.json();

                // 只顯示高級茶（userId為空或null）
                profiles = profiles.filter(p => !p.userId || p.userId === '' || p.userId === null);

                // 依照國家 / 國籍篩選
                const nationalitySelect = document.getElementById('nationalityFilter');
                const selectedNationality = nationalitySelect ? nationalitySelect.value : '';
                if (selectedNationality) {
                    profiles = profiles.filter(p => p.nationality === selectedNationality);
                }

                const list = document.getElementById('profiles-list');
                list.innerHTML = '<table><thead><tr><th>ID</th><th>姓名 / 國籍</th><th>地區</th><th>價格</th><th>狀態</th><th>操作</th></tr></thead><tbody>' +
                    profiles.map(p => \`
                        <tr>
                            <td>\${p.id}</td>
                            <td>\${p.name} \${p.nationality || ''}</td>
                            <td>\${p.location}\${p.district ? ' - ' + p.district : ''}</td>
                            <td>NT$ \${(p.price || 0).toLocaleString()}</td>
                            <td>\${p.isAvailable ? '✅ 可用' : '❌ 不可用'}</td>
                            <td>
                                <button class="btn" onclick="editProfile('\${p.id}')">編輯</button>
                                <button class="btn btn-danger" onclick="deleteProfile('\${p.id}')">刪除</button>
                            </td>
                        </tr>
                    \`).join('') + '</tbody></table>';
            } catch (error) {
                console.error('載入 Profiles 失敗:', error);
                alert('載入 Profiles 失敗: ' + error.message);
            }
        }

        // 載入 Provider Profiles（只顯示Provider上架的，userId不為空）
        async function loadProviderProfiles() {
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles');
                let profiles = await res.json();

                // 只顯示Provider上架的（userId不為空）
                profiles = profiles.filter(p => p.userId && p.userId !== '' && p.userId !== null);

                const list = document.getElementById('provider-profiles-list');
                if (profiles.length === 0) {
                    list.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">目前沒有Provider上架的資料</p>';
                } else {
                    list.innerHTML = '<table><thead><tr><th>ID</th><th>姓名 / 國籍</th><th>地區</th><th>價格</th><th>Provider ID</th><th>狀態</th></tr></thead><tbody>' +
                        profiles.map(p => \`
                            <tr>
                                <td>\${p.id}</td>
                                <td>\${p.name} \${p.nationality || ''}</td>
                                <td>\${p.location}\${p.district ? ' - ' + p.district : ''}</td>
                                <td>NT$ \${(p.price || 0).toLocaleString()}</td>
                                <td>\${p.userId}</td>
                                <td>\${p.isAvailable ? '✅ 可用' : '❌ 不可用'}</td>
                            </tr>
                        \`).join('') + '</tbody></table>';
                }
            } catch (error) {
                console.error('載入 Provider Profiles 失敗:', error);
                alert('載入 Provider Profiles 失敗: ' + error.message);
            }
        }

        // 載入 Articles
        async function loadArticles() {
            try {
                const res = await fetch(API_BASE + '/api/admin/articles');
                const articles = await res.json();
                const list = document.getElementById('articles-list');
                list.innerHTML = '<table><thead><tr><th>ID</th><th>標題</th><th>標籤</th><th>日期</th><th>瀏覽次數</th><th>操作</th></tr></thead><tbody>' +
                    articles.map(a => \`
                        <tr>
                            <td>\${a.id}</td>
                            <td>\${a.title}</td>
                            <td>\${a.tag}</td>
                            <td>\${a.date}</td>
                            <td>\${a.views.toLocaleString()}</td>
                            <td>
                                <button class="btn" onclick="editArticle('\${a.id}')">編輯</button>
                                <button class="btn btn-danger" onclick="deleteArticle('\${a.id}')">刪除</button>
                            </td>
                        </tr>
                    \`).join('') + '</tbody></table>';
            } catch (error) {
                console.error('載入 Articles 失敗:', error);
                alert('載入 Articles 失敗: ' + error.message);
            }
        }

        // 切換標籤
        function showTab(tab) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            event.target.classList.add('active');
            document.getElementById('profiles-tab').classList.toggle('hidden', tab !== 'profiles');
            document.getElementById('provider-profiles-tab').classList.toggle('hidden', tab !== 'provider-profiles');
            document.getElementById('articles-tab').classList.toggle('hidden', tab !== 'articles');
            document.getElementById('users-tab').classList.toggle('hidden', tab !== 'users');
            document.getElementById('bookings-tab').classList.toggle('hidden', tab !== 'bookings');
            if (tab === 'profiles') loadProfiles();
            if (tab === 'provider-profiles') loadProviderProfiles();
            if (tab === 'articles') loadArticles();
            if (tab === 'users') loadUsers();
            if (tab === 'bookings') loadBookings();
        }

        // 刪除 Profile
        async function deleteProfile(id) {
            if (!confirm('確定要刪除這個 Profile 嗎？')) return;
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles/' + id, { method: 'DELETE' });
                if (!res.ok) throw new Error('刪除失敗');
                loadProfiles();
                loadStats();
                alert('刪除成功！');
            } catch (error) {
                alert('刪除失敗: ' + error.message);
            }
        }

        // 刪除 Article
        async function deleteArticle(id) {
            if (!confirm('確定要刪除這篇文章嗎？')) return;
            try {
                const res = await fetch(API_BASE + '/api/admin/articles/' + id, { method: 'DELETE' });
                if (!res.ok) throw new Error('刪除失敗');
                loadArticles();
                loadStats();
                alert('刪除成功！');
            } catch (error) {
                alert('刪除失敗: ' + error.message);
            }
        }

        // 顯示 Profile 表單
        function showProfileForm(id = null) {
            currentEditingProfileId = id;
            const modal = document.getElementById('profileModal');
            const form = document.getElementById('profileForm');
            const aiSection = document.getElementById('aiParseSection');
            
            if (id) {
                document.getElementById('profileModalTitle').textContent = '✏️ 編輯茶茶';
                aiSection.style.display = 'none';
                loadProfileData(id);
            } else {
                document.getElementById('profileModalTitle').textContent = '⚡ 快速上架';
                aiSection.style.display = 'block';
                form.reset();
                document.getElementById('profileId').value = '';
                document.getElementById('priceInquiryOnly').checked = false;
                togglePriceInput(); // 重置價格輸入框狀態
                profileGallery = [];
                profileAddonServices = [];
                profileVideos = [];
                parsedPrices = null; // 清除解析出的 prices
                updateGalleryDisplay();
                updateAddonServicesDisplay();
                updateVideosDisplay();
                // 載入價格統計作為參考
                loadPriceStats();
            }
            
            modal.classList.add('active');
        }

        function setNationalityValue(value) {
            const select = document.getElementById('profileNationalitySelect');
            const custom = document.getElementById('profileNationalityCustom');
            if (!select || !custom) return;

            if (!value) {
                select.value = '';
                custom.value = '';
                custom.style.display = 'none';
                return;
            }

            const exists = Array.from(select.options).some(function (opt) { return opt.value === value; });
            if (exists) {
                select.value = value;
                custom.value = '';
                custom.style.display = 'none';
            } else {
                select.value = 'custom';
                custom.value = value;
                custom.style.display = 'block';
            }
        }

        function handleNationalityChange() {
            const select = document.getElementById('profileNationalitySelect');
            const custom = document.getElementById('profileNationalityCustom');
            if (!select || !custom) return;
            if (select.value === 'custom') {
                custom.style.display = 'block';
                custom.focus();
            } else {
                custom.style.display = 'none';
                custom.value = '';
            }
        }

        function getNationalityValue() {
            const select = document.getElementById('profileNationalitySelect');
            const custom = document.getElementById('profileNationalityCustom');
            if (!select || !custom) return '';
            if (select.value === 'custom') {
                return (custom.value || '').trim();
            }
            return select.value;
        }

        // 載入 Profile 資料
        async function loadProfileData(id) {
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles/' + id);
                const profile = await res.json();
                
                document.getElementById('profileId').value = profile.id;
                document.getElementById('profileName').value = profile.name || '';
                setNationalityValue(profile.nationality || '');
                document.getElementById('profileAge').value = profile.age || '';
                document.getElementById('profileHeight').value = profile.height || '';
                document.getElementById('profileWeight').value = profile.weight || '';
                document.getElementById('profileCup').value = profile.cup || '';
                document.getElementById('profileLocation').value = profile.location || '';
                document.getElementById('profileDistrict').value = profile.district || '';
                document.getElementById('profileType').value = profile.type || 'outcall';
                
                // 檢查是否為「私訊詢問」（price 為 -1 或 prices.oneShot.price 為 -1）
                const isInquiryOnly = profile.price === -1 || (profile.prices && profile.prices.oneShot && profile.prices.oneShot.price === -1);
                const priceCheckbox = document.getElementById('priceInquiryOnly');
                const priceInput = document.getElementById('profilePrice');
                
                if (isInquiryOnly) {
                    priceCheckbox.checked = true;
                    priceInput.value = '';
                    togglePriceInput(); // 觸發狀態更新
                } else {
                    priceCheckbox.checked = false;
                    document.getElementById('profilePrice').value = profile.price || '';
                    togglePriceInput(); // 確保狀態正確
                }
                
                document.getElementById('profileTags').value = (profile.tags || []).join(', ');
                document.getElementById('profileBasicServices').value = (profile.basicServices || []).join(', ');
                document.getElementById('profileIsAvailable').value = profile.isAvailable !== false ? 'true' : 'false';
                
                // 載入圖片
                profileGallery = profile.gallery || [profile.imageUrl || ''].filter(Boolean);
                profileAddonServices = profile.addonServices || [];
                profileVideos = profile.videos || [];
                updateGalleryDisplay();
                updateAddonServicesDisplay();
                updateVideosDisplay();
            } catch (error) {
                alert('載入資料失敗: ' + error.message);
            }
        }
        
        // AI 解析 Profile
        async function parseProfileWithAI() {
            const text = document.getElementById('aiParseText').value.trim();
            if (!text) {
                alert('請先貼上廣告文案');
                return;
            }
            
            const btn = document.getElementById('aiParseBtn');
            const btnText = document.getElementById('aiParseBtnText');
            btn.disabled = true;
            btnText.textContent = '解析中...';
            isParsing = true;
            
            try {
                const res = await fetch(API_BASE + '/api/gemini/parse-profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text })
                });
                
                if (!res.ok) {
                    let errorMessage = '解析失敗';
                    try {
                        const errorData = await res.json();
                        errorMessage = errorData.error || '解析失敗';
                    } catch (e) {
                        // 如果響應不是 JSON，嘗試讀取文本
                        const text = await res.text();
                        errorMessage = text || \`HTTP \${res.status}: \${res.statusText}\`;
                    }
                    throw new Error(errorMessage);
                }
                
                let data;
                try {
                    data = await res.json();
                } catch (e) {
                    const text = await res.text();
                    throw new Error(\`後端返回格式錯誤: \${text.substring(0, 100)}\`);
                }
                
                // 填充表單
                if (data.name) document.getElementById('profileName').value = data.name;
                if (data.nationality) setNationalityValue(data.nationality);
                if (data.age) document.getElementById('profileAge').value = data.age;
                if (data.height) document.getElementById('profileHeight').value = data.height;
                if (data.weight) document.getElementById('profileWeight').value = data.weight;
                if (data.cup) document.getElementById('profileCup').value = data.cup;
                if (data.location) document.getElementById('profileLocation').value = data.location;
                if (data.district) document.getElementById('profileDistrict').value = data.district;
                if (data.type) document.getElementById('profileType').value = data.type;
                if (data.price) document.getElementById('profilePrice').value = data.price;
                if (data.tags) document.getElementById('profileTags').value = (data.tags || []).join(', ');
                if (data.basicServices) document.getElementById('profileBasicServices').value = (data.basicServices || []).join(', ');
                if (data.addonServices) {
                    // 清理加值服務：移除價格部分（後端已處理，但前端也做一次確保）
                    profileAddonServices = (data.addonServices || []).map(service => {
                    // 移除 "+數字" 格式的價格部分，例如："毒龍+2000" -> "毒龍"
                    // 這裡是在 HTML 字串裡產生 JavaScript，所以要用四個反斜線，讓瀏覽器端真正看到的是 "\\+\\d+"
                    return service.replace(new RegExp('\\\\+\\\\d+', 'g'), '').trim();
                    }).filter(service => service.length > 0);
                    updateAddonServicesDisplay();
                }
                
                // 保存解析出的 prices（包含兩節價格）
                if (data.prices && data.prices.twoShot && data.prices.twoShot.price > 0) {
                    parsedPrices = data.prices;
                } else {
                    parsedPrices = null; // 如果沒有明確的兩節價格，清除緩存
                }
                
                alert('解析成功！請檢查並確認資料');
            } catch (error) {
                alert('解析失敗: ' + error.message);
            } finally {
                btn.disabled = false;
                btnText.textContent = '解析';
                isParsing = false;
            }
        }
        
        // 圖片處理 - 自動壓縮
        function compressImage(file) {
            return new Promise((resolve, reject) => {
                // 檢查檔案大小，如果已經很小就不需要壓縮
                if (file.size < 100 * 1024) { // 小於 100KB
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = (event) => resolve(event.target.result);
                    reader.onerror = reject;
                    return;
                }

                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onerror = reject;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 1200; // 增加最大寬度到 1200px，保持較好品質
                        const MAX_HEIGHT = 1600; // 最大高度限制
                        const QUALITY = 0.75; // 壓縮品質 75%
                        
                        let width = img.width;
                        let height = img.height;
                        
                        // 計算縮放比例
                        let scale = 1;
                        if (width > MAX_WIDTH) {
                            scale = Math.min(scale, MAX_WIDTH / width);
                        }
                        if (height > MAX_HEIGHT) {
                            scale = Math.min(scale, MAX_HEIGHT / height);
                        }
                        
                        width = Math.round(width * scale);
                        height = Math.round(height * scale);
                        
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        
                        // 使用更好的圖片渲染品質
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        
                        ctx.drawImage(img, 0, 0, width, height);
                        
                        // 壓縮為 JPEG 格式
                        const compressed = canvas.toDataURL('image/jpeg', QUALITY);
                        
                        // 如果壓縮後還是太大，進一步降低品質
                        if (compressed.length > 2 * 1024 * 1024) { // 如果超過 2MB
                            const lowerQuality = canvas.toDataURL('image/jpeg', 0.6);
                            resolve(lowerQuality);
                        } else {
                            resolve(compressed);
                        }
                    };
                };
                reader.onerror = reject;
            });
        }
        
        async function processFiles(files) {
            const uploadIcon = document.getElementById('uploadIcon');
            const uploadArea = document.getElementById('uploadArea');
            const originalText = uploadArea.querySelector('p').textContent;
            
            uploadIcon.textContent = '⏳';
            uploadArea.querySelector('p').textContent = '正在壓縮圖片...';
            uploadArea.style.pointerEvents = 'none';
            
            try {
                const fileArray = Array.from(files);
                let processedCount = 0;
                
                // 逐個處理圖片，顯示進度
                const compressed = [];
                for (const file of fileArray) {
                    uploadArea.querySelector('p').textContent = \`正在壓縮圖片 (\${processedCount + 1}/\${fileArray.length})...\`;
                    const compressedImg = await compressImage(file);
                    compressed.push(compressedImg);
                    processedCount++;
                }
                
                profileGallery = [...profileGallery, ...compressed];
                updateGalleryDisplay();
                
                // 顯示成功訊息
                const originalSize = fileArray.reduce((sum, f) => sum + f.size, 0);
                const compressedSize = compressed.reduce((sum, img) => sum + (img.length * 0.75), 0); // base64 約為實際大小的 75%
                const savedPercent = Math.round((1 - compressedSize / originalSize) * 100);
                
                if (savedPercent > 0) {
                    uploadArea.querySelector('p').textContent = \`✅ 已壓縮，節省約 \${savedPercent}% 空間\`;
                    setTimeout(() => {
                        uploadArea.querySelector('p').textContent = originalText;
                    }, 2000);
                } else {
                    uploadArea.querySelector('p').textContent = originalText;
                }
            } catch (error) {
                console.error('圖片處理失敗:', error);
                alert('圖片處理失敗: ' + error.message);
                uploadArea.querySelector('p').textContent = originalText;
            } finally {
                uploadIcon.textContent = '📤';
                uploadArea.style.pointerEvents = 'auto';
            }
        }
        
        function handleFileSelect(event) {
            processFiles(event.target.files);
        }
        
        function handleDrop(event) {
            event.preventDefault();
            handleDragLeave(event);
            processFiles(event.dataTransfer.files);
        }
        
        function handleDragOver(event) {
            event.preventDefault();
            document.getElementById('uploadArea').classList.add('dragging');
        }
        
        function handleDragLeave(event) {
            event.preventDefault();
            document.getElementById('uploadArea').classList.remove('dragging');
        }
        
        function updateGalleryDisplay() {
            const grid = document.getElementById('galleryGrid');
            const coverImage = profileGallery[0] || '';
            document.getElementById('profileImageUrl').value = coverImage;
            document.getElementById('profileGallery').value = JSON.stringify(profileGallery);
            
            grid.innerHTML = profileGallery.map((img, index) => {
                const isCover = index === 0;
                return '<div class="gallery-item ' + (isCover ? 'cover' : '') + '" onclick="setCoverImage(' + index + ')">' +
                    '<img src="' + img + '" alt="圖片 ' + (index + 1) + '" />' +
                    '<button type="button" class="delete-btn" onclick="deleteImage(' + index + '); event.stopPropagation();">✕</button>' +
                    (isCover ? '<div class="cover-badge">當前封面</div>' : '') +
                    '</div>';
            }).join('');
        }
        
        function setCoverImage(index) {
            const img = profileGallery[index];
            profileGallery.splice(index, 1);
            profileGallery.unshift(img);
            updateGalleryDisplay();
        }
        
        function deleteImage(index) {
            if (confirm('確定要刪除此圖片嗎？')) {
                profileGallery.splice(index, 1);
                updateGalleryDisplay();
            }
        }
        
        function addAddonService() {
            const input = document.getElementById('newAddonService');
            const value = input.value.trim();
            if (value) {
                profileAddonServices.push(value);
                input.value = '';
                updateAddonServicesDisplay();
            }
        }
        
        function removeAddonService(index) {
            profileAddonServices.splice(index, 1);
            updateAddonServicesDisplay();
        }
        
        function updateAddonServicesDisplay() {
            const list = document.getElementById('addonServicesList');
            list.innerHTML = profileAddonServices.map((service, index) => {
                return '<div class="addon-tag">' +
                    '<span>' + service + '</span>' +
                    '<button type="button" class="remove-btn" onclick="removeAddonService(' + index + ')">✕</button>' +
                    '</div>';
            }).join('');
        }
        
        // 影片 URL 解析函數
        function parseVideoUrl(url) {
            const result = { code: '', title: '' };
            
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname.toLowerCase();
                const pathname = urlObj.pathname;
                
                // FANZA (dmm.co.jp) - 例如: https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis123/
                if (hostname.includes('dmm.co.jp') || hostname.includes('dmm.com')) {
                    const cidMatch = pathname.match(/cid=([a-z0-9-]+)/i);
                    if (cidMatch) {
                        result.code = cidMatch[1].toUpperCase();
                    }
                }
                
                // JAVLibrary - 例如: https://www.javlibrary.com/cn/?v=javli5abc123
                if (hostname.includes('javlibrary.com')) {
                    const vMatch = urlObj.searchParams.get('v');
                    if (vMatch) {
                        result.code = vMatch.toUpperCase();
                    }
                }
                
                // JAVDB - 例如: https://javdb.com/v/abc123
                if (hostname.includes('javdb.com')) {
                    const pathMatch = pathname.match(/\/v\/([a-z0-9-]+)/i);
                    if (pathMatch) {
                        result.code = pathMatch[1].toUpperCase();
                    }
                }
                
                // 通用番号格式提取 (SSIS-123, SSIS123, ABC-123, ABC123 等)
                // 从 URL 路径或查询参数中提取
                const codePatterns = [
                    /([A-Z]{2,6}[-_]?[0-9]{2,6})/gi,  // SSIS-123, SSIS123
                    /([A-Z]{3,6}[0-9]{3,6})/gi,        // SSIS123
                ];
                
                for (const pattern of codePatterns) {
                    const matches = url.match(pattern);
                    if (matches && matches.length > 0) {
                        // 选择最长的匹配（通常是完整的番号）
                        const bestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
                        if (bestMatch.length >= 5) { // 至少5个字符才认为是番号
                            result.code = bestMatch.toUpperCase().replace(/[-_]/g, '-');
                            break;
                        }
                    }
                }
                
                // 尝试从 URL 路径中提取标题（如果 URL 包含标题）
                // 例如: https://example.com/video-title-ssis123
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length > 0) {
                    const lastPart = pathParts[pathParts.length - 1];
                    // 如果最后一部分包含番号，尝试提取标题部分
                    if (result.code && lastPart.includes(result.code.toLowerCase())) {
                        const codeLower = result.code.toLowerCase();
                        // 转义正则表达式特殊字符（使用字符串拼接避免模板字符串插值问题）
                        const specialChars = '[.*+?^\\\\' + '$' + '{' + '}' + '()|[\\]\\\\]';
                        const regex = new RegExp(specialChars, 'g');
                        const escapedCode = codeLower.replace(regex, function(match) {
                            return '\\\\\\\\' + match;
                        });
                        const titlePart = lastPart.replace(new RegExp(escapedCode, 'gi'), '').replace(/[-_]/g, ' ').trim();
                        if (titlePart.length > 3) {
                            result.title = titlePart;
                        }
                    }
                }
                
            } catch (e) {
                console.warn('URL 解析失敗:', e);
            }
            
            return result;
        }
        
        // 自動解析影片資訊
        async function autoParseVideo() {
            const urlInput = document.getElementById('newVideoUrl');
            const codeInput = document.getElementById('newVideoCode');
            const titleInput = document.getElementById('newVideoTitle');
            
            const url = urlInput.value.trim();
            if (!url) {
                alert('請先輸入影片連結');
                return;
            }
            
            // 顯示解析中狀態
            const parseBtn = document.getElementById('autoParseVideoBtn');
            if (parseBtn) {
                parseBtn.disabled = true;
                parseBtn.textContent = '解析中...';
            }
            
            try {
                // 從 URL 解析番號
                const parsed = parseVideoUrl(url);
                
                if (parsed.code) {
                    codeInput.value = parsed.code;
                }
                
                if (parsed.title) {
                    titleInput.value = parsed.title;
                }
                
                // 如果沒有解析到番號，嘗試從頁面獲取（需要後端 API）
                if (!parsed.code || !parsed.title) {
                    try {
                        const response = await fetch(API_BASE + '/api/admin/parse-video-info', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ url: url })
                        });
                        
                        if (response.ok) {
                            const data = await response.json();
                            if (data.code && !codeInput.value) {
                                codeInput.value = data.code;
                            }
                            if (data.title && !titleInput.value) {
                                titleInput.value = data.title;
                            }
                        }
                    } catch (apiError) {
                        // API 失敗不影響基本解析
                        console.warn('API 解析失敗:', apiError);
                    }
                }
                
                if (parsed.code || parsed.title) {
                    // 顯示成功提示
                    const successMsg = document.createElement('div');
                    successMsg.textContent = parsed.code ? ('已自動填入番號: ' + parsed.code) : '已解析部分資訊';
                    successMsg.style.cssText = 'color: #10b981; font-size: 0.875rem; margin-top: 0.5rem;';
                    urlInput.parentElement.appendChild(successMsg);
                    setTimeout(() => successMsg.remove(), 3000);
                } else {
                    alert('無法自動解析番號，請手動輸入');
                }
            } catch (error) {
                console.error('解析失敗:', error);
                alert('解析失敗: ' + error.message);
            } finally {
                if (parseBtn) {
                    parseBtn.disabled = false;
                    parseBtn.textContent = '自動解析';
                }
            }
        }
        
        // 影片管理函數
        function addVideo() {
            const urlInput = document.getElementById('newVideoUrl');
            const codeInput = document.getElementById('newVideoCode');
            const titleInput = document.getElementById('newVideoTitle');
            
            const url = urlInput.value.trim();
            const code = codeInput.value.trim();
            const title = titleInput.value.trim();
            
            if (!url) {
                alert('請輸入影片連結');
                return;
            }
            
            profileVideos.push({
                url: url,
                code: code || undefined,
                title: title || undefined
            });
            
            updateVideosDisplay();
            urlInput.value = '';
            codeInput.value = '';
            titleInput.value = '';
        }
        
        function removeVideo(index) {
            if (confirm('確定要刪除此影片嗎？')) {
                profileVideos.splice(index, 1);
                updateVideosDisplay();
            }
        }
        
        function updateVideosDisplay() {
            const list = document.getElementById('videosList');
            if (!list) return;
            
            list.innerHTML = profileVideos.map((video, index) => {
                const codeHtml = video.code ? '<div style="font-size: 0.875rem; color: #6b7280;">番號: <span style="font-weight: 600;">' + video.code + '</span></div>' : '';
                const title = video.title || '未命名影片';
                return '<div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.5rem;">' +
                    '<div style="flex: 1;">' +
                    '<div style="font-weight: 600; margin-bottom: 0.25rem;">' + title + '</div>' +
                    '<div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">連結: <a href="' + video.url + '" target="_blank" style="color: #3b82f6;">' + video.url + '</a></div>' +
                    codeHtml +
                    '</div>' +
                    '<button type="button" class="btn-small" onclick="removeVideo(' + index + ')" style="background: #ef4444; color: white;">刪除</button>' +
                    '</div>';
            }).join('');
        }

        function getCurrentTags() {
            const input = document.getElementById('profileTags');
            if (!input) return [];
            return (input.value || '')
                .split(',')
                .map(function (s) { return s.trim(); })
                .filter(function (s) { return s.length > 0; });
        }

        function setCurrentTags(tags) {
            const input = document.getElementById('profileTags');
            if (!input) return;
            const unique = Array.from(new Set(tags));
            input.value = unique.join(', ');
        }

        function toggleProfileTag(tag) {
            const tags = getCurrentTags();
            const index = tags.indexOf(tag);
            if (index > -1) {
                tags.splice(index, 1);
            } else {
                tags.push(tag);
            }
            setCurrentTags(tags);
        }

        // 保存 Profile
        async function saveProfile(event) {
            event.preventDefault();
            
            const coverImage = profileGallery[0] || document.getElementById('profileImageUrl').value;
            if (!coverImage) {
                alert('請至少上傳一張封面圖片');
                return;
            }
            
            const isInquiryOnly = document.getElementById('priceInquiryOnly').checked;
            const priceValue = isInquiryOnly ? -1 : parseInt(document.getElementById('profilePrice').value);
            
            if (!isInquiryOnly && (!priceValue || priceValue <= 0)) {
                alert('請輸入有效的價格，或勾選「私訊詢問」');
                return;
            }
            
            // 檢查是否已有兩節價格（優先順序：1. AI 解析結果 2. 現有資料 3. 套用公式）
            let existingTwoShotPrice = null;
            
            // 優先使用 AI 解析出的兩節價格
            if (parsedPrices && parsedPrices.twoShot && parsedPrices.twoShot.price > 0) {
                existingTwoShotPrice = parsedPrices.twoShot.price;
            } else if (currentEditingProfileId) {
                // 如果沒有解析結果，則檢查現有資料
                try {
                    const existingRes = await fetch(API_BASE + '/api/admin/profiles/' + currentEditingProfileId);
                    if (existingRes.ok) {
                        const existingProfile = await existingRes.json();
                        existingTwoShotPrice = existingProfile?.prices?.twoShot?.price;
                    }
                } catch (e) {
                    console.warn('無法載入現有資料:', e);
                }
            }
            
            // 構建 prices 對象：優先使用解析/現有的兩節價格，如果沒有則套用公式
            let prices;
            if (isInquiryOnly) {
                prices = {
                    oneShot: { price: -1, desc: '私訊詢問' },
                    twoShot: { price: -1, desc: '私訊詢問' }
                };
            } else {
                const twoShotPrice = (existingTwoShotPrice && existingTwoShotPrice > 0 && existingTwoShotPrice !== -1)
                    ? existingTwoShotPrice  // 優先使用解析/現有的兩節價格
                    : priceValue * 2 - 500;  // 如果沒有則套用公式
                
                prices = {
                    oneShot: { price: priceValue, desc: '一節/50min/1S' },
                    twoShot: { price: twoShotPrice, desc: '兩節/100min/2S' }
                };
            }
            
            const formData = {
                name: document.getElementById('profileName').value,
                nationality: getNationalityValue(),
                age: parseInt(document.getElementById('profileAge').value),
                height: parseInt(document.getElementById('profileHeight').value),
                weight: parseInt(document.getElementById('profileWeight').value),
                cup: document.getElementById('profileCup').value,
                location: document.getElementById('profileLocation').value,
                district: document.getElementById('profileDistrict').value || undefined,
                type: document.getElementById('profileType').value,
                price: priceValue,
                imageUrl: coverImage,
                tags: document.getElementById('profileTags').value.split(',').map(s => s.trim()).filter(s => s),
                basicServices: document.getElementById('profileBasicServices').value.split(',').map(s => s.trim()).filter(s => s),
                addonServices: profileAddonServices,
                videos: profileVideos,
                isAvailable: document.getElementById('profileIsAvailable').value === 'true',
                gallery: profileGallery.length > 0 ? profileGallery : [coverImage],
                albums: [],
                prices: prices,
                availableTimes: {
                    today: '12:00~02:00',
                    tomorrow: '12:00~02:00'
                }
            };

            try {
                const id = currentEditingProfileId;
                let res;
                
                if (id) {
                    // 更新（不需要重复检测）
                    res = await fetch(API_BASE + '/api/admin/profiles/' + id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                } else {
                    // 新增（带重复检测）
                    formData.id = Date.now().toString();
                    res = await fetch(API_BASE + '/api/admin/profiles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                }
                
                if (!res.ok) {
                    const error = await res.json();
                    
                    // 处理重复检测（409 状态码）
                    if (res.status === 409 && error.similarProfiles && error.similarProfiles.length > 0) {
                        const message = \`⚠️ 检测到可能重复的 Profile！\\n\\n相似度：\${error.similarProfiles[0].similarity}%\\n\\n相似 Profile：\\n\` +
                            error.similarProfiles.map(p => 
                                \`• \${p.name} \${p.nationality} (\${p.age}歲, \${p.location}) - 创建于 \${new Date(p.createdAt).toLocaleDateString('zh-TW')}\`
                            ).join('\\n') +
                            \`\\n\\n是否仍要继续上架？\`;
                        
                        if (confirm(message)) {
                            // 强制上架
                            formData.force = true;
                            const forceRes = await fetch(API_BASE + '/api/admin/profiles?force=true', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify(formData)
                            });
                            
                            if (!forceRes.ok) {
                                const forceError = await forceRes.json();
                                throw new Error(forceError.error || '强制上架失败');
                            }
                            
                            alert('已强制上架！');
                            closeProfileModal();
                            loadProfiles();
                            loadStats();
                            return;
                        } else {
                            return; // 用户取消
                        }
                    }
                    
                    throw new Error(error.error || '保存失敗');
                }
                
                alert('保存成功！');
                closeProfileModal();
                loadProfiles();
                loadStats();
            } catch (error) {
                alert('保存失敗: ' + error.message);
            }
        }

        // 關閉 Profile Modal
        function closeProfileModal() {
            document.getElementById('profileModal').classList.remove('active');
            currentEditingProfileId = null;
        }

        // 編輯 Profile
        async function editProfile(id) {
            showProfileForm(id);
        }

        // 顯示 Article 表單
        function showArticleForm(id = null) {
            currentEditingArticleId = id;
            const modal = document.getElementById('articleModal');
            const form = document.getElementById('articleForm');
            
            if (id) {
                document.getElementById('articleModalTitle').textContent = '編輯 Article';
                loadArticleData(id);
            } else {
                document.getElementById('articleModalTitle').textContent = '新增 Article';
                form.reset();
                document.getElementById('articleId').value = '';
                document.getElementById('articleDate').value = new Date().toISOString().split('T')[0];
            }
            
            modal.classList.add('active');
        }

        // 載入 Article 資料
        async function loadArticleData(id) {
            try {
                const res = await fetch(API_BASE + '/api/admin/articles/' + id);
                const article = await res.json();
                
                document.getElementById('articleId').value = article.id;
                document.getElementById('articleTitle').value = article.title || '';
                document.getElementById('articleSummary').value = article.summary || '';
                document.getElementById('articleTag').value = article.tag || '外送茶';
                document.getElementById('articleDate').value = article.date || '';
                document.getElementById('articleImageUrl').value = article.imageUrl || '';
                document.getElementById('articleContent').value = article.content || '';
            } catch (error) {
                alert('載入資料失敗: ' + error.message);
            }
        }

        // 保存 Article
        async function saveArticle(event) {
            event.preventDefault();
            
            const formData = {
                title: document.getElementById('articleTitle').value,
                summary: document.getElementById('articleSummary').value,
                tag: document.getElementById('articleTag').value,
                date: document.getElementById('articleDate').value,
                imageUrl: document.getElementById('articleImageUrl').value,
                content: document.getElementById('articleContent').value || undefined,
                views: 0
            };

            try {
                const id = currentEditingArticleId;
                let res;
                
                if (id) {
                    // 更新
                    res = await fetch(API_BASE + '/api/admin/articles/' + id, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                } else {
                    // 新增
                    formData.id = Date.now().toString();
                    res = await fetch(API_BASE + '/api/admin/articles', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                }
                
                if (!res.ok) {
                    const error = await res.json();
                    throw new Error(error.error || '保存失敗');
                }
                
                alert('保存成功！');
                closeArticleModal();
                loadArticles();
                loadStats();
            } catch (error) {
                alert('保存失敗: ' + error.message);
            }
        }

        // 關閉 Article Modal
        function closeArticleModal() {
            document.getElementById('articleModal').classList.remove('active');
            currentEditingArticleId = null;
        }

        // 編輯 Article
        async function editArticle(id) {
            showArticleForm(id);
        }

        // 點擊 Modal 背景關閉
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeProfileModal();
                closeArticleModal();
            }
        });

        // 顯示價格參考指南
        // 切換價格輸入框狀態
        function togglePriceInput() {
            const checkbox = document.getElementById('priceInquiryOnly');
            const priceInput = document.getElementById('profilePrice');
            const priceWrapper = priceInput.closest('.price-input-wrapper');
            
            if (checkbox.checked) {
                priceInput.disabled = true;
                priceInput.value = '';
                priceInput.removeAttribute('required');
                priceWrapper.style.opacity = '0.5';
                priceWrapper.style.pointerEvents = 'none';
            } else {
                priceInput.disabled = false;
                priceInput.setAttribute('required', 'required');
                priceWrapper.style.opacity = '1';
                priceWrapper.style.pointerEvents = 'auto';
            }
        }

        function showPriceGuide() {
            const helpDiv = document.getElementById('priceHelp');
            helpDiv.style.display = helpDiv.style.display === 'none' ? 'block' : 'none';
            if (helpDiv.style.display === 'block') {
                loadPriceStats();
            }
        }

        // 載入價格統計作為參考
        async function loadPriceStats() {
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles');
                const profiles = await res.json();
                
                if (profiles.length === 0) {
                    document.getElementById('priceStats').innerHTML = '<p style="color: #64748b; font-size: 0.85rem;">目前沒有其他 Profile 可供參考</p>';
                    return;
                }

                const prices = profiles.map(p => p.price).filter(p => p > 0);
                if (prices.length === 0) {
                    document.getElementById('priceStats').innerHTML = '<p style="color: #64748b; font-size: 0.85rem;">目前沒有價格資料可供參考</p>';
                    return;
                }

                const minPrice = Math.min(...prices);
                const maxPrice = Math.max(...prices);
                const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
                const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];

                // 根據類型分類統計
                const outcallPrices = profiles.filter(p => p.type === 'outcall').map(p => p.price).filter(p => p > 0);
                const incallPrices = profiles.filter(p => p.type === 'incall').map(p => p.price).filter(p => p > 0);

                let statsHtml = '<div style="background: white; padding: 1rem; border-radius: 6px; border: 1px solid #bae6fd;">';
                statsHtml += '<strong style="color: #0369a1; display: block; margin-bottom: 0.75rem;">📊 現有 Profiles 價格統計：</strong>';
                statsHtml += '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; margin-bottom: 0.75rem;">';
                statsHtml += \`<div><span style="color: #64748b; font-size: 0.8rem;">最低價：</span><span class="price-range">\${minPrice.toLocaleString()}</span></div>\`;
                statsHtml += \`<div><span style="color: #64748b; font-size: 0.8rem;">最高價：</span><span class="price-range">\${maxPrice.toLocaleString()}</span></div>\`;
                statsHtml += \`<div><span style="color: #64748b; font-size: 0.8rem;">平均價：</span><span class="price-range">\${avgPrice.toLocaleString()}</span></div>\`;
                statsHtml += \`<div><span style="color: #64748b; font-size: 0.8rem;">中位數：</span><span class="price-range">\${medianPrice.toLocaleString()}</span></div>\`;
                statsHtml += '</div>';

                if (outcallPrices.length > 0) {
                    const outcallAvg = Math.round(outcallPrices.reduce((a, b) => a + b, 0) / outcallPrices.length);
                    statsHtml += \`<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e0f2fe;"><span style="color: #64748b; font-size: 0.8rem;">🚗 外送平均：</span><span class="price-range">\${outcallAvg.toLocaleString()}</span> (共 \${outcallPrices.length} 筆)</div>\`;
                }
                if (incallPrices.length > 0) {
                    const incallAvg = Math.round(incallPrices.reduce((a, b) => a + b, 0) / incallPrices.length);
                    statsHtml += \`<div style="margin-top: 0.5rem;"><span style="color: #64748b; font-size: 0.8rem;">🏠 定點平均：</span><span class="price-range">\${incallAvg.toLocaleString()}</span> (共 \${incallPrices.length} 筆)</div>\`;
                }

                // 價格區間分布
                const ranges = [
                    { min: 0, max: 4500, label: '3,000-4,500' },
                    { min: 4500, max: 6000, label: '4,500-6,000' },
                    { min: 6000, max: 8000, label: '6,000-8,000' },
                    { min: 8000, max: 12000, label: '8,000-12,000' },
                    { min: 12000, max: Infinity, label: '12,000+' }
                ];

                statsHtml += '<div style="margin-top: 1rem; padding-top: 0.75rem; border-top: 1px solid #e0f2fe;">';
                statsHtml += '<strong style="color: #0369a1; font-size: 0.85rem; display: block; margin-bottom: 0.5rem;">價格分布：</strong>';
                ranges.forEach(range => {
                    const count = prices.filter(p => p >= range.min && p < range.max).length;
                    const percent = Math.round((count / prices.length) * 100);
                    if (count > 0) {
                        statsHtml += \`<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; font-size: 0.8rem;"><span>\${range.label}</span><span style="color: #64748b;">\${count} 筆 (\${percent}%)</span></div>\`;
                    }
                });
                statsHtml += '</div>';

                statsHtml += '</div>';
                document.getElementById('priceStats').innerHTML = statsHtml;
            } catch (error) {
                console.error('載入價格統計失敗:', error);
                document.getElementById('priceStats').innerHTML = '<p style="color: #ef4444; font-size: 0.85rem;">無法載入價格統計</p>';
            }
        }

        // 價格驗證和建議
        function validatePrice() {
            const priceInput = document.getElementById('profilePrice');
            const price = parseInt(priceInput.value);
            const type = document.getElementById('profileType').value;
            
            if (!price || price <= 0) return;

            // 移除舊的警告
            const existingWarning = priceInput.parentElement.querySelector('.price-warning');
            if (existingWarning) {
                existingWarning.remove();
            }

            // 基本價格範圍檢查
            let warning = null;
            if (price < 2000) {
                warning = { type: 'low', message: '⚠️ 價格過低（低於 2,000），可能低估了服務價值' };
            } else if (price > 20000) {
                warning = { type: 'high', message: '⚠️ 價格過高（超過 20,000），可能影響詢問量' };
            } else if (price < 3000 && type === 'outcall') {
                warning = { type: 'low', message: '⚠️ 外送價格建議至少 3,000 以上' };
            }

            if (warning) {
                const warningDiv = document.createElement('div');
                warningDiv.className = 'price-warning';
                warningDiv.style.cssText = \`margin-top: 0.5rem; padding: 0.75rem; background: \${warning.type === 'low' ? '#fef3c7' : '#fee2e2'}; border: 1px solid \${warning.type === 'low' ? '#f59e0b' : '#ef4444'}; border-radius: 6px; color: \${warning.type === 'low' ? '#92400e' : '#991b1b'}; font-size: 0.85rem;\`;
                warningDiv.textContent = warning.message;
                priceInput.parentElement.appendChild(warningDiv);
            }
        }

        // 綁定價格驗證
        document.addEventListener('DOMContentLoaded', () => {
            // 延遲綁定，確保元素已存在
            setTimeout(() => {
                const priceInput = document.getElementById('profilePrice');
                const typeSelect = document.getElementById('profileType');
                if (priceInput) {
                    priceInput.addEventListener('input', validatePrice);
                    priceInput.addEventListener('blur', validatePrice);
                }
                if (typeSelect) {
                    typeSelect.addEventListener('change', validatePrice);
                }
            }, 500);
        });

        // 載入用戶列表
        async function loadUsers() {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/admin/users', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                if (!res.ok) {
                    throw new Error('載入用戶失敗');
                }
                const users = await res.json();
                const list = document.getElementById('users-list');
                list.innerHTML = '<table><thead><tr><th>Email</th><th>手機號</th><th>身份</th><th>訂閱狀態</th><th>註冊時間</th><th>最後登入</th><th>操作</th></tr></thead><tbody>' +
                    users.map(u => \`
                        <tr>
                            <td>\${u.email || '-'}</td>
                            <td>\${u.phoneNumber || '-'}</td>
                            <td>\${u.role === 'provider' ? '👩 小姐' : u.role === 'client' ? '👤 客戶' : '👑 管理員'}</td>
                            <td>\${u.membershipLevel === 'subscribed' ? '✅ 已訂閱' : '❌ 未訂閱'}</td>
                            <td>\${new Date(u.createdAt).toLocaleString('zh-TW')}</td>
                            <td>\${u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-TW') : '-'}</td>
                            <td>
                                <button class="btn" onclick="viewUserDetail('\${u.id}')">查看詳情</button>
                            </td>
                        </tr>
                    \`).join('') + '</tbody></table>';
            } catch (error) {
                console.error('載入用戶失敗:', error);
                document.getElementById('users-list').innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">載入失敗: ' + error.message + '</div>';
            }
        }

        // 查看用戶詳情
        async function viewUserDetail(userId) {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/admin/users/' + userId, {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                if (!res.ok) {
                    throw new Error('載入用戶詳情失敗');
                }
                const data = await res.json();
                const user = data.user;
                const bookings = data.bookings || [];
                
                let bookingsHtml = '';
                if (bookings.length === 0) {
                    bookingsHtml = '<p>暫無預約記錄</p>';
                } else {
                    bookingsHtml = '<table style="margin-top: 1rem;"><thead><tr><th>預約ID</th><th>Profile</th><th>日期</th><th>時間</th><th>狀態</th></tr></thead><tbody>' +
                        bookings.map(b => \`
                            <tr>
                                <td>\${b.id.substring(0, 8)}...</td>
                                <td>\${b.profileId.substring(0, 8)}...</td>
                                <td>\${b.bookingDate}</td>
                                <td>\${b.bookingTime}</td>
                                <td>\${b.status === 'pending' ? '⏳ 待處理' : b.status === 'accepted' ? '✅ 已接受' : b.status === 'completed' ? '✅ 已完成' : b.status === 'cancelled' ? '❌ 已取消' : '❌ 已拒絕'}</td>
                            </tr>
                        \`).join('') + '</tbody></table>';
                }
                
                alert(\`用戶詳情：\\n\\nID: \${user.id}\\nEmail: \${user.email || '-'}\\n手機號: \${user.phoneNumber || '-'}\\n身份: \${user.role === 'provider' ? '小姐' : user.role === 'client' ? '客戶' : '管理員'}\\n訂閱狀態: \${user.membershipLevel === 'subscribed' ? '已訂閱' : '未訂閱'}\\n註冊時間: \${new Date(user.createdAt).toLocaleString('zh-TW')}\\n\\n預約記錄：\${bookings.length} 筆\`);
            } catch (error) {
                console.error('載入用戶詳情失敗:', error);
                alert('載入用戶詳情失敗: ' + error.message);
            }
        }

        // 導出用戶資料
        async function exportUsers() {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/admin/users', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                if (!res.ok) {
                    throw new Error('載入用戶失敗');
                }
                const users = await res.json();
                
                // 轉換為 CSV 格式
                const headers = ['Email', '手機號', '身份', '訂閱狀態', '註冊時間', '最後登入'];
                const rows = users.map(u => [
                    u.email || '',
                    u.phoneNumber || '',
                    u.role === 'provider' ? '小姐' : u.role === 'client' ? '客戶' : '管理員',
                    u.membershipLevel === 'subscribed' ? '已訂閱' : '未訂閱',
                    new Date(u.createdAt).toLocaleString('zh-TW'),
                    u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-TW') : ''
                ]);
                
                // 創建 CSV 內容
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => \`"\${cell}"\`).join(','))
                ].join('\\n');
                
                // 添加 BOM 以支援中文
                const BOM = '\\uFEFF';
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', \`用戶資料_\${new Date().toISOString().split('T')[0]}.csv\`);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                
                alert('導出成功！');
            } catch (error) {
                console.error('導出用戶資料失敗:', error);
                alert('導出失敗: ' + error.message);
            }
        }

        // 載入預約列表
        async function loadBookings() {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/bookings/all', {
                    headers: {
                        'Authorization': 'Bearer ' + token
                    }
                });
                if (!res.ok) {
                    throw new Error('載入預約失敗');
                }
                const bookings = await res.json();
                const list = document.getElementById('bookings-list');
                
                if (bookings.length === 0) {
                    list.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">目前沒有預約記錄</div>';
                    return;
                }
                
                list.innerHTML = '<table><thead><tr><th>預約ID</th><th>客戶ID</th><th>小姐ID</th><th>Profile ID</th><th>日期</th><th>時間</th><th>狀態</th><th>操作</th></tr></thead><tbody>' +
                    bookings.map(b => \`
                        <tr>
                            <td>\${b.id.substring(0, 8)}...</td>
                            <td>\${b.clientId.substring(0, 8)}...</td>
                            <td>\${b.providerId ? b.providerId.substring(0, 8) + '...' : '-'}</td>
                            <td>\${b.profileId.substring(0, 8)}...</td>
                            <td>\${b.bookingDate}</td>
                            <td>\${b.bookingTime}</td>
                            <td>\${b.status === 'pending' ? '⏳ 待處理' : b.status === 'accepted' ? '✅ 已接受' : b.status === 'completed' ? '✅ 已完成' : b.status === 'cancelled' ? '❌ 已取消' : '❌ 已拒絕'}</td>
                            <td>
                                <button class="btn" onclick="updateBookingStatus('\${b.id}', 'accepted')">接受</button>
                                <button class="btn btn-danger" onclick="updateBookingStatus('\${b.id}', 'rejected')">拒絕</button>
                            </td>
                        </tr>
                    \`).join('') + '</tbody></table>';
            } catch (error) {
                console.error('載入預約失敗:', error);
                document.getElementById('bookings-list').innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">載入失敗: ' + error.message + '</div>';
            }
        }

        // 更新預約狀態
        async function updateBookingStatus(bookingId, status) {
            try {
                const token = localStorage.getItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/bookings/' + bookingId + '/status', {
                    method: 'PUT',
                    headers: {
                        'Authorization': 'Bearer ' + token,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ status })
                });
                if (!res.ok) {
                    throw new Error('更新預約狀態失敗');
                }
                alert('更新成功');
                loadBookings();
            } catch (error) {
                console.error('更新預約狀態失敗:', error);
                alert('更新預約狀態失敗: ' + error.message);
            }
        }

    </script>
</body>
</html>
  `);
});

export default router;

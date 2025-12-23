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
    <title>茶湯匯 - 後台管理系統</title>
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
    </style>
</head>
<body>
    <div class="header">
        <h1>🍵 茶湯匯 - 後台管理系統</h1>
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
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab('profiles')">Profiles 管理</button>
            <button class="tab" onclick="showTab('articles')">Articles 管理</button>
        </div>

        <div class="content">
            <div id="profiles-tab">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>Profiles 管理</h2>
                    <button class="btn btn-success" onclick="showProfileForm()">+ 新增 Profile</button>
                </div>
                <div id="profiles-list"></div>
            </div>

            <div id="articles-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>Articles 管理</h2>
                    <button class="btn btn-success" onclick="showArticleForm()">+ 新增 Article</button>
                </div>
                <div id="articles-list"></div>
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
                        <input type="text" id="profileNationality" placeholder="🇹🇼" required />
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
                        <input type="number" id="profilePrice" required />
                    </div>
                </div>
                <div class="form-group">
                    <label>標籤 (用逗號分隔)</label>
                    <input type="text" id="profileTags" placeholder="氣質高雅, 鄰家清新" />
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
        let isDragging = false;
        let isParsing = false;

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

        // 載入 Profiles
        async function loadProfiles() {
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles');
                const profiles = await res.json();
                const list = document.getElementById('profiles-list');
                list.innerHTML = '<table><thead><tr><th>ID</th><th>姓名</th><th>地區</th><th>價格</th><th>狀態</th><th>操作</th></tr></thead><tbody>' +
                    profiles.map(p => \`
                        <tr>
                            <td>\${p.id}</td>
                            <td>\${p.name} \${p.nationality}</td>
                            <td>\${p.location}\${p.district ? ' - ' + p.district : ''}</td>
                            <td>NT$ \${p.price.toLocaleString()}</td>
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
            document.getElementById('articles-tab').classList.toggle('hidden', tab !== 'articles');
            if (tab === 'profiles') loadProfiles();
            if (tab === 'articles') loadArticles();
        }

        // 刪除 Profile
        async function deleteProfile(id) {
            if (!confirm('確定要刪除這個 Profile 嗎？')) return;
            try {
                const res = await fetch(API_BASE + \`/api/admin/profiles/\${id}\`, { method: 'DELETE' });
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
                const res = await fetch(API_BASE + \`/api/admin/articles/\${id}\`, { method: 'DELETE' });
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
                profileGallery = [];
                profileAddonServices = [];
                updateGalleryDisplay();
                updateAddonServicesDisplay();
            }
            
            modal.classList.add('active');
        }

        // 載入 Profile 資料
        async function loadProfileData(id) {
            try {
                const res = await fetch(API_BASE + \`/api/admin/profiles/\${id}\`);
                const profile = await res.json();
                
                document.getElementById('profileId').value = profile.id;
                document.getElementById('profileName').value = profile.name || '';
                document.getElementById('profileNationality').value = profile.nationality || '';
                document.getElementById('profileAge').value = profile.age || '';
                document.getElementById('profileHeight').value = profile.height || '';
                document.getElementById('profileWeight').value = profile.weight || '';
                document.getElementById('profileCup').value = profile.cup || '';
                document.getElementById('profileLocation').value = profile.location || '';
                document.getElementById('profileDistrict').value = profile.district || '';
                document.getElementById('profileType').value = profile.type || 'outcall';
                document.getElementById('profilePrice').value = profile.price || '';
                document.getElementById('profileTags').value = (profile.tags || []).join(', ');
                document.getElementById('profileBasicServices').value = (profile.basicServices || []).join(', ');
                document.getElementById('profileIsAvailable').value = profile.isAvailable !== false ? 'true' : 'false';
                
                // 載入圖片
                profileGallery = profile.gallery || [profile.imageUrl || ''].filter(Boolean);
                profileAddonServices = profile.addonServices || [];
                updateGalleryDisplay();
                updateAddonServicesDisplay();
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
                    const error = await res.json();
                    throw new Error(error.error || '解析失敗');
                }
                
                const data = await res.json();
                
                // 填充表單
                if (data.name) document.getElementById('profileName').value = data.name;
                if (data.nationality) document.getElementById('profileNationality').value = data.nationality;
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
                    profileAddonServices = data.addonServices || [];
                    updateAddonServicesDisplay();
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
        
        // 圖片處理
        function compressImage(file) {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = (event) => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        const MAX_WIDTH = 800;
                        let width = img.width;
                        let height = img.height;
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    };
                };
            });
        }
        
        async function processFiles(files) {
            const uploadIcon = document.getElementById('uploadIcon');
            uploadIcon.textContent = '⏳';
            
            try {
                const compressed = await Promise.all(Array.from(files).map(compressImage));
                profileGallery = [...profileGallery, ...compressed];
                updateGalleryDisplay();
            } catch (error) {
                alert('圖片處理失敗: ' + error.message);
            } finally {
                uploadIcon.textContent = '📤';
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
            
            grid.innerHTML = profileGallery.map((img, index) => \`
                <div class="gallery-item \${index === 0 ? 'cover' : ''}" onclick="setCoverImage(\${index})">
                    <img src="\${img}" alt="圖片 \${index + 1}" />
                    <button type="button" class="delete-btn" onclick="deleteImage(\${index}); event.stopPropagation();">✕</button>
                    \${index === 0 ? '<div class="cover-badge">當前封面</div>' : ''}
                </div>
            \`).join('');
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
            list.innerHTML = profileAddonServices.map((service, index) => \`
                <div class="addon-tag">
                    <span>\${service}</span>
                    <button type="button" class="remove-btn" onclick="removeAddonService(\${index})">✕</button>
                </div>
            \`).join('');
        }

        // 保存 Profile
        async function saveProfile(event) {
            event.preventDefault();
            
            const coverImage = profileGallery[0] || document.getElementById('profileImageUrl').value;
            if (!coverImage) {
                alert('請至少上傳一張封面圖片');
                return;
            }
            
            const formData = {
                name: document.getElementById('profileName').value,
                nationality: document.getElementById('profileNationality').value,
                age: parseInt(document.getElementById('profileAge').value),
                height: parseInt(document.getElementById('profileHeight').value),
                weight: parseInt(document.getElementById('profileWeight').value),
                cup: document.getElementById('profileCup').value,
                location: document.getElementById('profileLocation').value,
                district: document.getElementById('profileDistrict').value || undefined,
                type: document.getElementById('profileType').value,
                price: parseInt(document.getElementById('profilePrice').value),
                imageUrl: coverImage,
                tags: document.getElementById('profileTags').value.split(',').map(s => s.trim()).filter(s => s),
                basicServices: document.getElementById('profileBasicServices').value.split(',').map(s => s.trim()).filter(s => s),
                addonServices: profileAddonServices,
                isAvailable: document.getElementById('profileIsAvailable').value === 'true',
                gallery: profileGallery.length > 0 ? profileGallery : [coverImage],
                albums: [],
                prices: {
                    oneShot: { price: parseInt(document.getElementById('profilePrice').value), desc: '一節/50min/1S' },
                    twoShot: { price: parseInt(document.getElementById('profilePrice').value) * 2 - 500, desc: '兩節/100min/2S' }
                },
                availableTimes: {
                    today: '12:00~02:00',
                    tomorrow: '12:00~02:00'
                }
            };

            try {
                const id = currentEditingProfileId;
                let res;
                
                if (id) {
                    // 更新
                    res = await fetch(API_BASE + \`/api/admin/profiles/\${id}\`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formData)
                    });
                } else {
                    // 新增
                    formData.id = Date.now().toString();
                    res = await fetch(API_BASE + '/api/admin/profiles', {
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
                const res = await fetch(API_BASE + \`/api/admin/articles/\${id}\`);
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
                    res = await fetch(API_BASE + \`/api/admin/articles/\${id}\`, {
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

        // 初始化
        loadStats();
        loadProfiles();
    </script>
</body>
</html>
  `);
});

export default router;

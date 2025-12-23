import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
        .hidden {
            display: none;
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

    <script>
        const API_BASE = window.location.origin;

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
                await fetch(API_BASE + \`/api/admin/profiles/\${id}\`, { method: 'DELETE' });
                loadProfiles();
                loadStats();
            } catch (error) {
                alert('刪除失敗: ' + error.message);
            }
        }

        // 刪除 Article
        async function deleteArticle(id) {
            if (!confirm('確定要刪除這篇文章嗎？')) return;
            try {
                await fetch(API_BASE + \`/api/admin/articles/\${id}\`, { method: 'DELETE' });
                loadArticles();
                loadStats();
            } catch (error) {
                alert('刪除失敗: ' + error.message);
            }
        }

        function showProfileForm() {
            alert('請使用前端的管理介面或直接調用 API 來新增 Profile');
        }

        function editProfile(id) {
            alert('請使用前端的管理介面或直接調用 API 來編輯 Profile');
        }

        function showArticleForm() {
            alert('請使用前端的管理介面或直接調用 API 來新增 Article');
        }

        function editArticle(id) {
            alert('請使用前端的管理介面或直接調用 API 來編輯 Article');
        }

        // 初始化
        loadStats();
        loadProfiles();
    </script>
</body>
</html>
  `);
});

export default router;


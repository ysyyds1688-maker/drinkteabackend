import express from 'express';

const router = express.Router();

// 後台管理系統頁面
router.get('/', (req, res) => {
  try {
    const html = `
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
        .header { background: #1a1a1a; color: white; padding: 1rem 2rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header h1 { font-size: 1.5rem; font-weight: 600; }
        .container { max-width: 1400px; margin: 2rem auto; padding: 0 2rem; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
        .stat-card { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .stat-card h3 { font-size: 0.875rem; color: #666; margin-bottom: 0.5rem; }
        .stat-card .value { font-size: 2rem; font-weight: 600; color: #1a1a1a; }
        .tabs { display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 2px solid #e0e0e0; }
        .tab { padding: 1rem 2rem; background: none; border: none; cursor: pointer; font-size: 1rem; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px; }
        .tab.active { color: #1a1a1a; border-bottom-color: #1a1a1a; font-weight: 600; }
        .content { background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .btn { padding: 0.75rem 1.5rem; background: #1a1a1a; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500; margin-right: 0.5rem; }
        .btn:hover { background: #333; }
        .btn-success { background: #10b981; }
        .btn-danger { background: #ef4444; }
        .hidden { display: none; }
        table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e0e0e0; }
        .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; overflow-y: auto; }
        .modal.active { display: flex; }
        .modal-content { background: white; border-radius: 8px; padding: 2rem; max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto; }
        .login-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); z-index: 2000; display: flex; align-items: center; justify-content: center; }
        .login-box { background: white; padding: 2.5rem; border-radius: 12px; width: 400px; }
        .login-error { color: #ef4444; margin-bottom: 1rem; font-size: 0.875rem; display: none; }
        .login-error.show { display: block; }
        .form-group { margin-bottom: 1.25rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: 500; }
        .form-group input, .form-group select, .form-group textarea { width: 100%; padding: 0.75rem; border: 1px solid #ddd; border-radius: 6px; }
        .gallery-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; margin-top: 10px; }
        .gallery-item { position: relative; aspect-ratio: 1; border: 2px solid #ddd; border-radius: 4px; overflow: hidden; }
        .gallery-item img { width: 100%; height: 100%; object-fit: cover; }
    </style>
</head>
<body>
    <div id="loginOverlay" class="login-overlay">
        <div class="login-box">
            <h2>🔐 管理員登入</h2>
            <div id="loginError" class="login-error"></div>
            <form onsubmit="handleLogin(event)">
                <div class="form-group">
                    <label>Email</label>
                    <input type="email" id="loginEmail" required value="admin@test.com">
                </div>
                <div class="form-group">
                    <label>密碼</label>
                    <input type="password" id="loginPassword" required>
                </div>
                <button type="submit" class="btn" style="width: 100%;">登入</button>
            </form>
        </div>
    </div>

    <div class="header">
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <h1>🍵 茶王後台系統</h1>
            <div id="userInfo" style="display:none;">
                <span id="userEmail"></span>
                <button class="btn btn-danger" onclick="handleLogout()" style="padding: 0.4rem 0.8rem; margin-left: 1rem;">登出</button>
            </div>
        </div>
    </div>

    <div class="container" id="mainContent" style="display:none;">
        <div class="stats">
            <div class="stat-card"><h3>總 Profiles</h3><div class="value" id="totalProfiles">-</div></div>
            <div class="stat-card"><h3>文章總覽</h3><div class="value" id="totalArticles">-</div></div>
            <div class="stat-card"><h3>總用戶</h3><div class="value" id="totalUsers">-</div></div>
            <div class="stat-card"><h3>待處理預約</h3><div class="value" id="pendingBookings">-</div></div>
        </div>

        <div class="tabs">
            <button class="tab active" onclick="showTab(event, 'profiles')">高級茶管理</button>
            <button class="tab" onclick="showTab(event, 'articles')">文章管理</button>
            <button class="tab" onclick="showTab(event, 'users')">用戶管理</button>
            <button class="tab" onclick="showTab(event, 'bookings')">預約管理</button>
        </div>

        <div class="content">
            <div id="profiles-tab">
                <div style="display:flex; justify-content:space-between;">
                    <h2>高級茶清單</h2>
                    <button class="btn btn-success" onclick="showProfileForm()">+ 新增高級茶</button>
                </div>
                <div id="profiles-list"></div>
            </div>
            <div id="articles-tab" class="hidden"><h2>文章管理</h2><div id="articles-list"></div></div>
            <div id="users-tab" class="hidden"><h2>用戶管理</h2><div id="users-list"></div></div>
            <div id="bookings-tab" class="hidden"><h2>預約管理</h2><div id="bookings-list"></div></div>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin;

        function getAuthHeaders() {
            return {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
            };
        }

        async function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            try {
                const res = await fetch(API_BASE + '/api/auth/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email, password })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error || '登入失敗');
                
                localStorage.setItem('auth_token', data.token);
                localStorage.setItem('user_info', JSON.stringify(data.user));
                checkAuth();
            } catch (err) {
                const errDiv = document.getElementById('loginError');
                errDiv.textContent = err.message;
                errDiv.classList.add('show');
            }
        }

        function handleLogout() {
            localStorage.clear();
            location.reload();
        }

        function checkAuth() {
            const token = localStorage.getItem('auth_token');
            if (token) {
                document.getElementById('loginOverlay').style.display = 'none';
                document.getElementById('mainContent').style.display = 'block';
                document.getElementById('userInfo').style.display = 'block';
                document.getElementById('userEmail').textContent = JSON.parse(localStorage.getItem('user_info')).email;
                loadStats();
                loadProfiles();
            }
        }

        async function loadStats() {
            try {
                const res = await fetch(API_BASE + '/api/admin/stats', { headers: getAuthHeaders() });
                const stats = await res.json();
                document.getElementById('totalProfiles').textContent = stats.profiles.total;
                document.getElementById('totalArticles').textContent = stats.articles.total;
            } catch (e) { console.error(e); }
        }

        async function loadProfiles() {
            const list = document.getElementById('profiles-list');
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles', { headers: getAuthHeaders() });
                const data = await res.json();
                list.innerHTML = '<table><thead><tr><th>ID</th><th>姓名</th><th>價格</th><th>操作</th></tr></thead><tbody>' + 
                    data.map(p => \`<tr><td>\${p.id}</td><td>\${p.name}</td><td>\${p.price}</td><td><button class="btn btn-danger" onclick="deleteProfile('\${p.id}')">刪除</button></td></tr>\`).join('') + 
                    '</tbody></table>';
            } catch (e) { list.innerHTML = '載入失敗'; }
        }

        function showTab(event, tabName) {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.content > div').forEach(c => c.classList.add('hidden'));
            event.currentTarget.classList.add('active');
            document.getElementById(tabName + '-tab').classList.remove('hidden');
            if(tabName === 'bookings') loadBookings();
        }

        async function loadBookings() {
            const list = document.getElementById('bookings-list');
            try {
                const res = await fetch(API_BASE + '/api/admin/bookings', { headers: getAuthHeaders() });
                const data = await res.json();
                list.innerHTML = '<table><thead><tr><th>時間</th><th>小姐</th><th>客戶</th><th>狀態</th></tr></thead><tbody>' + 
                    data.map(b => \`<tr><td>\${new Date(b.createdAt).toLocaleString()}</td><td>\${b.profileName}</td><td>\${b.userName}</td><td>\${b.status}</td></tr>\`).join('') + 
                    '</tbody></table>';
            } catch (e) { list.innerHTML = '無預約資料'; }
        }

        window.onload = checkAuth;
    </script>
</body>
</html>
    \`;
    res.send(html);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('系統產生錯誤，請檢查後台日誌');
  }
});

export default router;
import express from 'express';

const router = express.Router();

// 資料備份頁面（獨立路由，避免影響主模板字串）
router.get('/backup', (req, res) => {
  res.redirect('/api/admin/backup');
});

// 後台管理系統主頁面（大型儀表板）
router.get('/', (req, res) => {
  // #region agent log
  console.log('[DEBUG] Admin panel route handler called');
  try {
    const http = require('http');
    const logData = JSON.stringify({location:'admin-panel.ts:6',message:'Admin panel route handler called',data:{timestamp:Date.now()},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C,D,E'});
    const options = {hostname:'127.0.0.1',port:7247,path:'/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(logData)}};
    const reqLog = http.request(options,()=>{});reqLog.on('error',()=>{});reqLog.write(logData);reqLog.end();
  } catch(e) {}
  // #endregion
  try {
    const html = `<!DOCTYPE html>
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
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .success-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
        }
        .error-message {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ef4444;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
        }
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
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

        /* ==================== 響應式設計 (RWD) ==================== */
        /* 平板 (768px - 1024px) */
        @media (max-width: 1024px) {
            .container {
                padding: 0 1rem;
            }
            .stats {
                grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            }
            .stat-card .value {
                font-size: 1.75rem;
            }
            .tabs {
                flex-wrap: wrap;
                gap: 0.5rem;
            }
            .tab {
                padding: 0.75rem 1rem;
                font-size: 0.875rem;
            }
            table {
                font-size: 0.875rem;
            }
            th, td {
                padding: 0.75rem 0.5rem;
            }
            .modal-content {
                max-width: 90%;
                padding: 1.5rem;
            }
        }

        /* 手機 (最大 768px) */
        @media (max-width: 768px) {
            .header {
                padding: 0.75rem 1rem;
            }
            .header h1 {
                font-size: 1.25rem;
            }
            .user-info {
                flex-direction: column;
                gap: 0.5rem;
                align-items: flex-end;
            }
            .user-info span {
                font-size: 0.75rem;
            }
            .logout-btn {
                padding: 0.4rem 0.75rem;
                font-size: 0.75rem;
            }
            .container {
                margin: 1rem auto;
                padding: 0 0.75rem;
            }
            .stats {
                grid-template-columns: repeat(2, 1fr);
                gap: 0.75rem;
            }
            .stat-card {
                padding: 1rem;
            }
            .stat-card h3 {
                font-size: 0.75rem;
                margin-bottom: 0.25rem;
            }
            .stat-card .value {
                font-size: 1.5rem;
            }
            .tabs {
                overflow-x: auto;
                -webkit-overflow-scrolling: touch;
                flex-wrap: nowrap;
                gap: 0.5rem;
                padding-bottom: 0.5rem;
            }
            .tabs::-webkit-scrollbar {
                height: 4px;
            }
            .tabs::-webkit-scrollbar-thumb {
                background: #ccc;
                border-radius: 2px;
            }
            .tab {
                padding: 0.75rem 1rem;
                font-size: 0.875rem;
                white-space: nowrap;
                flex-shrink: 0;
            }
            .content {
                padding: 1rem;
            }
            .content h2 {
                font-size: 1.25rem;
            }
            /* 表格改為卡片式（手機） */
            table {
                display: none;
            }
            .table-mobile {
                display: block;
            }
            .table-mobile .table-card {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 1rem;
                margin-bottom: 0.75rem;
            }
            .table-mobile .table-card-header {
                font-weight: 600;
                margin-bottom: 0.5rem;
                color: #1a1a1a;
            }
            .table-mobile .table-card-row {
                display: flex;
                justify-content: space-between;
                padding: 0.5rem 0;
                border-bottom: 1px solid #f0f0f0;
            }
            .table-mobile .table-card-row:last-child {
                border-bottom: none;
            }
            .table-mobile .table-card-label {
                font-weight: 500;
                color: #666;
                font-size: 0.875rem;
            }
            .table-mobile .table-card-value {
                color: #1a1a1a;
                font-size: 0.875rem;
                text-align: right;
            }
            .table-mobile .table-card-actions {
                display: flex;
                gap: 0.5rem;
                margin-top: 0.75rem;
                flex-wrap: wrap;
            }
            .btn {
                padding: 0.5rem 1rem;
                font-size: 0.75rem;
                margin-right: 0.25rem;
                margin-bottom: 0.25rem;
            }
            .modal.active {
                padding: 0.5rem;
            }
            .modal-content {
                max-width: 100%;
                max-height: 95vh;
                padding: 1rem;
            }
            .modal-header h2 {
                font-size: 1.25rem;
            }
            .form-row {
                grid-template-columns: 1fr;
            }
            .success-message,
            .error-message {
                top: 10px;
                right: 10px;
                left: 10px;
                padding: 0.75rem 1rem;
                font-size: 0.875rem;
            }
            /* 用戶搜索欄位 */
            #userSearchInput {
                min-width: 100%;
                margin-bottom: 0.5rem;
            }
            /* 統計卡片中的在線人數 */
            .stat-card[style*="background: linear-gradient"] {
                grid-column: 1 / -1;
            }
            .stat-card[style*="background: linear-gradient"] .value {
                font-size: 2rem;
            }
        }

        /* 小手機 (最大 480px) */
        @media (max-width: 480px) {
            .stats {
                grid-template-columns: 1fr;
            }
            .stat-card .value {
                font-size: 1.25rem;
            }
            .tab {
                padding: 0.5rem 0.75rem;
                font-size: 0.75rem;
            }
            .content h2 {
                font-size: 1rem;
            }
            .btn {
                padding: 0.4rem 0.75rem;
                font-size: 0.7rem;
            }
        }

        /* 桌面增強 (最小 1025px) */
        @media (min-width: 1025px) {
            .stats {
                grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            }
            .stat-card:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 8px rgba(0,0,0,0.15);
                transition: all 0.2s ease;
            }
            .btn {
                transition: all 0.2s ease;
            }
            .btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
        }

        /* 表格響應式切換 */
        .table-mobile {
            display: none;
        }
        @media (max-width: 768px) {
            .table-desktop {
                display: none;
            }
            .table-mobile {
                display: block;
            }
            .user-detail-grid {
                grid-template-columns: 1fr !important;
            }
            .modal-content[style*="max-width: 800px"] {
                max-width: 95% !important;
            }
        }
    </style>
</head>
<body>
    <!-- 登入覆蓋層 -->
    <div id="loginOverlay" class="login-overlay">
        <div class="login-box">
            <h2>🔐 後台管理系統登入</h2>
            <div id="loginError" class="login-error"></div>
            <form id="loginForm" onsubmit="handleLogin(event)">
                <div class="login-form-group">
                    <label>Email</label>
                    <input type="email" id="loginEmail" placeholder="admin@teakingom.com" required />
                </div>
                <div class="login-form-group">
                    <label>密碼</label>
                    <input type="password" id="loginPassword" placeholder="請輸入密碼" required />
                </div>
                <button type="submit" class="login-btn">登入</button>
            </form>
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
        <!-- 儀表板統計卡片（只顯示最重要的數據） -->
        <div class="stats" id="stats">
            <div class="stat-card" style="background: linear-gradient(135deg, #1a5f3f 0%, #15803d 100%); color: white; grid-column: span 2;">
                <h3 style="color: rgba(255,255,255,0.9);">🟢 在線人數</h3>
                <div class="value" id="onlineCount" style="color: white; font-size: 3rem; font-weight: 700;">-</div>
                <div style="font-size: 0.875rem; margin-top: 0.5rem; opacity: 0.9; display: flex; gap: 1rem; justify-content: center;">
                    <span id="onlineLoggedIn">已登入: -</span>
                    <span>|</span>
                    <span id="onlineGuests">訪客: -</span>
                </div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white;">
                <h3 style="color: rgba(255,255,255,0.9);">📊 總用戶數</h3>
                <div class="value" id="totalUsers" style="color: white; font-size: 2rem;">-</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); color: white;">
                <h3 style="color: rgba(255,255,255,0.9);">👩 佳麗人數</h3>
                <div class="value" id="totalProviders" style="color: white; font-size: 2rem;">-</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #ec4899 0%, #db2777 100%); color: white;">
                <h3 style="color: rgba(255,255,255,0.9);">👤 品茶客數</h3>
                <div class="value" id="totalClients" style="color: white; font-size: 2rem;">-</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white;">
                <h3 style="color: rgba(255,255,255,0.9);">📅 待處理預約</h3>
                <div class="value" id="pendingBookings" style="color: white; font-size: 2rem;">-</div>
            </div>
            <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white;">
                <h3 style="color: rgba(255,255,255,0.9);">✅ 可用 Profiles</h3>
                <div class="value" id="availableProfiles" style="color: white; font-size: 2rem;">-</div>
            </div>
        </div>

        <div class="tabs">
            <button class="tab active" data-tab="dashboard" onclick="showTab(event, &#39;dashboard&#39;)">📊 儀表板</button>
            <button class="tab" data-tab="profiles" onclick="showTab(event, &#39;profiles&#39;)">高級茶管理</button>
            <button class="tab" data-tab="provider-profiles" onclick="showTab(event, &#39;provider-profiles&#39;)">佳麗管理</button>
            <button class="tab" data-tab="articles" onclick="showTab(event, &#39;articles&#39;)">Articles 管理</button>
            <button class="tab" data-tab="users" onclick="showTab(event, &#39;users&#39;)">用戶管理</button>
            <button class="tab" data-tab="bookings" onclick="showTab(event, &#39;bookings&#39;)">預約管理</button>
            <button class="tab" data-tab="stats-detail" onclick="showTab(event, &#39;stats-detail&#39;)">📈 統計詳情</button>
        </div>

        <div class="content">
            <!-- 儀表板標籤頁 -->
            <div id="dashboard-tab">
                <div style="padding: 2rem; text-align: center; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border-radius: 12px; margin-bottom: 2rem;">
                    <h2 style="color: #1a5f3f; margin-bottom: 1rem;">📊 管理面板總覽</h2>
                    <p style="color: #15803d; font-size: 1.1rem;">歡迎使用茶王管理系統</p>
                </div>
                <!-- Telegram 通知測試區域 -->
                <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); margin-bottom: 2rem; border-left: 4px solid #3b82f6;">
                    <h3 style="color: #1a5f3f; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <span>📱</span>
                        <span>Telegram 通知系統</span>
                    </h3>
                    <p style="color: #666; font-size: 0.875rem; margin-bottom: 1rem;">
                        測試 Telegram Bot 連接並查看通知格式示例
                    </p>
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        <button class="btn" onclick="testTelegramNotification()" style="background: #3b82f6; color: white;">
                            🤖 測試 Telegram 通知
                        </button>
                        <button class="btn" onclick="checkTelegramConfig()" style="background: #6b7280; color: white;">
                            ⚙️ 檢查配置狀態
                        </button>
                    </div>
                    <div id="telegramTestResult" style="margin-top: 1rem; padding: 1rem; border-radius: 8px; display: none;"></div>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" onclick="showTab(null, 'profiles')" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="color: #1a5f3f; margin-bottom: 0.5rem;">🍵 高級茶管理</h3>
                        <p style="color: #666; font-size: 0.875rem;">管理嚴選好茶資料</p>
                        <div style="margin-top: 1rem; color: #1a5f3f; font-weight: 600;">點擊進入 →</div>
                    </div>
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" onclick="showTab(null, 'provider-profiles')" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="color: #1a5f3f; margin-bottom: 0.5rem;">👩 佳麗管理</h3>
                        <p style="color: #666; font-size: 0.875rem;">管理茶茶上架資料</p>
                        <div style="margin-top: 1rem; color: #1a5f3f; font-weight: 600;">點擊進入 →</div>
                    </div>
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" onclick="showTab(null, 'users')" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="color: #1a5f3f; margin-bottom: 0.5rem;">👥 用戶管理</h3>
                        <p style="color: #666; font-size: 0.875rem;">查看和管理所有用戶</p>
                        <div style="margin-top: 1rem; color: #1a5f3f; font-weight: 600;">點擊進入 →</div>
                    </div>
                    <div style="background: white; padding: 1.5rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); cursor: pointer; transition: transform 0.2s;" onclick="showTab(null, 'bookings')" onmouseover="this.style.transform='translateY(-4px)'" onmouseout="this.style.transform='translateY(0)'">
                        <h3 style="color: #1a5f3f; margin-bottom: 0.5rem;">📅 預約管理</h3>
                        <p style="color: #666; font-size: 0.875rem;">管理所有預約記錄</p>
                        <div style="margin-top: 1rem; color: #1a5f3f; font-weight: 600;">點擊進入 →</div>
                    </div>
                </div>
            </div>

            <div id="profiles-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <h2>高級茶管理（嚴選好茶）</h2>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <select id="nationalityFilter" onchange="loadProfiles()" style="padding: 0.5rem 1rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.875rem;">
                            <option value="">全部國籍</option>
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
                        <button class="btn btn-success" onclick="showProfileForm()">+ 新增高級茶</button>
                    </div>
                </div>
                <div id="profiles-list"></div>
            </div>

            <div id="provider-profiles-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>佳麗管理（茶茶上架）</h2>
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
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 1rem;">
                    <h2>用戶管理</h2>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <input type="text" id="userSearchInput" placeholder="🔍 搜尋 Email、公開ID、手機號..." 
                               oninput="filterUsers()" 
                               style="padding: 0.5rem 1rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.875rem; min-width: 250px;" />
                        <select id="userRoleFilter" onchange="filterUsers()" 
                                style="padding: 0.5rem 1rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.875rem;">
                            <option value="">所有身份</option>
                            <option value="client">👤 品茶客</option>
                            <option value="provider">👩 後宮佳麗</option>
                            <option value="admin">👑 管理員</option>
                        </select>
                        <button class="btn btn-success" onclick="exportUsers()">📥 導出用戶資料</button>
                    </div>
                </div>
                <div id="users-list"></div>
            </div>

            <div id="bookings-tab" class="hidden">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
                    <h2>預約管理</h2>
                </div>
                <div style="display: flex; gap: 1rem; margin-bottom: 1rem; border-bottom: 2px solid #e0e0e0;">
                    <button class="tab" data-booking-tab="premium" onclick="showBookingTab(event, 'premium')" style="padding: 0.75rem 1.5rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px;">嚴選好茶的預約</button>
                    <button class="tab" data-booking-tab="fish-market" onclick="showBookingTab(event, 'fish-market')" style="padding: 0.75rem 1.5rem; background: none; border: none; cursor: pointer; font-size: 0.875rem; color: #666; border-bottom: 2px solid transparent; margin-bottom: -2px;">特選魚市的預約</button>
                </div>
                <div id="bookings-list"></div>
            </div>

            <!-- 統計詳情標籤頁 -->
            <div id="stats-detail-tab" class="hidden">
                <h2 style="margin-bottom: 1.5rem;">📈 詳細統計數據</h2>
                <div class="stats" style="grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));">
                    <div class="stat-card">
                        <h3>總 Profiles</h3>
                        <div class="value" id="statsDetailTotalProfiles">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>可用 Profiles</h3>
                        <div class="value" id="statsDetailAvailableProfiles">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>總 Articles</h3>
                        <div class="value" id="statsDetailTotalArticles">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>總瀏覽次數</h3>
                        <div class="value" id="statsDetailTotalViews">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>總用戶數</h3>
                        <div class="value" id="statsDetailTotalUsers">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>佳麗人數</h3>
                        <div class="value" id="statsDetailTotalProviders">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>品茶客數</h3>
                        <div class="value" id="statsDetailTotalClients">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>總預約數</h3>
                        <div class="value" id="statsDetailTotalBookings">-</div>
                    </div>
                    <div class="stat-card">
                        <h3>待處理預約</h3>
                        <div class="value" id="statsDetailPendingBookings">-</div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 用戶詳情 Modal -->
    <div id="userDetailModal" class="modal">
        <div class="modal-content" style="max-width: 800px; max-height: 90vh; overflow-y: auto;">
            <div class="modal-header">
                <h2>👤 用戶詳情</h2>
                <button class="close-btn" onclick="closeUserDetailModal()">&times;</button>
            </div>
            <div style="padding: 1.5rem;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
                    <div><strong>公開ID：</strong><span id="userDetailId">-</span></div>
                    <div><strong>Email：</strong><span id="userDetailEmail">-</span></div>
                    <div><strong>手機號：</strong><span id="userDetailPhone">-</span></div>
                    <div><strong>暱稱：</strong><span id="userDetailUserName">-</span></div>
                    <div><strong>身份：</strong><span id="userDetailRole">-</span></div>
                    <div><strong>會員等級：</strong><span id="userDetailLevel">-</span></div>
                    <div><strong>驗證勳章：</strong><span id="userDetailBadges">-</span></div>
                    <div><strong>當前積分：</strong><span id="userDetailCurrentPoints" style="color: #f59e0b; font-weight: 600;">-</span></div>
                    <div><strong>總積分：</strong><span id="userDetailTotalPoints" style="color: #666;">-</span></div>
                    <div><strong>註冊時間：</strong><span id="userDetailCreated">-</span></div>
                    <div><strong>最後登入：</strong><span id="userDetailLastLogin">-</span></div>
                    <div><strong>會員到期：</strong><span id="userDetailExpires">-</span></div>
                    <div><strong>狀態：</strong><span id="userDetailBanStatus">-</span></div>
                    <div><strong>用戶標記：</strong><span id="userDetailTags">-</span></div>
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #e0e0e0;">
                    <h3 style="margin-bottom: 1rem;">用戶標記</h3>
                    <div style="margin-bottom: 0.75rem; font-size: 0.875rem; color: #666;">
                        <strong>職務標記：</strong>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <button class="btn" id="tagAdminBtn" onclick="toggleUserTag('admin')" style="background: #fbbf24; color: #1a1a1a; opacity: 0.5;">👑 管理員</button>
                        <button class="btn" id="tagModeratorBtn" onclick="toggleUserTag('moderator')" style="background: #8b5cf6; color: white; opacity: 0.5;">🛡️ 版主</button>
                        <button class="btn" id="tagSubModeratorBtn" onclick="toggleUserTag('sub_moderator')" style="background: #a78bfa; color: white; opacity: 0.5;">🛡️ 副版主</button>
                        <button class="btn" id="tagStaffBtn" onclick="toggleUserTag('staff')" style="background: #3b82f6; color: white; opacity: 0.5;">👔 內部人員</button>
                    </div>
                    <div style="margin-bottom: 0.75rem; font-size: 0.875rem; color: #666; margin-top: 1rem;">
                        <strong>其他標記：</strong>
                    </div>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap; margin-bottom: 1rem;">
                        <button class="btn" id="tagVipBtn" onclick="toggleUserTag('vip')" style="background: #10b981; color: white; opacity: 0.5;">💎 VIP</button>
                        <button class="btn" id="tagVerifiedBtn" onclick="toggleUserTag('verified')" style="background: #8b5cf6; color: white; opacity: 0.5;">✅ 已驗證</button>
                        <button class="btn" id="tagTrollBtn" onclick="toggleUserTag('troll')" style="background: #ef4444; color: white; opacity: 0.5;">🤖 水軍</button>
                        <button class="btn" id="tagTestBtn" onclick="toggleUserTag('test')" style="background: #6b7280; color: white; opacity: 0.5;">🧪 測試帳號</button>
                    </div>
                    <div style="padding: 0.75rem; background: #f0f9ff; border-left: 3px solid #3b82f6; border-radius: 4px; font-size: 0.875rem; color: #1e40af; margin-top: 0.5rem;">
                        <strong>💡 說明：</strong>職務標記（管理員、版主、副版主）會賦予用戶相應的管理權限。其他標記僅用於標識用戶屬性。
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #e0e0e0;">
                    <h3 style="margin-bottom: 1rem;">操作</h3>
                    <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                        <button class="btn" onclick="editUserLevel()">修改等級</button>
                        <button class="btn" onclick="addUserPoints()">💰 儲值積分</button>
                        <button class="btn" id="userDetailBanBtn" onclick="banUser()">封禁用戶</button>
                        <button class="btn" id="userDetailUnbanBtn" style="display: none;" onclick="unbanUser()">解封用戶</button>
                        <button class="btn" onclick="resetUserPassword()">重置密碼</button>
                    </div>
                </div>
                
                <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 2px solid #e0e0e0;">
                    <h3 style="margin-bottom: 1rem;">預約記錄 (<span id="userDetailBookings">0</span>)</h3>
                    <div id="userDetailBookingsList"></div>
                </div>
            </div>
        </div>
    </div>

    <!-- 用戶操作 Modal（用於輸入等級、封禁原因、密碼等） -->
    <div id="userActionModal" class="modal">
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2 id="userActionModalTitle">操作</h2>
                <button class="close-btn" onclick="closeUserActionModal()">&times;</button>
            </div>
            <div style="padding: 1.5rem;">
                <div id="userActionModalContent"></div>
                <div style="display: flex; gap: 0.5rem; justify-content: flex-end; margin-top: 1.5rem;">
                    <button class="btn" onclick="closeUserActionModal()">取消</button>
                    <button class="btn btn-success" id="userActionConfirmBtn">確認</button>
                </div>
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
                         onclick="document.getElementById(&#39;fileInput&#39;).click()">
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
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;纖細&#39;)">纖細</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;勻稱&#39;)">勻稱</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;肉感&#39;)">肉感</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;豐滿&#39;)">豐滿</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;模特兒&#39;)">模特兒</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;長腿&#39;)">長腿</button>
                    </div>
                    <div class="addon-services" id="personalityQuickTags" style="margin-top: 0.5rem;">
                        <div style="font-size: 0.75rem; font-weight: 600; margin-bottom: 0.25rem;">風格特質</div>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;氣質&#39;)">氣質</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;鄰家&#39;)">鄰家</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;性感&#39;)">性感</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;溫柔&#39;)">溫柔</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;活潑&#39;)">活潑</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;御姐&#39;)">御姐</button>
                        <button type="button" class="btn" style="background:#f3f4f6;color:#374151;" onclick="toggleProfileTag(&#39;學生&#39;)">學生</button>
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
        let profileVideos = [];
        let parsedPrices = null; // 儲存 AI 解析出的 prices（包含兩節價格）
        let isDragging = false;
        let isParsing = false;
        
        // 獲取 Authorization header
        function getAuthHeaders() {
            const token = safeGetItem('auth_token');
            return {
                'Content-Type': 'application/json',
                'Authorization': token ? 'Bearer ' + token : ''
            };
        }

        // 安全的 localStorage 操作（Safari 兼容）
        function safeSetItem(key, value) {
            try {
                localStorage.setItem(key, value);
                return true;
            } catch (e) {
                console.warn('localStorage.setItem 失敗，嘗試使用 sessionStorage:', e);
                try {
                    sessionStorage.setItem(key, value);
                    return true;
                } catch (e2) {
                    console.error('sessionStorage 也失敗:', e2);
                    return false;
                }
            }
        }
        
        function safeGetItem(key) {
            try {
                return localStorage.getItem(key);
            } catch (e) {
                console.warn('localStorage.getItem 失敗，嘗試使用 sessionStorage:', e);
                try {
                    return sessionStorage.getItem(key);
                } catch (e2) {
                    console.error('sessionStorage 也失敗:', e2);
                    return null;
                }
            }
        }
        
        function safeRemoveItem(key) {
            try {
                localStorage.removeItem(key);
            } catch (e) {
                console.warn('localStorage.removeItem 失敗:', e);
            }
            try {
                sessionStorage.removeItem(key);
            } catch (e) {
                console.warn('sessionStorage.removeItem 失敗:', e);
            }
        }

        // 檢查登入狀態
        function checkAuth() {
            const token = safeGetItem('auth_token');
            if (!token) {
                document.getElementById('loginOverlay').style.display = 'flex';
                document.querySelector('.container').style.display = 'none';
                return false;
            }
            document.getElementById('loginOverlay').style.display = 'none';
            document.querySelector('.container').style.display = 'block';
            // 顯示用戶信息
            try {
                const userInfo = safeGetItem('user_info');
                if (userInfo) {
                    const user = JSON.parse(userInfo);
                    if (user.email) {
                        document.getElementById('userEmail').textContent = user.email;
                        document.getElementById('userInfo').style.display = 'flex';
                    }
                }
            } catch (e) {
                console.error('解析用戶信息失敗:', e);
            }
            return true;
        }

        // 處理登入
        async function handleLogin(event) {
            event.preventDefault();
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorDiv = document.getElementById('loginError');
            const loginBtn = event.target.querySelector('button[type="submit"]') || event.target;

            // 清除之前的錯誤
            errorDiv.textContent = '';
            errorDiv.classList.remove('show');

            // 驗證輸入
            if (!email || !password) {
                errorDiv.textContent = '請輸入 Email 和密碼';
                errorDiv.classList.add('show');
                return;
            }

            // 顯示載入狀態
            const originalBtnText = loginBtn.textContent;
            loginBtn.disabled = true;
            loginBtn.textContent = '登入中...';

            try {
                console.log('[登入] 開始登入請求', { email, apiBase: API_BASE });
                
                const res = await fetch(API_BASE + '/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email, password })
                });

                console.log('[登入] 收到回應', { status: res.status, ok: res.ok });

                let data;
                try {
                    data = await res.json();
                    console.log('[登入] 解析回應數據', { hasUser: !!data.user, hasToken: !!data.token, userRole: data.user?.role });
                } catch (parseError) {
                    console.error('[登入] JSON 解析失敗', parseError);
                    const text = await res.text();
                    console.error('[登入] 回應內容', text);
                    throw new Error('伺服器回應格式錯誤，請稍後再試');
                }

                if (!res.ok) {
                    const errorMsg = data.error || '登入失敗 (HTTP ' + res.status + ')';
                    console.error('[登入] 登入失敗', { status: res.status, error: errorMsg });
                    throw new Error(errorMsg);
                }

                // 檢查是否有用戶數據和 token
                if (!data.user) {
                    console.error('[登入] 回應中缺少用戶數據');
                    throw new Error('登入回應中缺少用戶數據');
                }

                if (!data.token) {
                    console.error('[登入] 回應中缺少 token');
                    throw new Error('登入回應中缺少 token');
                }

                // 檢查是否為 admin（檢查 role 或 userTags）
                const userTags = data.user.userTags || [];
                const isAdmin = data.user.role === 'admin' || (Array.isArray(userTags) && userTags.includes('admin'));
                
                console.log('[登入] 檢查管理員權限', { 
                    role: data.user.role, 
                    userTags: userTags, 
                    isAdmin: isAdmin 
                });

                if (!isAdmin) {
                    throw new Error('只有管理員可以登入後台系統。您的角色：' + (data.user.role || '未知'));
                }

                // 保存 token 和用戶信息（使用安全的存儲方法，兼容 Safari）
                const tokenSaved = safeSetItem('auth_token', data.token);
                const userInfoSaved = safeSetItem('user_info', JSON.stringify(data.user));
                
                console.log('[登入] 保存登入信息', { tokenSaved, userInfoSaved });

                if (!tokenSaved || !userInfoSaved) {
                    // 如果存儲失敗，顯示警告但繼續
                    console.warn('⚠️ 無法保存登入信息到 localStorage/sessionStorage');
                    alert('⚠️ 警告：無法保存登入信息。請檢查瀏覽器的隱私設置，允許網站存儲數據。');
                }

                // 隱藏登入界面
                checkAuth();
                
                // 載入數據
                loadStats();
                loadProfiles();
                
                console.log('[登入] 登入成功');
            } catch (error) {
                console.error('[登入] 登入錯誤', error);
                const errorMessage = error.message || '登入失敗，請稍後再試';
                errorDiv.textContent = errorMessage;
                errorDiv.classList.add('show');
                
                // 錯誤信息顯示 10 秒
                setTimeout(() => {
                    errorDiv.classList.remove('show');
                }, 10000);
            } finally {
                // 恢復按鈕狀態
                loginBtn.disabled = false;
                loginBtn.textContent = originalBtnText;
            }
        }

        // 處理登出
        function handleLogout() {
            safeRemoveItem('auth_token');
            safeRemoveItem('user_info');
            checkAuth();
        }

        // 頁面載入時檢查登入狀態
        window.addEventListener('DOMContentLoaded', () => {
            if (checkAuth()) {
                loadStats();
                startOnlineStatsUpdate(); // 開始在線人數更新
                // 默認顯示儀表板
                showTab(null, 'dashboard');
            }
        });

        // 載入統計資訊
        async function loadStats() {
            try {
                // 顯示加載狀態
                const statCards = document.querySelectorAll('.stat-card .value');
                statCards.forEach(card => {
                    if (card.textContent === '-') {
                        card.textContent = '載入中...';
                        card.style.opacity = '0.6';
                    }
                });
                
                const res = await fetch(API_BASE + '/api/admin/stats', {
                    headers: getAuthHeaders()
                });
                const stats = await res.json();
                
                // 只更新儀表板上存在的元素（添加空值檢查）
                const updateElement = (id, value) => {
                    const el = document.getElementById(id);
                    if (el) {
                        el.textContent = value;
                    }
                };
                
                // 更新儀表板上的統計卡片（只更新存在的）
                updateElement('availableProfiles', stats.profiles?.available || '-');
                
                // 載入用戶統計（如果有的話）
                if (stats.users) {
                    updateElement('totalUsers', stats.users.total || '-');
                    updateElement('totalProviders', stats.users.providers || '-');
                    updateElement('totalClients', stats.users.clients || '-');
                }
                if (stats.bookings) {
                    updateElement('pendingBookings', stats.bookings.pending || '-');
                }
                
                // 同時更新統計詳情標籤頁的數據
                loadStatsDetail(stats);
                
                // 恢復正常透明度
                statCards.forEach(card => {
                    card.style.opacity = '1';
                });
            } catch (error) {
                console.error('載入統計失敗:', error);
                // 顯示錯誤狀態
                const statCards = document.querySelectorAll('.stat-card .value');
                statCards.forEach(card => {
                    if (card.textContent === '載入中...') {
                        card.textContent = '載入失敗';
                        card.style.color = '#ef4444';
                    }
                });
            }
        }

        // 載入統計詳情（用於統計詳情標籤頁）
        async function loadStatsDetail(statsData = null) {
            try {
                if (!statsData) {
                    const res = await fetch(API_BASE + '/api/admin/stats', {
                        headers: getAuthHeaders()
                    });
                    statsData = await res.json();
                }
                
                // 更新統計詳情標籤頁的所有數據
                const detailEls = {
                    'statsDetailTotalProfiles': statsData.profiles?.total || '-',
                    'statsDetailAvailableProfiles': statsData.profiles?.available || '-',
                    'statsDetailTotalArticles': statsData.articles?.total || '-',
                    'statsDetailTotalViews': statsData.articles?.totalViews?.toLocaleString() || '-',
                    'statsDetailTotalUsers': statsData.users?.total || '-',
                    'statsDetailTotalProviders': statsData.users?.providers || '-',
                    'statsDetailTotalClients': statsData.users?.clients || '-',
                    'statsDetailTotalBookings': statsData.bookings?.total || '-',
                    'statsDetailPendingBookings': statsData.bookings?.pending || '-'
                };
                
                Object.entries(detailEls).forEach(([id, value]) => {
                    const el = document.getElementById(id);
                    if (el) el.textContent = value;
                });
            } catch (error) {
                console.error('載入統計詳情失敗:', error);
            }
        }

        // 載入在線人數（實時更新）
        async function loadOnlineStats() {
            try {
                // 檢查 API_BASE 是否正確
                if (!API_BASE || API_BASE === 'null' || API_BASE === 'undefined') {
                    console.warn('API_BASE 未正確設置，跳過在線人數更新');
                    return;
                }
                
                const res = await fetch(API_BASE + '/api/stats/online', {
                    headers: getAuthHeaders(),
                    method: 'GET'
                });
                
                if (res.ok) {
                    const data = await res.json();
                    const onlineCountEl = document.getElementById('onlineCount');
                    const onlineLoggedInEl = document.getElementById('onlineLoggedIn');
                    const onlineGuestsEl = document.getElementById('onlineGuests');
                    
                    if (onlineCountEl) {
                        onlineCountEl.textContent = data.onlineCount || 0;
                    }
                    // 嘗試獲取詳細信息（如果API支持）
                    if (data.loggedInCount !== undefined && onlineLoggedInEl) {
                        onlineLoggedInEl.textContent = '已登入: ' + data.loggedInCount;
                    }
                    if (data.guestCount !== undefined && onlineGuestsEl) {
                        onlineGuestsEl.textContent = '訪客: ' + data.guestCount;
                    }
                } else {
                    console.warn('載入在線人數失敗，HTTP狀態:', res.status);
                }
            } catch (error) {
                // 靜默處理錯誤，避免影響其他功能
                if (error.message && !error.message.includes('Failed to fetch')) {
                    console.error('載入在線人數失敗:', error);
                }
            }
        }

        // 定期更新在線人數（每10秒）
        let onlineStatsInterval = null;
        function startOnlineStatsUpdate() {
            loadOnlineStats(); // 立即載入一次
            if (onlineStatsInterval) clearInterval(onlineStatsInterval);
            onlineStatsInterval = setInterval(loadOnlineStats, 10000); // 每10秒更新
        }

        // 載入高級茶 Profiles（只顯示後台管理員上架的，userId為空）
        async function loadProfiles() {
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles', {
                    headers: getAuthHeaders()
                });
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
                const isMobile = window.innerWidth <= 768;
                
                if (isMobile) {
                    // 手機：卡片式布局
                    list.innerHTML = '<div class="table-mobile">' +
                        profiles.map(p => {
                            const district = p.district ? ' - ' + p.district : '';
                            const availability = p.isAvailable ? '✅ 可用' : '❌ 不可用';
                            const safeName = String(p.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            const safeNationality = String(p.nationality || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            const safeLocation = String(p.location || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            const safeDistrict = String(district || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            return '<div class="table-card">' +
                                '<div class="table-card-header">' + safeName + ' ' + safeNationality + '</div>' +
                                '<div class="table-card-row"><span class="table-card-label">ID:</span><span class="table-card-value">' + p.id.substring(0, 12) + '...</span></div>' +
                                '<div class="table-card-row"><span class="table-card-label">地區:</span><span class="table-card-value">' + safeLocation + safeDistrict + '</span></div>' +
                                '<div class="table-card-row"><span class="table-card-label">價格:</span><span class="table-card-value">NT$ ' + (p.price || 0).toLocaleString() + '</span></div>' +
                                '<div class="table-card-row"><span class="table-card-label">狀態:</span><span class="table-card-value">' + availability + '</span></div>' +
                                '<div class="table-card-actions">' +
                                '<button class="btn" onclick="editProfile(' + JSON.stringify(p.id).replace(/"/g, '&quot;') + ')">編輯</button>' +
                                '<button class="btn btn-danger" onclick="deleteProfile(' + JSON.stringify(p.id).replace(/"/g, '&quot;') + ')">刪除</button>' +
                                '</div></div>';
                        }).join('') + '</div>';
                } else {
                    // 桌面：表格布局
                    list.innerHTML = '<div class="table-desktop"><table><thead><tr><th>ID</th><th>姓名 / 國籍</th><th>地區</th><th>價格</th><th>狀態</th><th>操作</th></tr></thead><tbody>' +
                        profiles.map(p => {
                            const district = p.district ? ' - ' + p.district : '';
                            const availability = p.isAvailable ? '✅ 可用' : '❌ 不可用';
                            const safeName = String(p.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            const safeNationality = String(p.nationality || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            const safeLocation = String(p.location || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            const safeDistrict = String(district || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                            return '<tr>' +
                                '<td>' + p.id + '</td>' +
                                '<td>' + safeName + ' ' + safeNationality + '</td>' +
                                '<td>' + safeLocation + safeDistrict + '</td>' +
                                '<td>NT$ ' + (p.price || 0).toLocaleString() + '</td>' +
                                '<td>' + availability + '</td>' +
                                '<td>' +
                                '<button class="btn" onclick="editProfile(' + JSON.stringify(p.id).replace(/"/g, '&quot;') + ')">編輯</button>' +
                                '<button class="btn btn-danger" onclick="deleteProfile(' + JSON.stringify(p.id).replace(/"/g, '&quot;') + ')">刪除</button>' +
                                '</td>' +
                                '</tr>';
                        }).join('') + '</tbody></table></div>';
                }
            } catch (error) {
                console.error('載入 Profiles 失敗:', error);
                alert('載入 Profiles 失敗: ' + error.message);
            }
        }

        // 載入佳麗 Profiles（只顯示佳麗上架的，userId不為空）
        async function loadProviderProfiles() {
            const list = document.getElementById('provider-profiles-list');
            if (list) {
                list.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;"><div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #1a5f3f; border-radius: 50%; animation: spin 1s linear infinite;"></div> 載入中...</div>';
            }
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles', {
                    headers: getAuthHeaders()
                });
                let profiles = await res.json();

                // 只顯示佳麗上架的（userId不為空）
                profiles = profiles.filter(p => p.userId && p.userId !== '' && p.userId !== null);

                const list = document.getElementById('provider-profiles-list');
                const isMobile = window.innerWidth <= 768;
                
                if (profiles.length === 0) {
                    list.innerHTML = '<p style="text-align: center; padding: 2rem; color: #666;">目前沒有佳麗上架的資料</p>';
                } else {
                    if (isMobile) {
                        // 手機：卡片式布局
                        list.innerHTML = '<div class="table-mobile">' +
                            profiles.map(p => {
                                const district = p.district ? ' - ' + p.district : '';
                                const availability = p.isAvailable ? '✅ 可用' : '❌ 不可用';
                                const safeName = String(p.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeNationality = String(p.nationality || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeLocation = String(p.location || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeDistrict = String(district || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeUserId = String(p.userId || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                return '<div class="table-card">' +
                                    '<div class="table-card-header">' + safeName + ' ' + safeNationality + '</div>' +
                                    '<div class="table-card-row"><span class="table-card-label">ID:</span><span class="table-card-value">' + p.id.substring(0, 12) + '...</span></div>' +
                                    '<div class="table-card-row"><span class="table-card-label">地區:</span><span class="table-card-value">' + safeLocation + safeDistrict + '</span></div>' +
                                    '<div class="table-card-row"><span class="table-card-label">價格:</span><span class="table-card-value">NT$ ' + (p.price || 0).toLocaleString() + '</span></div>' +
                                    '<div class="table-card-row"><span class="table-card-label">佳麗ID:</span><span class="table-card-value">' + safeUserId.substring(0, 12) + '...</span></div>' +
                                    '<div class="table-card-row"><span class="table-card-label">狀態:</span><span class="table-card-value">' + availability + '</span></div>' +
                                    '</div>';
                            }).join('') + '</div>';
                    } else {
                        // 桌面：表格布局
                        list.innerHTML = '<div class="table-desktop"><table><thead><tr><th>ID</th><th>姓名 / 國籍</th><th>地區</th><th>價格</th><th>佳麗 ID</th><th>狀態</th></tr></thead><tbody>' +
                            profiles.map(p => {
                                const district = p.district ? ' - ' + p.district : '';
                                const availability = p.isAvailable ? '✅ 可用' : '❌ 不可用';
                                const safeName = String(p.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeNationality = String(p.nationality || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeLocation = String(p.location || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeDistrict = String(district || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                const safeUserId = String(p.userId || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                                return '<tr>' +
                                    '<td>' + p.id + '</td>' +
                                    '<td>' + safeName + ' ' + safeNationality + '</td>' +
                                    '<td>' + safeLocation + safeDistrict + '</td>' +
                                    '<td>NT$ ' + (p.price || 0).toLocaleString() + '</td>' +
                                    '<td>' + safeUserId + '</td>' +
                                    '<td>' + availability + '</td>' +
                                    '</tr>';
                            }).join('') + '</tbody></table></div>';
                    }
                }
            } catch (error) {
                console.error('載入佳麗 Profiles 失敗:', error);
                const list = document.getElementById('provider-profiles-list');
                if (list) {
                    list.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">❌ 載入失敗: ' + error.message + '</div>';
                }
            }
        }

        // 載入 Articles
        async function loadArticles() {
            const list = document.getElementById('articles-list');
            if (list) {
                list.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666;"><div style="display: inline-block; width: 20px; height: 20px; border: 3px solid #f3f3f3; border-top: 3px solid #1a5f3f; border-radius: 50%; animation: spin 1s linear infinite;"></div> 載入中...</div>';
            }
            try {
                const res = await fetch(API_BASE + '/api/admin/articles', {
                    headers: getAuthHeaders()
                });
                const articles = await res.json();
                const list = document.getElementById('articles-list');
                list.innerHTML = '<table><thead><tr><th>ID</th><th>標題</th><th>標籤</th><th>日期</th><th>瀏覽次數</th><th>操作</th></tr></thead><tbody>' +
                    articles.map(a => {
                        const safeTitle = String(a.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const safeTag = String(a.tag || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const safeDate = String(a.date || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        return '<tr>' +
                            '<td>' + a.id + '</td>' +
                            '<td>' + safeTitle + '</td>' +
                            '<td>' + safeTag + '</td>' +
                            '<td>' + safeDate + '</td>' +
                            '<td>' + a.views.toLocaleString() + '</td>' +
                            '<td>' +
                            '<button class="btn" onclick="editArticle(' + JSON.stringify(a.id).replace(/"/g, '&quot;') + ')">編輯</button>' +
                            '<button class="btn btn-danger" onclick="deleteArticle(' + JSON.stringify(a.id).replace(/"/g, '&quot;') + ')">刪除</button>' +
                            '</td>' +
                            '</tr>';
                    }).join('') + '</tbody></table>';
            } catch (error) {
                console.error('載入 Articles 失敗:', error);
                const list = document.getElementById('articles-list');
                if (list) {
                    list.innerHTML = '<div style="text-align: center; padding: 2rem; color: #ef4444;">❌ 載入失敗: ' + error.message + '</div>';
                }
            }
        }

        // 切換標籤
        function showTab(evt, tab) {
            if (!tab && evt) {
                // 如果第一個參數是 event，第二個參數是 tab
                tab = evt.target.getAttribute('data-tab') || 'dashboard';
            } else if (!tab) {
                tab = 'dashboard';
            }
            
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            if (evt && evt.target) {
                evt.target.classList.add('active');
            } else {
                // 如果沒有 event，根據 tab 名稱找到對應按鈕
                const buttons = document.querySelectorAll('.tab');
                buttons.forEach(btn => {
                    if (btn.textContent.trim() === '高級茶管理' && tab === 'profiles') btn.classList.add('active');
                    else if (btn.textContent.trim() === '佳麗管理' && tab === 'provider-profiles') btn.classList.add('active');
                    else if (btn.textContent.trim() === 'Articles 管理' && tab === 'articles') btn.classList.add('active');
                    else if (btn.textContent.trim() === '用戶管理' && tab === 'users') btn.classList.add('active');
                    else if (btn.textContent.trim() === '預約管理' && tab === 'bookings') btn.classList.add('active');
                });
            }
            document.getElementById('profiles-tab').classList.toggle('hidden', tab !== 'profiles');
            document.getElementById('provider-profiles-tab').classList.toggle('hidden', tab !== 'provider-profiles');
            document.getElementById('articles-tab').classList.toggle('hidden', tab !== 'articles');
            document.getElementById('users-tab').classList.toggle('hidden', tab !== 'users');
            document.getElementById('bookings-tab').classList.toggle('hidden', tab !== 'bookings');
            document.getElementById('stats-detail-tab').classList.toggle('hidden', tab !== 'stats-detail');
            document.getElementById('dashboard-tab').classList.toggle('hidden', tab !== 'dashboard');
            if (tab === 'profiles') loadProfiles();
            if (tab === 'provider-profiles') loadProviderProfiles();
            if (tab === 'articles') loadArticles();
            if (tab === 'users') loadUsers();
            if (tab === 'stats-detail') loadStatsDetail();
            if (tab === 'bookings') {
                // 初始化預約標籤頁
                currentBookingTab = 'premium';
                document.querySelectorAll('[data-booking-tab]').forEach((t, index) => {
                    if (index === 0) {
                        t.classList.add('active');
                        t.style.color = '#1a1a1a';
                        t.style.borderBottomColor = '#1a1a1a';
                    } else {
                        t.classList.remove('active');
                        t.style.color = '#666';
                        t.style.borderBottomColor = 'transparent';
                    }
                });
                loadBookings();
            }
        }

        // 顯示成功/錯誤消息
        function showMessage(message, type = 'success') {
            const messageDiv = document.createElement('div');
            messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
            messageDiv.textContent = message;
            document.body.appendChild(messageDiv);
            setTimeout(() => {
                messageDiv.style.animation = 'slideIn 0.3s ease-out reverse';
                setTimeout(() => messageDiv.remove(), 300);
            }, 3000);
        }

        // 測試 Telegram 通知
        async function testTelegramNotification() {
            const resultDiv = document.getElementById('telegramTestResult');
            if (!resultDiv) return;
            
            // 檢查是否已登入
            const token = safeGetItem('auth_token');
            if (!token) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<div style="background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>⚠️</span><strong>請先登入</strong></div><p style="margin: 0; font-size: 0.875rem;">請先登入後台管理系統後再測試 Telegram 通知</p></div>';
                return;
            }
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<div style="display: flex; align-items: center; gap: 0.5rem; color: #3b82f6;"><div style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> 正在發送測試消息...</div>';
            
            try {
                const res = await fetch(API_BASE + '/api/telegram-notifications/test', {
                    method: 'POST',
                    headers: getAuthHeaders()
                });
                
                const data = await res.json();
                
                if (res.ok && data.success) {
                    resultDiv.innerHTML = '<div style="background: #d1fae5; border: 1px solid #10b981; color: #065f46; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>✅</span><strong>測試成功！</strong></div><p style="margin: 0; font-size: 0.875rem;">' + (data.message || '測試消息已發送到 Telegram 群組，請檢查是否收到。') + '</p></div>';
                } else {
                    let errorMsg = data.error || data.message || '未知錯誤';
                    if (res.status === 401) {
                        errorMsg = '未授權：請重新登入後台管理系統';
                    } else if (res.status === 403) {
                        errorMsg = '無權訪問：僅管理員可以使用此功能';
                    }
                    resultDiv.innerHTML = '<div style="background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>❌</span><strong>測試失敗</strong></div><p style="margin: 0; font-size: 0.875rem;">' + errorMsg + '</p></div>';
                }
            } catch (error) {
                resultDiv.innerHTML = '<div style="background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>❌</span><strong>測試失敗</strong></div><p style="margin: 0; font-size: 0.875rem;">' + (error.message || '網絡錯誤，請檢查連接') + '</p></div>';
            }
        }

        // 檢查 Telegram 配置狀態
        async function checkTelegramConfig() {
            const resultDiv = document.getElementById('telegramTestResult');
            if (!resultDiv) return;
            
            // 檢查是否已登入
            const token = safeGetItem('auth_token');
            if (!token) {
                resultDiv.style.display = 'block';
                resultDiv.innerHTML = '<div style="background: #fef3c7; border: 1px solid #f59e0b; color: #92400e; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>⚠️</span><strong>請先登入</strong></div><p style="margin: 0; font-size: 0.875rem;">請先登入後台管理系統後再檢查配置</p></div>';
                return;
            }
            
            resultDiv.style.display = 'block';
            resultDiv.innerHTML = '<div style="display: flex; align-items: center; gap: 0.5rem; color: #3b82f6;"><div style="width: 16px; height: 16px; border: 2px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div> 正在檢查配置...</div>';
            
            try {
                const res = await fetch(API_BASE + '/api/telegram-notifications/config', {
                    method: 'GET',
                    headers: getAuthHeaders()
                });
                
                const data = await res.json();
                
                if (res.ok) {
                    const statusIcon = data.configured ? '✅' : '❌';
                    const statusText = data.configured ? '已配置' : '未配置';
                    const statusColor = data.configured ? '#10b981' : '#ef4444';
                    const bgColor = data.configured ? '#d1fae5' : '#fee2e2';
                    const borderColor = data.configured ? '#10b981' : '#ef4444';
                    const textColor = data.configured ? '#065f46' : '#991b1b';
                    
                    let configDetails = '<div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid ' + borderColor + '; font-size: 0.875rem;">';
                    configDetails += '<div style="margin-bottom: 0.5rem;"><strong>配置詳情：</strong></div>';
                    configDetails += '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem;">';
                    configDetails += '<div>Bot Token: ' + (data.hasBotToken ? '<span style="color: #10b981;">✓ 已設置</span>' : '<span style="color: #ef4444;">✗ 未設置</span>') + '</div>';
                    configDetails += '<div>Chat ID: ' + ((data.hasChatId || data.hasGroupId) ? '<span style="color: #10b981;">✓ 已設置</span>' : '<span style="color: #ef4444;">✗ 未設置</span>') + '</div>';
                    if (data.hasMessageThreadId) {
                        configDetails += '<div>Message Thread ID: <span style="color: #10b981;">✓ 已設置</span></div>';
                    }
                    if (data.hasAdminChatId) {
                        configDetails += '<div>Admin Chat ID: <span style="color: #10b981;">✓ 已設置</span></div>';
                    }
                    configDetails += '</div>';
                    configDetails += '</div>';
                    
                    resultDiv.innerHTML = '<div style="background: ' + bgColor + '; border: 1px solid ' + borderColor + '; color: ' + textColor + '; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>' + statusIcon + '</span><strong>配置狀態：' + statusText + '</strong></div>' + configDetails + '</div>';
                } else {
                    let errorMsg = data.error || data.message || '未知錯誤';
                    if (res.status === 401) {
                        errorMsg = '未授權：請重新登入後台管理系統';
                    } else if (res.status === 403) {
                        errorMsg = '無權訪問：僅管理員可以查看 Telegram 配置';
                    }
                    resultDiv.innerHTML = '<div style="background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>❌</span><strong>檢查失敗</strong></div><p style="margin: 0; font-size: 0.875rem;">' + errorMsg + '</p></div>';
                }
            } catch (error) {
                resultDiv.innerHTML = '<div style="background: #fee2e2; border: 1px solid #ef4444; color: #991b1b; padding: 1rem; border-radius: 8px;"><div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem;"><span>❌</span><strong>檢查失敗</strong></div><p style="margin: 0; font-size: 0.875rem;">' + (error.message || '網絡錯誤，請檢查連接') + '</p></div>';
            }
        }

        // 刪除 Profile
        async function deleteProfile(id) {
            if (!confirm('確定要刪除這個 Profile 嗎？此操作無法復原。')) return;
            try {
                const res = await fetch(API_BASE + '/api/admin/profiles/' + id, { 
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (!res.ok) throw new Error('刪除失敗');
                loadProfiles();
                loadStats();
                showMessage('✅ 刪除成功！');
            } catch (error) {
                showMessage('❌ 刪除失敗: ' + error.message, 'error');
            }
        }

        // 刪除 Article
        async function deleteArticle(id) {
            if (!confirm('確定要刪除這篇文章嗎？此操作無法復原。')) return;
            try {
                const res = await fetch(API_BASE + '/api/admin/articles/' + id, { 
                    method: 'DELETE',
                    headers: getAuthHeaders()
                });
                if (!res.ok) throw new Error('刪除失敗');
                loadArticles();
                loadStats();
                showMessage('✅ 刪除成功！');
            } catch (error) {
                showMessage('❌ 刪除失敗: ' + error.message, 'error');
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
                const res = await fetch(API_BASE + '/api/admin/profiles/' + id, {
                    headers: getAuthHeaders()
                });
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
                // 確保 videos 是有效的數組，並清理每個 video 對象
                try {
                    profileVideos = (profile.videos || []).map(v => {
                        if (!v || typeof v !== 'object') return null;
                        return {
                            url: String(v.url || ''),
                            code: v.code ? String(v.code) : undefined,
                            title: v.title ? String(v.title) : undefined,
                            thumbnail: v.thumbnail ? String(v.thumbnail) : undefined
                        };
                    }).filter(v => v !== null);
                } catch (e) {
                    console.error('Error processing videos:', e);
                    profileVideos = [];
                }
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
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ text })
                });
                
                // 先讀取 response 文本，避免重複讀取
                const responseText = await res.text();
                
                if (!res.ok) {
                    let errorMessage = '解析失敗';
                    try {
                        const errorData = JSON.parse(responseText);
                        errorMessage = errorData.error || '解析失敗';
                    } catch (e) {
                        errorMessage = responseText || 'HTTP ' + res.status + ': ' + res.statusText;
                    }
                    throw new Error(errorMessage);
                }
                
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (e) {
                    throw new Error('後端返回格式錯誤: ' + responseText.substring(0, 100));
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
                        const plusChar = String.fromCharCode(43);
                        const dChar = String.fromCharCode(100);
                        const pattern = plusChar + '\\\\' + dChar + '+';
                        return service.replace(new RegExp(pattern, 'g'), '').trim();
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
                    uploadArea.querySelector('p').textContent = '正在壓縮圖片 (' + (processedCount + 1) + '/' + fileArray.length + ')...';
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
                    uploadArea.querySelector('p').textContent = '✅ 已壓縮，節省約 ' + savedPercent + '% 空間';
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
            if (!grid) return;
            
            try {
                const coverImage = profileGallery[0] || '';
                document.getElementById('profileImageUrl').value = coverImage;
                document.getElementById('profileGallery').value = JSON.stringify(profileGallery);
                
                grid.innerHTML = profileGallery.map((img, index) => {
                    const isCover = index === 0;
                    const safeImg = String(img || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                    return '<div class="gallery-item ' + (isCover ? 'cover' : '') + '" onclick="setCoverImage(' + index + ')">' +
                        '<img src="' + safeImg + '" alt="圖片 ' + (index + 1) + '" />' +
                        '<button type="button" class="delete-btn" onclick="deleteImage(' + index + '); event.stopPropagation();">✕</button>' +
                        (isCover ? '<div class="cover-badge">當前封面</div>' : '') +
                        '</div>';
                }).join('');
            } catch (error) {
                console.error('updateGalleryDisplay error:', error);
                grid.innerHTML = '<div style="color: red; padding: 1rem;">載入圖片時發生錯誤</div>';
            }
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
            if (!list) return;
            
            try {
                list.innerHTML = profileAddonServices.map((service, index) => {
                    const safeService = String(service || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                    return '<div class="addon-tag">' +
                        '<span>' + safeService + '</span>' +
                        '<button type="button" class="remove-btn" onclick="removeAddonService(' + index + ')">✕</button>' +
                        '</div>';
                }).join('');
            } catch (error) {
                console.error('updateAddonServicesDisplay error:', error);
                list.innerHTML = '<div style="color: red; padding: 1rem;">載入加值服務時發生錯誤</div>';
            }
        }
        
        // 影片 URL 解析函數
        function parseVideoUrl(url) {
            const result = { code: '', title: '' };
            
            try {
                const urlObj = new URL(url);
                const hostname = urlObj.hostname.toLowerCase();
                const pathname = urlObj.pathname;
                
                // FANZA (dmm.co.jp) - 例如: https://www.dmm.co.jp/digital/videoa/-/detail/=/cid=ssis123
                if (hostname.includes('dmm.co.jp') || hostname.includes('dmm.com')) {
                    const cidPattern = new RegExp('cid=([a-z0-9-]+)', 'i');
                    const cidMatch = pathname.match(cidPattern);
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
                    const pathPattern = new RegExp('/v/([a-z0-9-]+)', 'i');
                    const pathMatch = pathname.match(pathPattern);
                    if (pathMatch) {
                        result.code = pathMatch[1].toUpperCase();
                    }
                }
                
                // 通用番号格式提取 (SSIS-123, SSIS123, ABC-123, ABC123 等)
                // 从 URL 路径或查询参数中提取
                const codePatterns = [
                    new RegExp('([A-Z]{2,6}[-_]?[0-9]{2,6})', 'gi'),  // SSIS-123, SSIS123
                    new RegExp('([A-Z]{3,6}[0-9]{3,6})', 'gi')        // SSIS123
                ];
                
                for (const pattern of codePatterns) {
                    const matches = url.match(pattern);
                    if (matches && matches.length > 0) {
                        // 選擇最長的匹配（通常是完整的番號）
                        const bestMatch = matches.reduce((a, b) => a.length > b.length ? a : b);
                        if (bestMatch.length >= 5) { // 至少5个字符才认为是番号
                            const dash = String.fromCharCode(45);
                            const underscore = String.fromCharCode(95);
                            const replacePattern = new RegExp('[' + dash + underscore + ']', 'g');
                            result.code = bestMatch.toUpperCase().replace(replacePattern, '-');
                            break;
                        }
                    }
                }
                
                // 尝试从 URL 路径中提取标题（如果 URL 包含标题）
                // 例如: https://example.com/video-title-ssis123
                const pathParts = pathname.split('/').filter(p => p);
                if (pathParts.length > 0) {
                    const lastPart = pathParts[pathParts.length - 1];
                    // 如果最後一部分包含番號，嘗試提取標題部分
                    if (result.code && lastPart.includes(result.code.toLowerCase())) {
                        const codeLower = result.code.toLowerCase();
                        // 转义正则表达式特殊字符（使用字符串拼接避免插值问题）
                        const dot = String.fromCharCode(46);
                        const star = String.fromCharCode(42);
                        const plus = String.fromCharCode(43);
                        const qmark = String.fromCharCode(63);
                        const caret = String.fromCharCode(94);
                        const dollar = String.fromCharCode(36);
                        const lbrace = String.fromCharCode(123);
                        const rbrace = String.fromCharCode(125);
                        const lparen = String.fromCharCode(40);
                        const rparen = String.fromCharCode(41);
                        const pipe = String.fromCharCode(124);
                        const lbracket = String.fromCharCode(91);
                        const rbracket = String.fromCharCode(93);
                        const backslash = String.fromCharCode(92);
                        const specialCharsPattern = '[' + dot + star + plus + qmark + caret + dollar + lbrace + rbrace + lparen + rparen + pipe + lbracket + rbracket + backslash + backslash + ']';
                        const escapeRegex = new RegExp(specialCharsPattern, 'g');
                        const escapedCode = codeLower.replace(escapeRegex, function(m) {
                            const backslashChar = String.fromCharCode(92);
                            return backslashChar + backslashChar + m;
                        });
                        const dash = String.fromCharCode(45);
                        const underscore = String.fromCharCode(95);
                        const titlePart = lastPart.replace(new RegExp(escapedCode, 'gi'), '').replace(new RegExp('[' + dash + underscore + ']', 'g'), ' ').trim();
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
                            headers: getAuthHeaders(),
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
                            // 將縮略圖存儲在臨時變量中，以便在 addVideo 時使用
                            if (data.thumbnail) {
                                urlInput.setAttribute('data-thumbnail', data.thumbnail);
                            }
                        }
                    } catch (apiError) {
                        // API 失敗不影響基本解析（已經是繁體）
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
            const thumbnail = urlInput.getAttribute('data-thumbnail') || undefined;
            
            if (!url) {
                alert('請輸入影片連結');
                return;
            }
            
            profileVideos.push({
                url: url,
                code: code || undefined,
                title: title || undefined,
                thumbnail: thumbnail
            });
            
            updateVideosDisplay();
            urlInput.value = '';
            urlInput.removeAttribute('data-thumbnail');
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
            
            try {
                // 確保 profileVideos 是數組
                if (!Array.isArray(profileVideos)) {
                    console.error('profileVideos is not an array:', profileVideos);
                    profileVideos = [];
                }
                
                list.innerHTML = profileVideos.map((video, index) => {
                const codeHtml = video.code ? '<div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">番號: <span style="font-weight: 600;">' + String(video.code).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;') + '</span></div>' : '';
                const title = video.title || '未命名影片';
                const escapedTitle = String(title).replace(/'/g, '&#39;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const safeTitle = String(title).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
                const safeThumbnail = video.thumbnail ? String(video.thumbnail).replace(/"/g, '&quot;').replace(/'/g, '&#39;') : '';
                const thumbnailHtml = video.thumbnail ? 
                    '<div style="width: 120px; height: 90px; flex-shrink: 0; border-radius: 0.375rem; overflow: hidden; background: #e5e7eb; margin-right: 0.75rem;"><img src="' + safeThumbnail + '" alt="' + escapedTitle + '" style="width: 100%; height: 100%; object-fit: cover;" /></div>' : 
                    '<div style="width: 120px; height: 90px; flex-shrink: 0; border-radius: 0.375rem; background: #e5e7eb; margin-right: 0.75rem; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 0.75rem;">無縮圖</div>';
                
                return '<div style="display: flex; gap: 0.5rem; align-items: center; padding: 0.75rem; background: #f9fafb; border-radius: 0.5rem; margin-bottom: 0.5rem;">' +
                    thumbnailHtml +
                    '<div style="flex: 1;">' +
                    '<div style="font-weight: 600; margin-bottom: 0.25rem;">' + safeTitle + '</div>' +
                    '<div style="font-size: 0.875rem; color: #6b7280; margin-bottom: 0.25rem;">連結: <a href="' + String(video.url || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;') + '" target="_blank" style="color: #3b82f6; word-break: break-all;">' + String(video.url || '').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').substring(0, 50) + (String(video.url || '').length > 50 ? '...' : '') + '</a></div>' +
                    codeHtml +
                    '</div>' +
                    '<button type="button" class="btn-small" onclick="removeVideo(' + index + ')" style="background: #ef4444; color: white; flex-shrink: 0;">刪除</button>' +
                    '</div>';
                }).join('');
                
                // 驗證生成的 HTML 是否有效
                if (list.innerHTML && list.innerHTML.trim() === '') {
                    console.warn('updateVideosDisplay: Generated empty HTML');
                }
            } catch (error) {
                console.error('updateVideosDisplay error:', error);
                console.error('Error stack:', error.stack);
                console.error('profileVideos:', JSON.stringify(profileVideos, null, 2));
                try {
                    list.innerHTML = '<div style="color: red; padding: 1rem;">載入影片列表時發生錯誤: ' + String(error.message) + '</div>';
                } catch (e) {
                    console.error('Failed to set error message:', e);
                }
            }
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
                    const existingRes = await fetch(API_BASE + '/api/admin/profiles/' + currentEditingProfileId, {
                        headers: getAuthHeaders()
                    });
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
                        headers: getAuthHeaders(),
                        body: JSON.stringify(formData)
                    });
                } else {
                    // 新增（带重复检测）
                    formData.id = Date.now().toString();
                    res = await fetch(API_BASE + '/api/admin/profiles', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify(formData)
                    });
                }
                
                if (!res.ok) {
                    const error = await res.json();
                    
                    // 处理重复检测（409 状态码）
                    if (res.status === 409 && error.similarProfiles && error.similarProfiles.length > 0) {
                        const message = '⚠️ 检测到可能重复的 Profile！\\n\\n相似度：' + error.similarProfiles[0].similarity + '%\\n\\n相似 Profile：\\n' +
                            error.similarProfiles.map(p => 
                                '• ' + p.name + ' ' + p.nationality + ' (' + p.age + '歲, ' + p.location + ') - 创建于 ' + new Date(p.createdAt).toLocaleDateString('zh-TW')
                            ).join('\\n') +
                            '\\n\\n是否仍要继续上架？';
                        
                        if (confirm(message)) {
                            // 强制上架
                            formData.force = true;
                            const forceRes = await fetch(API_BASE + '/api/admin/profiles?force=true', {
                                method: 'POST',
                                headers: getAuthHeaders(),
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
                const res = await fetch(API_BASE + '/api/admin/articles/' + id, {
                    headers: getAuthHeaders()
                });
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
                        headers: getAuthHeaders(),
                        body: JSON.stringify(formData)
                    });
                } else {
                    // 新增
                    formData.id = Date.now().toString();
                    res = await fetch(API_BASE + '/api/admin/articles', {
                        method: 'POST',
                        headers: getAuthHeaders(),
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
                const res = await fetch(API_BASE + '/api/admin/profiles', {
                    headers: getAuthHeaders()
                });
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
                statsHtml += '<div><span style="color: #64748b; font-size: 0.8rem;">最低價：</span><span class="price-range">' + minPrice.toLocaleString() + '</span></div>';
                statsHtml += '<div><span style="color: #64748b; font-size: 0.8rem;">最高價：</span><span class="price-range">' + maxPrice.toLocaleString() + '</span></div>';
                statsHtml += '<div><span style="color: #64748b; font-size: 0.8rem;">平均價：</span><span class="price-range">' + avgPrice.toLocaleString() + '</span></div>';
                statsHtml += '<div><span style="color: #64748b; font-size: 0.8rem;">中位數：</span><span class="price-range">' + medianPrice.toLocaleString() + '</span></div>';
                statsHtml += '</div>';

                if (outcallPrices.length > 0) {
                    const outcallAvg = Math.round(outcallPrices.reduce((a, b) => a + b, 0) / outcallPrices.length);
                    statsHtml += '<div style="margin-top: 0.5rem; padding-top: 0.5rem; border-top: 1px solid #e0f2fe;"><span style="color: #64748b; font-size: 0.8rem;">🚗 外送平均：</span><span class="price-range">' + outcallAvg.toLocaleString() + '</span> (共 ' + outcallPrices.length + ' 筆)</div>';
                }
                if (incallPrices.length > 0) {
                    const incallAvg = Math.round(incallPrices.reduce((a, b) => a + b, 0) / incallPrices.length);
                    statsHtml += '<div style="margin-top: 0.5rem;"><span style="color: #64748b; font-size: 0.8rem;">🏠 定點平均：</span><span class="price-range">' + incallAvg.toLocaleString() + '</span> (共 ' + incallPrices.length + ' 筆)</div>';
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
                        statsHtml += '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.25rem; font-size: 0.8rem;"><span>' + range.label + '</span><span style="color: #64748b;">' + count + ' 筆 (' + percent + '%)</span></div>';
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
                const bgColor = warning.type === 'low' ? '#fef3c7' : '#fee2e2';
                const borderColor = warning.type === 'low' ? '#f59e0b' : '#ef4444';
                const textColor = warning.type === 'low' ? '#92400e' : '#991b1b';
                warningDiv.style.cssText = 'margin-top: 0.5rem; padding: 0.75rem; background: ' + bgColor + '; border: 1px solid ' + borderColor + '; border-radius: 6px; color: ' + textColor + '; font-size: 0.85rem;';
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

        // 儲存原始用戶數據（用於搜索過濾）
        let allUsersData = [];
        
        // 載入用戶列表
        async function loadUsers() {
            try {
                const token = safeGetItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/admin/users', {
                    headers: getAuthHeaders()
                });
                if (!res.ok) {
                    throw new Error('載入用戶失敗');
                }
                const users = await res.json();
                allUsersData = users; // 儲存原始數據
                renderUsers(users);
            } catch (error) {
                console.error('載入用戶失敗:', error);
                document.getElementById('users-list').innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">載入失敗: ' + error.message + '</div>';
            }
        }
        
        // 排序狀態
        let currentSortField = null;
        let currentSortDirection = 'asc'; // 'asc' 或 'desc'
        
        // 排序用戶
        function sortUsers(field) {
            // 如果點擊同一個欄位，切換排序方向
            if (currentSortField === field) {
                currentSortDirection = currentSortDirection === 'asc' ? 'desc' : 'asc';
            } else {
                currentSortField = field;
                currentSortDirection = 'asc';
            }
            
            // 獲取過濾後的用戶列表
            const searchTerm = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
            const roleFilter = document.getElementById('userRoleFilter')?.value || '';
            
            let filtered = allUsersData.filter(u => {
                // 搜索過濾
                if (searchTerm) {
                    const searchableText = [
                        u.email || '',
                        u.publicId || u.id || '',
                        u.phoneNumber || '',
                        u.userName || ''
                    ].join(' ').toLowerCase();
                    
                    if (!searchableText.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // 身份過濾
                if (roleFilter && u.role !== roleFilter) {
                    return false;
                }
                
                return true;
            });
            
            // 執行排序
            filtered.sort(function(a, b) {
                let aVal, bVal;
                
                switch (field) {
                    case 'membershipLevel':
                        // 會員等級：從高到低（定義等級順序）
                        const levelOrder = {
                            // 品茶客等級（從低到高）
                            'tea_guest': 1,
                            'tea_scholar': 2,
                            'royal_tea_scholar': 3,
                            'royal_tea_officer': 4,
                            'tea_king_attendant': 5,
                            'imperial_chief_tea_officer': 6,
                            'tea_king_confidant': 7,
                            'tea_king_personal_selection': 8,
                            'imperial_golden_seal_tea_officer': 9,
                            'national_master_tea_officer': 10,
                            // 後宮佳麗等級（從低到高）
                            'lady_trainee': 1,
                            'lady_apprentice': 2,
                            'lady_junior': 3,
                            'lady_senior': 4,
                            'lady_expert': 5,
                            'lady_master': 6,
                            'lady_elite': 7,
                            'lady_premium': 8,
                            'lady_royal': 9,
                            'lady_empress': 10
                        };
                        aVal = levelOrder[a.membershipLevel] || 0;
                        bVal = levelOrder[b.membershipLevel] || 0;
                        // 降序排列（高級在前）
                        return currentSortDirection === 'desc' ? bVal - aVal : aVal - bVal;
                        
                    case 'userName':
                        // 暱稱：有到無
                        aVal = (a.userName || '').trim();
                        bVal = (b.userName || '').trim();
                        if (!aVal && !bVal) return 0;
                        if (!aVal) return currentSortDirection === 'desc' ? -1 : 1; // 無暱稱排在最後
                        if (!bVal) return currentSortDirection === 'desc' ? 1 : -1;
                        // 有暱稱的按字母順序
                        return currentSortDirection === 'desc' 
                            ? bVal.localeCompare(aVal, 'zh-TW')
                            : aVal.localeCompare(bVal, 'zh-TW');
                        
                    case 'role':
                        // 身份：品茶客和後宮佳麗分組
                        const roleOrder = { 'client': 1, 'provider': 2, 'admin': 3 };
                        aVal = roleOrder[a.role] || 0;
                        bVal = roleOrder[b.role] || 0;
                        if (aVal !== bVal) {
                            return currentSortDirection === 'desc' ? bVal - aVal : aVal - bVal;
                        }
                        // 同身份內按暱稱排序
                        aVal = (a.userName || '').trim();
                        bVal = (b.userName || '').trim();
                        if (!aVal && !bVal) return 0;
                        if (!aVal) return 1;
                        if (!bVal) return -1;
                        return aVal.localeCompare(bVal, 'zh-TW');
                        
                    case 'publicId':
                        // 公開ID：按字母順序排序
                        aVal = (a.publicId || a.id || '').trim();
                        bVal = (b.publicId || b.id || '').trim();
                        return currentSortDirection === 'desc' 
                            ? bVal.localeCompare(aVal, 'zh-TW')
                            : aVal.localeCompare(bVal, 'zh-TW');
                        
                    default:
                        return 0;
                }
            });
            
            renderUsers(filtered);
        }
        
        // 過濾用戶
        function filterUsers() {
            const searchTerm = (document.getElementById('userSearchInput')?.value || '').toLowerCase();
            const roleFilter = document.getElementById('userRoleFilter')?.value || '';
            
            let filtered = allUsersData.filter(u => {
                // 搜索過濾
                if (searchTerm) {
                    const searchableText = [
                        u.email || '',
                        u.publicId || u.id || '',
                        u.phoneNumber || '',
                        u.userName || ''
                    ].join(' ').toLowerCase();
                    
                    if (!searchableText.includes(searchTerm)) {
                        return false;
                    }
                }
                
                // 身份過濾
                if (roleFilter && u.role !== roleFilter) {
                    return false;
                }
                
                return true;
            });
            
            // 如果有排序，應用排序
            if (currentSortField) {
                sortUsers(currentSortField);
                return; // sortUsers 會調用 renderUsers
            }
            
            renderUsers(filtered);
        }
        
        // 渲染用戶列表
        function renderUsers(users) {
            const list = document.getElementById('users-list');
            if (!list) return;
            
            const getMembershipLabel = (level) => {
                const labels = {
                    'tea_guest': '茶客',
                    'tea_scholar': '🥉 入門茶士',
                    'royal_tea_scholar': '🥈 御前茶士',
                    'royal_tea_officer': '🥇 御用茶官',
                    'tea_king_attendant': '💎 茶王近侍',
                    'imperial_chief_tea_officer': '👑 御前總茶官',
                    'tea_king_confidant': '🤝 茶王心腹',
                    'tea_king_personal_selection': '⭐ 茶王親選',
                    'imperial_golden_seal_tea_officer': '🏆 御賜金印茶官',
                    'national_master_tea_officer': '🌟 國師級茶官',
                    // 後宮佳麗等級
                    'lady_trainee': '🌸 初級佳麗',
                    'lady_apprentice': '🌺 見習佳麗',
                    'lady_junior': '🌷 中級佳麗',
                    'lady_senior': '🌹 高級佳麗',
                    'lady_expert': '🌻 專家佳麗',
                    'lady_master': '🌼 大師佳麗',
                    'lady_elite': '🌺 精英佳麗',
                    'lady_premium': '🌹 高級佳麗',
                    'lady_royal': '👑 皇家佳麗',
                    'lady_empress': '👸 皇后佳麗'
                };
                return labels[level] || level;
            };
            
            const getVerificationBadges = (user) => {
                const badges = [];
                if (user.emailVerified) badges.push('✉️');
                if (user.phoneVerified) badges.push('📱');
                return badges.length > 0 ? badges.join(' ') : '-';
            };
            
            if (users.length === 0) {
                list.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">沒有找到匹配的用戶</div>';
                return;
            }
            
            // 獲取用戶標記顯示
            const getUserTagsDisplay = (user) => {
                const tags = user.userTags || [];
                if (tags.length === 0) return '-';
                const tagLabels = {
                    'admin': '👑',
                    'moderator': '🛡️',
                    'sub_moderator': '🛡️',
                    'staff': '👔',
                    'troll': '🤖',
                    'vip': '💎',
                    'verified': '✅',
                    'test': '🧪'
                };
                return tags.map(function(tag) {
                    return tagLabels[tag] || tag;
                }).join(' ');
            };
            
            const isMobile = window.innerWidth <= 768;
            
            if (isMobile) {
                // 手機：卡片式布局（簡化版）
                list.innerHTML = '<div class="table-mobile">' +
                    users.map(u => {
                        const role = u.role === 'client' ? '👤 品茶客' : u.role === 'provider' ? '👩 後宮佳麗' : '👑 管理員';
                        const membership = getMembershipLabel(u.membershipLevel || 'tea_guest');
                        const badges = getVerificationBadges(u);
                        const tags = getUserTagsDisplay(u);
                        const publicId = u.publicId || u.id || '-';
                        const safePublicId = String(publicId).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const safeUserName = String(u.userName || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const banStatus = u.isBanned ? '<span style="color: #ef4444; font-size: 0.875rem;">❌ 已封禁</span>' : '<span style="color: #10b981; font-size: 0.875rem;">✅ 正常</span>';
                        return '<div class="table-card">' +
                            '<div class="table-card-header"><code style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem;">' + safePublicId + '</code> ' + banStatus + '</div>' +
                            '<div class="table-card-row"><span class="table-card-label">暱稱:</span><span class="table-card-value">' + safeUserName + '</span></div>' +
                            '<div class="table-card-row"><span class="table-card-label">身份:</span><span class="table-card-value">' + role + '</span></div>' +
                            '<div class="table-card-row"><span class="table-card-label">標記:</span><span class="table-card-value">' + tags + '</span></div>' +
                            '<div class="table-card-row"><span class="table-card-label">會員等級:</span><span class="table-card-value">' + membership + '</span></div>' +
                            '<div class="table-card-row"><span class="table-card-label">驗證:</span><span class="table-card-value">' + badges + '</span></div>' +
                            '<div class="table-card-actions">' +
                            '<button class="btn" onclick="viewUserDetail(' + JSON.stringify(u.id).replace(/"/g, '&quot;') + ')">查看詳情</button>' +
                            '</div></div>';
                    }).join('') + '</div>' +
                    '<div style="margin-top: 1rem; padding: 0.75rem; background: #f3f4f6; border-radius: 6px; text-align: center; color: #666; font-size: 0.875rem;">共顯示 ' + users.length + ' 位用戶</div>';
            } else {
                // 桌面：表格布局（簡化版，只保留：公開ID、暱稱、身份、標記、會員等級、驗證、狀態、操作）
                // 生成排序指示器
                const getSortIndicator = function(field) {
                    if (currentSortField !== field) {
                        return '<span style="color: #ccc; margin-left: 0.25rem;">↕</span>';
                    }
                    return currentSortDirection === 'asc' 
                        ? '<span style="color: #1a5f3f; margin-left: 0.25rem;">↑</span>'
                        : '<span style="color: #1a5f3f; margin-left: 0.25rem;">↓</span>';
                };
                
                list.innerHTML = '<div class="table-desktop"><table><thead><tr>' +
                    '<th style="cursor: pointer; user-select: none;" onclick="sortUsers(&quot;publicId&quot;)" onmouseover="this.style.background=&quot;#f3f4f6&quot;" onmouseout="this.style.background=&quot;&quot;">公開ID' + getSortIndicator('publicId') + '</th>' +
                    '<th style="cursor: pointer; user-select: none;" onclick="sortUsers(&quot;userName&quot;)" onmouseover="this.style.background=&quot;#f3f4f6&quot;" onmouseout="this.style.background=&quot;&quot;">暱稱' + getSortIndicator('userName') + '</th>' +
                    '<th style="cursor: pointer; user-select: none;" onclick="sortUsers(&quot;role&quot;)" onmouseover="this.style.background=&quot;#f3f4f6&quot;" onmouseout="this.style.background=&quot;&quot;">身份' + getSortIndicator('role') + '</th>' +
                    '<th>標記</th>' +
                    '<th style="cursor: pointer; user-select: none;" onclick="sortUsers(&quot;membershipLevel&quot;)" onmouseover="this.style.background=&quot;#f3f4f6&quot;" onmouseout="this.style.background=&quot;&quot;">會員等級' + getSortIndicator('membershipLevel') + '</th>' +
                    '<th>驗證</th>' +
                    '<th>狀態</th>' +
                    '<th>操作</th>' +
                    '</tr></thead><tbody>' +
                    users.map(u => {
                        const role = u.role === 'client' ? '👤 品茶客' : u.role === 'provider' ? '👩 後宮佳麗' : '👑 管理員';
                        const membership = getMembershipLabel(u.membershipLevel || 'tea_guest');
                        const badges = getVerificationBadges(u);
                        const tags = getUserTagsDisplay(u);
                        const publicId = u.publicId || u.id || '-';
                        const safePublicId = String(publicId).replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const safeUserName = String(u.userName || '-').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                        const banStatus = u.isBanned ? '<span style="color: #ef4444; font-size: 0.875rem;">❌ 已封禁</span>' : '<span style="color: #10b981; font-size: 0.875rem;">✅ 正常</span>';
                        return '<tr>' +
                            '<td><code style="background: #f3f4f6; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">' + safePublicId + '</code></td>' +
                            '<td>' + safeUserName + '</td>' +
                            '<td>' + role + '</td>' +
                            '<td>' + tags + '</td>' +
                            '<td>' + membership + '</td>' +
                            '<td>' + badges + '</td>' +
                            '<td>' + banStatus + '</td>' +
                            '<td style="white-space: nowrap;">' +
                            '<button class="btn" onclick="viewUserDetail(' + JSON.stringify(u.id).replace(/"/g, '&quot;') + ')">查看詳情</button>' +
                            '</td>' +
                            '</tr>';
                    }).join('') + '</tbody></table></div>' +
                    '<div style="margin-top: 1rem; padding: 0.75rem; background: #f3f4f6; border-radius: 6px; text-align: center; color: #666; font-size: 0.875rem;">共顯示 ' + users.length + ' 位用戶</div>';
            }
        }

        // 當前查看的用戶ID
        let currentViewingUserId = null;

        // 查看用戶詳情
        async function viewUserDetail(userId) {
            try {
                currentViewingUserId = userId;
                const token = safeGetItem('auth_token');
                if (!token) {
                    showMessage('請先登入', 'error');
                    return;
                }
                
                // 檢查 API_BASE 是否正確
                if (!API_BASE || API_BASE === 'null' || API_BASE === 'undefined') {
                    console.error('API_BASE 未正確設置:', API_BASE);
                    showMessage('❌ 無法連接到服務器，請刷新頁面重試', 'error');
                    return;
                }
                
                // 對用戶ID進行URL編碼，處理包含 # 等特殊字符的情況
                const encodedUserId = encodeURIComponent(userId);
                const url = API_BASE + '/api/admin/users/' + encodedUserId;
                console.log('請求用戶詳情:', url);
                
                const res = await fetch(url, {
                    headers: getAuthHeaders(),
                    method: 'GET'
                });
                
                if (!res.ok) {
                    if (res.status === 401) {
                        showMessage('❌ 登入已過期，請重新登入', 'error');
                        handleLogout();
                        return;
                    }
                    if (res.status === 403) {
                        showMessage('❌ 無權訪問此資源', 'error');
                        return;
                    }
                    throw new Error('HTTP ' + res.status + ': ' + res.statusText);
                }
                
                const data = await res.json();
                const user = data.user;
                const bookings = data.bookings || [];
                
                // 檢查 user 是否存在
                if (!user) {
                    showMessage('❌ 無法獲取用戶資料', 'error');
                    console.error('用戶資料為空:', data);
                    return;
                }
                
                // 顯示用戶詳情 Modal
                showUserDetailModal(user, bookings);
            } catch (error) {
                console.error('載入用戶詳情失敗:', error);
                if (error.message && error.message.includes('Failed to fetch')) {
                    showMessage('❌ 無法連接到服務器，請確認後端服務器正在運行', 'error');
                } else {
                    showMessage('❌ 載入用戶詳情失敗: ' + error.message, 'error');
                }
            }
        }

        // 顯示用戶詳情 Modal
        function showUserDetailModal(user, bookings) {
            const modal = document.getElementById('userDetailModal');
            if (!modal) {
                // 如果 Modal 不存在，創建它
                createUserDetailModal();
            }
            
            const roleText = user.role === 'client' ? '👤 品茶客' : user.role === 'provider' ? '👩 後宮佳麗' : '👑 管理員';
            const membershipLabels = {
                'tea_guest': '茶客',
                'tea_scholar': '🥉 入門茶士',
                'royal_tea_scholar': '🥈 御前茶士',
                'royal_tea_officer': '🥇 御用茶官',
                'tea_king_attendant': '💎 茶王近侍',
                'imperial_chief_tea_officer': '👑 御前總茶官',
                'tea_king_confidant': '🤝 茶王心腹',
                'tea_king_personal_selection': '⭐ 茶王親選',
                'imperial_golden_seal_tea_officer': '🏆 御賜金印茶官',
                'national_master_tea_officer': '🌟 國師級茶官',
                'lady_trainee': '🌸 初級佳麗',
                'lady_apprentice': '🌺 見習佳麗',
                'lady_junior': '🌷 中級佳麗',
                'lady_senior': '🌹 高級佳麗',
                'lady_expert': '🌻 專家佳麗',
                'lady_master': '🌼 大師佳麗',
                'lady_elite': '🌺 精英佳麗',
                'lady_premium': '🌹 高級佳麗',
                'lady_royal': '👑 皇家佳麗',
                'lady_empress': '👸 皇后佳麗'
            };
            const membershipText = membershipLabels[user.membershipLevel] || user.membershipLevel || '茶客';
            const badgesText = (user.emailVerified ? '✉️ ' : '') + (user.phoneVerified ? '📱' : '') || '無';
            const createdAtText = new Date(user.createdAt).toLocaleString('zh-TW');
            const lastLoginText = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-TW') : '從未登入';
            const expiresAtText = user.membershipExpiresAt ? new Date(user.membershipExpiresAt).toLocaleString('zh-TW') : '無';
            const isBanned = user.isBanned || false;
            
            // 填充用戶信息
            document.getElementById('userDetailId').textContent = user.publicId || user.id;
            const userNameEl = document.getElementById('userDetailUserName');
            if (userNameEl) userNameEl.textContent = user.userName || '-';
            document.getElementById('userDetailEmail').textContent = user.email || '-';
            document.getElementById('userDetailPhone').textContent = user.phoneNumber || '-';
            document.getElementById('userDetailRole').textContent = roleText;
            document.getElementById('userDetailLevel').textContent = membershipText;
            document.getElementById('userDetailBadges').textContent = badgesText;
            const currentPointsEl = document.getElementById('userDetailCurrentPoints');
            const totalPointsEl = document.getElementById('userDetailTotalPoints');
            if (currentPointsEl) currentPointsEl.textContent = (user.currentPoints || 0).toLocaleString();
            if (totalPointsEl) totalPointsEl.textContent = (user.totalPoints || 0).toLocaleString();
            document.getElementById('userDetailCreated').textContent = createdAtText;
            document.getElementById('userDetailLastLogin').textContent = lastLoginText;
            document.getElementById('userDetailExpires').textContent = expiresAtText;
            document.getElementById('userDetailBookings').textContent = bookings.length + ' 筆';
            
            // 更新用戶標記顯示
            const userTags = user.userTags || [];
            const tagLabels = {
                'admin': '👑 管理員',
                'staff': '👔 內部人員',
                'troll': '🤖 水軍',
                'vip': '💎 VIP',
                'verified': '✅ 已驗證',
                'test': '🧪 測試帳號'
            };
            const tagsText = userTags.length > 0 
                ? userTags.map(function(tag) {
                    return tagLabels[tag] || tag;
                }).join(', ')
                : '無';
            const tagsEl = document.getElementById('userDetailTags');
            if (tagsEl) {
                tagsEl.textContent = tagsText;
            }
            
            // 更新標記按鈕狀態
            const tagButtonMap = {
                'admin': 'tagAdminBtn',
                'moderator': 'tagModeratorBtn',
                'sub_moderator': 'tagSubModeratorBtn',
                'staff': 'tagStaffBtn',
                'troll': 'tagTrollBtn',
                'vip': 'tagVipBtn',
                'verified': 'tagVerifiedBtn',
                'test': 'tagTestBtn'
            };
            
            Object.keys(tagButtonMap).forEach(tag => {
                const btnId = tagButtonMap[tag];
                const btn = document.getElementById(btnId);
                if (btn) {
                    if (userTags.includes(tag)) {
                        btn.classList.add('active');
                        btn.style.opacity = '1';
                        btn.style.fontWeight = '600';
                    } else {
                        btn.classList.remove('active');
                        btn.style.opacity = '0.5';
                        btn.style.fontWeight = 'normal';
                    }
                }
            });
            
            // 更新封禁狀態
            const banStatusEl = document.getElementById('userDetailBanStatus');
            if (banStatusEl) {
                banStatusEl.textContent = isBanned ? '❌ 已封禁' : '✅ 正常';
                banStatusEl.style.color = isBanned ? '#ef4444' : '#10b981';
            }
            
            // 更新操作按鈕
            const banBtn = document.getElementById('userDetailBanBtn');
            const unbanBtn = document.getElementById('userDetailUnbanBtn');
            if (banBtn && unbanBtn) {
                banBtn.style.display = isBanned ? 'none' : 'inline-block';
                unbanBtn.style.display = isBanned ? 'inline-block' : 'none';
            }
            
            // 填充預約記錄
            const bookingsList = document.getElementById('userDetailBookingsList');
            if (bookings.length === 0) {
                bookingsList.innerHTML = '<p style="text-align: center; color: #666; padding: 1rem;">暫無預約記錄</p>';
            } else {
                bookingsList.innerHTML = '<table style="width: 100%; margin-top: 1rem;"><thead><tr><th>預約ID</th><th>日期</th><th>時間</th><th>狀態</th></tr></thead><tbody>' +
                    bookings.slice(0, 10).map(b => {
                        const statusText = b.status === 'pending' ? '⏳ 待處理' : b.status === 'accepted' ? '✅ 已接受' : b.status === 'completed' ? '✅ 已完成' : b.status === 'cancelled' ? '❌ 已取消' : '❌ 已拒絕';
                        return '<tr>' +
                            '<td><code style="font-size: 0.75rem;">' + b.id.substring(0, 12) + '...</code></td>' +
                            '<td>' + (b.bookingDate || '-') + '</td>' +
                            '<td>' + (b.bookingTime || '-') + '</td>' +
                            '<td>' + statusText + '</td>' +
                            '</tr>';
                    }).join('') + '</tbody></table>' +
                    (bookings.length > 10 ? '<p style="text-align: center; color: #666; margin-top: 0.5rem; font-size: 0.875rem;">顯示前 10 筆，共 ' + bookings.length + ' 筆</p>' : '');
            }
            
            // 顯示 Modal
            modal.classList.add('active');
        }


        // 關閉用戶詳情 Modal
        function closeUserDetailModal() {
            const modal = document.getElementById('userDetailModal');
            if (modal) {
                modal.classList.remove('active');
            }
            currentViewingUserId = null;
        }

        // 顯示用戶操作 Modal
        function showUserActionModal(title, contentHtml, onConfirm) {
            const modal = document.getElementById('userActionModal');
            const titleEl = document.getElementById('userActionModalTitle');
            const contentEl = document.getElementById('userActionModalContent');
            const confirmBtn = document.getElementById('userActionConfirmBtn');
            
            if (titleEl) titleEl.textContent = title;
            if (contentEl) contentEl.innerHTML = contentHtml;
            
            // 移除舊的事件監聽器並添加新的
            const newConfirmBtn = confirmBtn.cloneNode(true);
            confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
            newConfirmBtn.onclick = function() {
                onConfirm();
                closeUserActionModal();
            };
            
            modal.classList.add('active');
        }

        // 關閉用戶操作 Modal
        function closeUserActionModal() {
            const modal = document.getElementById('userActionModal');
            if (modal) {
                modal.classList.remove('active');
            }
        }

        // 修改用戶等級
        async function editUserLevel() {
            if (!currentViewingUserId) return;
            
            const contentHtml = '<div style="margin-bottom: 1rem;">' +
                '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">會員等級：</label>' +
                '<select id="userLevelSelect" style="width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.875rem;">' +
                '<option value="tea_guest">茶客</option>' +
                '<option value="tea_scholar">🥉 入門茶士</option>' +
                '<option value="royal_tea_scholar">🥈 御前茶士</option>' +
                '<option value="royal_tea_officer">🥇 御用茶官</option>' +
                '<option value="tea_king_attendant">💎 茶王近侍</option>' +
                '<option value="imperial_chief_tea_officer">👑 御前總茶官</option>' +
                '<option value="tea_king_confidant">🤝 茶王心腹</option>' +
                '<option value="tea_king_personal_selection">⭐ 茶王親選</option>' +
                '<option value="imperial_golden_seal_tea_officer">🏆 御賜金印茶官</option>' +
                '<option value="national_master_tea_officer">🌟 國師級茶官</option>' +
                '<option value="lady_trainee">🌸 初級佳麗</option>' +
                '<option value="lady_apprentice">🌺 見習佳麗</option>' +
                '<option value="lady_junior">🌷 中級佳麗</option>' +
                '<option value="lady_senior">🌹 高級佳麗</option>' +
                '<option value="lady_expert">🌻 專家佳麗</option>' +
                '<option value="lady_master">🌼 大師佳麗</option>' +
                '<option value="lady_elite">🌺 精英佳麗</option>' +
                '<option value="lady_premium">🌹 高級佳麗</option>' +
                '<option value="lady_royal">👑 皇家佳麗</option>' +
                '<option value="lady_empress">👸 皇后佳麗</option>' +
                '</select>' +
                '</div>';
            
            showUserActionModal('修改會員等級', contentHtml, async function() {
                const levelSelect = document.getElementById('userLevelSelect');
                const level = levelSelect ? levelSelect.value : null;
                if (!level) return;
                
                try {
                    const encodedUserId = encodeURIComponent(currentViewingUserId);
                    const res = await fetch(API_BASE + '/api/admin/users/' + encodedUserId + '/level', {
                        method: 'PUT',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ level })
                    });
                    if (!res.ok) throw new Error('更新失敗');
                    showMessage('✅ 會員等級已更新！');
                    viewUserDetail(currentViewingUserId); // 重新載入詳情
                    loadUsers(); // 刷新列表
                } catch (error) {
                    showMessage('❌ 更新失敗: ' + error.message, 'error');
                }
            });
        }

        // 封禁用戶
        async function banUser() {
            if (!currentViewingUserId) return;
            
            const contentHtml = '<div style="margin-bottom: 1rem;">' +
                '<p style="color: #ef4444; font-weight: 600; margin-bottom: 1rem;">⚠️ 確定要封禁此用戶嗎？</p>' +
                '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">封禁原因（可選）：</label>' +
                '<textarea id="banReasonInput" placeholder="請輸入封禁原因..." style="width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.875rem; min-height: 80px; resize: vertical;"></textarea>' +
                '</div>';
            
            showUserActionModal('封禁用戶', contentHtml, async function() {
                const reasonInput = document.getElementById('banReasonInput');
                const reason = reasonInput ? (reasonInput.value.trim() || '管理員封禁') : '管理員封禁';
                
                try {
                    const encodedUserId = encodeURIComponent(currentViewingUserId);
                    const res = await fetch(API_BASE + '/api/admin/users/' + encodedUserId + '/ban', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ reason })
                    });
                    if (!res.ok) throw new Error('封禁失敗');
                    showMessage('✅ 用戶已封禁！');
                    viewUserDetail(currentViewingUserId); // 重新載入詳情
                    loadUsers(); // 刷新列表
                } catch (error) {
                    showMessage('❌ 封禁失敗: ' + error.message, 'error');
                }
            });
        }

        // 解封用戶
        async function unbanUser() {
            if (!currentViewingUserId) return;
            
            const contentHtml = '<div style="margin-bottom: 1rem;">' +
                '<p style="color: #10b981; font-weight: 600;">✅ 確定要解封此用戶嗎？</p>' +
                '</div>';
            
            showUserActionModal('解封用戶', contentHtml, async function() {
                try {
                    const encodedUserId = encodeURIComponent(currentViewingUserId);
                    const res = await fetch(API_BASE + '/api/admin/users/' + encodedUserId + '/unban', {
                        method: 'POST',
                        headers: getAuthHeaders()
                    });
                    if (!res.ok) throw new Error('解封失敗');
                    showMessage('✅ 用戶已解封！');
                    viewUserDetail(currentViewingUserId); // 重新載入詳情
                    loadUsers(); // 刷新列表
                } catch (error) {
                    showMessage('❌ 解封失敗: ' + error.message, 'error');
                }
            });
        }

        // 重置密碼
        async function resetUserPassword() {
            if (!currentViewingUserId) return;
            
            const contentHtml = '<div style="margin-bottom: 1rem;">' +
                '<p style="color: #f59e0b; font-weight: 600; margin-bottom: 1rem;">⚠️ 確定要重置此用戶的密碼嗎？</p>' +
                '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">新密碼（至少6位）：</label>' +
                '<input type="password" id="newPasswordInput" placeholder="請輸入新密碼..." style="width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.875rem;" />' +
                '<p style="margin-top: 0.5rem; font-size: 0.75rem; color: #666;">密碼長度至少6位</p>' +
                '</div>';
            
            showUserActionModal('重置密碼', contentHtml, async function() {
                const passwordInput = document.getElementById('newPasswordInput');
                const newPassword = passwordInput ? passwordInput.value.trim() : '';
                
                if (!newPassword || newPassword.length < 6) {
                    showMessage('❌ 密碼長度至少6位', 'error');
                    return;
                }
                
                try {
                    const encodedUserId = encodeURIComponent(currentViewingUserId);
                    const res = await fetch(API_BASE + '/api/admin/users/' + encodedUserId + '/reset-password', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ newPassword })
                    });
                    if (!res.ok) throw new Error('重置失敗');
                    showMessage('✅ 密碼已重置！');
                } catch (error) {
                    showMessage('❌ 重置失敗: ' + error.message, 'error');
                }
            });
        }

        // 儲值積分
        async function addUserPoints() {
            if (!currentViewingUserId) return;
            
            const contentHtml = '<div style="margin-bottom: 1rem;">' +
                '<p style="color: #f59e0b; font-weight: 600; margin-bottom: 1rem;">💰 為用戶儲值積分</p>' +
                '<label style="display: block; margin-bottom: 0.5rem; font-weight: 600;">積分數量：</label>' +
                '<input type="number" id="pointsAmountInput" placeholder="請輸入要添加的積分數量..." min="1" style="width: 100%; padding: 0.75rem; border: 1px solid #e0e0e0; border-radius: 6px; font-size: 0.875rem;" />' +
                '<p style="margin-top: 0.5rem; font-size: 0.75rem; color: #666;">輸入正數表示增加積分</p>' +
                '</div>';
            
            showUserActionModal('儲值積分', contentHtml, async function() {
                const pointsInput = document.getElementById('pointsAmountInput');
                const pointsAmount = pointsInput ? parseInt(pointsInput.value.trim()) : 0;
                
                if (!pointsAmount || pointsAmount <= 0) {
                    showMessage('❌ 請輸入有效的積分數量（必須大於0）', 'error');
                    return;
                }
                
                try {
                    const encodedUserId = encodeURIComponent(currentViewingUserId);
                    const res = await fetch(API_BASE + '/api/admin/users/' + encodedUserId + '/add-points', {
                        method: 'POST',
                        headers: getAuthHeaders(),
                        body: JSON.stringify({ points: pointsAmount })
                    });
                    if (!res.ok) {
                        const errorData = await res.json().catch(() => ({ error: '儲值失敗' }));
                        throw new Error(errorData.error || '儲值失敗');
                    }
                    const data = await res.json();
                    showMessage('✅ 積分已成功儲值！當前積分：' + (data.currentPoints || 0));
                    viewUserDetail(currentViewingUserId); // 重新載入詳情
                } catch (error) {
                    showMessage('❌ 儲值失敗: ' + error.message, 'error');
                }
            });
        }

        // 切換用戶標記
        async function toggleUserTag(tag) {
            if (!currentViewingUserId) return;
            
            try {
                // 對用戶ID進行URL編碼
                const encodedUserId = encodeURIComponent(currentViewingUserId);
                
                // 先獲取當前用戶信息
                const res = await fetch(API_BASE + '/api/admin/users/' + encodedUserId, {
                    headers: getAuthHeaders()
                });
                if (!res.ok) throw new Error('獲取用戶信息失敗');
                const data = await res.json();
                const currentTags = data.user.userTags || [];
                
                // 切換標記
                let newTags;
                const isAdding = !currentTags.includes(tag);
                if (isAdding) {
                    newTags = [...currentTags, tag];
                } else {
                    newTags = currentTags.filter(function(t) { return t !== tag; });
                }
                
                // 如果是添加 'verified' 標記，先執行自動驗證
                if (tag === 'verified' && isAdding) {
                    const verifyRes = await fetch(API_BASE + '/api/admin/users/' + encodedUserId + '/auto-verify', {
                        method: 'POST',
                        headers: getAuthHeaders()
                    });
                    if (!verifyRes.ok) {
                        const errorData = await verifyRes.json().catch(() => ({ error: '自動驗證失敗' }));
                        throw new Error(errorData.error || '自動驗證失敗');
                    }
                    const verifyData = await verifyRes.json();
                    showMessage('✅ 用戶已自動驗證！Email 已驗證，手機號碼已生成：' + verifyData.generatedPhone);
                }
                
                // 更新標記
                const updateRes = await fetch(API_BASE + '/api/admin/users/' + encodedUserId + '/tags', {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ tags: newTags })
                });
                if (!updateRes.ok) throw new Error('更新標記失敗');
                
                // 重新載入用戶詳情
                viewUserDetail(currentViewingUserId);
                if (tag !== 'verified' || !isAdding) {
                    showMessage('✅ 用戶標記已更新');
                }
            } catch (error) {
                showMessage('❌ 操作失敗: ' + error.message, 'error');
            }
        }

        // 導出用戶資料
        async function exportUsers() {
            try {
                const token = safeGetItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/admin/users', {
                    headers: getAuthHeaders()
                });
                if (!res.ok) {
                    throw new Error('載入用戶失敗');
                }
                const users = await res.json();
                
                // 轉換為 CSV 格式
                const membershipLabels = {
                    'tea_guest': '茶客',
                    'tea_scholar': '入門茶士',
                    'royal_tea_scholar': '御前茶士',
                    'royal_tea_officer': '御用茶官',
                    'tea_king_attendant': '茶王近侍',
                    'imperial_chief_tea_officer': '御前總茶官',
                    'tea_king_confidant': '茶王心腹',
                    'tea_king_personal_selection': '茶王親選',
                    'imperial_golden_seal_tea_officer': '御賜金印茶官',
                    'national_master_tea_officer': '國師級茶官'
                };
                const headers = ['Email', '手機號', '身份', '會員等級', '會員到期', '驗證勳章', '註冊時間', '最後登入'];
                const rows = users.map(u => [
                    u.email || '',
                    u.phoneNumber || '',
                    u.role === 'client' ? '品茶客' : u.role === 'provider' ? '後宮佳麗' : '管理員',
                    membershipLabels[u.membershipLevel] || u.membershipLevel || '免費會員',
                    u.membershipExpiresAt ? new Date(u.membershipExpiresAt).toLocaleString('zh-TW') : '無',
                    (u.verificationBadges && u.verificationBadges.length > 0) ? u.verificationBadges.join(', ') : '無',
                    new Date(u.createdAt).toLocaleString('zh-TW'),
                    u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString('zh-TW') : ''
                ]);
                
                // 創建 CSV 內容
                const csvContent = [
                    headers.join(','),
                    ...rows.map(row => row.map(cell => '"' + cell + '"').join(','))
                ].join('\\n');
                
                // 添加 BOM 以支援中文
                const BOM = '\\uFEFF';
                const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', '用戶資料_' + new Date().toISOString().split('T')[0] + '.csv');
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

        let currentBookingTab = 'premium';
        
        // 切換預約標籤頁
        function showBookingTab(evt, tab) {
            currentBookingTab = tab;
            document.querySelectorAll('[data-booking-tab]').forEach(t => {
                t.classList.remove('active');
                t.style.color = '#666';
                t.style.borderBottomColor = 'transparent';
            });
            if (evt && evt.target) {
                evt.target.classList.add('active');
                evt.target.style.color = '#1a1a1a';
                evt.target.style.borderBottomColor = '#1a1a1a';
            }
            loadBookings();
        }

        // 載入預約列表
        async function loadBookings() {
            try {
                const token = safeGetItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/bookings/all', {
                    headers: getAuthHeaders()
                });
                if (!res.ok) {
                    throw new Error('載入預約失敗');
                }
                const bookings = await res.json();
                const list = document.getElementById('bookings-list');
                
                // 獲取所有 profiles 以判斷是嚴選好茶還是特選魚市
                const profilesRes = await fetch(API_BASE + '/api/admin/profiles', {
                    headers: getAuthHeaders()
                });
                const profiles = await profilesRes.json();
                const profileMap = {};
                profiles.forEach(p => {
                    profileMap[p.id] = p;
                });
                
                // 根據標籤頁過濾預約
                let filteredBookings = bookings;
                if (currentBookingTab === 'premium') {
                    // 嚴選好茶：profile 的 userId 為空或 null
                    filteredBookings = bookings.filter(b => {
                        const profile = profileMap[b.profileId];
                        return profile && (!profile.userId || profile.userId === '' || profile.userId === null);
                    });
                } else if (currentBookingTab === 'fish-market') {
                    // 特選魚市：profile 的 userId 不為空
                    filteredBookings = bookings.filter(b => {
                        const profile = profileMap[b.profileId];
                        return profile && profile.userId && profile.userId !== '' && profile.userId !== null;
                    });
                }
                
                if (filteredBookings.length === 0) {
                    list.innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">目前沒有' + (currentBookingTab === 'premium' ? '嚴選好茶' : '特選魚市') + '的預約記錄</div>';
                    return;
                }
                
                const isMobile = window.innerWidth <= 768;
                if (isMobile) {
                    // 手機：卡片式布局
                    list.innerHTML = '<div class="table-mobile">' +
                        filteredBookings.map(b => {
                            const statusText = b.status === 'pending' ? '⏳ 待處理' : b.status === 'accepted' ? '✅ 已接受' : b.status === 'completed' ? '✅ 已完成' : b.status === 'cancelled' ? '❌ 已取消' : '❌ 已拒絕';
                            const providerId = b.providerId ? b.providerId.substring(0, 8) + '...' : '-';
                            return '<div class="table-card">' +
                                '<div class="table-card-header">預約 #' + b.id.substring(0, 8) + '... ' + statusText + '</div>' +
                                '<div class="table-card-row"><span class="table-card-label">日期:</span><span class="table-card-value">' + b.bookingDate + '</span></div>' +
                                '<div class="table-card-row"><span class="table-card-label">時間:</span><span class="table-card-value">' + b.bookingTime + '</span></div>' +
                                '<div class="table-card-row"><span class="table-card-label">品茶客ID:</span><span class="table-card-value">' + b.clientId.substring(0, 12) + '...</span></div>' +
                                '<div class="table-card-row"><span class="table-card-label">佳麗ID:</span><span class="table-card-value">' + providerId + '</span></div>' +
                                '<div class="table-card-row"><span class="table-card-label">Profile ID:</span><span class="table-card-value">' + b.profileId.substring(0, 12) + '...</span></div>' +
                                '<div class="table-card-actions">' +
                                '<button class="btn" onclick="updateBookingStatus(' + JSON.stringify(b.id).replace(/"/g, '&quot;') + ', ' + JSON.stringify('accepted').replace(/"/g, '&quot;') + ')">接受</button>' +
                                '<button class="btn btn-danger" onclick="updateBookingStatus(' + JSON.stringify(b.id).replace(/"/g, '&quot;') + ', ' + JSON.stringify('rejected').replace(/"/g, '&quot;') + ')">拒絕</button>' +
                                '</div></div>';
                        }).join('') + '</div>';
                } else {
                    // 桌面：表格布局
                    list.innerHTML = '<div class="table-desktop"><table><thead><tr><th>預約ID</th><th>品茶客ID</th><th>佳麗ID</th><th>Profile ID</th><th>日期</th><th>時間</th><th>狀態</th><th>操作</th></tr></thead><tbody>' +
                        filteredBookings.map(b => {
                            const statusText = b.status === 'pending' ? '⏳ 待處理' : b.status === 'accepted' ? '✅ 已接受' : b.status === 'completed' ? '✅ 已完成' : b.status === 'cancelled' ? '❌ 已取消' : '❌ 已拒絕';
                            const providerId = b.providerId ? b.providerId.substring(0, 8) + '...' : '-';
                            return '<tr>' +
                                '<td>' + b.id.substring(0, 8) + '...</td>' +
                                '<td>' + b.clientId.substring(0, 8) + '...' + '</td>' +
                                '<td>' + providerId + '</td>' +
                                '<td>' + b.profileId.substring(0, 8) + '...' + '</td>' +
                                '<td>' + b.bookingDate + '</td>' +
                                '<td>' + b.bookingTime + '</td>' +
                                '<td>' + statusText + '</td>' +
                                '<td>' +
                                '<button class="btn" onclick="updateBookingStatus(' + JSON.stringify(b.id).replace(/"/g, '&quot;') + ', ' + JSON.stringify('accepted').replace(/"/g, '&quot;') + ')">接受</button>' +
                                '<button class="btn btn-danger" onclick="updateBookingStatus(' + JSON.stringify(b.id).replace(/"/g, '&quot;') + ', ' + JSON.stringify('rejected').replace(/"/g, '&quot;') + ')">拒絕</button>' +
                                '</td>' +
                                '</tr>';
                        }).join('') + '</tbody></table></div>';
                }
            } catch (error) {
                console.error('載入預約失敗:', error);
                document.getElementById('bookings-list').innerHTML = '<div style="padding: 2rem; text-align: center; color: #666;">載入失敗: ' + error.message + '</div>';
            }
        }

        // 更新預約狀態
        async function updateBookingStatus(bookingId, status) {
            try {
                const token = safeGetItem('auth_token');
                if (!token) {
                    alert('請先登入');
                    return;
                }
                const res = await fetch(API_BASE + '/api/bookings/' + bookingId + '/status', {
                    method: 'PUT',
                    headers: getAuthHeaders(),
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
`;
    // #region agent log
    const rawHtmlLength = html.length;
    const rawHtmlFirst100 = html.substring(0, 100);
    const rawHtmlLast100 = html.substring(Math.max(0, html.length - 100));
    const rawHtmlFirst13 = html.substring(0, 13);
    const rawHtmlFirst13Hex = Buffer.from(rawHtmlFirst13).toString('hex');
    console.log('[DEBUG] Raw HTML generated - Length:', rawHtmlLength);
    console.log('[DEBUG] First 13 chars:', JSON.stringify(rawHtmlFirst13));
    console.log('[DEBUG] First 13 hex:', rawHtmlFirst13Hex);
    console.log('[DEBUG] Has backtick:', rawHtmlFirst13.includes('`'));
    try {
      const http = require('http');
      const logData = JSON.stringify({location:'admin-panel.ts:2571',message:'Raw HTML generated',data:{length:rawHtmlLength,first100:rawHtmlFirst100,last100:rawHtmlLast100,first13:rawHtmlFirst13,first13Hex:rawHtmlFirst13Hex,hasBacktick:rawHtmlFirst13.includes('`')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,D'});
      const options = {hostname:'127.0.0.1',port:7247,path:'/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(logData)}};
      const reqLog = http.request(options,()=>{});reqLog.on('error',()=>{});reqLog.write(logData);reqLog.end();
    } catch(e) {}
    // #endregion
    // Remove leading backtick and newline if present, and trailing whitespace
    const cleanHtml = html.trimStart().startsWith('`') ? html.trimStart().substring(1).trimStart() : html.trimStart();
    // Ensure cleanHtml ends with </html> without trailing whitespace
    const finalHtml = cleanHtml.trimEnd();
    // #region agent log
    console.log('[DEBUG] After trimEnd - finalHtml length:', finalHtml.length);
    console.log('[DEBUG] finalHtml ends with </html>:', finalHtml.endsWith('</html>'));
    console.log('[DEBUG] finalHtml last 30 chars:', JSON.stringify(finalHtml.substring(Math.max(0, finalHtml.length - 30))));
    console.log('[DEBUG] finalHtml last 20 bytes hex:', Buffer.from(finalHtml.substring(Math.max(0, finalHtml.length - 20)), 'utf8').toString('hex'));
    // #endregion
    // #region agent log
    const cleanHtmlLength = finalHtml.length;
    const cleanHtmlFirst100 = finalHtml.substring(0, 100);
    const cleanHtmlLast100 = finalHtml.substring(Math.max(0, finalHtml.length - 100));
    const cleanHtmlFirst13 = finalHtml.substring(0, 13);
    const cleanHtmlFirst13Hex = Buffer.from(cleanHtmlFirst13).toString('hex');
    const hasUnclosedString = (finalHtml.match(/"/g) || []).length % 2 !== 0 || (finalHtml.match(/'/g) || []).length % 2 !== 0;
    const hasUnclosedTemplate = (finalHtml.match(/`/g) || []).length % 2 !== 0;
    console.log('[DEBUG] Clean HTML prepared - Length:', cleanHtmlLength);
    console.log('[DEBUG] Clean first 13 chars:', JSON.stringify(cleanHtmlFirst13));
    console.log('[DEBUG] Clean first 13 hex:', cleanHtmlFirst13Hex);
    console.log('[DEBUG] Has backtick:', cleanHtmlFirst13.includes('`'));
    console.log('[DEBUG] Has unclosed string:', hasUnclosedString);
    console.log('[DEBUG] Has unclosed template:', hasUnclosedTemplate);
    try {
      const http = require('http');
      const logData = JSON.stringify({location:'admin-panel.ts:2573',message:'Clean HTML prepared',data:{length:cleanHtmlLength,first100:cleanHtmlFirst100,last100:cleanHtmlLast100,first13:cleanHtmlFirst13,first13Hex:cleanHtmlFirst13Hex,hasBacktick:cleanHtmlFirst13.includes('`'),hasUnclosedString,hasUnclosedTemplate},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C,E'});
      const options = {hostname:'127.0.0.1',port:7247,path:'/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(logData)}};
      const reqLog = http.request(options,()=>{});reqLog.on('error',()=>{});reqLog.write(logData);reqLog.end();
    } catch(e) {}
    // #endregion
    console.log('HTML length:', finalHtml.length);
    console.log('HTML first 50 chars:', finalHtml.substring(0, 50));
    console.log('HTML last 50 chars:', finalHtml.substring(finalHtml.length - 50));
    // #region agent log
    console.log('[DEBUG] About to send HTML response - Length:', cleanHtmlLength);
    try {
      const http = require('http');
      const logData = JSON.stringify({location:'admin-panel.ts:2580',message:'About to send HTML response',data:{htmlLength:cleanHtmlLength,contentType:'text/html'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
      const options = {hostname:'127.0.0.1',port:7247,path:'/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(logData)}};
      const reqLog = http.request(options,()=>{});reqLog.on('error',()=>{});reqLog.write(logData);reqLog.end();
    } catch(e) {}
    // #endregion
    // Set proper content type - DO NOT set Content-Length manually, let Express handle it
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    // #region agent log
    const actualByteLength = Buffer.byteLength(finalHtml, 'utf8');
    console.log('[DEBUG] HTML string length:', finalHtml.length);
    console.log('[DEBUG] HTML UTF-8 byte length:', actualByteLength);
    console.log('[DEBUG] HTML ends with </html>:', finalHtml.endsWith('</html>'));
    const scriptTags = (finalHtml.match(/<script>/g) || []).length;
    const closeScriptTags = (finalHtml.match(/<\/script>/g) || []).length;
    console.log('[DEBUG] Script tags - open:', scriptTags, 'close:', closeScriptTags);
    // Check for any unclosed strings in the script content
    const scriptStart = finalHtml.indexOf('<script>');
    const scriptEnd = finalHtml.indexOf('</script>');
    if (scriptStart >= 0 && scriptEnd >= 0) {
      const scriptContent = finalHtml.substring(scriptStart + 8, scriptEnd);
      const singleQuotes = (scriptContent.match(/'/g) || []).length;
      const doubleQuotes = (scriptContent.match(/"/g) || []).length;
      console.log('[DEBUG] Script content quotes - single:', singleQuotes, 'double:', doubleQuotes);
      // Check for unmatched quotes (odd numbers indicate unclosed strings)
      if (singleQuotes % 2 !== 0) {
        console.warn('[DEBUG] WARNING: Odd number of single quotes in script - possible unclosed string!');
      }
      if (doubleQuotes % 2 !== 0) {
        console.warn('[DEBUG] WARNING: Odd number of double quotes in script - possible unclosed string!');
      }
      // Try to parse the script to check for syntax errors
      try {
        new Function(scriptContent);
        console.log('[DEBUG] Script syntax validation: PASSED');
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        const errorString = e instanceof Error ? e.toString() : String(e);
        console.error('[DEBUG] Script syntax validation: FAILED -', errorMessage);
        console.error('[DEBUG] Error at:', errorString);
      }
    }
    // #endregion
    // Validate HTML structure before sending
    const htmlLines = finalHtml.split('\n');
    console.log('[DEBUG] HTML total lines:', htmlLines.length);
    console.log('[DEBUG] First line (first 50 chars):', JSON.stringify(htmlLines[0].substring(0, 50)));
    console.log('[DEBUG] Last line (last 50 chars):', JSON.stringify(htmlLines[htmlLines.length - 1].substring(Math.max(0, htmlLines[htmlLines.length - 1].length - 50))));
    // Check if HTML starts correctly
    if (!finalHtml.startsWith('<!DOCTYPE')) {
      console.error('[DEBUG] ERROR: HTML does not start with <!DOCTYPE');
    }
    // Check if HTML ends correctly
    if (!finalHtml.endsWith('</html>')) {
      console.error('[DEBUG] ERROR: HTML does not end with </html>');
    }
    // Send HTML using res.send - Express will automatically set Content-Length correctly
    // #region agent log
    console.log('[DEBUG] About to send HTML - actual byte length:', Buffer.byteLength(finalHtml, 'utf8'));
    console.log('[DEBUG] First 20 bytes hex:', Buffer.from(finalHtml.substring(0, 20), 'utf8').toString('hex'));
    console.log('[DEBUG] Last 20 bytes hex:', Buffer.from(finalHtml.substring(Math.max(0, finalHtml.length - 20)), 'utf8').toString('hex'));
    // Check for BOM or invisible characters at the very start
    const firstChar = finalHtml[0];
    const firstCharCode = firstChar ? firstChar.charCodeAt(0) : -1;
    console.log('[DEBUG] First char:', JSON.stringify(firstChar), 'code:', firstCharCode, 'hex:', firstCharCode.toString(16));
    // Check if HTML starts with BOM (0xFEFF)
    if (firstCharCode === 0xFEFF) {
      console.error('[DEBUG] ERROR: HTML starts with BOM (Byte Order Mark)!');
    }
    // #endregion
    // Set explicit headers and send HTML directly to avoid any Express processing issues
    const htmlBuffer = Buffer.from(finalHtml, 'utf8');
    const contentLength = htmlBuffer.length;
    
    // #region agent log
    console.log('[DEBUG] Final HTML validation before sending:');
    console.log('[DEBUG] - Length:', finalHtml.length);
    console.log('[DEBUG] - UTF-8 byte length:', contentLength);
    console.log('[DEBUG] - Starts with:', JSON.stringify(finalHtml.substring(0, 20)));
    console.log('[DEBUG] - Ends with:', JSON.stringify(finalHtml.substring(Math.max(0, finalHtml.length - 20))));
    console.log('[DEBUG] - First 13 chars:', JSON.stringify(finalHtml.substring(0, 13)));
    console.log('[DEBUG] - First 13 hex:', Buffer.from(finalHtml.substring(0, 13), 'utf8').toString('hex'));
    // #endregion
    
    // Set headers BEFORE sending to ensure proper content type
    // CRITICAL: Set headers in correct order to prevent browser from treating HTML as JavaScript
    // Remove any existing Content-Type header first
    res.removeHeader('Content-Type');
    
    // Set headers BEFORE sending to ensure proper content type
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Validate and send HTML
    const trimmedHtml = finalHtml.trim();
    
    if (!trimmedHtml.startsWith('<!DOCTYPE html>')) {
        return res.status(500).send('HTML generation error: Invalid start');
    }
    if (!trimmedHtml.endsWith('</html>')) {
        return res.status(500).send('HTML generation error: Invalid end');
    }
    
    // CRITICAL: Ensure we're sending HTML, not JavaScript
    if (res.headersSent) {
        console.error('[ERROR] Headers already sent!');
        return;
    }
    
    // Use res.contentType() to set Content-Type - this is the Express way
    res.contentType('text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Use res.send() to let Express handle encoding and Content-Length
    res.send(trimmedHtml);
    // #region agent log
    console.log('[DEBUG] HTML response sent');
    try {
      const http = require('http');
      const logData = JSON.stringify({location:'admin-panel.ts:2726',message:'HTML response sent',data:{htmlLength:finalHtml.length,contentLength:contentLength},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'});
      const options = {hostname:'127.0.0.1',port:7247,path:'/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(logData)}};
      const reqLog = http.request(options,()=>{});reqLog.on('error',()=>{});reqLog.write(logData);reqLog.end();
    } catch(e) {}
    // #endregion
  } catch (error) {
    // #region agent log
    const errorDetails: Record<string, unknown> = error instanceof Error ? {message:error.message,stack:error.stack,name:error.name} : {toString:String(error)};
    console.error('[DEBUG] Error generating HTML:', errorDetails);
    try {
      const http = require('http');
      const logData = JSON.stringify({location:'admin-panel.ts:2584',message:'Error generating HTML',data:errorDetails,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'});
      const options = {hostname:'127.0.0.1',port:7247,path:'/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84',method:'POST',headers:{'Content-Type':'application/json','Content-Length':Buffer.byteLength(logData)}};
      const reqLog = http.request(options,()=>{});reqLog.on('error',()=>{});reqLog.write(logData);reqLog.end();
    } catch(e) {}
    // #endregion
    console.error('Error generating HTML:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).send('Error generating admin panel: ' + errorMessage);
  }
});

export default router;

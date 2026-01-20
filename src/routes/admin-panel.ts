import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    const location = 'admin-panel.ts:6';
    const message = 'Admin panel route handler called';
    const timestamp = Date.now();
    const data = {timestamp};
    const sessionId = 'debug-session';
    const runId = 'run1';
    const hypothesisId = 'A,B,C,D,E';
    const logData = JSON.stringify({location, message, data, timestamp, sessionId, runId, hypothesisId});
    const hostname = '127.0.0.1';
    const port = 7247;
    const path = '/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84';
    const method = 'POST';
    const contentTypeHeader = 'Content-Type';
    const contentTypeValue = 'application/json';
    const contentLengthHeader = 'Content-Length';
    const contentLengthValue = Buffer.byteLength(logData);
    const headers = {[contentTypeHeader]: contentTypeValue, [contentLengthHeader]: contentLengthValue};
    const options = {hostname, port, path, method, headers};
    const reqLog = http.request(options, () => {});
    reqLog.on('error', () => {});
    reqLog.write(logData);
    reqLog.end();
  } catch(e) {}
  // #endregion
  try {
    // 從外部檔案讀取 HTML 模板，避免 TypeScript 解析超長模板字串的問題
    const htmlTemplatePath = join(__dirname, '..', 'templates', 'admin-panel.html');
    const html = readFileSync(htmlTemplatePath, 'utf-8');
    // #region agent log
    const rawHtmlLength = html.length;
    const rawHtmlFirst100 = html.substring(0, 100);
    const rawHtmlLast100 = html.substring(Math.max(0, html.length - 100));
    const rawHtmlFirst13 = html.substring(0, 13);
    const rawHtmlFirst13Hex = Buffer.from(rawHtmlFirst13).toString('hex');
    console.log('[DEBUG] Raw HTML generated - Length:', rawHtmlLength);
    console.log('[DEBUG] First 13 chars:', JSON.stringify(rawHtmlFirst13));
    console.log('[DEBUG] First 13 hex:', rawHtmlFirst13Hex);
    const backtickCheck = '`';
    console.log('[DEBUG] Has backtick:', rawHtmlFirst13.includes(backtickCheck));
    try {
      const http = require('http');
      const backtickChar = '`';
      const location = 'admin-panel.ts:2571';
      const message = 'Raw HTML generated';
      const timestamp = Date.now();
      const sessionId = 'debug-session';
      const runId = 'run1';
      const hypothesisId = 'A,D';
      const data = {length:rawHtmlLength,first100:rawHtmlFirst100,last100:rawHtmlLast100,first13:rawHtmlFirst13,first13Hex:rawHtmlFirst13Hex,hasBacktick:rawHtmlFirst13.includes(backtickChar)};
      const logData = JSON.stringify({location, message, data, timestamp, sessionId, runId, hypothesisId});
      const hostname = '127.0.0.1';
      const port = 7247;
      const path = '/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84';
      const method = 'POST';
      const contentTypeHeader = 'Content-Type';
      const contentTypeValue = 'application/json';
      const contentLengthHeader = 'Content-Length';
      const contentLengthValue = Buffer.byteLength(logData);
      const headers = {[contentTypeHeader]: contentTypeValue, [contentLengthHeader]: contentLengthValue};
      const options = {hostname, port, path, method, headers};
      const reqLog = http.request(options, () => {});
      reqLog.on('error', () => {});
      reqLog.write(logData);
      reqLog.end();
    } catch(e) {}
    // #endregion
    // Remove leading backtick and newline if present, and trailing whitespace
    const backtickChar3 = '`';
    const cleanHtml = html.trimStart().startsWith(backtickChar3) ? html.trimStart().substring(1).trimStart() : html.trimStart();
    // Ensure cleanHtml ends with </html> without trailing whitespace
    const finalHtml = cleanHtml.trimEnd();
    // #region agent log
    console.log('[DEBUG] After trimEnd - finalHtml length:', finalHtml.length);
    const htmlEndCheck2 = '</html>';
    console.log('[DEBUG] finalHtml ends with </html>:', finalHtml.endsWith(htmlEndCheck2));
    console.log('[DEBUG] finalHtml last 30 chars:', JSON.stringify(finalHtml.substring(Math.max(0, finalHtml.length - 30))));
    console.log('[DEBUG] finalHtml last 20 bytes hex:', Buffer.from(finalHtml.substring(Math.max(0, finalHtml.length - 20)), 'utf8').toString('hex'));
    // #endregion
    // #region agent log
    const cleanHtmlLength = finalHtml.length;
    const cleanHtmlFirst100 = finalHtml.substring(0, 100);
    const cleanHtmlLast100 = finalHtml.substring(Math.max(0, finalHtml.length - 100));
    const cleanHtmlFirst13 = finalHtml.substring(0, 13);
    const cleanHtmlFirst13Hex = Buffer.from(cleanHtmlFirst13).toString('hex');
    const doubleQuoteRegex = /"/g;
    const singleQuoteRegex = /'/g;
    const hasUnclosedString = (finalHtml.match(doubleQuoteRegex) || []).length % 2 !== 0 || (finalHtml.match(singleQuoteRegex) || []).length % 2 !== 0;
    const backtickRegex = /`/g;
    const hasUnclosedTemplate = (finalHtml.match(backtickRegex) || []).length % 2 !== 0;
    console.log('[DEBUG] Clean HTML prepared - Length:', cleanHtmlLength);
    console.log('[DEBUG] Clean first 13 chars:', JSON.stringify(cleanHtmlFirst13));
    console.log('[DEBUG] Clean first 13 hex:', cleanHtmlFirst13Hex);
    const backtickCheck2 = '`';
    console.log('[DEBUG] Has backtick:', cleanHtmlFirst13.includes(backtickCheck2));
    console.log('[DEBUG] Has unclosed string:', hasUnclosedString);
    console.log('[DEBUG] Has unclosed template:', hasUnclosedTemplate);
    try {
      const http = require('http');
      const backtickChar2 = '`';
      const location = 'admin-panel.ts:2573';
      const message = 'Clean HTML prepared';
      const timestamp = Date.now();
      const sessionId = 'debug-session';
      const runId = 'run1';
      const hypothesisId = 'A,C,E';
      const data = {length:cleanHtmlLength,first100:cleanHtmlFirst100,last100:cleanHtmlLast100,first13:cleanHtmlFirst13,first13Hex:cleanHtmlFirst13Hex,hasBacktick:cleanHtmlFirst13.includes(backtickChar2),hasUnclosedString,hasUnclosedTemplate};
      const logData = JSON.stringify({location, message, data, timestamp, sessionId, runId, hypothesisId});
      const hostname = '127.0.0.1';
      const port = 7247;
      const path = '/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84';
      const method = 'POST';
      const contentTypeHeader = 'Content-Type';
      const contentTypeValue = 'application/json';
      const contentLengthHeader = 'Content-Length';
      const contentLengthValue = Buffer.byteLength(logData);
      const headers = {[contentTypeHeader]: contentTypeValue, [contentLengthHeader]: contentLengthValue};
      const options = {hostname, port, path, method, headers};
      const reqLog = http.request(options, () => {});
      reqLog.on('error', () => {});
      reqLog.write(logData);
      reqLog.end();
    } catch(e) {}
    // #endregion
    console.log('HTML length:', finalHtml.length);
    console.log('HTML first 50 chars:', finalHtml.substring(0, 50));
    console.log('HTML last 50 chars:', finalHtml.substring(finalHtml.length - 50));
    // #region agent log
    console.log('[DEBUG] About to send HTML response - Length:', cleanHtmlLength);
    try {
      const http = require('http');
      const location = 'admin-panel.ts:2580';
      const message = 'About to send HTML response';
      const timestamp = Date.now();
      const sessionId = 'debug-session';
      const runId = 'run1';
      const hypothesisId = 'B';
      const data = {htmlLength:cleanHtmlLength,contentType:'text/html'};
      const logData = JSON.stringify({location, message, data, timestamp, sessionId, runId, hypothesisId});
      const hostname = '127.0.0.1';
      const port = 7247;
      const path = '/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84';
      const method = 'POST';
      const contentTypeHeader = 'Content-Type';
      const contentTypeValue = 'application/json';
      const contentLengthHeader = 'Content-Length';
      const contentLengthValue = Buffer.byteLength(logData);
      const headers = {[contentTypeHeader]: contentTypeValue, [contentLengthHeader]: contentLengthValue};
      const options = {hostname, port, path, method, headers};
      const reqLog = http.request(options, () => {});
      reqLog.on('error', () => {});
      reqLog.write(logData);
      reqLog.end();
    } catch(e) {}
    // #endregion
    // Set proper content type - DO NOT set Content-Length manually, let Express handle it
    const contentTypeHeader = 'Content-Type';
    const contentTypeValue = 'text/html; charset=utf-8';
    res.setHeader(contentTypeHeader, contentTypeValue);
    // #region agent log
    const actualByteLength = Buffer.byteLength(finalHtml, 'utf8');
    console.log('[DEBUG] HTML string length:', finalHtml.length);
    console.log('[DEBUG] HTML UTF-8 byte length:', actualByteLength);
    const htmlEndCheck3 = '</html>';
    console.log('[DEBUG] HTML ends with </html>:', finalHtml.endsWith(htmlEndCheck3));
    const scriptTagRegex = /<script>/g;
    const closeScriptTagRegex = /<\/script>/g;
    const scriptTags = (finalHtml.match(scriptTagRegex) || []).length;
    const closeScriptTags = (finalHtml.match(closeScriptTagRegex) || []).length;
    console.log('[DEBUG] Script tags - open:', scriptTags, 'close:', closeScriptTags);
    // Check for any unclosed strings in the script content
    const scriptStartTag = '<script>';
    const scriptEndTag = '</script>';
    const scriptStart = finalHtml.indexOf(scriptStartTag);
    const scriptEnd = finalHtml.indexOf(scriptEndTag);
    if (scriptStart >= 0 && scriptEnd >= 0) {
      const scriptContent = finalHtml.substring(scriptStart + 8, scriptEnd);
      const singleQuoteRegex2 = /'/g;
      const doubleQuoteRegex2 = /"/g;
      const singleQuotes = (scriptContent.match(singleQuoteRegex2) || []).length;
      const doubleQuotes = (scriptContent.match(doubleQuoteRegex2) || []).length;
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
    const doctypeCheck = '<!DOCTYPE';
    if (!finalHtml.startsWith(doctypeCheck)) {
      console.error('[DEBUG] ERROR: HTML does not start with <!DOCTYPE');
    }
    // Check if HTML ends correctly
    const htmlEndCheck = '</html>';
    if (!finalHtml.endsWith(htmlEndCheck)) {
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
    const contentTypeHeader3 = 'Content-Type';
    res.removeHeader(contentTypeHeader3);
    
    // Set headers BEFORE sending to ensure proper content type
    const contentTypeHeader2 = 'Content-Type';
    const contentTypeValue2 = 'text/html; charset=utf-8';
    res.setHeader(contentTypeHeader2, contentTypeValue2);
    const cacheControlHeader2 = 'Cache-Control';
    const cacheControlValue2 = 'no-cache, no-store, must-revalidate, max-age=0';
    res.setHeader(cacheControlHeader2, cacheControlValue2);
    const pragmaHeader2 = 'Pragma';
    const pragmaValue2 = 'no-cache';
    res.setHeader(pragmaHeader2, pragmaValue2);
    const expiresHeader2 = 'Expires';
    const expiresValue2 = '0';
    res.setHeader(expiresHeader2, expiresValue2);
    const xContentTypeHeader2 = 'X-Content-Type-Options';
    const xContentTypeValue2 = 'nosniff';
    res.setHeader(xContentTypeHeader2, xContentTypeValue2);
    
    // Validate and send HTML
    const trimmedHtml = finalHtml.trim();
    
    const doctypeStart = '<!DOCTYPE html>';
    if (!trimmedHtml.startsWith(doctypeStart)) {
        return res.status(500).send('HTML generation error: Invalid start');
    }
    const htmlEnd = '</html>';
    if (!trimmedHtml.endsWith(htmlEnd)) {
        return res.status(500).send('HTML generation error: Invalid end');
    }
    
    // CRITICAL: Ensure we're sending HTML, not JavaScript
    if (res.headersSent) {
        const errorMsg1 = '[ERROR] Headers already sent!';
        console.error(errorMsg1);
        const errorMsg2 = 'Headers already sent';
        return res.status(500).send(errorMsg2);
    }
    
    // Use res.contentType() to set Content-Type - this is the Express way
    const contentType = 'text/html; charset=utf-8';
    res.contentType(contentType);
    const cacheControlHeader = 'Cache-Control';
    const cacheControlValue = 'no-cache, no-store, must-revalidate, max-age=0';
    res.setHeader(cacheControlHeader, cacheControlValue);
    const pragmaHeader = 'Pragma';
    const pragmaValue = 'no-cache';
    res.setHeader(pragmaHeader, pragmaValue);
    const expiresHeader = 'Expires';
    const expiresValue = '0';
    res.setHeader(expiresHeader, expiresValue);
    const xContentTypeHeader = 'X-Content-Type-Options';
    const xContentTypeValue = 'nosniff';
    res.setHeader(xContentTypeHeader, xContentTypeValue);
    
    // Use res.send() to let Express handle encoding and Content-Length
    res.send(trimmedHtml);
    // #region agent log
    console.log('[DEBUG] HTML response sent');
    try {
      const http = require('http');
      const location = 'admin-panel.ts:2726';
      const message = 'HTML response sent';
      const timestamp = Date.now();
      const sessionId = 'debug-session';
      const runId = 'run1';
      const hypothesisId = 'B';
      const data = {htmlLength:finalHtml.length,contentLength:contentLength};
      const logData = JSON.stringify({location, message, data, timestamp, sessionId, runId, hypothesisId});
      const hostname = '127.0.0.1';
      const port = 7247;
      const path = '/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84';
      const method = 'POST';
      const contentTypeHeader = 'Content-Type';
      const contentTypeValue = 'application/json';
      const contentLengthHeader = 'Content-Length';
      const contentLengthValue = Buffer.byteLength(logData);
      const headers = {[contentTypeHeader]: contentTypeValue, [contentLengthHeader]: contentLengthValue};
      const options = {hostname, port, path, method, headers};
      const reqLog = http.request(options, () => {});
      reqLog.on('error', () => {});
      reqLog.write(logData);
      reqLog.end();
    } catch(e) {}
    // #endregion
  } catch (error) {
    // #region agent log
    const errorDetails: Record<string, unknown> = error instanceof Error ? {message:error.message,stack:error.stack,name:error.name} : {toString:String(error)};
    console.error('[DEBUG] Error generating HTML:', errorDetails);
    try {
      const http = require('http');
      const location = 'admin-panel.ts:2584';
      const message = 'Error generating HTML';
      const timestamp = Date.now();
      const sessionId = 'debug-session';
      const runId = 'run1';
      const hypothesisId = 'E';
      const data = errorDetails;
      const logData = JSON.stringify({location, message, data, timestamp, sessionId, runId, hypothesisId});
      const hostname = '127.0.0.1';
      const port = 7247;
      const path = '/ingest/df99b3ce-2254-49ab-bc06-36ea663efb84';
      const method = 'POST';
      const contentTypeHeader = 'Content-Type';
      const contentTypeValue = 'application/json';
      const contentLengthHeader = 'Content-Length';
      const contentLengthValue = Buffer.byteLength(logData);
      const headers = {[contentTypeHeader]: contentTypeValue, [contentLengthHeader]: contentLengthValue};
      const options = {hostname, port, path, method, headers};
      const reqLog = http.request(options, () => {});
      reqLog.on('error', () => {});
      reqLog.write(logData);
      reqLog.end();
    } catch(e) {}
    // #endregion
    console.error('Error generating HTML:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    res.status(500).send('Error generating admin panel: ' + errorMessage);
  }
});

export default router;

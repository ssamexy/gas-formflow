# GAS FormFlow 小白部署教學

## 安全提醒

建議自行部署自己的 Web App。不要直接使用陌生人部署好的 Web App URL。若使用別人部署的 Web App，表單與 Sheet 可能建立在對方 Google 帳號底下。自行部署後，表單與資料會留在自己的 Google 帳號底下。

第一次授權時，Google 可能會顯示未驗證應用程式。因為這是使用者自己建立的 Apps Script 專案。請確認程式碼來自自己信任的 repo 後再繼續授權。

## 步驟

1. 打開 Google Apps Script。
2. 建立新專案。
3. 將專案名稱改成 GAS FormFlow。
4. 打開 `dist/Code.gs`。
5. 複製全部內容。
6. 回到 Apps Script，貼到 `Code.gs`。
7. 新增 HTML 檔案，命名為 `Index`。
8. 打開 `dist/Index.html`。
9. 複製全部內容。
10. 貼到 Apps Script 的 `Index.html`。
11. 儲存專案。
12. 在 Apps Script 上方選擇 `setup` 或 `doGet` 測試函式。
13. 執行一次，完成 Google 授權。
14. 點選「部署」→「新增部署作業」。
15. 類型選擇「網頁應用程式」。
16. 執行身分選擇「我」。
17. 存取權依需求選擇：
    - 只有我自己
    - 擁有連結的任何人
18. 完成部署後，複製 Web App URL。
19. 之後手機打開這個 URL，即可貼 JSON 產生表單。

## 使用方式

1. 在手機或電腦打開你的 Web App URL。
2. 貼上 AI 產生的 JSON，或載入內建範例。
3. 按「驗證」確認 JSON 可用。
4. 按「預覽」檢查表單與 Sheet 結構。
5. 按「建立表單」。
6. 複製填寫連結、公告文案，並視需要使用 QR placeholder。

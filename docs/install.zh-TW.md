# GAS FormFlow 快速安裝

完成一次設定後，就能從手機或電腦開啟自己的 FormFlow Web App。

預估時間：第一次約 10 分鐘。

## 安裝前先確認

- 請使用你準備存放表單與回應資料的 Google 帳號。
- 請建立並部署自己的 Apps Script 專案。
- 部署時，存取權固定選「只有我自己」。
- 不要使用陌生人提供的 Web App URL，也不要把自己的 Web App URL 公開分享。

## 第一步：建立 Apps Script 專案

1. 開啟 [Google Apps Script](https://script.google.com/)。
2. 按「新增專案」。
3. 將專案名稱改成 `GAS FormFlow`。

這是一個獨立的 Apps Script 專案，不需要先建立或綁定 Google Sheet。

## 第二步：貼入兩個檔案

### Code.gs

1. 開啟 repo 的 [dist/Code.gs](../dist/Code.gs)。
2. 複製全部內容。
3. 回到 Apps Script，打開預設的 `Code.gs`。
4. 刪除原有內容並貼上。

### Index.html

1. 在 Apps Script 左側「檔案」旁按「＋」。
2. 選擇「HTML」。
3. 檔名輸入 `Index`。
4. 開啟 repo 的 [dist/Index.html](../dist/Index.html)。
5. 複製全部內容並貼到 `Index.html`。
6. 按「儲存專案」。

請確認檔名是 `Index.html`，大小寫一致。

## 第三步：完成 Google 授權

1. 在 Apps Script 上方的函式選單選擇 `setup`。
2. 按「執行」。
3. 選擇自己的 Google 帳號並完成授權。
4. 確認畫面中的專案名稱是你剛建立的 `GAS FormFlow`。

Google 可能顯示「Google 尚未驗證這個應用程式」。這是因為程式是你在自己帳號建立的私人 Apps Script 專案。請先確認專案名稱、帳號與程式來源，再決定是否繼續。

GAS FormFlow 需要以下能力：

- 建立與設定 Google Forms。
- 建立 Google Sheets 與統計分頁。
- 儲存使用者自行提供的 AI API Key 與模型設定。
- 使用外部 HTTPS 連線呼叫使用者選擇的 Gemini 或 Groq。

詳細說明請看 [安全、資料與權限](../SECURITY.md)。

## 第四步：部署成私人 Web App

1. 右上角按「部署」。
2. 選擇「新增部署作業」。
3. 類型選擇「網頁應用程式」。
4. 說明可填 `GAS FormFlow`。
5. 「執行身分」選擇「我」。
6. 「誰可以存取」選擇「只有我自己」。
7. 按「部署」。
8. 複製 Web App URL。

安全設定必須是：

| 設定 | 正確選項 |
|---|---|
| 執行身分 | 我 |
| 誰可以存取 | 只有我自己 |

請勿選擇「任何人」或「擁有連結的任何人」。公開部署可能讓其他人透過你的帳號建立 Form、Sheet，並消耗你的 AI API 額度。

## 第五步：確認安裝成功

1. 用同一個 Google 帳號開啟 Web App URL。
2. 確認看到 GAS FormFlow 主畫面。
3. 先載入內建範例。
4. 按「更新右側預覽」。
5. 確認表單預覽正常。

第一次測試可以先不設定 AI API Key。載入內建範例即可驗證表單預覽與基本流程。

真正按下「建立表單」後，系統才會在你的 Google Drive 建立一份 Form 與一份回應 Sheet。

## 選用：設定 AI

- [Gemini API 設定指南](ai-gemini.zh-TW.md)
- [Groq API 與 ZDR 設定指南](ai-groq.zh-TW.md)

API Key 儲存在你的 Apps Script Properties。若只想使用 ChatGPT、Gemini 網頁版或其他 AI 產生 JSON，可以跳過這一步。

## 更新版本

更新程式時：

1. 重新複製新版 `dist/Code.gs` 與 `dist/Index.html`。
2. 覆蓋 Apps Script 內的兩個檔案。
3. 儲存並重新執行 `setup`；若權限有變更，Google 會要求重新授權。
4. 到「部署」→「管理部署作業」。
5. 編輯原本的 Web App，選擇「建立新版本」後部署。

沿用原本 deployment，可盡量維持相同的 Web App URL。

## 常見問題

### 開啟 URL 後顯示沒有權限

確認瀏覽器登入的是部署 Web App 的同一個 Google 帳號。

### 更新程式後畫面沒有變

Apps Script Web App 使用版本化部署。請到「管理部署作業」建立新版本，單純儲存程式碼不會更新既有 Web App。

### 可以把 Web App URL 給同事嗎？

目前小白版設計為單一管理者私人使用。同事只需要取得最後建立好的 Google Form 填寫連結，不需要取得 FormFlow Web App URL。

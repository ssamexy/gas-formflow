# GAS FormFlow

用自己的 Google 帳號部署一套私有、免費、AI-ready 的表單工作流。

設定一次後，即可在手機或電腦與 AI 討論表單、預覽內容，並建立 Google Form、回應 Sheet、統計頁、公告文案與可掃描 QR code。產生的 Form 與 Sheet 都留在你的 Google Drive。

## 10 分鐘快速安裝

GAS FormFlow 使用獨立的 Google Apps Script Web App，不需要綁定既有 Sheet。

1. 開啟 [Google Apps Script](https://script.google.com/) 並建立新專案。
2. 將 [dist/Code.gs](dist/Code.gs) 全部複製到專案的 `Code.gs`。
3. 新增 HTML 檔案 `Index`，將 [dist/Index.html](dist/Index.html) 全部貼入。
4. 儲存後執行一次 `setup`，使用自己的 Google 帳號完成授權。
5. 點「部署」→「新增部署作業」→「網頁應用程式」。
6. 執行身分選「我」；存取權固定選「只有我自己」。
7. 開啟部署完成後取得的 Web App URL，即可開始使用。

請勿把存取權設成「任何人」或「擁有連結的任何人」。這個 Web App 能以部署者身分建立 Form、Sheet，並可能使用部署者儲存的 AI API Key。

完整圖文步驟：

- [繁體中文安裝教學](docs/install.zh-TW.md)
- [English installation guide](docs/install.en.md)
- [安全、資料與權限說明](SECURITY.md)

## 使用流程

1. 選擇性設定自己的 Gemini 或 Groq API Key。
2. 用白話描述活動、調查或報名需求。
3. 與 AI 確認表單雛型。
4. 核准並轉成 FormFlow JSON。
5. 預覽後建立 Form、Sheet、QR code 與公告文案。

不想設定 API Key，也可以貼入其他 AI 產生的 FormFlow JSON，或直接載入內建範例。

## 適合用途

- 活動與課程報名
- 出席、意願與志工調查
- 小組、家庭、人數與房型統計
- 滿意度與活動回饋

目前不支援檔案上傳、複雜跳題、正式考試測驗、大型問卷平台與高度客製視覺表單。遇到少數特殊題型，可先建立基本表單，再到 Google Forms 後台微調。

## AI 與隱私

- Form、Sheet 與 API Key 都由使用者自己的 Apps Script 專案管理。
- API Key 儲存在 Script Properties，不會回傳到主畫面或寫入 log。
- 只有使用 AI 功能時，表單討論內容才會送到使用者選擇的 Gemini 或 Groq。
- QR code 在瀏覽器內產生，表單網址不會送到外部 QR 服務。

設定方式：

- [Gemini API 繁體中文指南](docs/ai-gemini.zh-TW.md)
- [Groq API 與 ZDR 繁體中文指南](docs/ai-groq.zh-TW.md)
- [Gemini API English guide](docs/ai-gemini.en.md)
- [Groq API and ZDR English guide](docs/ai-groq.en.md)

## 開發者

`src/` 是模組化原始碼；`dist/` 是提供一般使用者複製的雙檔版本。

```bash
npm run check
```

進階部署、clasp、private/agent build 與 smoke test 請見：

- [Deployment Modes](docs/deployment-modes.md)
- [Agent Validation Guide](docs/agent-validation.md)
- [Schema v1](docs/schema-v1.md)

## 授權

MIT

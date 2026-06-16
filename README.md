# GAS FormFlow

用 Google Forms + Google Apps Script 打造私有化、免費、AI-ready 的表單工作流。

只需設定一次，之後即可在手機上貼入 AI 產生的 JSON，一鍵建立 Google Form、回應 Sheet、QR code placeholder、公告文案與基本統計骨架。

## 適合用途

- 活動報名
- 意願調查
- 出席統計
- 志工支援調查
- 小組 / 區域統計
- 課程報名
- 滿意度回饋
- 家庭 / 房型 / 人數統計

## 不適合用途

- 檔案上傳表單
- 複雜跳題問卷
- 正式考試測驗
- 大型問卷平台
- 高度客製視覺表單

## 安全提醒

建議自行部署自己的 Web App。不要直接使用陌生人部署好的 Web App。若使用別人的 Web App，表單與 Sheet 可能建立在對方 Google 帳號底下。自行部署後，表單與 Sheet 會建立在自己的 Google 帳號底下。

第一次授權時，Google 可能會顯示未驗證應用程式。這是因為你正在執行自己建立的 Apps Script 專案。請確認程式碼來自你信任的 repo 後再繼續授權。

## 小白安裝教學

完整教學：

- [繁體中文部署方法](docs/install.zh-TW.md)
- [English installation guide](docs/install.en.md)

簡短版：

1. 打開 Google Apps Script。
2. 建立新專案，命名為 GAS FormFlow。
3. 複製 `dist/Code.gs` 全部內容到 Apps Script 的 `Code.gs`。
4. 新增 HTML 檔案 `Index`。
5. 複製 `dist/Index.html` 全部內容到 Apps Script 的 `Index.html`。
6. 儲存專案。
7. 執行一次 `setup` 或 `doGet`，完成 Google 授權。
8. 部署為 Web App，執行身分選「我」。
9. 用手機打開 Web App URL，貼上 JSON 後建立表單。

## Beginner Installation

Full guide:

- [Traditional Chinese installation guide](docs/install.zh-TW.md)
- [English installation guide](docs/install.en.md)

Short version:

1. Open Google Apps Script.
2. Create a new project named GAS FormFlow.
3. Copy all content from `dist/Code.gs` into Apps Script `Code.gs`.
4. Create an HTML file named `Index`.
5. Copy all content from `dist/Index.html` into Apps Script `Index.html`.
6. Save the project.
7. Run `setup` or `doGet` once and complete Google authorization.
8. Deploy as a Web App, executing as Me.
9. Open the Web App URL on your phone, paste JSON, and create forms.

## 進階部署：clasp

```bash
git clone https://github.com/ssamexy/gas-formflow.git
cd gas-formflow
npm install -g @google/clasp
clasp login
clasp create --type standalone --title "GAS FormFlow"
clasp push
```

接著打開 Apps Script 專案，部署為 Web App。

若要綁定既有專案：

```bash
clasp clone <scriptId>
clasp push
```

## Repo 結構

```text
src/       多檔案開發版
dist/      小白複製版，只需要 Code.gs 與 Index.html
examples/  範例 JSON
docs/      schema、prompt、部署教學
tools/     本地打包與驗證腳本
```

## v1 功能

- JSON 輸入、範例載入、驗證與預覽
- 建立 Google Form
- 建立 Google Sheet 並設定 Form response destination
- 建立 `Clean_Data`、`Question_Meta`、`Summary`、`Announcement`、`Generator_Log` 分頁
- 產生可複製的 LINE / 通訊軟體公告文案
- 顯示填寫連結、編輯連結、Sheet 連結與建立時間
- 預留 i18n 結構

## QR code 狀態

v1 目前提供 QR provider 架構與可下載 SVG placeholder，不依賴外部 QR API，也不使用已淘汰的 Google Image Charts API。完整離線 QR 編碼器列為 v1.1 工作項。

## v1 不支援

- 檔案上傳題
- 圖片題
- 影片題
- 完整測驗模式、答案、配分
- 複雜跳題邏輯
- 表單主題樣式設定
- 不保證支援超大型問卷

遇到不支援題型時，請先產生基本表單後，到 Google Forms 後台手動微調。

## ChatGPT Prompt

```text
請根據我的需求，產生符合 GAS FormFlow v1 schema 的 JSON。

規則：
1. 只輸出 JSON，不要加 markdown code block。
2. schemaVersion 固定為 "1.0"。
3. 每題都要有 key、type、title。
4. 題型只可使用 shortText、paragraph、multipleChoice、checkbox、dropdown、date、time、scale、sectionHeader、pageBreak、grid、checkboxGrid。
5. multipleChoice、checkbox、dropdown 必須提供 options array。
6. 若題目需要統計，請加上 analysis。
7. 不要使用檔案上傳、圖片、影片、測驗、跳題邏輯。
8. JSON 必須可被 JSON.parse() 解析，不可有註解，不可有 trailing comma。
9. 使用繁體中文。

我的表單需求如下：
【貼上需求】
```

## 本地檢查

```bash
npm run check
```

這會重建 `dist/`，並檢查必要檔案、範例 JSON、支援題型與主要 GAS entry points。

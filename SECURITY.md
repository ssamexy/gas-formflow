# GAS FormFlow 安全、資料與權限

**最後更新 / Last updated:** 2026-07-16

## 資料放在哪裡

自行部署後：

- GAS FormFlow 程式位於使用者自己的 Google Apps Script 專案。
- 建立的 Google Form 與回應 Sheet 位於使用者自己的 Google Drive。
- Gemini 或 Groq API Key 儲存在該專案的 Script Properties。
- FormFlow 專案作者沒有後台可以查看使用者的表單、回應或 API Key。

## AI 資料流

只有使用者主動使用 AI 討論或 JSON 產生功能時，相關內容才會送到選擇的 AI provider：

- Google Gemini：依使用者自己的 Gemini API 帳號與政策處理。
- Groq：依使用者自己的 Groq 帳號、模型與資料設定處理。
- 不設定 API Key：FormFlow 不會自行把表單內容送到 AI 服務。

AI 對話保留在目前瀏覽器分頁的前端狀態，不寫入 Script Properties。API Key 不會回傳到前端、不會寫入 log，也不會放在請求 URL。

## Google 權限

| OAuth scope | 功能 |
|---|---|
| `forms` | 建立與設定 Google Forms |
| `spreadsheets` | 建立回應 Sheet、統計與公告分頁 |
| `script.storage` | 儲存 AI API Key、模型與私人設定 |
| `script.external_request` | 連線到使用者選擇的 Gemini 或 Groq API |

GAS FormFlow 不要求完整 Google Drive scope，也不會掃描使用者 Drive 中的其他檔案。

## 安全部署基線

一般使用者應使用：

| 設定 | 值 |
|---|---|
| 專案類型 | Standalone Apps Script |
| 執行身分 | 我 |
| Web App 存取權 | 只有我自己 |
| API Key | 使用者自己的 Key |
| Web App URL | 不公開分享 |

請把最後建立完成的 Google Form 填寫連結分享給受訪者，不要分享 FormFlow Web App URL。

## 撤銷與移除

停止使用時可以：

1. 在 Apps Script 的「部署」→「管理部署作業」封存 Web App deployment。
2. 刪除 Apps Script 專案，以移除其中的 Script Properties 與 API Key。
3. 到 Google 帳號的第三方應用程式與服務連線頁面撤銷授權。
4. 個別保留或刪除已建立的 Form 與 Sheet。

刪除 FormFlow 專案不會自動刪除先前建立的 Form 與 Sheet。

## 回報安全問題

請避免在公開 issue 貼出 API Key、deployment ID、Script ID、Form 編輯連結或含個資的 Sheet。安全問題可透過 GitHub repository owner 的私人聯絡方式回報。

---

# GAS FormFlow Security, Data, and Permissions

## Where your data is stored

After you deploy your own copy:

- The GAS FormFlow code runs in your own Google Apps Script project.
- Generated Google Forms and response Sheets are stored in your own Google Drive.
- Gemini or Groq API Keys are stored in that project's Script Properties.
- The FormFlow project author has no backend access to your Forms, responses, or API Keys.

## AI data flow

Form content is sent to an AI provider only when you actively use AI discussion or JSON generation:

- Google Gemini processes it under your own Gemini API account and policies.
- Groq processes it under your own Groq account, model, and data settings.
- Without an API Key, FormFlow does not send form content to an AI service.

AI conversation history remains in the current browser tab's frontend state and is not written to Script Properties. API Keys are not returned to the frontend, written to logs, or placed in request URLs.

## Google permissions

| OAuth scope | Purpose |
|---|---|
| `forms` | Create and configure Google Forms |
| `spreadsheets` | Create response Sheets, statistics, and announcement tabs |
| `script.storage` | Store AI API Keys, model selections, and private settings |
| `script.external_request` | Connect to the Gemini or Groq API selected by the user |

GAS FormFlow does not request the full Google Drive scope and does not scan unrelated files in your Drive.

## Secure deployment baseline

Beginner installations should use:

| Setting | Required value |
|---|---|
| Project type | Standalone Apps Script |
| Execute as | Me |
| Who has access | Only myself |
| API Key | Your own Key |
| Web App URL | Keep private |

Share the generated Google Form response URL with respondents. Do not share the FormFlow Web App URL.

## Revoke access and remove data

When you stop using FormFlow, you can:

1. Archive the Web App deployment under Apps Script's Deploy > Manage deployments.
2. Delete the Apps Script project to remove its Script Properties and stored API Keys.
3. Revoke authorization from your Google Account's third-party apps and services connections page.
4. Keep or delete previously generated Forms and Sheets individually.

Deleting the FormFlow Apps Script project does not automatically delete Forms or Sheets it created earlier.

## Report a security issue

Do not post API Keys, deployment IDs, Script IDs, Form edit links, or Sheets containing personal data in a public issue. Report security issues through a private contact method provided by the GitHub repository owner.

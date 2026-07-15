# Google Gemini API（v2）

**Last updated:** 2026-07-15

GAS FormFlow v2 可使用自己的 Gemini API Key，從自然語言需求產生通過 FormFlow schema v1 驗證的 JSON。

## 設定

1. 到 [Google AI Studio](https://aistudio.google.com/apikey) 建立 Gemini API Key。
2. 開啟自己部署的 GAS FormFlow private Web App。
3. 在「AI 產生 JSON（v2）」貼上 Key。
4. 按「偵測支援模型」。系統會呼叫 Google `models.list`，只顯示支援 `generateContent` 的模型。
5. 選擇模型後按「儲存 Key 與模型」。
6. 輸入表單需求，按「AI 產生 JSON」。生成內容通過既有 schema 驗證後會放入主 JSON 編輯區。

模型清單代表該 Key 目前可見且支援內容生成的模型，不代表每個模型都保證有免費額度。免費額度、地區限制與模型供應由 Google 決定，可能隨時調整。

## Key 安全

- Key 儲存在你自己的 Apps Script `ScriptProperties`，屬性名稱為 `FORMFLOW_AI_GOOGLE_API_KEY`。
- Web App 只回傳 `hasApiKey` 狀態，不會把 Key 或 Key 尾碼讀回前端。
- Gemini 請求以 `x-goog-api-key` header 傳送，不把 Key 放在 URL。
- 儲存成功後，瀏覽器中的密碼欄位會清空。
- 「清除 AI 設定」會刪除已儲存的 Key 與模型。
- 公開 `agent` 驗證模式會停用所有 AI Key、模型與生成 API。日常使用請維持 `private` 模式。

更新到 v2 後，Apps Script 會要求新增 `script.external_request` 權限，供 `UrlFetchApp` 連線至 Google Gemini API。

## 更換 Key 或模型

貼上新 Key後重新偵測模型，再選擇並儲存即可覆蓋舊設定。若只更換模型，可將 Key 留空，系統會使用已儲存的 Key 驗證新模型。

## 常見錯誤

- Key 無效或權限不足：回到 Google AI Studio 檢查 Key 與 Gemini API 狀態。
- 額度用完或請求過快：稍後重試，或查看 Google 提供的 quota。
- 產生 JSON 未通過驗證：原始內容仍會放入 JSON 編輯區，可手動修正或調整需求後重試。
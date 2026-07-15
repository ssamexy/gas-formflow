# Google Gemini API（v2）

**Last updated:** 2026-07-15

GAS FormFlow v2 可使用自己的 Gemini API Key，先和 AI 逐步討論表單，再由使用者核准白話文雛型並轉成 FormFlow JSON。

## 設定與操作

1. 到 [Google AI Studio](https://aistudio.google.com/apikey) 建立 Gemini API Key。
2. 開啟自己部署的 GAS FormFlow private Web App，選擇 Google Gemini API。
3. 在遮罩密碼欄輸入 Key，按「安全儲存 Key」。驗證成功後輸入欄會清空，不會回填明碼。
4. 按「偵測支援模型」，選擇適合的文字模型，再按「儲存所選模型」。
5. 在 AI 討論區描述用途、填寫對象與問題；AI 會提問並持續整理「目前表單雛型」，不會直接寫入 JSON。
6. 確認白話文雛型後，按「我同意雛型，轉成 JSON」並再次確認。
7. 通過 schema 驗證的結果會寫入下方獨立 JSON 編輯區，並更新右側預覽。你也可以直接貼入其他 AI 產生的 JSON。

對話只保留在目前瀏覽器分頁的記憶體中，重新整理或重開討論就會清除。送出訊息時，為維持上下文，當前對話內容會傳給所選 provider。

模型清單只顯示目前 Key 可見、支援 `generateContent` 且適合文字表單設計的模型，不保證每個模型都有免費額度。免費額度、地區限制與模型供應由 Google 決定。

## Key 安全

- Key 儲存在你自己的 Apps Script `ScriptProperties`，屬性名稱為 `FORMFLOW_AI_GOOGLE_API_KEY`。
- Web App 只回傳 `hasApiKey` 狀態，不會把 Key 或尾碼讀回前端。
- Gemini 請求以 `x-goog-api-key` header 傳送，不把 Key 放在 URL。
- 「清除 AI 設定」會刪除已儲存的 Key 與模型。
- 公開 `agent` 驗證模式會停用所有 AI API；日常使用請維持 `private` 模式。

更新到 v2 後，Apps Script 會要求 `script.external_request` 權限，供 `UrlFetchApp` 連線至 Gemini API。

## 更換 Key 或模型

輸入新 Key 並按「安全儲存 Key」即可覆蓋舊 Key；之後重新偵測並儲存模型。只更換模型時不必重新輸入 Key。

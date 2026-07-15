# Groq API 與 ZDR（v2）

**Last updated:** 2026-07-15

GAS FormFlow v2 可使用自己的 Groq API Key，先逐步討論表單，再由使用者核准白話文雛型並轉成 FormFlow JSON。

## 設定與操作

1. 到 [Groq Console](https://console.groq.com/keys) 建立 API Key。
2. 在 FormFlow 選擇 Groq API。
3. 在遮罩密碼欄輸入 Key，按「安全儲存 Key」。驗證成功後輸入欄會清空。
4. 偵測支援模型、選擇文字模型，按「儲存所選模型」。
5. 在 AI 討論區多輪討論；AI 會持續整理白話文的「目前表單雛型」，不會直接改動 JSON。
6. 確認雛型後，按「我同意雛型，轉成 JSON」並再次確認。
7. 結果通過 schema 驗證後才會進入獨立 JSON 編輯區與右側預覽；也可貼入其他 AI 產生的 JSON。

對話只保留在目前瀏覽器分頁的記憶體中。送出訊息時，當前對話內容會傳給 Groq 以維持上下文。FormFlow 使用 Groq 的 `/openai/v1/models` 與 `/openai/v1/chat/completions`，並排除明顯的語音／音訊模型；組織或專案權限仍可能使個別模型回傳 403。

## ZDR 與資料保留

依 Groq 官方目前的 [Your Data in GroqCloud](https://console.groq.com/docs/your-data) 說明，一般 inference 的 customer inputs/outputs 預設不保留，但可能因平台可靠性或濫用調查暫存最多 30 天。所有客戶可由 Groq Console 的 Data Controls 啟用 Zero Data Retention；usage metadata 仍會保留。

因此，選用 Groq 不等於自動啟用完整 ZDR。若 ZDR 是必要條件，請由 Groq organization admin 明確啟用並確認目前政策。

## Key 安全

- Key 儲存在自己的 Apps Script `ScriptProperties`，屬性名稱為 `FORMFLOW_AI_GROQ_API_KEY`。
- Key 只透過 `Authorization: Bearer ...` header 傳送，不放在 URL、不回傳前端、不寫入 log。
- Gemini 與 Groq 的 Key／模型分開儲存。
- 公開 `agent` 模式停用所有 AI API。

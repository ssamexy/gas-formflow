# Groq API 與 ZDR（v2）

**Last updated:** 2026-07-15

GAS FormFlow v2 可使用自己的 Groq API Key，動態取得模型並從自然語言需求產生 FormFlow JSON。

## 設定

1. 到 [Groq Console](https://console.groq.com/keys) 建立 API Key。
2. 在 GAS FormFlow 的 AI Provider 選擇「Groq API」。
3. 貼上 Key，按「偵測支援模型」。
4. 選擇模型並按「儲存 Key 與模型」。
5. 輸入表單需求，按「AI 產生 JSON」。

FormFlow 呼叫 Groq 的 `/openai/v1/models` 與 `/openai/v1/chat/completions`，並使用 JSON Object Mode。模型清單會排除明顯的語音／音訊模型；組織或專案的 model permissions 仍可能讓個別模型回傳 403。

## ZDR 與資料保留

依 Groq 官方目前的 [Your Data in GroqCloud](https://console.groq.com/docs/your-data) 說明：

- 一般 inference 請求預設不保留 customer inputs/outputs。
- 為平台可靠性或濫用調查，inputs/outputs 仍可能暫存最多 30 天。
- 所有客戶可在 Groq Console 的 Data Controls 啟用 Zero Data Retention；啟用後不保留上述 customer data，但依賴資料保留的功能會停用。
- Usage metadata 一律保留，但官方說明其不含 customer inputs/outputs。

因此，使用 Groq provider 不等於自動啟用完整 ZDR。若 ZDR 是你的必要條件，請由 Groq organization admin 在 Data Controls 明確啟用並自行確認目前政策。

## Key 安全

- Key 儲存在自己的 Apps Script `ScriptProperties`，屬性名稱為 `FORMFLOW_AI_GROQ_API_KEY`。
- Key 只透過 `Authorization: Bearer ...` header 傳送，不放在 URL、不回傳前端、不寫入 log。
- Gemini 與 Groq 的 Key／模型分開儲存，切換 provider 不會互相覆蓋。
- 公開 `agent` 模式停用所有 AI API。

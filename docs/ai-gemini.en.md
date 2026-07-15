# Google Gemini API (v2)

**Last updated:** 2026-07-15

GAS FormFlow v2 uses your Gemini API key for a controlled workflow: discuss the form, approve a plain-language outline, then convert it to FormFlow JSON.

## Setup and workflow

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Open your self-hosted private Web App and select Google Gemini API.
3. Enter the key in the masked password field and click Save key securely. After validation, the field is cleared and the key is never filled back in.
4. Detect supported models, select a suitable text model, and save the selected model.
5. Discuss the purpose, respondents, and questions in the AI discussion area. The AI asks follow-up questions and maintains a plain-language current outline without writing JSON.
6. When the outline is ready, explicitly approve it and confirm conversion.
7. Validated output is written to the independent JSON editor and shown in the right-side preview. JSON from another AI can also be pasted directly into that editor.

The discussion is kept only in the current browser tab's memory. Reloading or resetting clears it. The current conversation is sent to the selected provider when you send a message so it can preserve context.

The model list contains models visible to the key that support `generateContent` and are suitable for text form design. It does not guarantee free-tier quota. Availability, regional restrictions, and quotas are controlled by Google.

## Key safety

- The key is stored in your own Apps Script `ScriptProperties` as `FORMFLOW_AI_GOOGLE_API_KEY`.
- The Web App returns only a `hasApiKey` boolean, never the key or a suffix.
- Requests send the key in the `x-goog-api-key` header, not in the URL.
- Clear AI settings removes the saved key and model.
- Public `agent` validation mode disables all AI APIs. Keep normal use in `private` mode.

After updating to v2, Apps Script requests the `script.external_request` permission so `UrlFetchApp` can call Gemini.

## Replace a key or model

Enter a new key and save it securely to replace the old key, then detect and save a model again. Changing only the model does not require re-entering the key.

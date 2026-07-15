# Google Gemini API (v2)

**Last updated:** 2026-07-15

GAS FormFlow v2 can use your own Gemini API key to turn natural-language requirements into JSON that passes the existing FormFlow schema v1 validator.

## Setup

1. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Open your self-hosted GAS FormFlow private Web App.
3. Paste the key into "AI JSON generation (v2)".
4. Click Detect supported models. FormFlow calls Google `models.list` and shows only models supporting `generateContent`.
5. Select a model and save the key and model.
6. Enter a form requirement and generate JSON. Valid output is placed in the main JSON editor.

The list shows models visible to the key that advertise content generation. It does not guarantee free-tier quota for every model. Availability, regional restrictions, and quotas are controlled by Google and may change.

## Key safety

- The key is stored in your own Apps Script `ScriptProperties` as `FORMFLOW_AI_GOOGLE_API_KEY`.
- The Web App returns only a `hasApiKey` boolean, never the key or a key suffix.
- Requests send the key in the `x-goog-api-key` header, not in the URL.
- The password field is cleared after settings are saved.
- Clear AI settings removes the saved key and model.
- Public `agent` validation mode disables all AI key, model, and generation APIs. Keep normal use in `private` mode.

After updating to v2, Apps Script requests the `script.external_request` permission so `UrlFetchApp` can call the Google Gemini API.

## Replace a key or model

Paste a new key and detect models again to replace both settings. To change only the model, leave the key field empty; FormFlow validates the new model with the saved key.
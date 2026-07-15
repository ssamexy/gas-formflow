# Groq API and ZDR (v2)

**Last updated:** 2026-07-15

GAS FormFlow v2 uses your Groq API key for a controlled workflow: discuss the form, approve a plain-language outline, then convert it to FormFlow JSON.

## Setup and workflow

1. Create an API key in the [Groq Console](https://console.groq.com/keys).
2. Select Groq API in FormFlow.
3. Enter the key in the masked password field and click Save key securely. The field is cleared after successful validation.
4. Detect supported models, select a text model, and save the selected model.
5. Hold a multi-turn discussion in the AI area. The AI maintains a plain-language current outline without changing JSON.
6. Explicitly approve the outline and confirm conversion.
7. Schema-validated output is placed in the independent JSON editor and right-side preview. JSON from another AI can also be pasted directly.

The discussion stays only in the current browser tab's memory. The current conversation is sent to Groq when a message is submitted so context is preserved. FormFlow calls Groq `/openai/v1/models` and `/openai/v1/chat/completions`, excluding obvious speech and audio models. Organization or project permissions can still cause a model to return 403.

## ZDR and retention

According to Groq's current [Your Data in GroqCloud](https://console.groq.com/docs/your-data) documentation, customer inputs and outputs are not retained by default for normal inference, but may be temporarily logged for platform reliability or abuse investigations for up to 30 days. Customers can enable Zero Data Retention in Groq Console Data Controls; usage metadata is still retained.

Using Groq does not automatically enable full ZDR. If ZDR is required, an organization admin should explicitly enable it and verify the current policy.

## Key safety

- The key is stored in your own Apps Script `ScriptProperties` as `FORMFLOW_AI_GROQ_API_KEY`.
- It is sent only in the `Authorization: Bearer ...` header, never placed in a URL, returned to the browser, or logged.
- Gemini and Groq settings are stored separately.
- Public `agent` mode disables all AI APIs.

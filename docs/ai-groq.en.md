# Groq API and ZDR (v2)

**Last updated:** 2026-07-15

GAS FormFlow v2 can use your own Groq API key, discover models dynamically, and turn natural-language requirements into FormFlow JSON.

## Setup

1. Create an API key in the [Groq Console](https://console.groq.com/keys).
2. Select Groq API in the FormFlow AI provider field.
3. Paste the key and detect supported models.
4. Select and save a model.
5. Enter a requirement and generate JSON.

FormFlow calls Groq `/openai/v1/models` and `/openai/v1/chat/completions` with JSON Object Mode. It excludes obvious speech and audio models; organization or project model permissions can still cause a selected model to return 403.

## ZDR and retention

According to Groq's current [Your Data in GroqCloud](https://console.groq.com/docs/your-data) documentation:

- Customer inputs and outputs are not retained by default for normal inference.
- They may still be temporarily logged for platform reliability or abuse investigations for up to 30 days.
- All customers can enable Zero Data Retention in Groq Console Data Controls. This prevents that customer-data retention but disables features that require stored state.
- Usage metadata is always retained; Groq states that it does not contain customer inputs or outputs.

Using the Groq provider does not automatically mean full ZDR is enabled. If ZDR is required, an organization admin should explicitly enable it in Data Controls and verify the current Groq policy.

## Key safety

- The key is stored in your own Apps Script `ScriptProperties` as `FORMFLOW_AI_GROQ_API_KEY`.
- It is sent only in the `Authorization: Bearer ...` header, never placed in a URL, returned to the browser, or logged.
- Gemini and Groq settings are stored separately.
- Public `agent` mode disables all AI APIs.

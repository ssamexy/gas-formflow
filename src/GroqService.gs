var GroqService = (function () {
  var API_BASE = 'https://api.groq.com/openai/v1';
  var API_KEY_PROPERTY = 'FORMFLOW_AI_GROQ_API_KEY';
  var MODEL_PROPERTY = 'FORMFLOW_AI_GROQ_MODEL';
  var MAX_REQUIREMENT_CHARS = 20000;

  function getSettings() {
    var props = PropertiesService.getScriptProperties();
    return {
      hasApiKey: !!props.getProperty(API_KEY_PROPERTY),
      model: props.getProperty(MODEL_PROPERTY) || ''
    };
  }

  function listModels(apiKey) {
    var resolvedKey = resolveApiKey(apiKey);
    var data = requestJson('/models', { method: 'get' }, resolvedKey);
    return (data.data || [])
      .filter(isTextGenerationModel)
      .map(toModelOption)
      .sort(function (a, b) { return a.label.localeCompare(b.label); });
  }

  function saveApiKey(apiKey) {
    var resolvedKey = resolveApiKey(apiKey);
    var models = listModels(resolvedKey);
    var props = PropertiesService.getScriptProperties();
    props.setProperty(API_KEY_PROPERTY, resolvedKey);
    props.deleteProperty(MODEL_PROPERTY);
    return { settings: getSettings(), models: models };
  }

  function saveModel(modelName) {
    var normalizedModel = normalizeModelName(modelName);
    var models = listModels('');
    var isAvailable = models.some(function (model) { return model.name === normalizedModel; });
    if (!isAvailable) throw new Error('AI_MODEL|The selected model is not available for this API key.');
    PropertiesService.getScriptProperties().setProperty(MODEL_PROPERTY, normalizedModel);
    return getSettings();
  }

  function saveSettings(apiKey, modelName) {
    var resolvedKey = resolveApiKey(apiKey);
    var normalizedModel = normalizeModelName(modelName);
    var models = listModels(resolvedKey);
    var isAvailable = models.some(function (model) { return model.name === normalizedModel; });
    if (!isAvailable) throw new Error('AI_MODEL|The selected model is not available for this API key.');
    PropertiesService.getScriptProperties().setProperties({
      FORMFLOW_AI_GROQ_API_KEY: resolvedKey,
      FORMFLOW_AI_GROQ_MODEL: normalizedModel
    });
    return getSettings();
  }

  function clearSettings() {
    PropertiesService.getScriptProperties().deleteProperty(API_KEY_PROPERTY);
    PropertiesService.getScriptProperties().deleteProperty(MODEL_PROPERTY);
    return getSettings();
  }

  function generateSpec(requirement, modelName) {
    var prompt = String(requirement || '').trim();
    if (prompt.length < 5) throw new Error('AI_CONFIG|Please enter a form requirement.');
    if (prompt.length > MAX_REQUIREMENT_CHARS) throw new Error('AI_CONFIG|The requirement is too long.');
    var apiKey = resolveApiKey('');
    var model = normalizeModelName(modelName || getSettings().model);
    var response = requestJson('/chat/completions', {
      method: 'post',
      payload: {
        model: model,
        messages: [
          { role: 'system', content: AiPrompt.buildFormFlowSystemPrompt() },
          { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2
      }
    }, apiKey);
    return AiPrompt.validateGeneratedSpec(extractResponseText(response), model);
  }

  function discussForm(messages, modelName) {
    var apiKey = resolveApiKey('');
    var model = normalizeModelName(modelName || getSettings().model);
    var response = requestJson('/chat/completions', {
      method: 'post',
      payload: {
        model: model,
        messages: [{ role: 'system', content: AiPrompt.buildDiscussionSystemPrompt() }].concat(messages),
        temperature: 0.4
      }
    }, apiKey);
    return extractResponseText(response);
  }

  function isTextGenerationModel(model) {
    var id = String(model && model.id || '').toLowerCase();
    if (!id || model.active === false) return false;
    return !/(whisper|speech|audio|tts|orpheus|guard|safeguard)/.test(id);
  }

  function toModelOption(model) {
    var id = normalizeModelName(model.id);
    var owner = model.owned_by ? 'Owned by ' + model.owned_by : '';
    return {
      id: id,
      name: id,
      label: id,
      description: owner,
      inputTokenLimit: Number(model.context_window || 0),
      outputTokenLimit: Number(model.max_completion_tokens || 0)
    };
  }

  function resolveApiKey(apiKey) {
    var provided = String(apiKey || '').trim();
    var resolved = provided || PropertiesService.getScriptProperties().getProperty(API_KEY_PROPERTY) || '';
    if (resolved.length < 20) throw new Error('AI_CONFIG|A valid Groq API key is required.');
    return resolved;
  }

  function normalizeModelName(modelName) {
    var name = String(modelName || '').trim();
    if (!/^[A-Za-z0-9._\/-]+$/.test(name) || name.indexOf('..') !== -1) throw new Error('AI_MODEL|Select a valid model.');
    return name;
  }

  function requestJson(path, request, apiKey) {
    var options = {
      method: request.method || 'get',
      headers: { Authorization: 'Bearer ' + apiKey },
      muteHttpExceptions: true
    };
    if (request.payload) {
      options.contentType = 'application/json';
      options.payload = JSON.stringify(request.payload);
    }
    var response = UrlFetchApp.fetch(API_BASE + path, options);
    var status = response.getResponseCode();
    var text = response.getContentText();
    var data;
    try {
      data = text ? JSON.parse(text) : {};
    } catch (error) {
      throw new Error('AI_RESPONSE|Groq returned an unreadable response.');
    }
    if (status < 200 || status >= 300) throw buildHttpError(status, data, apiKey);
    return data;
  }

  function buildHttpError(status, data, apiKey) {
    var providerMessage = data && data.error && data.error.message ? data.error.message : 'Request failed.';
    var safeMessage = sanitizeProviderMessage(providerMessage, apiKey);
    if (status === 401 || status === 403) return new Error('AI_AUTH|' + safeMessage);
    if (status === 429) return new Error('AI_QUOTA|' + safeMessage);
    return new Error('AI_REMOTE|' + safeMessage);
  }

  function sanitizeProviderMessage(message, apiKey) {
    return String(message || '')
      .split(String(apiKey || '')).join('***')
      .replace(/(Bearer\s+)[^\s]+/gi, '$1***')
      .slice(0, 300);
  }

  function extractResponseText(response) {
    var choices = response && response.choices ? response.choices : [];
    var text = choices[0] && choices[0].message ? String(choices[0].message.content || '').trim() : '';
    if (!text) throw new Error('AI_RESPONSE|Groq returned no content.');
    return text;
  }

  return {
    getSettings: getSettings,
    listModels: listModels,
    saveApiKey: saveApiKey,
    saveModel: saveModel,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    discussForm: discussForm,
    generateSpec: generateSpec
  };
})();

var GeminiService = (function () {
  var API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
  var API_KEY_PROPERTY = 'FORMFLOW_AI_GOOGLE_API_KEY';
  var MODEL_PROPERTY = 'FORMFLOW_AI_GOOGLE_MODEL';
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
    var data = requestJson('/models?pageSize=1000', { method: 'get' }, resolvedKey);
    return (data.models || [])
      .filter(function (model) {
        return isFormDesignModel(model);
      })
      .map(toModelOption)
      .sort(function (a, b) {
        return a.label.localeCompare(b.label);
      });
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
      FORMFLOW_AI_GOOGLE_API_KEY: resolvedKey,
      FORMFLOW_AI_GOOGLE_MODEL: normalizedModel
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
    var response = requestJson('/' + model + ':generateContent', {
      method: 'post',
      payload: buildGenerationRequest(prompt)
    }, apiKey);
    return AiPrompt.validateGeneratedSpec(extractResponseText(response), model);
  }

  function discussForm(messages, modelName) {
    var apiKey = resolveApiKey('');
    var model = normalizeModelName(modelName || getSettings().model);
    var response = requestJson('/' + model + ':generateContent', {
      method: 'post',
      payload: {
        systemInstruction: { parts: [{ text: AiPrompt.buildDiscussionSystemPrompt() }] },
        contents: messages.map(function (message) {
          return {
            role: message.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: message.content }]
          };
        }),
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 }
      }
    }, apiKey);
    return extractResponseText(response);
  }

  function isFormDesignModel(model) {
    var name = String(model && model.name || '').toLowerCase();
    if ((model.supportedGenerationMethods || []).indexOf('generateContent') === -1) return false;
    return !/(tts|image|banana|lyria|robotics|computer-use|deep-research|antigravity|omni)/.test(name);
  }

  function toModelOption(model) {
    var name = normalizeModelName(model.name || model.baseModelId || '');
    return {
      id: name.replace(/^models\//, ''),
      name: name,
      label: model.displayName || name.replace(/^models\//, ''),
      description: model.description || '',
      inputTokenLimit: Number(model.inputTokenLimit || 0),
      outputTokenLimit: Number(model.outputTokenLimit || 0)
    };
  }

  function resolveApiKey(apiKey) {
    var provided = String(apiKey || '').trim();
    var resolved = provided || PropertiesService.getScriptProperties().getProperty(API_KEY_PROPERTY) || '';
    if (resolved.length < 20) throw new Error('AI_CONFIG|A valid Gemini API key is required.');
    return resolved;
  }

  function normalizeModelName(modelName) {
    var name = String(modelName || '').trim();
    if (name && name.indexOf('models/') !== 0) name = 'models/' + name;
    if (!/^models\/[A-Za-z0-9._-]+$/.test(name)) throw new Error('AI_MODEL|Select a valid model.');
    return name;
  }

  function buildGenerationRequest(requirement) {
    return {
      systemInstruction: {
        parts: [{ text: AiPrompt.buildFormFlowSystemPrompt() }]
      },
      contents: [{
        role: 'user',
        parts: [{ text: requirement }]
      }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2
      }
    };
  }

  function requestJson(path, request, apiKey) {
    var options = {
      method: request.method || 'get',
      headers: { 'x-goog-api-key': apiKey },
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
      throw new Error('AI_RESPONSE|Gemini returned an unreadable response.');
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
      .replace(/([?&]key=)[^&\s]+/gi, '$1***')
      .slice(0, 300);
  }

  function extractResponseText(response) {
    var candidates = response && response.candidates ? response.candidates : [];
    var parts = candidates[0] && candidates[0].content ? candidates[0].content.parts || [] : [];
    var text = parts.map(function (part) { return part.text || ''; }).join('').trim();
    if (!text) throw new Error('AI_RESPONSE|Gemini returned no content.');
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

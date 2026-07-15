var AiService = (function () {
  var DEFAULT_PROVIDER = 'google-gemini';

  function getProviders() {
    return [
      { id: 'google-gemini', label: 'Google Gemini API' },
      { id: 'groq', label: 'Groq API' }
    ];
  }

  function getSettings(providerId) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).getSettings();
    return {
      providers: getProviders(),
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function listModels(providerId, apiKey) {
    var selectedProvider = normalizeProviderId(providerId);
    var provider = getProvider(selectedProvider);
    return {
      provider: selectedProvider,
      models: provider.listModels(apiKey),
      hasApiKey: provider.getSettings().hasApiKey
    };
  }

  function saveApiKey(providerId, apiKey) {
    var selectedProvider = normalizeProviderId(providerId);
    var result = getProvider(selectedProvider).saveApiKey(apiKey);
    return {
      provider: selectedProvider,
      hasApiKey: result.settings.hasApiKey,
      model: result.settings.model,
      models: result.models
    };
  }

  function saveModel(providerId, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).saveModel(modelName);
    return {
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function saveSettings(providerId, apiKey, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).saveSettings(apiKey, modelName);
    return {
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function clearSettings(providerId) {
    var selectedProvider = normalizeProviderId(providerId);
    var settings = getProvider(selectedProvider).clearSettings();
    return {
      provider: selectedProvider,
      hasApiKey: settings.hasApiKey,
      model: settings.model
    };
  }

  function generateSpec(providerId, requirement, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    return getProvider(selectedProvider).generateSpec(requirement, modelName);
  }

  function discussForm(providerId, messages, modelName) {
    var selectedProvider = normalizeProviderId(providerId);
    return {
      provider: selectedProvider,
      model: modelName,
      reply: getProvider(selectedProvider).discussForm(normalizeMessages(messages), modelName)
    };
  }

  function normalizeMessages(messages) {
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('AI_CONFIG|請先輸入想討論的表單需求。');
    }
    var normalized = messages.slice(-24).map(function (message) {
      var role = message && message.role === 'assistant' ? 'assistant' : 'user';
      var content = String(message && message.content || '').trim();
      if (!content || content.length > 6000) throw new Error('AI_CONFIG|單則對話內容需介於 1 到 6000 字。');
      return { role: role, content: content };
    });
    var totalLength = normalized.reduce(function (total, message) { return total + message.content.length; }, 0);
    if (totalLength > 40000) throw new Error('AI_CONFIG|對話內容過長，請重開討論或精簡需求。');
    return normalized;
  }

  function normalizeProviderId(providerId) {
    return String(providerId || DEFAULT_PROVIDER);
  }

  function getProvider(providerId) {
    if (providerId === 'google-gemini') return GeminiService;
    if (providerId === 'groq') return GroqService;
    throw new Error('AI_PROVIDER|Unsupported AI provider.');
  }

  function toUserMessage(error) {
    var message = error && error.message ? error.message : String(error || '');
    var separator = message.indexOf('|');
    var code = separator === -1 ? 'AI_REMOTE' : message.slice(0, separator);
    var detail = separator === -1 ? '' : message.slice(separator + 1);
    if (code === 'AI_AUTH') return 'API Key \u7121\u6548\u3001\u672a\u555f\u7528\uff0c\u6216\u6c92\u6709\u6b0a\u9650\u3002\u8acb\u5230 provider console \u6aa2\u67e5 Key \u8a2d\u5b9a\u3002';
    if (code === 'AI_QUOTA') return 'API \u984d\u5ea6\u5df2\u7528\u5b8c\u6216\u8acb\u6c42\u904e\u65bc\u983b\u7e41\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002';
    if (code === 'AI_MODEL') return '\u9078\u64c7\u7684\u6a21\u578b\u7121\u6548\uff0c\u6216\u4e0d\u652f\u63f4\u76ee\u524d\u7684\u8868\u55ae\u8a2d\u8a08\u4efb\u52d9\u3002';
    if (code === 'AI_CONFIG') return detail || '\u8acb\u5148\u5b8c\u6210 AI \u8a2d\u5b9a\u3002';
    if (code === 'AI_RESPONSE') return 'AI provider \u6c92\u6709\u56de\u50b3\u53ef\u7528\u5167\u5bb9\uff0c\u8acb\u8abf\u6574\u8aaa\u660e\u5f8c\u91cd\u8a66\u3002';
    if (code === 'AI_PROVIDER') return '\u76ee\u524d\u53ea\u652f\u63f4 Google Gemini API \u8207 Groq API\u3002';
    return 'AI provider \u9023\u7dda\u5931\u6557\u3002' + (detail ? ' ' + detail : '');
  }

  return {
    getSettings: getSettings,
    listModels: listModels,
    saveApiKey: saveApiKey,
    saveModel: saveModel,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    discussForm: discussForm,
    generateSpec: generateSpec,
    toUserMessage: toUserMessage
  };
})();

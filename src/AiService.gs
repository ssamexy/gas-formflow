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
    if (code === 'AI_MODEL') return '\u9078\u64c7\u7684\u6a21\u578b\u7121\u6548\u6216\u4e0d\u652f\u63f4 JSON \u5167\u5bb9\u7522\u751f\u3002';
    if (code === 'AI_CONFIG') return detail || '\u8acb\u5148\u5b8c\u6210 AI \u8a2d\u5b9a\u3002';
    if (code === 'AI_RESPONSE') return 'AI provider \u6c92\u6709\u56de\u50b3\u53ef\u7528\u7684 FormFlow JSON\uff0c\u8acb\u8abf\u6574\u9700\u6c42\u5f8c\u91cd\u8a66\u3002';
    if (code === 'AI_PROVIDER') return '\u76ee\u524d\u53ea\u652f\u63f4 Google Gemini API \u8207 Groq API\u3002';
    return 'AI provider \u9023\u7dda\u5931\u6557\u3002' + (detail ? ' ' + detail : '');
  }

  return {
    getSettings: getSettings,
    listModels: listModels,
    saveSettings: saveSettings,
    clearSettings: clearSettings,
    generateSpec: generateSpec,
    toUserMessage: toUserMessage
  };
})();
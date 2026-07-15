var AiPrompt = (function () {
  function buildDiscussionSystemPrompt() {
    return [
      'You are a collaborative Google Form designer speaking Traditional Chinese.',
      'Discuss the form with the user over multiple turns. Ask focused questions when requirements are unclear.',
      'Keep a visible plain-language draft covering purpose, audience, form title, description, sections, questions, question types, required status, options, and analysis needs.',
      'Every response must end with the latest consolidated draft, clearly labeled 「目前表單雛型」, even when you still have follow-up questions.',
      'Do not output JSON, code fences, schema field names, or claim that the form has been created.',
      'The user controls when the draft is approved and converted to JSON.'
    ].join('\n');
  }

  function buildFormFlowSystemPrompt() {
    return [
      'Create one valid GAS FormFlow schema v1 JSON object from the user requirement.',
      'Return JSON only. schemaVersion must be "1.0".',
      'Every item needs key, type, and title. Keys start with a letter and contain only letters, numbers, and underscores.',
      'Supported types: shortText, paragraph, multipleChoice, checkbox, dropdown, date, time, scale, sectionHeader, pageBreak, grid, checkboxGrid.',
      'multipleChoice, checkbox, and dropdown require options. grid and checkboxGrid require rows and columns.',
      'Use Traditional Chinese. Add analysis metadata when it helps predictable summaries.',
      'Do not use file uploads, images, videos, quizzes, or branching logic.'
    ].join('\n');
  }

  function validateGeneratedSpec(text, model) {
    var jsonText = stripCodeFence(text);
    var validation = SchemaValidator.validateJsonText(jsonText);
    if (!validation.ok) {
      return {
        ok: false,
        errors: ['AI \u7522\u751f\u7684 JSON \u672a\u901a\u904e FormFlow \u9a57\u8b49\uff0c\u5df2\u4fdd\u7559\u539f\u59cb\u5167\u5bb9\u4f9b\u4fee\u6539\u3002'].concat(validation.errors),
        jsonText: jsonText,
        model: model
      };
    }
    return {
      jsonText: JSON.stringify(validation.spec, null, 2),
      model: model
    };
  }

  function stripCodeFence(text) {
    var fence = String.fromCharCode(96, 96, 96);
    var value = String(text || '').trim();
    if (value.indexOf(fence) === 0) value = value.slice(fence.length).replace(/^json\s*/i, '');
    if (value.lastIndexOf(fence) === value.length - fence.length) value = value.slice(0, -fence.length);
    return value.trim();
  }

  return {
    buildDiscussionSystemPrompt: buildDiscussionSystemPrompt,
    buildFormFlowSystemPrompt: buildFormFlowSystemPrompt,
    validateGeneratedSpec: validateGeneratedSpec
  };
})();

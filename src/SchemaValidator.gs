var SchemaValidator = (function () {
  var SUPPORTED_SCHEMA = '1.0';
  var SUPPORTED_TYPES = {
    shortText: true,
    paragraph: true,
    multipleChoice: true,
    checkbox: true,
    dropdown: true,
    date: true,
    time: true,
    scale: true,
    sectionHeader: true,
    pageBreak: true,
    grid: true,
    checkboxGrid: true
  };
  var OPTION_TYPES = { multipleChoice: true, checkbox: true, dropdown: true };
  var GRID_TYPES = { grid: true, checkboxGrid: true };
  var LIMITS = {
    maxJsonChars: 120000,
    maxTitleChars: 180,
    maxDescriptionChars: 5000,
    maxItems: 120,
    maxOptions: 80,
    maxGridRows: 50,
    maxGridColumns: 20,
    maxTextChars: 1200
  };

  function validateJsonText(jsonText) {
    if (!jsonText || String(jsonText).trim() === '') {
      return fail(['請先貼上 GAS FormFlow JSON。']);
    }
    if (String(jsonText).length > LIMITS.maxJsonChars) {
      return fail(['JSON 太大，v1 目前不支援超大型問卷。請先縮減題目或分批建立。']);
    }
    var spec;
    try {
      spec = JSON.parse(jsonText);
    } catch (error) {
      return fail(['JSON 格式不正確，請確認沒有註解、尾端逗號或多餘文字。', error.message]);
    }
    var errors = validateSpec(spec);
    if (errors.length) return fail(errors, spec);
    return { ok: true, errors: [], spec: spec };
  }

  function validateSpec(spec) {
    var errors = [];
    if (!spec || typeof spec !== 'object' || Array.isArray(spec)) {
      return ['JSON 根層必須是一個物件。'];
    }
    if (spec.schemaVersion !== SUPPORTED_SCHEMA) {
      errors.push('schemaVersion 目前只支援 "1.0"。');
    }
    if (!hasText(spec.title)) errors.push('title 為必填。');
    if (hasText(spec.title) && spec.title.length > LIMITS.maxTitleChars) errors.push('title 過長，請縮短到 ' + LIMITS.maxTitleChars + ' 字以內。');
    if (spec.description && String(spec.description).length > LIMITS.maxDescriptionChars) errors.push('description 過長，請縮短。');
    if (!Array.isArray(spec.items) || spec.items.length === 0) {
      errors.push('items 必須是非空陣列。');
      return errors;
    }
    if (spec.items.length > LIMITS.maxItems) {
      errors.push('題目數量超過 v1 上限 ' + LIMITS.maxItems + ' 題，請拆成多個表單。');
    }

    var keys = {};
    spec.items.forEach(function (item, index) {
      var label = '第 ' + (index + 1) + ' 題';
      if (!item || typeof item !== 'object') {
        errors.push(label + ' 必須是物件。');
        return;
      }
      if (!hasText(item.key)) {
        errors.push(label + ' 缺少 key。');
      } else if (!/^[A-Za-z][A-Za-z0-9_]{1,63}$/.test(item.key)) {
        errors.push(label + ' 的 key "' + item.key + '" 不合理，請使用英文字母開頭，只含英文、數字與底線。');
      } else if (keys[item.key]) {
        errors.push(label + ' 的 key "' + item.key + '" 重複。');
      } else {
        keys[item.key] = true;
      }
      if (!SUPPORTED_TYPES[item.type]) {
        errors.push(label + ' 的 type "' + item.type + '" 目前不支援，請先產生基本表單後，到 Google Forms 後台手動微調。');
      }
      if (!hasText(item.title) && item.type !== 'pageBreak') errors.push(label + ' 缺少 title。');
      if (hasText(item.title) && item.title.length > LIMITS.maxTextChars) errors.push(label + ' 的 title 過長。');
      if (item.helpText && String(item.helpText).length > LIMITS.maxTextChars) errors.push(label + ' 的 helpText 過長。');
      if (OPTION_TYPES[item.type] && !hasStringArray(item.options)) {
        errors.push(label + ' 是選項題，必須提供 options array。');
      }
      if (OPTION_TYPES[item.type] && Array.isArray(item.options) && item.options.length > LIMITS.maxOptions) {
        errors.push(label + ' 的 options 超過上限 ' + LIMITS.maxOptions + ' 個。');
      }
      if (GRID_TYPES[item.type] && (!hasStringArray(item.rows) || !hasStringArray(item.columns))) {
        errors.push(label + ' 是 grid 題，必須提供 rows / columns。');
      }
      if (GRID_TYPES[item.type] && Array.isArray(item.rows) && item.rows.length > LIMITS.maxGridRows) {
        errors.push(label + ' 的 rows 超過上限 ' + LIMITS.maxGridRows + ' 列。');
      }
      if (GRID_TYPES[item.type] && Array.isArray(item.columns) && item.columns.length > LIMITS.maxGridColumns) {
        errors.push(label + ' 的 columns 超過上限 ' + LIMITS.maxGridColumns + ' 欄。');
      }
      if (item.type === 'scale') {
        if (item.lowerBound && (item.lowerBound < 0 || item.lowerBound > 10)) errors.push(label + ' lowerBound 必須在 0 到 10。');
        if (item.upperBound && (item.upperBound < 1 || item.upperBound > 10)) errors.push(label + ' upperBound 必須在 1 到 10。');
      }
    });
    return errors;
  }

  function hasText(value) {
    return typeof value === 'string' && value.trim() !== '';
  }

  function hasStringArray(value) {
    return Array.isArray(value) && value.length > 0 && value.every(function (item) {
      return typeof item === 'string' && item.trim() !== '';
    });
  }

  function fail(errors, spec) {
    return { ok: false, errors: errors, spec: spec || null };
  }

  function toUserMessage(error) {
    var message = error && error.message ? error.message : String(error);
    if (message.indexOf('Authorization') !== -1 || message.indexOf('permission') !== -1) {
      return 'Google 授權不足。請先在 Apps Script 執行 setup 並完成授權，再重新操作。';
    }
    return '建立失敗：' + message;
  }

  return {
    validateJsonText: validateJsonText,
    validateSpec: validateSpec,
    toUserMessage: toUserMessage,
    supportedTypes: Object.keys(SUPPORTED_TYPES)
  };
})();

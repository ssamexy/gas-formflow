/**
 * GAS FormFlow dist/Code.gs
 * Generated from src/*.gs. Edit src files, then run npm run build.
 */

// ===== src/Code.gs =====
function doGet() {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('GAS FormFlow')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function setup() {
  return {
    ok: true,
    app: 'GAS FormFlow',
    message: 'Setup completed. You can deploy this project as a Web App.'
  };
}

function apiValidateSpec(jsonText) {
  return SchemaValidator.validateJsonText(jsonText);
}

function apiPreviewSpec(jsonText) {
  var validation = SchemaValidator.validateJsonText(jsonText);
  if (!validation.ok) return validation;
  return {
    ok: true,
    form: FormBuilder.preview(validation.spec),
    sheet: SheetBuilder.preview(validation.spec)
  };
}

function apiCreateFormFlow(jsonText) {
  try {
    var validation = SchemaValidator.validateJsonText(jsonText);
    if (!validation.ok) return validation;

    var spec = validation.spec;
    var formResult = FormBuilder.create(spec);
    var sheetResult = SheetBuilder.create(spec, formResult);
    formResult.form.setDestination(FormApp.DestinationType.SPREADSHEET, sheetResult.spreadsheet.getId());

    var values = {
      title: spec.title || '',
      publishedUrl: formResult.publishedUrl,
      editUrl: formResult.editUrl,
      sheetUrl: sheetResult.sheetUrl,
      deadlineText: spec.deadlineText || '',
      notice: spec.notice || '',
      qrCodeUrl: formResult.publishedUrl
    };
    var announcement = SheetBuilder.renderTemplate(spec.lineMessageTemplate, values);
    SheetBuilder.writeAnnouncement(sheetResult.spreadsheet, announcement);
    SheetBuilder.writeLog(sheetResult.spreadsheet, {
      title: spec.title,
      publishedUrl: formResult.publishedUrl,
      editUrl: formResult.editUrl,
      sheetUrl: sheetResult.sheetUrl
    });

    return {
      ok: true,
      title: spec.title,
      publishedUrl: formResult.publishedUrl,
      editUrl: formResult.editUrl,
      sheetUrl: sheetResult.sheetUrl,
      announcement: announcement,
      createdAt: new Date().toISOString(),
      qrCode: QrCodeBuilder.buildClientQrPayload(formResult.publishedUrl)
    };
  } catch (error) {
    return {
      ok: false,
      errors: [SchemaValidator.toUserMessage(error)]
    };
  }
}


// ===== src/SchemaValidator.gs =====
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

  function validateJsonText(jsonText) {
    if (!jsonText || String(jsonText).trim() === '') {
      return fail(['請先貼上 GAS FormFlow JSON。']);
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
    if (!Array.isArray(spec.items) || spec.items.length === 0) {
      errors.push('items 必須是非空陣列。');
      return errors;
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
      if (OPTION_TYPES[item.type] && !hasStringArray(item.options)) {
        errors.push(label + ' 是選項題，必須提供 options array。');
      }
      if (GRID_TYPES[item.type] && (!hasStringArray(item.rows) || !hasStringArray(item.columns))) {
        errors.push(label + ' 是 grid 題，必須提供 rows / columns。');
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


// ===== src/FormBuilder.gs =====
var FormBuilder = (function () {
  function preview(spec) {
    return {
      title: spec.title,
      description: spec.description || '',
      itemCount: spec.items.length,
      items: spec.items.map(function (item) {
        return {
          key: item.key,
          type: item.type,
          title: item.title || '',
          helpText: item.helpText || '',
          required: !!item.required,
          options: item.options || [],
          rows: item.rows || [],
          columns: item.columns || []
        };
      })
    };
  }

  function create(spec) {
    var form = FormApp.create(spec.title);
    if (spec.description) form.setDescription(spec.description);
    if (spec.confirmationMessage) form.setConfirmationMessage(spec.confirmationMessage);
    spec.items.forEach(function (item) {
      addItem(form, item);
    });
    return {
      form: form,
      publishedUrl: form.getPublishedUrl(),
      editUrl: form.getEditUrl()
    };
  }

  function addItem(form, item) {
    var created;
    switch (item.type) {
      case 'shortText':
        created = form.addTextItem();
        setCommon(created, item);
        break;
      case 'paragraph':
        created = form.addParagraphTextItem();
        setCommon(created, item);
        break;
      case 'multipleChoice':
        created = form.addMultipleChoiceItem();
        setCommon(created, item);
        created.setChoiceValues(item.options);
        break;
      case 'checkbox':
        created = form.addCheckboxItem();
        setCommon(created, item);
        created.setChoiceValues(item.options);
        break;
      case 'dropdown':
        created = form.addListItem();
        setCommon(created, item);
        created.setChoiceValues(item.options);
        break;
      case 'date':
        created = form.addDateItem();
        setCommon(created, item);
        break;
      case 'time':
        created = form.addTimeItem();
        setCommon(created, item);
        break;
      case 'scale':
        created = form.addScaleItem();
        setCommon(created, item);
        created.setBounds(item.lowerBound || 1, item.upperBound || 5);
        if (item.lowerLabel || item.upperLabel) created.setLabels(item.lowerLabel || '', item.upperLabel || '');
        break;
      case 'sectionHeader':
        created = form.addSectionHeaderItem();
        created.setTitle(item.title);
        if (item.helpText) created.setHelpText(item.helpText);
        break;
      case 'pageBreak':
        created = form.addPageBreakItem();
        if (item.title) created.setTitle(item.title);
        if (item.helpText) created.setHelpText(item.helpText);
        break;
      case 'grid':
        created = form.addGridItem();
        setCommon(created, item);
        created.setRows(item.rows);
        created.setColumns(item.columns);
        break;
      case 'checkboxGrid':
        created = form.addCheckboxGridItem();
        setCommon(created, item);
        created.setRows(item.rows);
        created.setColumns(item.columns);
        break;
      default:
        throw new Error('此功能目前不支援：' + item.type + '。請先產生基本表單後，到 Google Forms 後台手動微調。');
    }
  }

  function setCommon(formItem, item) {
    formItem.setTitle(item.title);
    if (item.helpText) formItem.setHelpText(item.helpText);
    if (typeof formItem.setRequired === 'function') formItem.setRequired(!!item.required);
  }

  return {
    preview: preview,
    create: create
  };
})();


// ===== src/SheetBuilder.gs =====
var SheetBuilder = (function () {
  var SHEETS = ['Form Responses 1', 'Clean_Data', 'Question_Meta', 'Summary', 'Announcement', 'Generator_Log'];

  function preview(spec) {
    var statItems = getStatItems(spec);
    return {
      sheets: SHEETS,
      cleanDataColumns: ['timestamp'].concat(spec.items.filter(isDataItem).map(function (item) { return item.key; })),
      statFields: statItems.map(function (item) { return item.key; }),
      nonStatFields: spec.items.filter(isDataItem).filter(function (item) {
        return !statItems.some(function (candidate) { return candidate.key === item.key; });
      }).map(function (item) { return item.key; }),
      summaryPlan: buildSummaryPlan(spec)
    };
  }

  function create(spec, formResult) {
    var spreadsheet = SpreadsheetApp.create(spec.sheetName || (spec.title + ' Responses'));
    ensureSheets(spreadsheet);
    writeCleanData(spreadsheet, spec);
    writeQuestionMeta(spreadsheet, spec);
    SummaryBuilder.writeSummary(spreadsheet, spec);
    writeAnnouncement(spreadsheet, '');
    writeLogHeader(spreadsheet);
    return {
      spreadsheet: spreadsheet,
      sheetUrl: spreadsheet.getUrl()
    };
  }

  function ensureSheets(spreadsheet) {
    var first = spreadsheet.getSheets()[0];
    first.setName('Form Responses 1');
    SHEETS.slice(1).forEach(function (name) {
      var existing = spreadsheet.getSheetByName(name);
      if (!existing) spreadsheet.insertSheet(name);
    });
  }

  function writeCleanData(spreadsheet, spec) {
    var sheet = spreadsheet.getSheetByName('Clean_Data');
    sheet.clear();
    var columns = preview(spec).cleanDataColumns;
    sheet.getRange(1, 1, 1, columns.length).setValues([columns]);
    var formulas = columns.map(function (_, index) {
      var sourceColumn = columnLetter(index + 1);
      return '=ARRAYFORMULA(IF(\'Form Responses 1\'!' + sourceColumn + '2:' + sourceColumn + '="",,\'Form Responses 1\'!' + sourceColumn + '2:' + sourceColumn + '))';
    });
    sheet.getRange(2, 1, 1, formulas.length).setFormulas([formulas]);
    sheet.setFrozenRows(1);
  }

  function writeQuestionMeta(spreadsheet, spec) {
    var sheet = spreadsheet.getSheetByName('Question_Meta');
    sheet.clear();
    var rows = [['key', 'title', 'type', 'required', 'options', 'analysis_role', 'summary_type']];
    spec.items.filter(isDataItem).forEach(function (item) {
      rows.push([
        item.key,
        item.title || '',
        item.type,
        !!item.required,
        JSON.stringify(item.options || item.rows || []),
        item.analysis && item.analysis.role ? item.analysis.role : '',
        item.analysis && item.analysis.summary ? item.analysis.summary : inferSummaryType(item)
      ]);
    });
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
  }

  function writeAnnouncement(spreadsheet, announcement) {
    var sheet = spreadsheet.getSheetByName('Announcement');
    sheet.clear();
    sheet.getRange(1, 1, 2, 1).setValues([['announcement'], [announcement || '']]);
    sheet.setColumnWidth(1, 700);
  }

  function writeLogHeader(spreadsheet) {
    var sheet = spreadsheet.getSheetByName('Generator_Log');
    sheet.clear();
    sheet.getRange(1, 1, 1, 5).setValues([['createdAt', 'title', 'publishedUrl', 'editUrl', 'sheetUrl']]);
    sheet.setFrozenRows(1);
  }

  function writeLog(spreadsheet, data) {
    var sheet = spreadsheet.getSheetByName('Generator_Log');
    sheet.appendRow([new Date(), data.title || '', data.publishedUrl || '', data.editUrl || '', data.sheetUrl || '']);
  }

  function renderTemplate(template, values) {
    var base = template || '【{title}】\n\n請填寫表單：\n{publishedUrl}\n\n{deadlineText}\n{notice}';
    return base.replace(/\{([A-Za-z0-9_]+)\}/g, function (_, key) {
      return values[key] || '';
    }).replace(/\n{3,}/g, '\n\n').trim();
  }

  function buildSummaryPlan(spec) {
    var plans = ['回覆總數', '缺漏檢查'];
    getStatItems(spec).forEach(function (item) {
      plans.push(item.key + ': ' + inferSummaryType(item));
    });
    var primaryKey = spec.analysis && spec.analysis.primaryKey;
    if (primaryKey) plans.push('疑似重複檢查: ' + primaryKey);
    return plans;
  }

  function getStatItems(spec) {
    return spec.items.filter(isDataItem).filter(function (item) {
      return ['multipleChoice', 'checkbox', 'dropdown', 'scale', 'date', 'time'].indexOf(item.type) !== -1 ||
        (item.analysis && item.analysis.summary);
    });
  }

  function inferSummaryType(item) {
    if (item.analysis && item.analysis.summary) return item.analysis.summary;
    if (['multipleChoice', 'dropdown'].indexOf(item.type) !== -1) return 'countOptions';
    if (item.type === 'checkbox') return 'countCheckboxOptions';
    if (item.type === 'scale') return 'averageAndDistribution';
    if (item.type === 'date') return 'countDates';
    if (item.type === 'time') return 'countTimes';
    return '';
  }

  function isDataItem(item) {
    return ['sectionHeader', 'pageBreak'].indexOf(item.type) === -1;
  }

  function columnLetter(columnNumber) {
    var letter = '';
    while (columnNumber > 0) {
      var modulo = (columnNumber - 1) % 26;
      letter = String.fromCharCode(65 + modulo) + letter;
      columnNumber = Math.floor((columnNumber - modulo) / 26);
    }
    return letter;
  }

  return {
    preview: preview,
    create: create,
    writeAnnouncement: writeAnnouncement,
    writeLog: writeLog,
    renderTemplate: renderTemplate,
    inferSummaryType: inferSummaryType,
    isDataItem: isDataItem,
    columnLetter: columnLetter
  };
})();


// ===== src/SummaryBuilder.gs =====
var SummaryBuilder = (function () {
  function writeSummary(spreadsheet, spec) {
    var sheet = spreadsheet.getSheetByName('Summary');
    sheet.clear();
    var rows = [
      ['section', 'field', 'metric', 'value'],
      ['overview', 'responses', 'total', '=MAX(0,COUNTA(\'Form Responses 1\'!A:A)-1)']
    ];
    var dataColumn = 2;
    spec.items.filter(SheetBuilder.isDataItem).forEach(function (item) {
      var summaryType = SheetBuilder.inferSummaryType(item);
      if (summaryType) rows = rows.concat(buildRows(item, dataColumn, summaryType));
      dataColumn += 1;
    });
    if (spec.analysis && spec.analysis.primaryKey) {
      var primaryIndex = findDataIndex(spec, spec.analysis.primaryKey);
      if (primaryIndex !== -1) {
        var primaryColumn = SheetBuilder.columnLetter(primaryIndex + 2);
        rows.push(['quality', spec.analysis.primaryKey, 'possibleDuplicates', '=COUNTIF(Clean_Data!' + primaryColumn + ':' + primaryColumn + ',Clean_Data!' + primaryColumn + '2)']);
      }
    }
    spec.items.filter(SheetBuilder.isDataItem).forEach(function (item, index) {
      if (!item.required) return;
      var column = SheetBuilder.columnLetter(index + 2);
      rows.push(['quality', item.key, 'missingCount', '=COUNTBLANK(Clean_Data!' + column + '2:' + column + ')']);
    });
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 4);
  }

  function buildRows(item, dataColumn, summaryType) {
    var column = SheetBuilder.columnLetter(dataColumn);
    if (['multipleChoice', 'dropdown'].indexOf(item.type) !== -1) {
      return (item.options || []).map(function (option) {
        return ['field', item.key, option, '=COUNTIF(Clean_Data!' + column + ':' + column + ',"' + escapeFormulaText(option) + '")'];
      });
    }
    if (item.type === 'checkbox') {
      return (item.options || []).map(function (option) {
        return ['field', item.key, option, '=COUNTIF(Clean_Data!' + column + ':' + column + ',"*' + escapeFormulaText(option) + '*")'];
      });
    }
    if (item.type === 'scale') {
      return [
        ['field', item.key, 'average', '=IFERROR(AVERAGE(Clean_Data!' + column + '2:' + column + '),"")'],
        ['field', item.key, 'responses', '=COUNT(Clean_Data!' + column + '2:' + column + ')']
      ];
    }
    if (item.type === 'date' || item.type === 'time') {
      return [
        ['field', item.key, 'filledCount', '=COUNTA(Clean_Data!' + column + '2:' + column + ')'],
        ['field', item.key, 'uniqueValues', '=COUNTUNIQUE(Clean_Data!' + column + '2:' + column + ')']
      ];
    }
    return [['field', item.key, summaryType, buildNote(item)]];
  }

  function buildNote(item) {
    if (['multipleChoice', 'dropdown', 'checkbox'].indexOf(item.type) !== -1) {
      return 'Options: ' + (item.options || []).join(', ');
    }
    if (item.type === 'scale') return 'Compute average and distribution from response values.';
    if (item.type === 'date') return 'Count and group by response date.';
    if (item.type === 'time') return 'Count and group by response time.';
    return 'Configured by analysis metadata.';
  }

  function findDataIndex(spec, key) {
    var items = spec.items.filter(SheetBuilder.isDataItem);
    for (var index = 0; index < items.length; index += 1) {
      if (items[index].key === key) return index;
    }
    return -1;
  }

  function escapeFormulaText(value) {
    return String(value || '').replace(/"/g, '""');
  }

  return {
    writeSummary: writeSummary
  };
})();


// ===== src/QrCodeBuilder.gs =====
var QrCodeBuilder = (function () {
  function buildClientQrPayload(url) {
    return {
      provider: 'client-placeholder',
      text: url,
      note: 'Index.html renders a local SVG placeholder with the form URL. Replace provider in v1.1 for full QR encoding if needed.'
    };
  }

  return {
    buildClientQrPayload: buildClientQrPayload
  };
})();

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
    first.setName('Clean_Data');
    SHEETS.filter(function (name) { return name !== 'Form Responses 1' && name !== 'Clean_Data'; }).forEach(function (name) {
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
        safeCellText(item.key),
        safeCellText(item.title || ''),
        safeCellText(item.type),
        !!item.required,
        safeCellText(JSON.stringify(item.options || item.rows || [])),
        safeCellText(item.analysis && item.analysis.role ? item.analysis.role : ''),
        safeCellText(item.analysis && item.analysis.summary ? item.analysis.summary : inferSummaryType(item))
      ]);
    });
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
  }

  function writeAnnouncement(spreadsheet, announcement) {
    var sheet = spreadsheet.getSheetByName('Announcement');
    sheet.clear();
    sheet.getRange(1, 1, 2, 1).setValues([['announcement'], [safeCellText(announcement || '')]]);
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
    sheet.appendRow([new Date(), safeCellText(data.title || ''), data.publishedUrl || '', data.editUrl || '', data.sheetUrl || '']);
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

  function safeCellText(value) {
    var text = String(value == null ? '' : value);
    return /^[=+\-@]/.test(text) ? "'" + text : text;
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
    columnLetter: columnLetter,
    safeCellText: safeCellText
  };
})();

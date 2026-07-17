var SheetBuilder = (function () {
  var SHEETS = ['Clean_Data', 'Question_Meta', 'Form_Info', 'Summary', 'Announcement', 'Generator_Log'];

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

  function create(spec) {
    var spreadsheet = SpreadsheetApp.create(spec.sheetName || (spec.title + ' Responses'));
    ensureSheets(spreadsheet);
    return { spreadsheet: spreadsheet, sheetUrl: spreadsheet.getUrl() };
  }

  function ensureSheets(spreadsheet) {
    var first = spreadsheet.getSheets()[0];
    first.setName('Clean_Data');
    SHEETS.filter(function (name) { return name !== 'Clean_Data'; }).forEach(function (name) {
      if (!spreadsheet.getSheetByName(name)) spreadsheet.insertSheet(name);
    });
  }


  function buildResponseLayout(headers, spec) {
    if (!Array.isArray(headers) || headers.length < 2) throw new Error('Response sheet headers are not ready.');
    var layout = { cleanDataColumns: ['timestamp'], sourceByCleanKey: { timestamp: columnLetter(1) }, responseHeaderByCleanKey: { timestamp: headers[0] } };
    spec.items.filter(isDataItem).forEach(function (item) {
      if (item.type === 'grid' || item.type === 'checkboxGrid') {
        (item.rows || []).forEach(function (row, rowIndex) {
          var cleanKey = item.key + '__row_' + (rowIndex + 1);
          addLayoutColumn_(layout, cleanKey, findGridHeader_(headers, item.title, row));
        });
        return;
      }
      addLayoutColumn_(layout, item.key, findExactHeader_(headers, item.title));
    });
    return layout;
  }

  function findResponseSheetByHeaders(sheets, spec) {
    for (var index = 0; index < sheets.length; index += 1) {
      var sheet = sheets[index];
      if (!sheet || sheet.getLastColumn() < 2) continue;
      try {
        buildResponseLayout(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0], spec);
        return sheet;
      } catch (error) {}
    }
    return null;
  }

  function addLayoutColumn_(layout, cleanKey, match) {
    layout.cleanDataColumns.push(cleanKey);
    layout.sourceByCleanKey[cleanKey] = columnLetter(match.index + 1);
    layout.responseHeaderByCleanKey[cleanKey] = match.header;
  }

  function findExactHeader_(headers, title) {
    var matches = headers.map(function (header, index) { return { header: header, index: index }; }).filter(function (candidate) { return candidate.header === title; });
    if (matches.length !== 1) throw new Error('Expected exactly one response column for "' + title + '".');
    return matches[0];
  }

  function findGridHeader_(headers, title, row) {
    var matches = headers.map(function (header, index) { return { header: header, index: index }; }).filter(function (candidate) { return candidate.header === title + ' [' + row + ']' || candidate.header === title + ' - ' + row || candidate.header === title + ': ' + row; });
    if (matches.length !== 1) throw new Error('Expected one response column for grid row "' + title + '" / "' + row + '".');
    return matches[0];
  }
  function finalizeResponseSheets(spreadsheet, formResult, spec) {
    // Form destination binding can take longer than 10 seconds under load.
    // Keep a bounded wait, but avoid reporting a false creation failure.
    var deadline = Date.now() + 30000;
    var responseSheet = null;
    while (Date.now() < deadline && !responseSheet) {
      spreadsheet = SpreadsheetApp.openById(spreadsheet.getId());
      responseSheet = findResponseSheetByHeaders(spreadsheet.getSheets(), spec);
      if (!responseSheet) Utilities.sleep(250);
    }
    if (!responseSheet) {
      var observedSheets = spreadsheet.getSheets().map(function (sheet) {
        var lastColumn = sheet.getLastColumn();
        return {
          name: sheet.getName(),
          headers: lastColumn > 0 ? sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0] : []
        };
      });
      throw new Error(
        'Google Form response sheet was not created with the expected headers. ' +
        'Form link state: ' + (spreadsheet.getFormUrl() ? 'linked' : 'not linked') + '. ' +
        'Observed sheets: ' + JSON.stringify(observedSheets)
      );
    }
    var headers = responseSheet.getRange(1, 1, 1, responseSheet.getLastColumn()).getDisplayValues()[0];
    var layout = buildResponseLayout(headers, spec);
    layout.responseSheetName = responseSheet.getName();
    var analysis = spec.analysis || {};
    var generateSummary = analysis.enabled !== false && analysis.generateSummary !== false;
    var generateCleanData = analysis.enabled !== false && (analysis.generateCleanData !== false || generateSummary);
    if (generateCleanData) writeCleanData(spreadsheet, layout);
    writeQuestionMeta(spreadsheet, spec);
    writeFormInfo(spreadsheet, formResult, spec, responseSheet);
    if (generateSummary) SummaryBuilder.writeSummaryForLayout(spreadsheet, spec, layout);
    writeAnnouncement(spreadsheet, '');
    writeLogHeader(spreadsheet);
    return { responseSheet: responseSheet, layout: layout };
  }

  function writeCleanData(spreadsheet, layout) {
    var sheet = spreadsheet.getSheetByName('Clean_Data');
    sheet.clear();
    sheet.getRange(1, 1, 1, layout.cleanDataColumns.length).setValues([layout.cleanDataColumns]);
    var quotedResponseSheet = quoteSheetName_(layout.responseSheetName);
    var formulas = layout.cleanDataColumns.map(function (cleanKey) {
      var sourceColumn = layout.sourceByCleanKey[cleanKey];
      return '=ARRAYFORMULA(IF(' + quotedResponseSheet + '!' + sourceColumn + '2:' + sourceColumn + '="",,' + quotedResponseSheet + '!' + sourceColumn + '2:' + sourceColumn + '))';
    });
    sheet.getRange(2, 1, 1, formulas.length).setFormulas([formulas]);
    sheet.setFrozenRows(1);
  }

  function writeFormInfo(spreadsheet, formResult, spec, responseSheet) {
    var sheet = spreadsheet.getSheetByName('Form_Info');
    sheet.clear();
    var rows = [['field', 'value'], ['title', safeCellText(spec.title)], ['description', safeCellText(spec.description || '')], ['deadline', safeCellText(spec.deadlineText || '')], ['notice', safeCellText(spec.notice || '')], ['responseUnit', safeCellText(spec.analysis && spec.analysis.responseUnit || '')], ['publishedUrl', formResult.publishedUrl], ['editUrl', formResult.editUrl], ['sheetUrl', spreadsheet.getUrl()], ['responseSheet', safeCellText(responseSheet.getName())]];
    sheet.getRange(1, 1, rows.length, 2).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(2, 700);
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

  function quoteSheetName_(sheetName) {
    return "'" + String(sheetName).replace(/'/g, "''") + "'";
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
    finalizeResponseSheets: finalizeResponseSheets,
    writeAnnouncement: writeAnnouncement,
    writeLog: writeLog,
    renderTemplate: renderTemplate,
    inferSummaryType: inferSummaryType,
    isDataItem: isDataItem,
    buildResponseLayout: buildResponseLayout,
    findResponseSheetByHeaders: findResponseSheetByHeaders,
    columnLetter: columnLetter,
    safeCellText: safeCellText
  };
})();

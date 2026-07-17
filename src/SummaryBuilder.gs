var SummaryBuilder = (function () {
  function writeSummary(spreadsheet, spec, layout) {
    if (!layout) throw new Error('Summary requires a response-sheet layout.');
    return writeSummaryForLayout(spreadsheet, spec, layout);
  }

  function buildRows(item, dataColumn, summaryType) {
    var column = SheetBuilder.columnLetter(dataColumn);
    if (['multipleChoice', 'dropdown'].indexOf(item.type) !== -1) {
      return (item.options || []).map(function (option) {
        return ['field', SheetBuilder.safeCellText(item.key), SheetBuilder.safeCellText(option), '=COUNTIF(Clean_Data!' + column + ':' + column + ',"' + escapeFormulaText(option) + '")'];
      });
    }
    if (item.type === 'checkbox') {
      return (item.options || []).map(function (option) {
        return ['field', SheetBuilder.safeCellText(item.key), SheetBuilder.safeCellText(option), '=COUNTIF(Clean_Data!' + column + ':' + column + ',"*' + escapeFormulaText(option) + '*")'];
      });
    }
    if (item.type === 'scale') {
      return [
        ['field', SheetBuilder.safeCellText(item.key), 'average', '=IFERROR(AVERAGE(Clean_Data!' + column + '2:' + column + '),"")'],
        ['field', SheetBuilder.safeCellText(item.key), 'responses', '=COUNT(Clean_Data!' + column + '2:' + column + ')']
      ];
    }
    if (item.type === 'date' || item.type === 'time') {
      return [
        ['field', SheetBuilder.safeCellText(item.key), 'filledCount', '=COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*")'],
        ['field', SheetBuilder.safeCellText(item.key), 'uniqueValues', '=IF(COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*")=0,0,COUNTUNIQUE(FILTER(Clean_Data!' + column + '2:' + column + ',Clean_Data!' + column + '2:' + column + '<>"")))']
      ];
    }
    return [['field', SheetBuilder.safeCellText(item.key), SheetBuilder.safeCellText(summaryType), SheetBuilder.safeCellText(buildNote(item))]];
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


  function writeSummaryForLayout(spreadsheet, spec, layout) {
    var sheet = spreadsheet.getSheetByName('Summary');
    sheet.clear();
    var analysis = spec.analysis || {};
    if (analysis.enabled === false || analysis.generateSummary === false) {
      sheet.getRange(1, 1, 2, 4).setValues([['section', 'field', 'metric', 'value'], ['overview', 'analysis', 'status', 'disabled by spec']]);
      return;
    }
    var rows = [['section', 'field', 'metric', 'value'], ['overview', 'responses', 'total', '=MAX(0,COUNTA(Clean_Data!A2:A))']];
    var selected = Array.isArray(analysis.summaryFields) ? analysis.summaryFields : [];
    spec.items.filter(SheetBuilder.isDataItem).forEach(function (item) {
      if (selected.length && selected.indexOf(item.key) === -1) return;
      getCleanKeys_(item).forEach(function (cleanKey) {
        var column = SheetBuilder.columnLetter(layout.cleanDataColumns.indexOf(cleanKey) + 1);
        rows = rows.concat(buildLayoutRows_(item, cleanKey, column));
      });
    });
    spec.items.filter(SheetBuilder.isDataItem).forEach(function (item) {
      if (!item.required) return;
      getCleanKeys_(item).forEach(function (cleanKey) {
        var column = SheetBuilder.columnLetter(layout.cleanDataColumns.indexOf(cleanKey) + 1);
        rows.push(['quality', SheetBuilder.safeCellText(cleanKey), 'missingCount', '=MAX(0,$D$2-COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*"))']);
      });
    });
    sheet.getRange(1, 1, rows.length, 4).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 4);
  }

  function getCleanKeys_(item) {
    if (item.type === 'grid' || item.type === 'checkboxGrid') {
      return (item.rows || []).map(function (_, index) { return item.key + '__row_' + (index + 1); });
    }
    return [item.key];
  }

  function buildLayoutRows_(item, cleanKey, column) {
    var label = SheetBuilder.safeCellText(cleanKey);
    if (['multipleChoice', 'dropdown', 'grid'].indexOf(item.type) !== -1) {
      return (item.options || item.columns || []).map(function (option) {
        return ['field', label, SheetBuilder.safeCellText(option), '=COUNTIF(Clean_Data!' + column + ':' + column + ',"' + escapeCountifText_(option) + '")'];
      });
    }
    if (item.type === 'checkbox' || item.type === 'checkboxGrid') {
      return (item.options || item.columns || []).map(function (option) {
        return ['field', label, SheetBuilder.safeCellText(option), '=SUM(ARRAYFORMULA(N(REGEXMATCH(Clean_Data!' + column + '2:' + column + ',"(^|, )' + escapeRegexText_(option) + '(, |$)"))))'];
      });
    }
    if (item.type === 'scale') return [['field', label, 'average', '=IFERROR(AVERAGE(Clean_Data!' + column + '2:' + column + '),"")'], ['field', label, 'responses', '=COUNT(Clean_Data!' + column + '2:' + column + ')']];
    return [['field', label, 'filledCount', '=COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*")'], ['field', label, 'uniqueValues', '=IF(COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*")=0,0,COUNTUNIQUE(FILTER(Clean_Data!' + column + '2:' + column + ',Clean_Data!' + column + '2:' + column + '<>"")))']];
  }

  function escapeCountifText_(value) { return String(value || '').replace(/~/g, '~~').replace(/\*/g, '~*').replace(/\?/g, '~?').replace(/"/g, '""'); }
  function escapeRegexText_(value) { return String(value || '').replace(/[.*+?^$()|[\]{}\\]/g, '\\$&').replace(/"/g, '""'); }
  return {
    writeSummary: writeSummary,
    writeSummaryForLayout: writeSummaryForLayout
  };
})();

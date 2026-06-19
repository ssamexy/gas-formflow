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
        rows.push(['quality', SheetBuilder.safeCellText(spec.analysis.primaryKey), 'possibleDuplicates', '=IF(COUNTIF(Clean_Data!' + primaryColumn + '2:' + primaryColumn + ',"?*")=0,0,MAX(COUNTIF(Clean_Data!' + primaryColumn + '2:' + primaryColumn + ',FILTER(Clean_Data!' + primaryColumn + '2:' + primaryColumn + ',Clean_Data!' + primaryColumn + '2:' + primaryColumn + '<>""))))']);
      }
    }
    spec.items.filter(SheetBuilder.isDataItem).forEach(function (item, index) {
      if (!item.required) return;
      var column = SheetBuilder.columnLetter(index + 2);
      rows.push(['quality', SheetBuilder.safeCellText(item.key), 'missingCount', '=MAX(0,$D$2-COUNTIF(Clean_Data!' + column + '2:' + column + ',"?*"))']);
    });
    sheet.getRange(1, 1, rows.length, rows[0].length).setValues(rows);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, 4);
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

  return {
    writeSummary: writeSummary
  };
})();

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
          helpText: item.helpText || item.description || '',
          required: !!item.required,
          options: item.options || [],
          rows: item.rows || [],
          columns: item.columns || [],
          lowerBound: item.lowerBound !== undefined ? item.lowerBound : 1,
          upperBound: item.upperBound !== undefined ? item.upperBound : 5,
          lowerLabel: item.lowerLabel || '',
          upperLabel: item.upperLabel || ''
        };
      })
    };
  }

  function create(spec) {
    var form = FormApp.create(spec.title);
    var description = spec.description ? String(spec.description) : '';
    form.setDescription(description);
    if (spec.confirmationMessage) form.setConfirmationMessage(spec.confirmationMessage);
    spec.items.forEach(function (item) {
      addItem(form, item);
    });
    return {
      form: form,
      description: form.getDescription(),
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
        created.setBounds(
          item.lowerBound !== undefined ? item.lowerBound : 1,
          item.upperBound !== undefined ? item.upperBound : 5
        );
        if (item.lowerLabel || item.upperLabel) created.setLabels(item.lowerLabel || '', item.upperLabel || '');
        break;
      case 'sectionHeader':
        created = form.addSectionHeaderItem();
        created.setTitle(item.title);
        setHelpText(created, item);
        break;
      case 'pageBreak':
        created = form.addPageBreakItem();
        if (item.title) created.setTitle(item.title);
        setHelpText(created, item);
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
    setHelpText(formItem, item);
    if (typeof formItem.setRequired === 'function') formItem.setRequired(!!item.required);
  }

  function setHelpText(formItem, item) {
    var helpText = item.helpText || item.description || '';
    if (helpText) formItem.setHelpText(String(helpText));
  }

  return {
    preview: preview,
    create: create
  };
})();

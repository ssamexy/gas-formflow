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

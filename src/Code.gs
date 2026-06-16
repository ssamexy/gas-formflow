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

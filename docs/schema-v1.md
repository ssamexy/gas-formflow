# GAS FormFlow Schema v1

`schemaVersion` must be `"1.0"`. The root object describes one Google Form, one response Sheet, announcement text, and predictable summary metadata.

```json
{
  "schemaVersion": "1.0",
  "title": "表單標題",
  "description": "表單說明",
  "notice": "重要提醒",
  "deadlineText": "截止時間",
  "confirmationMessage": "送出後訊息",
  "sheetName": "回應試算表名稱",
  "lineMessageTemplate": "公告文案模板",
  "analysis": {
    "enabled": true,
    "primaryKey": "name",
    "generateCleanData": true,
    "generateSummary": true,
    "summaryFields": []
  },
  "items": []
}
```

## Supported Item Types

- `shortText`
- `paragraph`
- `multipleChoice`
- `checkbox`
- `dropdown`
- `date`
- `time`
- `scale`
- `sectionHeader`
- `pageBreak`
- `grid`
- `checkboxGrid`

Every item should include `key`, `type`, and `title`. `key` must start with a letter and use only letters, numbers, and underscores.

Option fields (`multipleChoice`, `checkbox`, `dropdown`) require `options`. Grid fields (`grid`, `checkboxGrid`) require `rows` and `columns`.

## Announcement Variables

- `{title}`
- `{publishedUrl}`
- `{editUrl}`
- `{sheetUrl}`
- `{deadlineText}`
- `{notice}`
- `{qrCodeUrl}`

## Unsupported in v1

- File upload questions
- Image questions
- Video questions
- Full quiz mode, answers, and points
- Complex branching logic
- Google Forms visual theme customization
- Very large survey guarantees

If a form needs these features, create the basic form first, then fine-tune it in Google Forms.

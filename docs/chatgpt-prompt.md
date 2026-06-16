# ChatGPT Prompt

請根據我的需求，產生符合 GAS FormFlow v1 schema 的 JSON。

規則：

1. 只輸出 JSON，不要加 markdown code block。
2. schemaVersion 固定為 `"1.0"`。
3. 每題都要有 key、type、title。
4. 題型只可使用 shortText、paragraph、multipleChoice、checkbox、dropdown、date、time、scale、sectionHeader、pageBreak、grid、checkboxGrid。
5. multipleChoice、checkbox、dropdown 必須提供 options array。
6. 若題目需要統計，請加上 analysis。
7. 不要使用檔案上傳、圖片、影片、測驗、跳題邏輯。
8. JSON 必須可被 JSON.parse() 解析，不可有註解，不可有 trailing comma。
9. 使用繁體中文。

我的表單需求如下：

【貼上需求】

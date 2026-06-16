# GAS FormFlow Beginner Installation

## Security Note

Deploy your own Web App. Do not use a Web App URL deployed by a stranger. If you use someone else's Web App, forms and spreadsheets may be created under their Google account. If you deploy your own copy, the generated Google Form and Sheet stay in your Google account.

During the first authorization, Google may show an unverified app warning. This is expected because you are running your own Apps Script project. Only continue if you trust the code you copied.

## Steps

1. Open Google Apps Script.
2. Create a new project.
3. Rename the project to GAS FormFlow.
4. Open `dist/Code.gs` from this repository.
5. Copy all content.
6. Paste it into `Code.gs` in Apps Script.
7. Create a new HTML file named `Index`.
8. Open `dist/Index.html` from this repository.
9. Copy all content.
10. Paste it into `Index.html` in Apps Script.
11. Save the project.
12. Run the `setup` or `doGet` test function once.
13. Complete Google authorization.
14. Click Deploy -> New deployment.
15. Select Web app.
16. Execute as: Me.
17. Choose access level:
    - Only myself
    - Anyone with the link
18. Finish deployment and copy the Web App URL.
19. Open this URL on your phone to paste JSON and generate Google Forms.

## Usage

1. Open your Web App URL on a phone or desktop browser.
2. Paste AI-generated JSON or load a built-in example.
3. Click Validate.
4. Click Preview.
5. Click Create form.
6. Copy the form URL, announcement text, and QR placeholder as needed.

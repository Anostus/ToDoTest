# Sheets To Do — GitHub Pages + Google Sheets

A simple static To Do app for GitHub Pages that stores tasks in a Google Sheet through a Google Apps Script web app.

## Files

- `index.html` — the app page
- `styles.css` — styling
- `app.js` — browser app logic
- `apps-script/Code.gs` — Google Apps Script backend

## Google Sheet setup

1. Create a new Google Sheet.
2. Rename the first tab to `Todos`, or let the script create that tab for you.
3. In the Sheet, open **Extensions > Apps Script**.
4. Replace the default script with the contents of `apps-script/Code.gs`.
5. Optional: set `APP_KEY_ROT13` in `Code.gs` using ROT13, or use `APP_KEY` as plaintext. Do not use this for sensitive security; GitHub Pages code is public.
6. Click **Deploy > New deployment**.
7. Choose **Web app**.
8. Set **Execute as** to **Me**.
9. Set **Who has access** to **Anyone**.
10. Deploy, authorize the script, then copy the Web App URL ending in `/exec`.

## ROT13 light obfuscation

This version keeps the browser-facing connection values one layer deep by storing them with ROT13. ROT13 only changes letters, so it is easy to reverse and should not be treated as real security. It mainly keeps your Apps Script URL and optional key from appearing as plain text at a glance.

To ROT13 a value, open your browser console and run:

```js
function rot13(value) {
  return String(value).replace(/[a-z]/gi, (char) => {
    const base = char <= "Z" ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
  });
}

rot13("https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec");
```

Example pieces:

```text
https://script.google.com/macros/s/.../exec
uggcf://fpevcg.tbbtyr.pbz/znpebf/f/.../rkrp
```

## App setup

You can use either option:

### Option A: paste the URL in the app

1. Open the GitHub Pages app in your browser.
2. Paste the Apps Script Web App URL into the Connection panel.
3. Enter the optional app key if you used one. The app will save these browser settings in local storage using ROT13.
4. Click **Save settings**.
5. Repeat on your tablet/computer because browser local storage is per device.

### Option B: hard-code the URL

Edit `app.js`:

```js
const CONFIG = {
  API_URL_ROT13: "uggcf://fpevcg.tbbtyr.pbz/znpebf/f/LBHE_QRCYBLZRAG_VQ/rkrp",
  APP_KEY_ROT13: ""
};
```

Commit and push the change to GitHub. Every device that opens your GitHub Pages site will use the same backend URL after the app decodes it in the browser.

## GitHub Pages setup

1. Create a GitHub repository.
2. Upload `index.html`, `styles.css`, `app.js`, and optionally this README.
3. Go to **Settings > Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select your branch, usually `main`, and folder `/root`.
6. Save.

## Notes

- This is best for personal/lightweight data.
- ROT13 is obfuscation, not encryption. Do not store passwords, medical data, financial data, or anything sensitive.
- If you change `Code.gs`, create a new Apps Script deployment version or edit the existing deployment so the live `/exec` URL uses the latest code.

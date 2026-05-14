/*
  Google Apps Script backend for the GitHub Pages To Do app.

  Recommended setup:
  1. Create a Google Sheet.
  2. Open Extensions > Apps Script.
  3. Paste this entire file into Code.gs.
  4. Deploy > New deployment > Web app.
  5. Execute as: Me.
  6. Who has access: Anyone.
  7. Copy the Web App URL ending in /exec into app.js or the app's Connection panel.
  8. For one-layer light obfuscation, you can store optional values as ROT13 below.
*/

const SHEET_NAME = 'Todos';
const APP_KEY = ''; // Optional plaintext key. Example: 'my-simple-key'.
const APP_KEY_ROT13 = ''; // Optional ROT13 key. If set, this overrides APP_KEY. Example: 'zl-fvzcyr-xrl'.
const SPREADSHEET_ID = ''; // Optional plaintext ID. Leave blank when this script is bound to the Sheet.
const SPREADSHEET_ID_ROT13 = ''; // Optional ROT13 spreadsheet ID. If set, this overrides SPREADSHEET_ID.

function doGet(e) {
  return handleRequest_(e);
}

function doPost(e) {
  return handleRequest_(e);
}

function handleRequest_(e) {
  const lock = LockService.getScriptLock();

  try {
    lock.waitLock(10000);
    const payload = getPayload_(e);
    checkKey_(payload);

    const action = String(payload.action || 'list').toLowerCase();
    const sheet = getTodoSheet_();

    let result;

    if (action === 'list') {
      result = { ok: true, todos: readTodos_(sheet) };
    } else if (action === 'add') {
      addTodo_(sheet, payload);
      result = { ok: true, todos: readTodos_(sheet) };
    } else if (action === 'update') {
      updateTodo_(sheet, payload);
      result = { ok: true, todos: readTodos_(sheet) };
    } else if (action === 'delete') {
      deleteTodo_(sheet, payload);
      result = { ok: true, todos: readTodos_(sheet) };
    } else {
      throw new Error('Unknown action: ' + action);
    }

    return json_(result);
  } catch (error) {
    return json_({ ok: false, error: error.message || String(error) });
  } finally {
    try {
      lock.releaseLock();
    } catch (ignore) {}
  }
}

function getPayload_(e) {
  if (e && e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents);
    } catch (error) {
      throw new Error('Invalid JSON body.');
    }
  }

  return e && e.parameter ? e.parameter : {};
}

function checkKey_(payload) {
  const expectedKey = getAppKey_();
  if (!expectedKey) return;

  if (String(payload.key || '') !== expectedKey) {
    throw new Error('Invalid app key.');
  }
}

function getAppKey_() {
  return APP_KEY_ROT13 ? rot13_(APP_KEY_ROT13) : APP_KEY;
}

function getSpreadsheetId_() {
  return SPREADSHEET_ID_ROT13 ? rot13_(SPREADSHEET_ID_ROT13) : SPREADSHEET_ID;
}

function rot13_(value) {
  return String(value || '').replace(/[a-z]/gi, function(char) {
    var base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
  }).trim();
}

function getTodoSheet_() {
  const spreadsheetId = getSpreadsheetId_();
  const spreadsheet = spreadsheetId
    ? SpreadsheetApp.openById(spreadsheetId)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('No spreadsheet found. Bind this script to a Sheet or set SPREADSHEET_ID.');
  }

  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  ensureHeaders_(sheet);
  return sheet;
}

function ensureHeaders_(sheet) {
  const headers = ['id', 'text', 'done', 'createdAt', 'updatedAt'];

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }

  const range = sheet.getRange(1, 1, 1, headers.length);
  const current = range.getValues()[0];
  const needsHeaders = headers.some((header, index) => current[index] !== header);

  if (needsHeaders) {
    range.setValues([headers]);
  }
}

function readTodos_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  return sheet
    .getRange(2, 1, lastRow - 1, 5)
    .getValues()
    .filter((row) => row[0])
    .map((row) => ({
      id: String(row[0]),
      text: String(row[1] || ''),
      done: row[2] === true || String(row[2]).toLowerCase() === 'true',
      createdAt: String(row[3] || ''),
      updatedAt: String(row[4] || '')
    }))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function addTodo_(sheet, payload) {
  const text = cleanText_(payload.text);

  if (!text) {
    throw new Error('Task text is required.');
  }

  const now = new Date().toISOString();
  sheet.appendRow([Utilities.getUuid(), text, false, now, now]);
}

function updateTodo_(sheet, payload) {
  const id = requireId_(payload.id);
  const rowNumber = findRowNumber_(sheet, id);
  const now = new Date().toISOString();

  if (Object.prototype.hasOwnProperty.call(payload, 'text')) {
    const text = cleanText_(payload.text);
    if (!text) throw new Error('Task text cannot be blank.');
    sheet.getRange(rowNumber, 2).setValue(text);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'done')) {
    sheet.getRange(rowNumber, 3).setValue(payload.done === true || String(payload.done).toLowerCase() === 'true');
  }

  sheet.getRange(rowNumber, 5).setValue(now);
}

function deleteTodo_(sheet, payload) {
  const id = requireId_(payload.id);
  const rowNumber = findRowNumber_(sheet, id);
  sheet.deleteRow(rowNumber);
}

function findRowNumber_(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) throw new Error('Task not found.');

  const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

  for (let i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) {
      return i + 2;
    }
  }

  throw new Error('Task not found.');
}

function requireId_(id) {
  const cleanId = String(id || '').trim();
  if (!cleanId) throw new Error('Task id is required.');
  return cleanId;
}

function cleanText_(text) {
  return String(text || '').trim().slice(0, 200);
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

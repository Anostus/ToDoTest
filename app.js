// GitHub Pages can only serve static files.
// Put your deployed Google Apps Script /exec URL here after setup,
// but store it with ROT13 so it is not plain text in your repo.
// Example: "https://script.google.com/macros/s/.../exec" becomes
// "uggcf://fpevcg.tbbtyr.pbz/znpebf/f/.../rkrp".
const CONFIG = {
  API_URL_ROT13: "uggcf://fpevcg.tbbtyr.pbz/znpebf/f/NXslpok9CmyJelaABofJse4U7k0hYLHeFlGvawLv58xVMK42gKZpwLctOM3HPTsg4xlSmrZT3N/rkrp",
  APP_KEY_ROT13: "" // Optional. Must match APP_KEY or APP_KEY_ROT13 in apps-script/Code.gs if you use one.
};

const STORAGE_KEYS = {
  apiUrlRot13: "sheetsTodo.apiUrlRot13",
  appKeyRot13: "sheetsTodo.appKeyRot13"
};

// Keeps existing browser settings working if you used the first version of this app.
const LEGACY_STORAGE_KEYS = {
  apiUrl: "sheetsTodo.apiUrl",
  appKey: "sheetsTodo.appKey"
};

const state = {
  todos: [],
  busy: false
};

const els = {
  apiUrlInput: document.querySelector("#apiUrlInput"),
  appKeyInput: document.querySelector("#appKeyInput"),
  saveSettingsButton: document.querySelector("#saveSettingsButton"),
  clearSettingsButton: document.querySelector("#clearSettingsButton"),
  refreshButton: document.querySelector("#refreshButton"),
  todoForm: document.querySelector("#todoForm"),
  todoInput: document.querySelector("#todoInput"),
  todoList: document.querySelector("#todoList"),
  todoTemplate: document.querySelector("#todoTemplate"),
  emptyState: document.querySelector("#emptyState"),
  countText: document.querySelector("#countText"),
  statusText: document.querySelector("#statusText")
};

function rot13(value = "") {
  return String(value).replace(/[a-z]/gi, (char) => {
    const base = char <= "Z" ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
  });
}

function encodeLightly(value) {
  return rot13(String(value || "").trim());
}

function decodeLightly(value) {
  return rot13(String(value || "")).trim();
}

function readRot13Setting(storageKey, configValue, legacyStorageKey) {
  const storedRot13 = localStorage.getItem(storageKey);

  if (storedRot13 !== null) {
    return decodeLightly(storedRot13);
  }

  const legacyValue = localStorage.getItem(legacyStorageKey);

  if (legacyValue !== null) {
    return String(legacyValue).trim();
  }

  return decodeLightly(configValue);
}

function getSettings() {
  return {
    apiUrl: readRot13Setting(STORAGE_KEYS.apiUrlRot13, CONFIG.API_URL_ROT13, LEGACY_STORAGE_KEYS.apiUrl),
    appKey: readRot13Setting(STORAGE_KEYS.appKeyRot13, CONFIG.APP_KEY_ROT13, LEGACY_STORAGE_KEYS.appKey)
  };
}

function setStatus(message, isError = false) {
  els.statusText.textContent = message;
  els.statusText.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function setBusy(isBusy) {
  state.busy = isBusy;
  document.querySelectorAll("button, input").forEach((el) => {
    if (el.id !== "apiUrlInput" && el.id !== "appKeyInput") {
      el.disabled = isBusy;
    }
  });
}

async function apiRequest(action, data = {}) {
  const { apiUrl, appKey } = getSettings();

  if (!apiUrl) {
    throw new Error("Add your Apps Script Web App URL in the Connection panel first.");
  }

  const payload = {
    action,
    key: appKey,
    ...data
  };

  // Do not set custom headers here. A simple text/plain request avoids CORS preflight issues.
  const response = await fetch(apiUrl, {
    method: "POST",
    body: JSON.stringify(payload)
  });

  const text = await response.text();
  let result;

  try {
    result = JSON.parse(text);
  } catch (error) {
    throw new Error("The Apps Script response was not JSON. Check your deployment URL and access settings.");
  }

  if (!response.ok || !result.ok) {
    throw new Error(result.error || `Request failed with status ${response.status}`);
  }

  return result;
}

async function loadTodos() {
  setBusy(true);
  setStatus("Loading tasks…");

  try {
    const result = await apiRequest("list");
    state.todos = result.todos || [];
    renderTodos();
    setStatus("Synced.");
  } catch (error) {
    renderTodos();
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
}

async function addTodo(text) {
  setBusy(true);
  setStatus("Adding task…");

  try {
    const result = await apiRequest("add", { text });
    state.todos = result.todos || [];
    els.todoInput.value = "";
    renderTodos();
    setStatus("Task added.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(false);
    els.todoInput.focus();
  }
}

async function updateTodo(id, updates) {
  setBusy(true);
  setStatus("Updating task…");

  try {
    const result = await apiRequest("update", { id, ...updates });
    state.todos = result.todos || [];
    renderTodos();
    setStatus("Task updated.");
  } catch (error) {
    setStatus(error.message, true);
    await loadTodos();
  } finally {
    setBusy(false);
  }
}

async function deleteTodo(id) {
  setBusy(true);
  setStatus("Deleting task…");

  try {
    const result = await apiRequest("delete", { id });
    state.todos = result.todos || [];
    renderTodos();
    setStatus("Task deleted.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    setBusy(false);
  }
}

function renderTodos() {
  els.todoList.innerHTML = "";

  const incomplete = state.todos.filter((todo) => !todo.done).length;
  els.countText.textContent = `${state.todos.length} total · ${incomplete} open`;
  els.emptyState.hidden = state.todos.length > 0;

  for (const todo of state.todos) {
    const node = els.todoTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = node.querySelector(".todo-checkbox");
    const text = node.querySelector(".todo-text");
    const deleteButton = node.querySelector(".delete-button");

    node.classList.toggle("done", Boolean(todo.done));
    checkbox.checked = Boolean(todo.done);
    text.textContent = todo.text;

    checkbox.addEventListener("change", () => {
      updateTodo(todo.id, { done: checkbox.checked });
    });

    deleteButton.addEventListener("click", () => {
      deleteTodo(todo.id);
    });

    els.todoList.appendChild(node);
  }
}

function hydrateSettingsForm() {
  const { apiUrl, appKey } = getSettings();
  els.apiUrlInput.value = apiUrl;
  els.appKeyInput.value = appKey;
}

els.saveSettingsButton.addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEYS.apiUrlRot13, encodeLightly(els.apiUrlInput.value));
  localStorage.setItem(STORAGE_KEYS.appKeyRot13, encodeLightly(els.appKeyInput.value));
  localStorage.removeItem(LEGACY_STORAGE_KEYS.apiUrl);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.appKey);
  setStatus("Connection settings saved with ROT13 obfuscation in this browser.");
  loadTodos();
});

els.clearSettingsButton.addEventListener("click", () => {
  localStorage.removeItem(STORAGE_KEYS.apiUrlRot13);
  localStorage.removeItem(STORAGE_KEYS.appKeyRot13);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.apiUrl);
  localStorage.removeItem(LEGACY_STORAGE_KEYS.appKey);
  hydrateSettingsForm();
  setStatus("Local connection settings cleared.");
});

els.refreshButton.addEventListener("click", loadTodos);

els.todoForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = els.todoInput.value.trim();
  if (text) addTodo(text);
});

hydrateSettingsForm();
renderTodos();
loadTodos();

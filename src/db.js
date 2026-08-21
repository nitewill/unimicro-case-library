const DB_NAME = "unimicro-application-library";
const DB_VERSION = 3;
const CASE_STORE = "cases";
const REQUEST_STORE = "requests";
const TAXONOMY_STORE = "taxonomies";
const META_STORE = "metadata";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CASE_STORE)) {
        db.createObjectStore(CASE_STORE, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(REQUEST_STORE)) {
        const store = db.createObjectStore(REQUEST_STORE, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt");
      }
      if (!db.objectStoreNames.contains(TAXONOMY_STORE)) {
        db.createObjectStore(TAXONOMY_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });
}

function transact(storeName, mode, callback) {
  return openDatabase().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, mode);
        const store = transaction.objectStore(storeName);
        let result;
        transaction.oncomplete = () => {
          db.close();
          resolve(result);
        };
        transaction.onerror = () => {
          db.close();
          reject(transaction.error);
        };
        result = callback(store);
      }),
  );
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function seedCases(cases) {
  const existing = await getAllCases();
  if (existing.length) return existing;
  await transact(CASE_STORE, "readwrite", (store) => cases.forEach((item) => store.put(item)));
  return cases;
}

export async function seedOfficialDataset(cases, taxonomies, version) {
  const db = await openDatabase();
  const currentVersion = await new Promise((resolve, reject) => {
    const transaction = db.transaction(META_STORE, "readonly");
    const request = transaction.objectStore(META_STORE).get("officialDatasetVersion");
    request.onsuccess = () => resolve(request.result?.value || "");
    request.onerror = () => reject(request.error);
  });

  if (currentVersion !== version) {
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([CASE_STORE, TAXONOMY_STORE, META_STORE], "readwrite");
      const caseStore = transaction.objectStore(CASE_STORE);
      const taxonomyStore = transaction.objectStore(TAXONOMY_STORE);
      caseStore.clear();
      taxonomyStore.clear();
      cases.forEach((item) => caseStore.put(item));
      Object.entries(taxonomies).forEach(([key, values]) => taxonomyStore.put({ key, values }));
      transaction.objectStore(META_STORE).put({ key: "officialDatasetVersion", value: version });
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("真实案例数据初始化失败"));
    });
  }
  db.close();
  return { cases: await getAllCases(), taxonomies: await seedTaxonomies(taxonomies) };
}

export async function getAllCases() {
  const request = await transact(CASE_STORE, "readonly", (store) => requestToPromise(store.getAll()));
  return request;
}

export async function saveCase(applicationCase) {
  await transact(CASE_STORE, "readwrite", (store) => store.put(applicationCase));
  return applicationCase;
}

export async function deleteCase(id) {
  await transact(CASE_STORE, "readwrite", (store) => store.delete(id));
}

export async function getTaxonomies() {
  const records = await transact(TAXONOMY_STORE, "readonly", (store) => requestToPromise(store.getAll()));
  return Object.fromEntries(records.map((record) => [record.key, record.values]));
}

export async function seedTaxonomies(defaults) {
  const existing = await getTaxonomies();
  const merged = { ...defaults, ...existing };
  const missing = Object.entries(defaults).filter(([key]) => !existing[key]);
  if (missing.length) await transact(TAXONOMY_STORE, "readwrite", (store) => missing.forEach(([key, values]) => store.put({ key, values })));
  return merged;
}

export async function saveTaxonomies(taxonomies) {
  await transact(TAXONOMY_STORE, "readwrite", (store) => Object.entries(taxonomies).forEach(([key, values]) => store.put({ key, values })));
  return taxonomies;
}

export async function saveApplicationRequest(payload) {
  const request = {
    ...payload,
    id: crypto.randomUUID(),
    status: "待跟进",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await transact(REQUEST_STORE, "readwrite", (store) => store.put(request));
  return request;
}

export async function getApplicationRequests() {
  const request = await transact(REQUEST_STORE, "readonly", (store) => requestToPromise(store.getAll()));
  return request.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function updateApplicationRequestStatus(id, status) {
  const request = await transact(REQUEST_STORE, "readwrite", async (store) => {
    const current = await requestToPromise(store.get(id));
    if (!current) throw new Error("未找到该应用需求");
    const updated = { ...current, status, updatedAt: new Date().toISOString() };
    store.put(updated);
    return updated;
  });
  return request;
}

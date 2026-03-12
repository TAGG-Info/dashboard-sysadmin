'use strict';
// ============ CONFIG ============
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

const CONFIG = {
  clientId: 'bfe4e208-6801-4e19-9325-21a3d333ff98',
  tenantId: '57f51722-d719-49b3-ad2e-a65959ef8a91',
  siteUrl: 'tagginfo.sharepoint.com:/sites/TechResearchPWF',
  scopes: ['Sites.ReadWrite.All'],
  lists: {
    main: 'CommandesControleur',
    receptions: 'ReceptionMateriel',
    maintenances: 'Maintenances',
    factMateriel: 'FacturationMateriel',
    factLicence: 'FacturationLicence',
    cmdClientSup: 'CommandesClientSup',
    cmdFournSup: 'CommandesFournisseurSup',
  }
};

// Reference lists: SharePoint list name → { column, label }
const REF_LISTS = {
  Demandeurs:         { column: 'Demandeur',        label: 'Demandeurs' },
  MaterielControleur: { column: 'TypeMateriel',     label: 'Types de matériel' },
  GarantieMateriel:   { column: 'GarantieMateriel', label: 'Garanties materiel' },
  TypeControleur:     { column: 'TypeControleur',   label: 'Types de controleur' },
  TypeMachine:        { column: 'TypeMachine',      label: 'Types de machine' },
  TypeMaintenance:    { column: 'TypeMaintenance',  label: 'Types de maintenance' },
  TypeLicence:        { column: 'TypeLicence',      label: 'Types de licence' },
  EtatCommande:       { column: 'EtatCommande',     label: 'États de commande' },
};

// Maps field names → ref list name (for select dropdowns)
const FIELD_REF_MAP = {
  DemandeurFabricant: 'Demandeurs',
  DemandeurDestockage: 'Demandeurs',
  TypeControleur: 'TypeControleur',
  TypeMachineLicence: 'TypeMachine',
  GarantieCommande: 'GarantieMateriel',
  EtatCommande: 'EtatCommande',
};

// Maps field names → 'distinct' to extract unique values from existing data
const FIELD_DISTINCT_MAP = {
  PaysExpedition: 'main',
  TypeCommandeFabricant: 'main',
  NomClient: 'main',
  NomClientFinal: 'main',
  NomFournisseur: 'main',
  NomTransporteur: 'main',
};

// Sub-list fields → ref list name
const SUB_FIELD_REF_MAP = {
  TypeMateriel: 'MaterielControleur',
  GarantieMateriel: 'GarantieMateriel',
  TypeMaintenance: 'TypeMaintenance',
  TypeLicence: 'TypeLicence',
};

let refData = {};  // { listName: ['value1', 'value2', ...] }
let distinctData = {};  // { fieldName: ['value1', 'value2', ...] }

// Field schemas for edit forms: [fieldName, label, type]
// type: text | date | currency | number | textarea | boolean | select | suggest | pj
const GENERAL_SCHEMA = [
  { section: 'Commande Client', fields: [
    ['EtatCommande', 'État de la commande', 'select'],
    ['DemandeurFabricant', 'Demandeur', 'select'],
    ['DateCommandeFabricant', 'Date de la commande Client', 'date'],
    ['NoCommandeFabricant', 'N° de commande Client', 'text'],
    ['NomClient', 'Client', 'suggest'],
    ['TypeCommandeFabricant', 'Type de commande', 'suggest'],
    ['GarantieCommande', 'Garantie', 'select'],
    ['TypeControleur', 'Type de controleur', 'select'],
    ['NoControleur', 'N° de controleur', 'text'],
    ['MontantCommandeMateriel', 'Montant commande matériel', 'currency'],
    ['PJ_CommandeFabricant', 'Commande materiel', 'pj'],
    ['MontantCommandeLogiciel', 'Montant commande logiciel', 'currency'],
    ['PJ_CommandeClientLogiciel', 'Commande logiciel', 'pj'],
    ['MontantCommandePDF', 'Montant commande PDF', 'currency'],
    ['MontantCommandeClient', 'Total commande', 'currency'],
    ['CommentaireCommandeClient', 'Commentaire', 'textarea'],
  ]},
  { section: 'Commande Fournisseur', fields: [
    ['DateCommandeFournisseur', 'Date de la commande fournisseur', 'date'],
    ['NoCommandeFournisseur', 'N° de commande TagG', 'text'],
    ['NomFournisseur', 'Fournisseur', 'suggest'],
    ['MontantCommandeFournisseur', 'Montant de la commande', 'currency'],
    ['PJ_CommandeFournisseur', 'Commande fournisseur', 'pj'],
    ['NoFactureFournisseur', 'N° de facture fournisseur', 'text'],
    ['DateReceptionFactureFournisseur', 'Date de facture', 'date'],
    ['NoFactureChronoFournisseur', 'N° de facture chrono', 'text'],
    ['MontantFactureFournisseur', 'Montant de la facture HT', 'currency'],
    ['PJ_FactureFournisseur', 'Facture fournisseur', 'pj'],
    ['CommentaireCommandeFournisseur', 'Commentaire', 'textarea'],
  ]},
  { section: 'Expedition', fields: [
    ['NomClientFinal', 'Nom du client final', 'suggest'],
    ['AdresseClient', 'Adresse', 'textarea'],
    ['PaysExpedition', 'Pays', 'suggest'],
    ['NomContact', 'Contact - Nom', 'text'],
    ['MailContact', 'Contact - Mail', 'text'],
    ['TelContact', 'Contact - Tel', 'text'],
    ['DateExpedition', 'Date d\'expédition', 'date'],
    ['PJ_BlTransport', 'BL', 'pj'],
    ['NomTransporteur', 'Transporteur', 'suggest'],
    ['NoSuiviTransport', 'N° de suivi', 'text'],
    ['MontantTransport', 'Montant du transport', 'currency'],
    ['MontantTransportFact', 'Montant facture', 'currency'],
  ]},
  { section: 'Licence', fields: [
    ['IDMachineLicence', 'ID de la machine', 'text'],
    ['TypeMachineLicence', 'Type de machine', 'select'],
    ['IDDungleIPDS', 'ID du dungle IPDS', 'text'],
    ['OptionPDF', 'Option PDF', 'boolean'],
    ['MontantOptionPDF', 'Montant', 'currency'],
    ['PJ_FicheMiseEnService', 'Fiche de mise en service', 'pj'],
    ['CommentaireLicence', 'Commentaire', 'textarea'],
  ]},
  { section: 'Destockage', fields: [
    ['DateCommandeDestockage', 'Date', 'date'],
    ['DemandeurDestockage', 'Demandeur', 'select'],
    ['NoCommandeDestockage', 'N° de commande', 'text'],
    ['PJ_CommandeDestockage', 'Commande destockage', 'pj'],
  ]},
  { section: 'Commentaires', fields: [
    ['CommentaireMateriel', 'Commentaire materiel', 'textarea'],
    ['CommentaireMaintenance', 'Commentaire maintenance', 'textarea'],
  ]},
];

const SUB_SCHEMAS = {
  receptions: { list: 'receptions', title: 'Réception matériel et Garantie', fields: [
    ['TypeMateriel', 'Type', 'select'],
    ['NoSerieMateriel', 'N° de serie', 'text'],
    ['GarantieMateriel', 'Garantie', 'select'],
    ['PJ_BLReception', 'BL', 'pj'],
  ]},
  maintenances: { list: 'maintenances', title: 'Maintenance', fields: [
    ['TypeMaintenance', 'Type de maintenance', 'select'],
    ['DateDebutMaintenance', 'Date de début', 'date'],
    ['DateFinMaintenance', 'Date de fin', 'date'],
    ['NoFactureMaintenance', 'N° de facture TagG', 'text'],
    ['DateFactureMaintenance', 'Date de la facture', 'date'],
    ['MontantFactureMaintenance', 'Montant de la facture', 'currency'],
    ['DateAlerteMaintenance', 'Date alerte', 'date'],
  ]},
  factMat: { list: 'factMateriel', title: 'Facturation Hardware', fields: [
    ['NoFactureMateriel', 'N° de facture TagG', 'text'],
    ['DateFactureMateriel', 'Date de la facture', 'date'],
    ['MontantFactureMateriel', 'Montant de la facture', 'currency'],
    ['PJ_FactureMateriel', 'Facture', 'pj'],
  ]},
  factLic: { list: 'factLicence', title: 'Facturation Software', fields: [
    ['TypeLicence', 'Type de licence', 'select'],
    ['NoFactureLicence', 'N° de facture TagG', 'text'],
    ['DateFactureLicence', 'Date de la facture', 'date'],
    ['MontantFactureLicence', 'Montant de la facture', 'currency'],
    ['PJ_FactureLicence', 'Facture', 'pj'],
  ]},
  cmdClient: { list: 'cmdClientSup', title: 'Commande supplémentaire Client', fields: [
    ['MontantCommandeClientSup', 'Montant commande', 'currency'],
    ['CommentaireCommandeClientSup', 'Commentaire', 'textarea'],
  ]},
  cmdFourn: { list: 'cmdFournSup', title: 'Commande supplémentaire Fournisseur', fields: [
    ['MontantCommandeFournisseurSup', 'Montant commande', 'currency'],
    ['CommentaireCommandeFournisseurSup', 'Commentaire', 'textarea'],
  ]},
};

const TABS = [
  { id: 'General', label: 'Général', panel: 'panelGeneral' },
  { id: 'Receptions', label: 'Réceptions', panel: 'panelReceptions' },
  { id: 'Maintenances', label: 'Maintenances', panel: 'panelMaintenances' },
  { id: 'Factures', label: 'Factures', panel: 'panelFactures' },
  { id: 'CmdSup', label: 'Cmd Sup', panel: 'panelCmdSup' },
  { id: 'PJ', label: 'PJ', panel: 'panelPJ' },
];

// ============ MSAL ============
const msalConfig = {
  auth: {
    clientId: CONFIG.clientId,
    authority: `https://login.microsoftonline.com/${CONFIG.tenantId}`,
    redirectUri: window.location.origin + window.location.pathname,
  },
  cache: { cacheLocation: 'sessionStorage' }
};
const msalInstance = new msal.PublicClientApplication(msalConfig);
let accessToken = null;
let siteId = null;

// Data
let allCommandes = [];
let subData = {};
let currentCommande = null;
let currentTab = 'General';
let editMode = false;
let isNewCommande = false;
let isAdmin = false;
let currentUserDisplayName = ''; // 'Prénom NOM' from Admins list

// ============ AUTH ============
async function init() {
  try {
    await msalInstance.handleRedirectPromise();
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) await authenticate(accounts[0]);
  } catch (e) {
    const el = document.getElementById('authError');
    if (el) { el.textContent = e.message; el.style.display = 'block'; }
  }
}

async function login() {
  try { await msalInstance.loginRedirect({ scopes: CONFIG.scopes }); }
  catch (e) {
    document.getElementById('authError').textContent = e.message;
    document.getElementById('authError').style.display = 'block';
  }
}

async function authenticate(account) {
  try {
    const tokenResponse = await msalInstance.acquireTokenSilent({ scopes: CONFIG.scopes, account });
    accessToken = tokenResponse.accessToken;
    document.getElementById('authScreen').style.display = 'none';
    document.getElementById('app').classList.add('visible');
    isAdmin = await checkAdmin(account.username);
    if (!currentUserDisplayName) currentUserDisplayName = account.name || account.username;
    document.getElementById('userName').textContent = currentUserDisplayName;
    const rb = document.getElementById('roleBadge');
    if (rb) rb.textContent = isAdmin ? 'Admin' : 'Lecteur';
    applyAccessMode();
    await loadData();
  } catch (e) {
    if (e instanceof msal.InteractionRequiredAuthError) {
      await msalInstance.loginRedirect({ scopes: CONFIG.scopes });
    } else {
      const el = document.getElementById('authError');
      if (el) { el.textContent = e.message; el.style.display = 'block'; }
    }
  }
}

function logout() { msalInstance.logoutRedirect(); }

// ============ THEME ============
function toggleTheme() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const newTheme = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  document.getElementById('btnTheme').textContent = newTheme === 'dark' ? '☀️' : '🌙';
}

// Apply saved theme on load
(function() {
  const saved = localStorage.getItem('theme') || 'light';
  if (saved === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.addEventListener('DOMContentLoaded', () => {
      const btn = document.getElementById('btnTheme');
      if (btn) btn.textContent = '☀️';
    });
  }
})();

// ============ GRAPH API ============
async function ensureToken() {
  try {
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length === 0) throw new Error('No account');
    const resp = await msalInstance.acquireTokenSilent({ scopes: CONFIG.scopes, account: accounts[0] });
    accessToken = resp.accessToken;
  } catch (e) {
    console.warn('[Token] Silent refresh failed, redirecting...', e);
    msalInstance.acquireTokenRedirect({ scopes: CONFIG.scopes });
  }
}

async function graphFetch(url, options = {}) {
  await ensureToken();
  const headers = { 'Authorization': `Bearer ${accessToken}`, 'Prefer': 'HonorNonIndexedQueriesWarningMayFailRandomly', ...options.headers };
  const res = await fetch(`${GRAPH_BASE}${url}`, { ...options, headers });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Graph ${options.method || 'GET'} ${res.status}: ${errText}`);
  }
  return res;
}

async function graphGet(url) {
  const res = await graphFetch(url);
  return res.json();
}

async function graphPost(url, body) {
  const res = await graphFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function graphPatch(url, body) {
  const res = await graphFetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function graphDelete(url) {
  await graphFetch(url, { method: 'DELETE' });
}

async function uploadFileToDrive(noControleur, folderName, file) {
  if (!isAdmin) return;
  const sid = await getSiteId();
  const folderPath = `PiecesJointes_Controleur/${encodeURIComponent(noControleur)}/${encodeURIComponent(folderName)}`;
  const safeFileName = file.name.replace(/[#%]/g, '_');
  const res = await graphFetch(`/sites/${sid}/drive/root:/${folderPath}/${encodeURIComponent(safeFileName)}:/content`, {
    method: 'PUT',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file
  });
  const item = await res.json();
  delete pjCache[noControleur];
  return item.webUrl;
}

// Open a sub-table PJ (stored as webUrl) via Graph API download URL → modal
async function openSubPJ(webUrl) {
  if (!webUrl) return;
  try {
    const sid = await getSiteId();
    const decoded = decodeURIComponent(webUrl);
    const marker = '/Shared Documents/';
    const idx = decoded.indexOf(marker);
    if (idx === -1) { window.open(webUrl, '_blank'); return; }
    const relPath = decoded.substring(idx + marker.length);
    const encodedPath = relPath.split('/').map(encodeURIComponent).join('/');
    const item = await graphGet(`/sites/${sid}/drive/root:/${encodedPath}`);
    const b = {
      label: 'Facture', name: item.name,
      webUrl: item.webUrl || '',
      downloadUrl: item['@microsoft.graph.downloadUrl'] || '',
      driveItemId: item.id,
      mimeType: item.file?.mimeType || '',
    };
    const i = currentPJButtons.length;
    currentPJButtons.push(b);
    openPJModal(i);
  } catch (e) {
    toast('Erreur ouverture: ' + e.message.substring(0, 80), 'error');
  }
}

// Upload a PJ from an inline form field (general edit or PJ tab)
async function uploadPJFromForm(input, noControleur, folderName) {
  if (!isAdmin) return;
  if (!input.files?.[0]) return;
  const file = input.files[0];
  const label = input.closest('.form-field, .pj-upload-section');
  const nameDisplay = label?.querySelector('.file-name-display');
  input.disabled = true;
  if (nameDisplay) nameDisplay.textContent = 'Upload en cours...';
  try {
    const webUrl = await uploadFileToDrive(noControleur, folderName, file);
    const filled = await autoFillPJField(folderName, webUrl);
    toast(filled ? 'PJ ajoutée et champ mis à jour' : 'PJ ajoutée');
    if (currentCommande) {
      await renderPJ(currentCommande);
      renderGeneral(currentCommande);
    }
  } catch (e) {
    toast('Erreur upload: ' + e.message.substring(0, 80), 'error');
  }
  input.value = '';
  input.disabled = false;
  if (nameDisplay) nameDisplay.textContent = '';
}

async function getSiteId() {
  if (siteId) return siteId;
  const site = await graphGet(`/sites/${CONFIG.siteUrl}`);
  siteId = site.id;
  return siteId;
}

// Returns items WITH _spItemId for PATCH/DELETE
// Accepts either a config key ('main') or actual list name ('CommandesControleur')
async function getListItems(listKey) {
  const listName = CONFIG.lists[listKey] || listKey;
  const sid = await getSiteId();
  let items = [];
  let url = `/sites/${sid}/lists/${listName}/items?expand=fields&$top=999`;
  while (url) {
    const data = await graphGet(url);
    items = items.concat(data.value || []);
    url = data['@odata.nextLink'] ? data['@odata.nextLink'].replace(GRAPH_BASE, '') : null;
  }
  return items.map(i => ({ ...i.fields, _spItemId: i.id }));
}

// Returns items filtered by NoControleur using OData $filter (server-side)
async function getFilteredListItems(listKey, noControleur) {
  const listName = CONFIG.lists[listKey] || listKey;
  const sid = await getSiteId();
  let items = [];
  const safeNo = noControleur.replace(/'/g, "''");
  let url = `/sites/${sid}/lists/${listName}/items?expand=fields&$top=999&$filter=fields/NoControleur eq '${safeNo}'`;
  while (url) {
    const data = await graphGet(url);
    items = items.concat(data.value || []);
    url = data['@odata.nextLink'] ? data['@odata.nextLink'].replace(GRAPH_BASE, '') : null;
  }
  return items.map(i => ({ ...i.fields, _spItemId: i.id }));
}

// ============ ADMIN CHECK ============
async function checkAdmin(email) {
  try {
    const sid = await getSiteId();
    const safeEmail = email.replace(/'/g, "''");
    const url = `/sites/${sid}/lists/Admins/items?expand=fields&$top=1&$filter=fields/UserEmail eq '${safeEmail}'`;
    const data = await graphGet(url);
    if (data.value && data.value.length > 0) {
      const f = data.value[0].fields || {};
      if (f.Prenom || f.Nom) {
        currentUserDisplayName = `${f.Prenom || ''} ${(f.Nom || '').toUpperCase()}`.trim();
      }
      return true;
    }
    // Anti-lockout: if list is empty, grant admin
    const allUrl = `/sites/${sid}/lists/Admins/items?$top=1`;
    const allData = await graphGet(allUrl);
    return !(allData.value && allData.value.length > 0);
  } catch (e) {
    console.warn('Admin check failed, defaulting to admin:', e);
    return true;
  }
}

function applyAccessMode() {
  // Hide edit buttons in read-only mode
  const editElements = [
    document.getElementById('btnEdit'),
    document.querySelector('.btn-new'),
    document.querySelector('button[onclick="openAdmin()"]'),
    document.getElementById('btnAdmins'),
  ];
  editElements.forEach(el => { if (el) el.style.display = isAdmin ? '' : 'none'; });

  // Role badge in topbar (styled via .role-badge CSS class)
  const badge = document.getElementById('roleBadge');
  if (badge) badge.textContent = isAdmin ? 'Admin' : 'Lecteur';
}

// ============ WRITE OPERATIONS ============
async function createListItem(listKey, fields) {
  const sid = await getSiteId();
  const listName = CONFIG.lists[listKey] || listKey;
  const clean = cleanFieldsForWrite(fields);
  if (clean.NoControleur) clean.Title = clean.NoControleur;
  const result = await graphPost(`/sites/${sid}/lists/${listName}/items`, { fields: clean });
  return { ...result.fields, _spItemId: result.id };
}

async function updateListItem(listKey, itemId, fields) {
  const sid = await getSiteId();
  const listName = CONFIG.lists[listKey] || listKey;
  const clean = cleanFieldsForWrite(fields);
  await graphPatch(`/sites/${sid}/lists/${listName}/items/${itemId}/fields`, clean);
}

async function deleteListItem(listKey, itemId) {
  const sid = await getSiteId();
  const listName = CONFIG.lists[listKey] || listKey;
  await graphDelete(`/sites/${sid}/lists/${listName}/items/${itemId}`);
}

function cleanFieldsForWrite(fields) {
  const clean = {};
  for (const [k, v] of Object.entries(fields)) {
    if (k.startsWith('_') || k === 'id' || v === undefined) continue;
    clean[k] = v;
  }
  return clean;
}

// ============ LOAD DATA ============
async function loadData() {
  try {
    const [commandes] = await Promise.all([getListItems('main'), loadRefLists()]);
    allCommandes = commandes;
    allCommandes.sort((a, b) => (b.NoControleur || '').localeCompare(a.NoControleur || ''));
    buildDistinctData();
    buildEtatFilter();
    renderList(allCommandes);
  } catch (e) {
    document.getElementById('listContainer').innerHTML = `<div style="padding:16px;color:#d13438;">Erreur: ${esc(e.message)}</div>`;
    console.error(e);
  }
}

// ============ REFERENCE LISTS ============
async function loadRefLists() {
  const promises = Object.entries(REF_LISTS).map(async ([listName, cfg]) => {
    try {
      const items = await getListItems(listName);
      refData[listName] = items.map(i => i[cfg.column] || i.Title || '').filter(Boolean);
      refData[listName].sort((a, b) => a.localeCompare(b, 'fr'));
      // Store raw items for admin (need _spItemId for delete)
      refData['_raw_' + listName] = items;
    } catch (e) {
      console.error(`[ref] Failed to load ${listName}:`, e);
      refData[listName] = [];
      refData['_raw_' + listName] = [];
    }
  });
  await Promise.all(promises);
}

function buildDistinctData() {
  for (const [field, source] of Object.entries(FIELD_DISTINCT_MAP)) {
    if (source === 'main') {
      distinctData[field] = [...new Set(allCommandes.map(c => c[field]).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'fr'));
    }
  }
}

function getOptionsForField(field) {
  // Check if field maps to a reference list (select)
  const refList = FIELD_REF_MAP[field] || SUB_FIELD_REF_MAP[field];
  if (refList && refData[refList]) return refData[refList];
  // Check if field maps to distinct values (suggest)
  if (distinctData[field]) return distinctData[field];
  return [];
}

// ============ ADMIN PANEL ============
let adminCurrentTab = null;

function openAdmin() {
  if (!isAdmin) return;
  const modal = document.getElementById('adminModal');
  modal.classList.add('visible');
  const tabs = Object.entries(REF_LISTS);
  adminCurrentTab = adminCurrentTab || tabs[0][0];
  renderAdminTabs();
  renderAdminBody();
}

function closeAdmin() {
  document.getElementById('adminModal').classList.remove('visible');
}

function renderAdminTabs() {
  document.getElementById('adminTabs').innerHTML = Object.entries(REF_LISTS).map(([key, cfg]) =>
    `<div class="admin-tab ${key === adminCurrentTab ? 'active' : ''}" onclick="switchAdminTab('${key}')">${cfg.label} (${(refData[key] || []).length})</div>`
  ).join('');
}

function switchAdminTab(key) {
  adminCurrentTab = key;
  renderAdminTabs();
  renderAdminBody();
}

function renderAdminBody() {
  const key = adminCurrentTab;
  const items = refData[key] || [];
  const rawItems = refData['_raw_' + key] || [];
  const body = document.getElementById('adminBody');
  body.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <span class="admin-count" style="margin:0;">${items.length} element(s)</span>
      ${items.length > 0 ? '<button class="btn btn-danger btn-sm" data-action="deleteAll">Tout supprimer</button>' : ''}
    </div>
    <ul class="admin-list">
      ${items.map((val, i) => {
        const raw = rawItems[i];
        const itemId = raw ? raw._spItemId : '';
        return `<li data-idx="${i}" data-item-id="${esc(itemId)}"><span class="admin-val">${esc(val)}</span><div class="admin-item-actions"><button class="admin-edit" title="Modifier" data-action="editRef" data-item-id="${esc(itemId)}" data-idx="${i}">&#9998;</button><button class="admin-del" title="Supprimer" data-action="deleteRef" data-item-id="${esc(itemId)}" data-idx="${i}">&#128465;</button></div></li>`;
      }).join('')}
    </ul>
    <div class="admin-add">
      <input type="text" id="adminNewValue" placeholder="Nouvelle valeur...">
      <button class="btn btn-primary btn-sm" data-action="addRef">Ajouter</button>
      <button class="btn btn-secondary btn-sm" data-action="toggleBulk">Import en masse</button>
    </div>
    <div id="bulkImportZone" style="display:none; margin-top:12px; padding-top:12px; border-top:1px solid #e0e0e0;">
      <textarea id="bulkImportText" style="width:100%;height:120px;padding:8px;font-size:13px;border:1px solid #d0d0d0;border-radius:4px;font-family:inherit;resize:vertical;" placeholder="Coller les valeurs ici (une par ligne)..."></textarea>
      <div style="display:flex;gap:8px;margin-top:8px;align-items:center;">
        <button class="btn btn-primary btn-sm" data-action="bulkImport">Importer tout</button>
        <span id="bulkImportStatus" style="font-size:12px;color:#605e5c;"></span>
      </div>
    </div>`;
  // Event delegation for admin actions
  body.onclick = function(e) {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'deleteAll') deleteAllRefItems(key);
    else if (action === 'deleteRef') deleteRefItem(key, btn.dataset.itemId, parseInt(btn.dataset.idx));
    else if (action === 'editRef') startEditRefItem(key, btn.dataset.itemId, parseInt(btn.dataset.idx));
    else if (action === 'saveRef') saveEditRefItem(key, btn.dataset.itemId, parseInt(btn.dataset.idx));
    else if (action === 'cancelRef') renderAdminBody();
    else if (action === 'addRef') addRefItem(key);
    else if (action === 'toggleBulk') toggleBulkImport(key);
    else if (action === 'bulkImport') bulkImport(key);
  };
  document.getElementById('adminNewValue').onkeydown = function(e) { if (e.key === 'Enter') addRefItem(key); };
}

async function addRefItem(listName) {
  const input = document.getElementById('adminNewValue');
  const val = input.value.trim();
  if (!val) return;
  const existing = refData[listName] || [];
  if (existing.some(v => v.toLowerCase() === val.toLowerCase())) {
    toast(`"${val}" existe déjà`, 'error');
    return;
  }
  const cfg = REF_LISTS[listName];
  try {
    const fields = {};
    fields[cfg.column] = val;
    fields.Title = val;
    const item = await createListItem(listName, fields);
    refData[listName].push(val);
    refData[listName].sort((a, b) => a.localeCompare(b, 'fr'));
    refData['_raw_' + listName].push(item);
    refData['_raw_' + listName].sort((a, b) => (a[cfg.column] || '').localeCompare(b[cfg.column] || '', 'fr'));
    input.value = '';
    renderAdminTabs();
    renderAdminBody();
    toast(`"${val}" ajouté`, 'success');
  } catch (e) {
    console.error('addRefItem error:', e);
    toast('Erreur: ' + e.message, 'error');
  }
}

async function deleteRefItem(listName, itemId, idx) {
  if (!itemId) return;
  const val = refData[listName][idx];
  if (!await customConfirm(`Supprimer "${val}" ?`)) return;
  try {
    await deleteListItem(listName, itemId);
    refData[listName].splice(idx, 1);
    refData['_raw_' + listName].splice(idx, 1);
    renderAdminTabs();
    renderAdminBody();
    toast(`"${val}" supprimé`, 'success');
  } catch (e) {
    console.error('deleteRefItem error:', e);
    toast('Erreur: ' + e.message, 'error');
  }
}

function startEditRefItem(listName, itemId, idx) {
  const li = document.querySelector(`#adminBody li[data-idx="${idx}"]`);
  if (!li) return;
  const currentVal = refData[listName][idx] || '';
  li.innerHTML = `<input class="admin-edit-input" type="text" value="${esc(currentVal)}" style="flex:1;padding:4px 8px;font-size:13px;border:1px solid #0078d4;border-radius:4px;">` +
    `<div class="admin-item-actions">` +
    `<button class="admin-save" title="Enregistrer" data-action="saveRef" data-item-id="${esc(itemId)}" data-idx="${idx}">&#10003;</button>` +
    `<button class="admin-cancel" title="Annuler" data-action="cancelRef">&#10007;</button>` +
    `</div>`;
  const input = li.querySelector('input');
  input.focus();
  input.select();
  input.onkeydown = function(e) {
    if (e.key === 'Enter') saveEditRefItem(listName, itemId, idx);
    else if (e.key === 'Escape') renderAdminBody();
  };
}

async function saveEditRefItem(listName, itemId, idx) {
  const li = document.querySelector(`#adminBody li[data-idx="${idx}"]`);
  if (!li) return;
  const input = li.querySelector('input');
  const newVal = input ? input.value.trim() : '';
  if (!newVal) return;
  const oldVal = refData[listName][idx];
  if (newVal === oldVal) { renderAdminBody(); return; }
  const cfg = REF_LISTS[listName];
  try {
    const fields = {};
    fields[cfg.column] = newVal;
    fields.Title = newVal;
    await updateListItem(listName, itemId, fields);
    refData[listName][idx] = newVal;
    refData[listName].sort((a, b) => a.localeCompare(b, 'fr'));
    const rawIdx = refData['_raw_' + listName].findIndex(r => r._spItemId === itemId);
    if (rawIdx !== -1) {
      refData['_raw_' + listName][rawIdx][cfg.column] = newVal;
      refData['_raw_' + listName][rawIdx].Title = newVal;
    }
    renderAdminTabs();
    renderAdminBody();
    toast(`"${oldVal}" renommé en "${newVal}"`, 'success');
  } catch (e) {
    console.error('saveEditRefItem error:', e);
    toast('Erreur: ' + e.message, 'error');
  }
}

async function deleteAllRefItems(listName) {
  const items = refData['_raw_' + listName] || [];
  if (items.length === 0) return;
  if (!await customConfirm(`Supprimer les ${items.length} éléments de "${REF_LISTS[listName].label}" ?`, 'Tout supprimer')) return;
  let deleted = 0;
  for (const item of [...items]) {
    try {
      await deleteListItem(listName, item._spItemId);
      deleted++;
    } catch (e) {
      console.error(`deleteAll error:`, e);
      toast(`Erreur après ${deleted}/${items.length} suppressions : ${e.message}`, 'error');
      break;
    }
  }
  // Reload from server to stay in sync after partial or full delete
  try {
    await loadRefLists();
  } catch (e) { console.warn('Reload ref lists failed:', e); }
  renderAdminTabs();
  renderAdminBody();
  if (deleted === items.length) toast(`${deleted} élément(s) supprimé(s)`, 'success');
  else toast(`${deleted}/${items.length} supprimé(s) — liste rechargée`, 'error');
}

function toggleBulkImport(listName) {
  const zone = document.getElementById('bulkImportZone');
  zone.style.display = zone.style.display === 'none' ? 'block' : 'none';
}

async function bulkImport(listName) {
  if (!isAdmin) return;
  const textarea = document.getElementById('bulkImportText');
  const status = document.getElementById('bulkImportStatus');
  // Clean SharePoint UI noise from copy-paste
  const stripSuffix = / ?(ouvrir le menu|open menu|modifier|edit|supprimer|delete|\.\.\.|\u2026)$/gi;
  const noiseLine = /^(s[ée]lectionner ou d[ée]s[ée]lectionner.*|select or deselect.*|ouvrir le menu|open menu|modifier|edit|supprimer|delete|afficher|actions|cet [ée]l[ée]ment|this item|\.\.\.|\u2026|\s*)$/i;
  const stripHtml = /<[^>]+>/g;
  const lines = textarea.value.split('\n')
    .map(l => l.trim().replace(stripHtml, '').replace(stripSuffix, '').trim())
    .filter(l => l && !noiseLine.test(l));
  if (lines.length === 0) { status.textContent = 'Aucune valeur détectée après nettoyage.'; return; }

  // Filter out duplicates (already in the list)
  const existing = new Set((refData[listName] || []).map(v => v.toLowerCase()));
  const newValues = lines.filter(v => !existing.has(v.toLowerCase()));

  if (newValues.length === 0) {
    status.textContent = 'Toutes les valeurs existent déjà.';
    return;
  }

  const cfg = REF_LISTS[listName];
  let added = 0;
  status.textContent = `Import en cours... 0/${newValues.length}`;

  for (const val of newValues) {
    try {
      const fields = {};
      fields[cfg.column] = val;
      fields.Title = val;
      const item = await createListItem(listName, fields);
      refData[listName].push(val);
      refData['_raw_' + listName].push(item);
      added++;
      status.textContent = `Import en cours... ${added}/${newValues.length}`;
    } catch (e) {
      console.error(`bulkImport error for "${val}":`, e);
      status.textContent = `Erreur sur "${val}": ${e.message}`;
    }
  }

  refData[listName].sort((a, b) => a.localeCompare(b, 'fr'));
  refData['_raw_' + listName].sort((a, b) => {
    const aVal = a[cfg.column] || a.Title || '';
    const bVal = b[cfg.column] || b.Title || '';
    return aVal.localeCompare(bVal, 'fr');
  });

  textarea.value = '';
  renderAdminTabs();
  renderAdminBody();
  toast(`${added} élément(s) ajouté(s)`, 'success');
}

// ============ ACCESS PANEL (Admins + Utilisateurs) ============
let adminsData = []; // [{ email, prenom, nom, _spItemId }]
let usersData = [];  // [{ email, prenom, nom, _spItemId }]
let accessActiveTab = 'admins'; // 'admins' | 'users'

function openAdminsPanel() {
  if (!isAdmin) return;
  document.getElementById('adminsModal').classList.add('visible');
  renderAccessTabs();
  loadAccessTab();
}

function closeAdminsPanel() {
  document.getElementById('adminsModal').classList.remove('visible');
}

function renderAccessTabs() {
  document.getElementById('accessTabs').innerHTML = [
    { key: 'admins', label: 'Administrateurs', count: adminsData.length },
    { key: 'users', label: 'Utilisateurs', count: usersData.length },
  ].map(t => `<div class="admin-tab ${t.key === accessActiveTab ? 'active' : ''}" onclick="switchAccessTab('${t.key}')">${t.label} (${t.count})</div>`).join('');
}

function switchAccessTab(tab) {
  accessActiveTab = tab;
  renderAccessTabs();
  loadAccessTab();
}

async function loadAccessTab() {
  const body = document.getElementById('adminsBody');
  body.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement...</div>';
  const listName = accessActiveTab === 'admins' ? 'Admins' : 'Utilisateurs';
  try {
    const items = await getListItems(listName);
    const data = items.map(i => ({ email: i.UserEmail || i.Title || '', prenom: i.Prenom || '', nom: i.Nom || '', _spItemId: i._spItemId }));
    data.sort((a, b) => a.email.localeCompare(b.email, 'fr'));
    if (accessActiveTab === 'admins') adminsData = data; else usersData = data;
    renderAccessTabs();
    renderAccessList();
  } catch (e) {
    body.innerHTML = '<div style="color:var(--red);padding:8px;">Erreur: ' + esc(e.message) + '</div>';
  }
}

function getAccessData() { return accessActiveTab === 'admins' ? adminsData : usersData; }
function getAccessLabel() { return accessActiveTab === 'admins' ? 'administrateur' : 'utilisateur'; }
function getAccessListName() { return accessActiveTab === 'admins' ? 'Admins' : 'Utilisateurs'; }

function renderAccessList() {
  const body = document.getElementById('adminsBody');
  const data = getAccessData();
  const label = getAccessLabel();
  body.innerHTML = `
    <div style="margin-bottom:8px;">
      <span class="admin-count">${data.length} ${label}(s)</span>
    </div>
    <ul class="admin-list">
      ${data.map((a, i) => {
        const displayName = (a.prenom || a.nom) ? `${a.prenom} ${a.nom.toUpperCase()}`.trim() : '';
        return `
        <li data-idx="${i}">
          <span class="admin-val">${displayName ? esc(displayName) + ' <span style="color:var(--text-tertiary);font-size:11px;">(' + esc(a.email) + ')</span>' : esc(a.email)}</span>
          <div class="admin-item-actions">
            <button class="admin-edit" title="Modifier" onclick="editAccessItem(${i})">&#9998;</button>
            <button class="admin-del" title="Retirer" onclick="removeAccessItem('${esc(a._spItemId)}', ${i})">&#128465;</button>
          </div>
        </li>`;
      }).join('')}
    </ul>
    <div class="admin-add" style="flex-wrap:wrap;">
      <input type="text" id="accessNewPrenom" placeholder="Prénom" style="flex:0 1 120px;">
      <input type="text" id="accessNewNom" placeholder="Nom" style="flex:0 1 120px;">
      <input type="email" id="accessNewEmail" placeholder="Email" style="flex:1;" onkeydown="if(event.key==='Enter')addAccessItem()">
      <button class="btn btn-primary btn-sm" onclick="addAccessItem()">Ajouter</button>
    </div>`;
}

function editAccessItem(idx) {
  const data = getAccessData();
  const a = data[idx];
  if (!a) return;
  const li = document.querySelector(`.admin-list li[data-idx="${idx}"]`);
  if (!li) return;
  li.innerHTML = `
    <div style="display:flex;gap:6px;flex:1;flex-wrap:wrap;align-items:center;">
      <input type="text" class="adm-edit-prenom" value="${esc(a.prenom)}" placeholder="Prénom" style="flex:0 1 110px;padding:5px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:var(--bg-surface);color:var(--text-primary);">
      <input type="text" class="adm-edit-nom" value="${esc(a.nom)}" placeholder="Nom" style="flex:0 1 110px;padding:5px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:var(--bg-surface);color:var(--text-primary);">
      <input type="email" class="adm-edit-email" value="${esc(a.email)}" placeholder="Email" style="flex:1;padding:5px 8px;border:1px solid var(--border);border-radius:4px;font-size:12px;background:var(--bg-surface);color:var(--text-primary);">
    </div>
    <div class="admin-item-actions" style="opacity:1;">
      <button class="admin-save" title="Enregistrer" onclick="saveAccessItem(${idx})">&#10003;</button>
      <button class="admin-cancel" title="Annuler" onclick="renderAccessList()">&#10005;</button>
    </div>`;
}

async function saveAccessItem(idx) {
  if (!isAdmin) return;
  const data = getAccessData();
  const a = data[idx];
  if (!a) return;
  const li = document.querySelector(`.admin-list li[data-idx="${idx}"]`);
  if (!li) return;
  const prenom = li.querySelector('.adm-edit-prenom').value.trim();
  const nom = li.querySelector('.adm-edit-nom').value.trim();
  const email = li.querySelector('.adm-edit-email').value.trim().toLowerCase();
  if (!email) { toast('Email requis', 'error'); return; }
  try {
    await updateListItem(getAccessListName(), a._spItemId, { UserEmail: email, Title: email, Prenom: prenom, Nom: nom });
    data[idx] = { ...a, email, prenom, nom };
    renderAccessList();
    toast(`${getAccessLabel()} mis à jour`, 'success');
  } catch (e) {
    toast('Erreur: ' + e.message, 'error');
  }
}

async function addAccessItem() {
  if (!isAdmin) return;
  const inputEmail = document.getElementById('accessNewEmail');
  const inputPrenom = document.getElementById('accessNewPrenom');
  const inputNom = document.getElementById('accessNewNom');
  const email = inputEmail.value.trim().toLowerCase();
  const prenom = inputPrenom.value.trim();
  const nom = inputNom.value.trim();
  if (!email) return;
  const data = getAccessData();
  if (data.some(a => a.email.toLowerCase() === email)) {
    toast('"' + email + '" existe déjà', 'error');
    return;
  }
  try {
    const fields = { UserEmail: email, Title: email };
    if (prenom) fields.Prenom = prenom;
    if (nom) fields.Nom = nom;
    const item = await createListItem(getAccessListName(), fields);
    data.push({ email, prenom, nom, _spItemId: item._spItemId });
    data.sort((a, b) => a.email.localeCompare(b.email, 'fr'));
    inputEmail.value = ''; inputPrenom.value = ''; inputNom.value = '';
    renderAccessTabs();
    renderAccessList();
    toast(`"${email}" ajouté`, 'success');
  } catch (e) {
    toast('Erreur: ' + e.message, 'error');
  }
}

async function removeAccessItem(itemId, idx) {
  if (!isAdmin) return;
  const data = getAccessData();
  const email = data[idx]?.email;
  const label = getAccessLabel();
  if (!await customConfirm(`Retirer "${email}" des ${label}s ?`)) return;
  try {
    await deleteListItem(getAccessListName(), itemId);
    data.splice(idx, 1);
    renderAccessTabs();
    renderAccessList();
    toast('"' + email + '" retiré', 'success');
  } catch (e) {
    toast('Erreur: ' + e.message, 'error');
  }
}

// Legacy aliases
function renderAdminsList() { if (accessActiveTab === 'admins') renderAccessList(); }
function editAdmin(idx) { editAccessItem(idx); }
function saveAdmin(idx) { saveAccessItem(idx); }
function addAdmin() { addAccessItem(); }
function removeAdmin(itemId, idx) { removeAccessItem(itemId, idx); }

async function loadSubData(noControleur) {
  if (subData[noControleur]) return subData[noControleur];
  async function safeGetFiltered(listKey) {
    try {
      const items = await getFilteredListItems(listKey, noControleur);
      return items;
    } catch (e) { console.error(`[loadSubData] ERREUR "${listKey}" for ${noControleur}:`, e); return []; }
  }
  const [receptions, maintenances, factMat, factLic, cmdClient, cmdFourn] = await Promise.all([
    safeGetFiltered('receptions'), safeGetFiltered('maintenances'), safeGetFiltered('factMateriel'),
    safeGetFiltered('factLicence'), safeGetFiltered('cmdClientSup'), safeGetFiltered('cmdFournSup'),
  ]);
  const result = { receptions, maintenances, factMat, factLic, cmdClient, cmdFourn };
  subData[noControleur] = result;
  return result;
}

function invalidateSubCache(noControleur) {
  delete subData[noControleur];
}

// ============ LIST VIEW ============
function buildEtatFilter() {
  const etats = [...new Set(allCommandes.map(c => c.EtatCommande).filter(Boolean))].sort();
  buildDemandeurFilter();
  const select = document.getElementById('filterEtat');
  select.innerHTML = '<option value="">Tous les états</option>';
  etats.forEach(e => {
    const opt = document.createElement('option');
    opt.value = e;
    opt.textContent = e.length > 40 ? e.substring(0, 40) + '...' : e;
    select.appendChild(opt);
  });
}

function buildDemandeurFilter() {
  const demandeurs = [...new Set(allCommandes.map(c => c.DemandeurFabricant).filter(Boolean))].sort();
  const select = document.getElementById('filterDemandeur');
  if (!select) return;
  select.innerHTML = '<option value="">Tous les demandeurs</option>';
  demandeurs.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d;
    opt.textContent = d;
    select.appendChild(opt);
  });
}

let _filterTimer;
function filterList() {
  clearTimeout(_filterTimer);
  _filterTimer = setTimeout(_doFilterList, 180);
}
function _doFilterList() {
  const search = document.getElementById('searchInput').value.toLowerCase();
  const etat = document.getElementById('filterEtat').value;
  const demandeur = document.getElementById('filterDemandeur')?.value || '';
  const filtered = allCommandes.filter(c => {
    const matchSearch = !search ||
      (c.NoControleur || '').toLowerCase().includes(search) ||
      (c.NomClient || '').toLowerCase().includes(search) ||
      (c.NoCommandeFabricant || '').toLowerCase().includes(search) ||
      (c.TypeControleur || '').toLowerCase().includes(search);
    return matchSearch && (!etat || c.EtatCommande === etat) && (!demandeur || c.DemandeurFabricant === demandeur);
  });
  renderList(filtered);
}

let _visibleItems = [];
let _openGroups = new Set(); // tracks open client groups

function renderList(items) {
  _visibleItems = items;
  const container = document.getElementById('listContainer');
  if (items.length === 0) {
    document.getElementById('listCount').innerHTML = '<span>0 commande(s)</span>';
    container.innerHTML = '<div style="padding:16px;color:var(--text-tertiary);text-align:center;">Aucun résultat</div>';
    return;
  }

  // Group by demandeur
  const groups = new Map();
  for (const c of items) {
    const demandeur = c.DemandeurFabricant || '– Sans demandeur –';
    if (!groups.has(demandeur)) groups.set(demandeur, []);
    groups.get(demandeur).push(c);
  }

  const groupCount = groups.size;
  document.getElementById('listCount').innerHTML = '<span>' + items.length + ' commande(s) · ' + groupCount + ' demandeur(s)</span>';

  // If only one group or search active, auto-open all
  const searchActive = document.getElementById('searchInput').value.trim() !== ''
    || document.getElementById('filterEtat').value !== ''
    || (document.getElementById('filterDemandeur')?.value || '') !== '';
  if (searchActive || groupCount <= 3) {
    for (const key of groups.keys()) _openGroups.add(key);
  }

  let html = '';
  for (const [demandeur, cmds] of groups) {
    const isOpen = _openGroups.has(demandeur);
    html += '<div class="client-group' + (isOpen ? ' open' : '') + '" data-client="' + esc(demandeur) + '">'
      + '<div class="client-header' + (isOpen ? ' open' : '') + '" onclick="toggleGroup(this)">'
      + '<span class="chevron">▶</span>'
      + '<span class="client-name">' + esc(demandeur) + '</span>'
      + '<span class="client-badge">' + cmds.length + '</span>'
      + '</div>'
      + '<div class="client-items">';
    for (const c of cmds) {
      const isActive = c.NoControleur === currentCommande?.NoControleur;
      const metaParts = [];
      if (c.TypeControleur) metaParts.push(esc(c.TypeControleur));
      if (c.NomClient) metaParts.push(esc(c.NomClient));
      if (c.NoCommandeFabricant) metaParts.push(esc(c.NoCommandeFabricant));
      html += '<div class="list-item' + (isActive ? ' active' : '') + '" id="item-' + esc(c.NoControleur) + '" onclick="selectCommande(\'' + esc(c.NoControleur) + '\')">'
        + '<div class="list-item-header">'
        + '<span class="list-item-id">' + esc(c.NoControleur || '') + '</span>'
        + '<span class="list-item-client">' + esc(c.NomClient || '–') + '</span>'
        + '</div>'
        + (metaParts.length ? '<div class="list-item-meta">' + metaParts.join('<span class="dot">·</span>') + '</div>' : '')
        + '<div class="list-item-status"><span class="status-badge ' + getStatusColor(c.EtatCommande) + '">' + esc(truncate(c.EtatCommande, 50)) + '</span></div>'
        + '</div>';
    }
    html += '</div></div>';
  }

  container.innerHTML = html;
}

function toggleGroup(headerEl) {
  const group = headerEl.parentElement;
  const client = group.dataset.client;
  const isOpen = group.classList.toggle('open');
  headerEl.classList.toggle('open', isOpen);
  if (isOpen) _openGroups.add(client);
  else _openGroups.delete(client);
}

// ============ SIDEBAR RESIZE ============
(function() {
  const sidebar = document.getElementById('sidebar');
  const handle = document.getElementById('sidebarResize');
  if (!handle) return;
  let startX, startW;
  handle.addEventListener('mousedown', function(e) {
    e.preventDefault();
    startX = e.clientX;
    startW = sidebar.offsetWidth;
    handle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  function onMove(e) {
    const w = Math.max(280, Math.min(600, startW + (e.clientX - startX)));
    sidebar.style.width = w + 'px';
  }
  function onUp() {
    handle.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    localStorage.setItem('sidebarWidth', sidebar.style.width);
  }
  // Restore saved width
  const saved = localStorage.getItem('sidebarWidth');
  if (saved) sidebar.style.width = saved;
})();

// ============ NEW COMMANDE ============
function newCommande() {
  if (!isAdmin) return;
  isNewCommande = true;
  editMode = true;
  currentCommande = { NoControleur: '' };

  document.getElementById('detailEmpty').style.display = 'none';
  document.getElementById('detailContent').style.display = 'flex';
  document.getElementById('detailTitle').textContent = 'Nouvelle commande';
  document.getElementById('btnEdit').textContent = '';
  document.getElementById('btnEdit').style.display = 'none';

  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('detail').classList.add('visible');

  buildTabs();
  switchTab('General');
  renderGeneralEdit(currentCommande, true);

  // Clear other panels
  ['panelReceptions','panelMaintenances','panelFactures','panelCmdSup','panelPJ'].forEach(id => {
    document.getElementById(id).innerHTML = '<div class="pj-empty">Enregistrez la commande d\'abord</div>';
  });
}

// ============ DETAIL VIEW ============
async function selectCommande(no) {
  // Revoke any pending blob URL from previous PJ viewer
  if (window._currentBlobUrl) { URL.revokeObjectURL(window._currentBlobUrl); window._currentBlobUrl = null; }
  isNewCommande = false;
  editMode = false;
  currentCommande = allCommandes.find(c => c.NoControleur === no);
  if (!currentCommande) return;

  if (window._activeListItem) window._activeListItem.classList.remove('active');
  const el = document.getElementById(`item-${no}`);
  if (el) {
    el.classList.add('active'); window._activeListItem = el;
    // Auto-open parent group if collapsed
    const group = el.closest('.client-group');
    if (group && !group.classList.contains('open')) {
      group.classList.add('open');
      const header = group.querySelector('.client-header');
      if (header) header.classList.add('open');
      _openGroups.add(group.dataset.client);
    }
  }

  document.getElementById('detailEmpty').style.display = 'none';
  document.getElementById('detailContent').style.display = 'flex';
  document.getElementById('detailTitle').textContent = `${no} - ${currentCommande.NomClient || ''}`;
  document.getElementById('btnEdit').innerHTML = '<span class="action-icon">&#9998;</span> Modifier'; document.getElementById('btnEdit').classList.add('primary');
  document.getElementById('btnEdit').style.display = '';

  document.getElementById('sidebar').classList.add('hidden');
  document.getElementById('detail').classList.add('visible');

  buildTabs();
  switchTab('General');
  // Show General immediately, then load PJ and refresh to show inline PJ links
  renderGeneral(currentCommande);
  await renderPJ(currentCommande);
  // Re-render General now that PJ cache is loaded (for inline PJ buttons)
  if (!editMode) renderGeneral(currentCommande);

  const loadingHtml = '<div class="loading"><div class="spinner"></div> Chargement...</div>';
  ['panelReceptions','panelMaintenances','panelFactures','panelCmdSup'].forEach(id => {
    document.getElementById(id).innerHTML = loadingHtml;
  });

  try {
    const sub = await loadSubData(no);
    renderSubPanel('panelReceptions', 'receptions', sub.receptions);
    renderSubPanel('panelMaintenances', 'maintenances', sub.maintenances);
    renderFactures(sub.factMat, sub.factLic);
    renderCmdSup(sub.cmdClient, sub.cmdFourn);
  } catch (e) {
    console.error('Error loading sub-data:', e);
    const errHtml = `<div style="padding:16px;color:#d13438;">Erreur: ${esc(e.message)}</div>`;
    ['panelReceptions','panelMaintenances','panelFactures','panelCmdSup'].forEach(id => {
      document.getElementById(id).innerHTML = errHtml;
    });
  }
}

function goBack() {
  document.getElementById('sidebar').classList.remove('hidden');
  document.getElementById('detail').classList.remove('visible');
}

function buildTabs() {
  document.getElementById('tabsBar').innerHTML = TABS.map(t =>
    `<div class="tab ${t.id === currentTab ? 'active' : ''}" onclick="switchTab('${t.id}')">${t.label}</div>`
  ).join('');
}

function switchTab(id) {
  currentTab = id;
  const tabs = document.querySelectorAll('.tab');
  TABS.forEach((t, i) => {
    if (tabs[i]) tabs[i].classList.toggle('active', t.id === id);
    document.getElementById(t.panel).classList.toggle('active', t.id === id);
  });
}

// ============ TOGGLE EDIT ============
function toggleEdit() {
  if (!currentCommande || !isAdmin) return;
  editMode = !editMode;
  const btnEdit = document.getElementById('btnEdit');
  if (editMode) {
    btnEdit.innerHTML = '<span class="action-icon">&#10005;</span> Annuler';
    btnEdit.classList.remove('primary');
    renderGeneralEdit(currentCommande, false);
  } else {
    btnEdit.innerHTML = '<span class="action-icon">&#9998;</span> Modifier';
    btnEdit.classList.add('primary');
    renderGeneral(currentCommande);
  }
}

// ============ RENDER GENERAL (VIEW) ============
function renderGeneral(c) {
  // Summary KPIs at top
  const summaryHtml = '<div class="dash-kpis">'
    + '<div class="dash-kpi"><div class="dash-kpi-label">Commande client</div><div class="dash-kpi-value blue">' + fmtCur(c.MontantCommandeClient) + '</div></div>'
    + '<div class="dash-kpi border-orange"><div class="dash-kpi-label">Commande fournisseur</div><div class="dash-kpi-value">' + fmtCur(c.MontantCommandeFournisseur) + '</div></div>'
    + '<div class="dash-kpi border-green"><div class="dash-kpi-label">Marge</div><div class="dash-kpi-value ' + ((parseFloat(c.MontantCommandeClient)||0) - (parseFloat(c.MontantCommandeFournisseur)||0) >= 0 ? 'green' : 'orange') + '">' + fmtCur((parseFloat(c.MontantCommandeClient)||0) - (parseFloat(c.MontantCommandeFournisseur)||0)) + '</div></div>'
    + '</div>';

  const formHtml = '<div class="form-grid">'
    + GENERAL_SCHEMA.map(s => {
      return '<div class="form-section">' + s.section + '</div>'
        + s.fields.map(([field, label, type]) => {
          if (type === 'pj') {
            const pjFiles = getPJFilesForField(c.NoControleur, field);
            if (pjFiles.length === 0) return '<div class="form-field"><label>' + label + '</label><div class="pj-empty-inline">Aucune PJ</div></div>';
            const links = pjFiles.map(function(pf) { return '<a class="pj-inline" href="#" onclick="openPJByDriveId(\'' + pf.driveItemId + '\');return false;"><span class="pj-icon">&#128206;</span><span class="pj-name">' + esc(pf.name) + '</span></a>'; }).join('');
            return '<div class="form-field"><label>' + label + '</label><div class="pj-stack">' + links + '</div></div>';
          }
          const raw = c[field];
          let display;
          if (type === 'date') display = fmtDate(raw);
          else if (type === 'currency') display = fmtCur(raw);
          else if (type === 'boolean') display = raw ? 'Oui' : 'Non';
          else display = stripHtml(raw);
          return '<div class="form-field"><label>' + label + '</label>'
            + '<div class="value ' + (!display ? 'empty' : '') + ' ' + (type === 'currency' && display && display !== '-' ? 'currency' : '') + '">' + esc(display || '-') + '</div></div>';
        }).join('');
    }).join('') + '</div>';

  document.getElementById('panelGeneral').innerHTML = summaryHtml + formHtml;
}

// ============ RENDER GENERAL (EDIT) ============
function renderGeneralEdit(c, isNew) {
  document.getElementById('panelGeneral').innerHTML = `<form id="formGeneral" onsubmit="saveGeneral(event)"><div class="form-grid">
    ${GENERAL_SCHEMA.map(s => `
      <div class="form-section">${s.section}</div>
      ${s.fields.map(([field, label, type]) => {
        if (type === 'pj') {
          const pjFiles = getPJFilesForField(c.NoControleur, field);
          const fileLinks = pjFiles.length > 0
            ? '<div class="pj-stack">' + pjFiles.map(pf => `<a class="pj-inline" href="#" onclick="openPJByDriveId('${pf.driveItemId}');return false;"><span class="pj-icon">&#128206;</span><span class="pj-name">${esc(pf.name)}</span></a>`).join('') + '</div>'
            : '<span class="pj-empty-inline">Aucune PJ</span>';
          return `<div class="form-field"><label>${label}</label>${fileLinks}</div>`;
        }
        const raw = c[field] ?? '';
        const readonly = field === 'NoControleur' && !isNew ? 'readonly' : '';
        let input;
        if (type === 'textarea') {
          input = `<textarea name="${field}">${esc(raw)}</textarea>`;
        } else if (type === 'date') {
          const val = raw ? toInputDate(raw) : '';
          input = `<input type="date" name="${field}" value="${val}" ${readonly}>`;
        } else if (type === 'currency' || type === 'number') {
          const val = raw != null && raw !== '' ? parseFloat(raw) || '' : '';
          input = `<input type="number" step="0.01" name="${field}" value="${val}" ${readonly}>`;
        } else if (type === 'boolean') {
          input = `<select name="${field}"><option value="false" ${!raw ? 'selected' : ''}>Non</option><option value="true" ${raw ? 'selected' : ''}>Oui</option></select>`;
        } else if (type === 'select') {
          const opts = getOptionsForField(field);
          input = `<select name="${field}"><option value="">-- Choisir --</option>${opts.map(o => `<option value="${esc(o)}" ${o === String(raw) ? 'selected' : ''}>${esc(o)}</option>`).join('')}</select>`;
        } else if (type === 'suggest') {
          const dlId = 'ac_' + field;
          input = `<div style="position:relative;">
            <input type="text" name="${field}" value="${esc(raw)}" ${readonly} autocomplete="off" onfocus="showAC('${field}')" oninput="filterAC('${field}')" onblur="setTimeout(()=>hideAC('${field}'),200)">
            <div class="ac-dropdown" id="${dlId}" style="display:none;"></div>
          </div>`;
        } else {
          input = `<input type="text" name="${field}" value="${esc(raw)}" ${readonly}>`;
        }
        return `<div class="form-field"><label>${label}</label>${input}</div>`;
      }).join('')}
    `).join('')}
    <div class="action-bar">
      <button type="submit" class="btn btn-primary" id="btnSaveGeneral">${isNew ? 'Creer' : 'Enregistrer'}</button>
      <button type="button" class="btn btn-secondary" onclick="${isNew ? 'goBack()' : 'toggleEdit()'}">Annuler</button>
    </div>
  </div></form>`;
}

async function saveGeneral(e) {
  e.preventDefault();
  if (!isAdmin) return;
  const form = document.getElementById('formGeneral');
  const btn = document.getElementById('btnSaveGeneral');
  btn.disabled = true;
  btn.textContent = 'Enregistrement...';

  try {
    const fields = {};
    for (const s of GENERAL_SCHEMA) {
      for (const [field, , type] of s.fields) {
        const el = form.elements[field];
        if (!el) continue;
        let val = el.value;
        if (type === 'currency' || type === 'number') {
          val = val ? parseFloat(val) : null;
        } else if (type === 'boolean') {
          val = val === 'true';
        } else if (type === 'date') {
          val = val ? val + 'T00:00:00Z' : null;
        } else {
          val = val || null;
        }
        fields[field] = val;
      }
    }

    if (isNewCommande) {
      if (!fields.NoControleur) { toast('Le N° de contrôleur est requis', 'error'); return; }
      fields.Title = fields.NoControleur;
      const created = await createListItem('main', fields);
      allCommandes.unshift(created);
      buildEtatFilter();
      renderList(allCommandes);
      isNewCommande = false;
      editMode = false;
      currentCommande = created;
      toast('Commande créée');
      await selectCommande(created.NoControleur);
    } else {
      await updateListItem('main', currentCommande._spItemId, fields);
      // Update local cache
      Object.assign(currentCommande, fields);
      editMode = false;
      document.getElementById('btnEdit').innerHTML = '<span class="action-icon">&#9998;</span> Modifier'; document.getElementById('btnEdit').classList.add('primary');
      document.getElementById('detailTitle').textContent = `${currentCommande.NoControleur} - ${currentCommande.NomClient || ''}`;
      renderGeneral(currentCommande);
      renderList(allCommandes);
      toast('Commande enregistrée');
    }
  } catch (err) {
    console.error(err);
    toast('Erreur: ' + err.message.substring(0, 80), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = isNewCommande ? 'Créer' : 'Enregistrer';
  }
}

// ============ RENDER SUB-PANEL (generic) ============
function renderSubPanel(panelId, schemaKey, items) {
  const schema = SUB_SCHEMAS[schemaKey];
  const currencyField = schema.fields.find(f => f[2] === 'currency');
  const totalVal = currencyField ? items.reduce((s, r) => s + (parseFloat(r[currencyField[0]]) || 0), 0) : 0;
  const now = new Date();

  // Build KPIs based on schema type
  let kpisHtml = '';
  if (schemaKey === 'receptions') {
    kpisHtml = '<div class="dash-kpis">'
      + '<div class="dash-kpi"><div class="dash-kpi-label">Matériels reçus</div><div class="dash-kpi-value blue">' + items.length + '</div></div>'
      + '<div class="dash-kpi border-green"><div class="dash-kpi-label">Types distincts</div><div class="dash-kpi-value">' + new Set(items.map(r => r.TypeMateriel).filter(Boolean)).size + '</div></div>'
      + '</div>';
  } else if (schemaKey === 'maintenances') {
    const active = items.filter(r => r.DateFinMaintenance && new Date(r.DateFinMaintenance) >= now).length;
    const expired = items.length - active;
    const alertItems = items.filter(r => {
      if (!r.DateFinMaintenance) return false;
      const diff = (new Date(r.DateFinMaintenance) - now) / (1000*60*60*24);
      return diff >= 0 && diff <= 90;
    }).length;
    kpisHtml = '<div class="dash-kpis">'
      + '<div class="dash-kpi"><div class="dash-kpi-label">Total</div><div class="dash-kpi-value blue">' + fmtCur(totalVal) + '</div><div class="dash-kpi-sub">' + items.length + ' contrat(s)</div></div>'
      + '<div class="dash-kpi border-green"><div class="dash-kpi-label">Actifs</div><div class="dash-kpi-value green">' + active + '</div></div>'
      + '<div class="dash-kpi border-orange"><div class="dash-kpi-label">Expirés</div><div class="dash-kpi-value' + (expired > 0 ? ' orange' : '') + '">' + expired + '</div></div>'
      + (alertItems > 0 ? '<div class="dash-kpi border-purple"><div class="dash-kpi-label">Expire bientôt</div><div class="dash-kpi-value orange">' + alertItems + '</div><div class="dash-kpi-sub">< 90 jours</div></div>' : '')
      + '</div>';
  }

  // Table with maintenance status dots
  let tableHtml = '';
  if (items.length === 0) {
    tableHtml = '<div class="pj-empty">Aucun(e) ' + schema.title.toLowerCase() + '</div>';
  } else {
    const visibleFields = schema.fields.filter(f => f[2] !== 'pj');
    tableHtml = '<table class="gallery"><thead><tr>' + visibleFields.map(f => '<th>' + f[1] + '</th>').join('') + (isAdmin ? '<th></th>' : '') + '</tr></thead><tbody>'
      + items.map(r => {
        return '<tr>' + visibleFields.map(([field, , type]) => {
          let val = r[field];
          if (type === 'date') val = fmtDate(val);
          else if (type === 'currency') val = fmtCur(val);
          let extra = '';
          // Add dot for date fin maintenance
          if (schemaKey === 'maintenances' && field === 'DateFinMaintenance' && val && val !== '-') {
            const endDate = new Date(r[field]);
            const diff = (endDate - now) / (1000*60*60*24);
            if (diff < 0) extra = '<span class="maint-dot expired" title="Expiré"></span>';
            else if (diff <= 90) extra = '<span class="maint-dot alert" title="Expire bientôt"></span>';
            else extra = '<span class="maint-dot active" title="Actif"></span>';
          }
          const tdClass = type === 'currency' ? 'class="currency"' : extra ? 'style="white-space:nowrap"' : '';
          return '<td ' + tdClass + '>' + extra + esc(val) + '</td>';
        }).join('')
        + (isAdmin ? '<td><button class="btn-del" data-schema="' + schemaKey + '" data-item-id="' + esc(r._spItemId) + '" data-no="' + esc(currentCommande?.NoControleur) + '" title="Supprimer">&#128465;</button></td>' : '') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  const panel = document.getElementById(panelId);
  panel.innerHTML = kpisHtml + tableHtml
    + '<div id="addForm_' + panelId + '"></div>'
    + (isAdmin ? '<button class="btn-action" onclick="showAddForm(\'' + panelId + '\',\'' + schemaKey + '\')" style="margin-top:10px;"><span class="action-icon">+</span> Ajouter</button>' : '');
  // Event delegation for delete buttons (onclick écrase le précédent, évite l'accumulation)
  panel.onclick = function(e) {
    const btn = e.target.closest('.btn-del[data-schema]');
    if (btn) deleteSubRow(btn.dataset.schema, btn.dataset.itemId, btn.dataset.no);
  };
}

// ============ RENDER FACTURES (2 sub-schemas) - DASHBOARD ============
function renderFactures(factMat, factLic) {
  const sumMat = factMat.reduce((s, r) => s + (parseFloat(r.MontantFactureMateriel) || 0), 0);
  const sumLic = factLic.reduce((s, r) => s + (parseFloat(r.MontantFactureLicence) || 0), 0);
  const totalAll = sumMat + sumLic;
  const nbTotal = factMat.length + factLic.length;

  document.getElementById('panelFactures').innerHTML = `
    <div class="fact-kpis">
      <div class="fact-kpi">
        <span class="fact-kpi-label">Total facture</span>
        <span class="fact-kpi-value">${fmtCur(totalAll)}</span>
        <span class="fact-kpi-sub">${nbTotal} facture${nbTotal > 1 ? 's' : ''}</span>
      </div>
      <div class="fact-kpi accent-green">
        <span class="fact-kpi-label">Materiel</span>
        <span class="fact-kpi-value">${fmtCur(sumMat)}</span>
        <span class="fact-kpi-sub">${factMat.length} facture${factMat.length > 1 ? 's' : ''}</span>
      </div>
      <div class="fact-kpi accent-orange">
        <span class="fact-kpi-label">Licence</span>
        <span class="fact-kpi-value">${fmtCur(sumLic)}</span>
        <span class="fact-kpi-sub">${factLic.length} facture${factLic.length > 1 ? 's' : ''}</span>
      </div>
    </div>

    <div class="fact-section">
      <div class="fact-section-header green">
        <span class="fact-section-title">Facturation Materiel <span class="badge">${factMat.length}</span></span>
        <span class="fact-section-total">${fmtCur(sumMat)}</span>
      </div>
      ${renderSubTable('factMat', factMat)}
      <div id="addForm_panelFactures_mat"></div>
      ${isAdmin ? '<button class="btn-action" onclick="showAddForm(\'panelFactures_mat\',\'factMat\')" style="margin-top:10px;"><span class="action-icon">+</span> Ajouter materiel</button>' : ''}
    </div>

    <div class="fact-section">
      <div class="fact-section-header">
        <span class="fact-section-title">Facturation Licence <span class="badge">${factLic.length}</span></span>
        <span class="fact-section-total">${fmtCur(sumLic)}</span>
      </div>
      ${renderSubTable('factLic', factLic)}
      <div id="addForm_panelFactures_lic"></div>
      ${isAdmin ? '<button class="btn-action" onclick="showAddForm(\'panelFactures_lic\',\'factLic\')" style="margin-top:10px;"><span class="action-icon">+</span> Ajouter licence</button>' : ''}
    </div>
  `;
}

function renderCmdSup(cmdClient, cmdFourn) {
  const sumClient = cmdClient.reduce((s, r) => s + (parseFloat(r.MontantCommandeClientSup) || 0), 0);
  const sumFourn = cmdFourn.reduce((s, r) => s + (parseFloat(r.MontantCommandeFournisseurSup) || 0), 0);

  document.getElementById('panelCmdSup').innerHTML =
    '<div class="dash-kpis">'
    + '<div class="dash-kpi"><div class="dash-kpi-label">Cmd Client Sup.</div><div class="dash-kpi-value blue">' + fmtCur(sumClient) + '</div><div class="dash-kpi-sub">' + cmdClient.length + ' commande(s)</div></div>'
    + '<div class="dash-kpi border-orange"><div class="dash-kpi-label">Cmd Fournisseur Sup.</div><div class="dash-kpi-value">' + fmtCur(sumFourn) + '</div><div class="dash-kpi-sub">' + cmdFourn.length + ' commande(s)</div></div>'
    + '<div class="dash-kpi border-green"><div class="dash-kpi-label">Marge Sup.</div><div class="dash-kpi-value ' + (sumClient - sumFourn >= 0 ? 'green' : 'orange') + '">' + fmtCur(sumClient - sumFourn) + '</div></div>'
    + '</div>'
    + '<div class="fact-section"><div class="fact-section-header"><span class="fact-section-title">Client <span class="badge">' + cmdClient.length + '</span></span><span class="fact-section-total">' + fmtCur(sumClient) + '</span></div>'
    + renderSubTable('cmdClient', cmdClient)
    + '<div id="addForm_panelCmdSup_cl"></div>'
    + (isAdmin ? '<button class="btn-action" onclick="showAddForm(&apos;panelCmdSup_cl&apos;,&apos;cmdClient&apos;)" style="margin-top:10px;"><span class="action-icon">+</span> Ajouter client</button>' : '') + '</div>'
    + '<div class="fact-section"><div class="fact-section-header green"><span class="fact-section-title">Fournisseur <span class="badge">' + cmdFourn.length + '</span></span><span class="fact-section-total">' + fmtCur(sumFourn) + '</span></div>'
    + renderSubTable('cmdFourn', cmdFourn)
    + '<div id="addForm_panelCmdSup_fr"></div>'
    + (isAdmin ? '<button class="btn-action" onclick="showAddForm(&apos;panelCmdSup_fr&apos;,&apos;cmdFourn&apos;)" style="margin-top:10px;"><span class="action-icon">+</span> Ajouter fournisseur</button>' : '') + '</div>';
}

function renderSubTable(schemaKey, items) {
  const schema = SUB_SCHEMAS[schemaKey];
  if (items.length === 0) return `<div class="pj-empty">Aucun(e) ${schema.title.toLowerCase()}</div>`;
  return `<table class="gallery">
    <thead><tr>${schema.fields.map(f => `<th>${f[1]}</th>`).join('')}${isAdmin ? '<th></th>' : ''}</tr></thead>
    <tbody>${items.map(r => `
      <tr>
        ${schema.fields.map(([field, , type]) => {
          let val = r[field];
          if (type === 'date') val = fmtDate(val);
          else if (type === 'currency') val = fmtCur(val);
          else if (type === 'pj') {
            if (!val) return '<td></td>';
            const fileName = decodeURIComponent(val.split('/').pop() || 'Fichier');
            return `<td><a class="pj-inline" href="#" onclick="openSubPJ(decodeURIComponent('${encodeURIComponent(val)}'));return false;"><span class="pj-icon">&#128206;</span><span class="pj-name">${esc(fileName)}</span></a></td>`;
          }
          return `<td ${type === 'currency' ? 'class="currency"' : ''}>${esc(val)}</td>`;
        }).join('')}
        ${isAdmin ? `<td><button class="btn-del" onclick="deleteSubRow('${schemaKey}','${r._spItemId}','${esc(currentCommande?.NoControleur)}')" title="Supprimer">&#128465;</button></td>` : ''}
      </tr>
    `).join('')}</tbody>
  </table>`;
}

// ============ ADD ROW FORM ============
function showAddForm(containerId, schemaKey) {
  if (!isAdmin) return;
  const schema = SUB_SCHEMAS[schemaKey];
  const container = document.getElementById(`addForm_${containerId}`);
  if (!container) return;
  container.innerHTML = `
    <div class="add-form">
      <h4>Ajouter ${schema.title}</h4>
      <div class="add-form-grid">
        ${schema.fields.map(([field, label, type]) => {
          let input;
          if (type === 'textarea') input = `<textarea name="${field}"></textarea>`;
          else if (type === 'date') input = `<input type="date" name="${field}">`;
          else if (type === 'currency') input = `<input type="number" step="0.01" name="${field}">`;
          else if (type === 'select') {
            const opts = getOptionsForField(field);
            input = `<select name="${field}"><option value="">-- Choisir --</option>${opts.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select>`;
          }
          else if (type === 'pj') input = `<label class="btn-file-label"><input type="file" name="${field}" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onchange="this.closest('label').nextElementSibling.textContent=this.files[0]?.name||''">&#128206; Choisir un fichier</label><span class="file-name-display pj-empty-inline"></span>`;
          else input = `<input type="text" name="${field}">`;
          return `<div class="form-field"><label>${label}</label>${input}</div>`;
        }).join('')}
      </div>
      <div class="add-form-actions">
        <button class="btn btn-primary" onclick="saveSubRow('${containerId}','${schemaKey}')">Enregistrer</button>
        <button class="btn btn-secondary" onclick="document.getElementById('addForm_${containerId}').innerHTML=''">Annuler</button>
      </div>
    </div>
  `;
}

async function saveSubRow(containerId, schemaKey) {
  if (!isAdmin) return;
  if (!currentCommande?.NoControleur) return;
  const schema = SUB_SCHEMAS[schemaKey];
  const container = document.getElementById(`addForm_${containerId}`);

  // Collect file inputs before replacing DOM
  const fileUploads = [];
  for (const [field, , type] of schema.fields) {
    if (type !== 'pj') continue;
    const el = container.querySelector(`[name="${field}"]`);
    if (el?.files?.[0]) fileUploads.push({ field, file: el.files[0] });
  }

  const fields = { NoControleur: currentCommande.NoControleur };
  for (const [field, , type] of schema.fields) {
    if (type === 'pj') continue;
    const el = container.querySelector(`[name="${field}"]`);
    if (!el) continue;
    let val = el.value;
    if (type === 'currency') val = val ? parseFloat(val) : null;
    else if (type === 'date') val = val ? val + 'T00:00:00Z' : null;
    else val = val || null;
    if (val !== null) fields[field] = val;
  }

  try {
    container.innerHTML = '<div class="loading"><div class="spinner"></div> Enregistrement...</div>';
    for (const { field, file } of fileUploads) {
      fields[field] = await uploadFileToDrive(currentCommande.NoControleur, field, file);
    }
    await createListItem(schema.list, fields);
    invalidateSubCache(currentCommande.NoControleur);
    toast('Ligne ajoutée');
    // Reload sub-data and re-render
    const sub = await loadSubData(currentCommande.NoControleur);
    renderAfterSubChange(sub);
  } catch (err) {
    console.error(err);
    toast('Erreur: ' + err.message.substring(0, 80), 'error');
    container.innerHTML = '';
  }
}

async function deleteSubRow(schemaKey, itemId, noControleur) {
  if (!isAdmin) return;
  if (!await customConfirm('Supprimer cette ligne ?')) return;
  const schema = SUB_SCHEMAS[schemaKey];
  try {
    await deleteListItem(schema.list, itemId);
    invalidateSubCache(noControleur);
    toast('Ligne supprimée');
    const sub = await loadSubData(noControleur);
    renderAfterSubChange(sub);
  } catch (err) {
    console.error(err);
    toast('Erreur: ' + err.message.substring(0, 80), 'error');
  }
}

function renderAfterSubChange(sub) {
  renderSubPanel('panelReceptions', 'receptions', sub.receptions);
  renderSubPanel('panelMaintenances', 'maintenances', sub.maintenances);
  renderFactures(sub.factMat, sub.factLic);
  renderCmdSup(sub.cmdClient, sub.cmdFourn);
}

// ============ RENDER PJ ============
const PJ_LABELS = {
  'PJ_CommandeFabricant': 'Commande materiel',
  'PJ_CommandeClientLogiciel': 'Commande logiciel',
  'PJ_CommandeFournisseur': 'Commande fournisseur',
  'PJ_FactureFournisseur': 'Facture fournisseur',
  'PJ_BlTransport': 'BL Transport',
  'PJ_FicheMiseEnService': 'Fiche de mise en service',
  'PJ_CommandeDestockage': 'Commande déstockage',
  'PJ_FactureMateriel': 'Facture Hardware',
  'PJ_FactureLicence': 'Facture Logiciel',
  'PJ_FactureMaintenance': 'Facture Maintenance',
  'PJ_CommandeClientSup': 'Commande client sup.',
  'PJ_CommandeFournisseurSup': 'Commande fournisseur sup.',
  'PJ_BlMateriel': 'BL Materiel',
  'PJ_BLReception': 'BL réception',
};

// Mapping PJ folder → SP list to auto-fill after upload
// listKey: 'main' = CommandesControleur, otherwise = sub-list key
// subKey: key in subData cache (for sub-lists)
const PJ_FIELD_TARGET = {
  PJ_CommandeFabricant:      { listKey: 'main' },
  PJ_CommandeClientLogiciel: { listKey: 'main' },
  PJ_CommandeFournisseur:    { listKey: 'main' },
  PJ_FactureFournisseur:     { listKey: 'main' },
  PJ_BlTransport:            { listKey: 'main' },
  PJ_FicheMiseEnService:     { listKey: 'main' },
  PJ_CommandeDestockage:     { listKey: 'main' },
  PJ_BLReception:            { listKey: 'main' },
  PJ_CommandeClientSup:      { listKey: 'main' },
  PJ_CommandeFournisseurSup: { listKey: 'main' },
  PJ_BlMateriel:             { listKey: 'main' },
  PJ_FactureMateriel:        { listKey: 'factMateriel', subKey: 'factMat' },
  PJ_FactureLicence:         { listKey: 'factLicence',  subKey: 'factLic' },
  PJ_FactureMaintenance:     { listKey: 'maintenances', subKey: 'maintenances' },
};

// After uploading a PJ, auto-update the corresponding SP list field
async function autoFillPJField(folderName, webUrl) {
  const target = PJ_FIELD_TARGET[folderName];
  if (!target || !currentCommande) return false;
  try {
    if (target.listKey === 'main') {
      await updateListItem('main', currentCommande._spItemId, { [folderName]: webUrl });
      currentCommande[folderName] = webUrl;
    } else {
      const sub = await loadSubData(currentCommande.NoControleur);
      const items = sub[target.subKey] || [];
      if (items.length === 0) return false;
      // Update the most recently added sub-item
      const item = items[items.length - 1];
      await updateListItem(target.listKey, item._spItemId, { [folderName]: webUrl });
      invalidateSubCache(currentCommande.NoControleur);
    }
    return true;
  } catch (e) {
    console.warn('[autoFillPJField]', e);
    return false;
  }
}

// Cache PJ per commande (from drive API)
const pjCache = {};

async function renderPJ(c) {
  if (!c.NoControleur) {
    document.getElementById('panelPJ').innerHTML = '<div class="pj-empty">Aucune pièce jointe</div>';
    return;
  }

  document.getElementById('panelPJ').innerHTML = '<div class="loading"><div class="spinner"></div> Chargement des PJ...</div>';

  if (pjCache[c.NoControleur]) {
    renderPJButtons(pjCache[c.NoControleur]);
    return;
  }

  try {
    const sid = await getSiteId();
    const folderPath = `PiecesJointes_Controleur/${encodeURIComponent(c.NoControleur)}`;
    const driveItems = await graphGet(`/sites/${sid}/drive/root:/${folderPath}:/children`);
    const buttons = [];

    if (driveItems.value && driveItems.value.length > 0) {
      const folders = driveItems.value.filter(f => f.folder);
      await Promise.all(folders.map(async folder => {
        const label = PJ_LABELS[folder.name] || folder.name.replace('PJ_', '').replace(/([A-Z])/g, ' $1').trim();
        try {
          const files = await graphGet(`/sites/${sid}/drive/items/${folder.id}/children`);
          if (files.value) {
            for (const file of files.value) {
              buttons.push({
                _folder: folder.name,
                label, name: file.name,
                webUrl: file.webUrl || '',
                downloadUrl: file['@microsoft.graph.downloadUrl'] || '',
                driveItemId: file.id,
                mimeType: file.file?.mimeType || '',
              });
            }
          }
        } catch (e) { console.warn('[PJ] Error listing', folder.name, e); }
      }));
    }

    pjCache[c.NoControleur] = buttons;
    renderPJButtons(buttons);
  } catch (e) {
    pjCache[c.NoControleur] = [];
    renderPJButtons([]);
  }
}

// Get PJ files for a specific field from cache
function getPJFilesForField(noControleur, pjFieldName) {
  const cached = pjCache[noControleur];
  if (!cached) return [];
  // pjFieldName is like 'PJ_CommandeFabricant', folder name in drive matches this
  const seen = new Set();
  return cached.filter(b => {
    if (b._folder !== pjFieldName) return false;
    if (seen.has(b.name)) return false;
    seen.add(b.name);
    return true;
  });
}

// Open PJ viewer by drive item ID (for inline PJ buttons)
async function openPJByDriveId(driveItemId) {
  // Find in currentPJButtons or any cached data
  let found = currentPJButtons.find(b => b.driveItemId === driveItemId);
  if (!found) {
    for (const buttons of Object.values(pjCache)) {
      found = buttons.find(b => b.driveItemId === driveItemId);
      if (found) break;
    }
  }
  if (!found) {
    // Fetch fresh data from Graph
    try {
      const sid = await getSiteId();
      const item = await graphGet(`/sites/${sid}/drive/items/${driveItemId}`);
      found = {
        label: '', name: item.name,
        webUrl: item.webUrl || '',
        downloadUrl: item['@microsoft.graph.downloadUrl'] || '',
        driveItemId: item.id,
        mimeType: item.file?.mimeType || '',
      };
    } catch (e) { toast('Erreur chargement PJ', 'error'); return; }
  }
  // Add to currentPJButtons temporarily and open
  const idx = currentPJButtons.length;
  currentPJButtons.push(found);
  openPJModal(idx);
}

// Store buttons globally for onclick access
let currentPJButtons = [];

function renderPJButtons(buttons) {
  currentPJButtons = buttons;
  if (buttons.length === 0) {
    document.getElementById('panelPJ').innerHTML = '<div class="pj-empty">Aucune pièce jointe</div>';
    return;
  }

  function getFileIcon(mime, name) {
    const ext = (name || '').split('.').pop().toLowerCase();
    if (mime.includes('pdf') || ext === 'pdf') return { cls: 'pdf', label: 'PDF' };
    if (mime.includes('image') || ['png','jpg','jpeg','gif','bmp','webp'].includes(ext)) return { cls: 'img', label: 'IMG' };
    if (mime.includes('word') || mime.includes('document') || ['doc','docx'].includes(ext)) return { cls: 'doc', label: 'DOC' };
    if (mime.includes('excel') || mime.includes('spreadsheet') || ['xls','xlsx'].includes(ext)) return { cls: 'doc', label: 'XLS' };
    return { cls: 'other', label: ext.toUpperCase().substring(0,3) || '?' };
  }

  const html = '<div class="gallery-header"><span class="gallery-count">' + buttons.length + '</span><span class="gallery-total">pièce(s) jointe(s)</span></div>'
    + '<div class="pj-grid">'
    + buttons.map((b, i) => {
      const icon = getFileIcon(b.mimeType, b.name);
      return '<div class="pj-card-wrap"><a class="pj-card" onclick="openPJModal(' + i + ')" title="' + esc(b.name) + '">'
        + '<div class="pj-icon ' + icon.cls + '">' + icon.label + '</div>'
        + '<div class="pj-card-info"><div class="pj-card-label">' + esc(b.label) + '</div><div class="pj-card-name">' + esc(b.name) + '</div></div>'
        + '</a>'
        + (isAdmin ? '<button class="pj-del" title="Supprimer" onclick="deletePJ(' + i + ')">&#128465;</button>' : '')
        + '</div>';
    }).join('')
    + '</div>';

  const folderOptions = Object.entries(PJ_LABELS)
    .map(([k, v]) => `<option value="${k}">${v}</option>`).join('');
  const uploadSection = currentCommande ? `<div class="pj-upload-section">
    <select id="pjUploadFolder" style="padding:6px 10px;border:1px solid var(--border);border-radius:5px;font-size:12px;color:var(--text-primary);background:var(--bg-surface);">
      <option value="">-- Type de PJ --</option>${folderOptions}
    </select>
    <label class="btn-file-label"><input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" onchange="uploadPJFromPanel(this)">&#128206; Ajouter une PJ</label>
    <span class="file-name-display pj-empty-inline"></span>
  </div>` : '';

  document.getElementById('panelPJ').innerHTML = html + uploadSection;
}

async function deletePJ(idx) {
  if (!isAdmin) return;
  const b = currentPJButtons[idx];
  if (!b || !b.driveItemId) return;
  if (!await customConfirm(`Supprimer "${b.name}" ?`)) return;
  try {
    const sid = await getSiteId();
    await graphDelete(`/sites/${sid}/drive/items/${b.driveItemId}`);
    // Remove from cache and re-render
    if (currentCommande && pjCache[currentCommande.NoControleur]) {
      pjCache[currentCommande.NoControleur] = pjCache[currentCommande.NoControleur].filter(p => p.driveItemId !== b.driveItemId);
    }
    renderPJButtons(pjCache[currentCommande?.NoControleur] || []);
    renderGeneral(currentCommande);
    toast('"' + b.name + '" supprimé', 'success');
  } catch (e) {
    toast('Erreur: ' + e.message, 'error');
  }
}

async function uploadPJFromPanel(input) {
  if (!isAdmin) return;
  const folder = document.getElementById('pjUploadFolder')?.value;
  if (!folder) { toast('Choisir un type de PJ', 'error'); input.value = ''; return; }
  if (!input.files?.[0] || !currentCommande) return;
  const nameDisplay = input.closest('.pj-upload-section')?.querySelector('.file-name-display');
  input.disabled = true;
  if (nameDisplay) nameDisplay.textContent = 'Upload en cours...';
  try {
    const webUrl = await uploadFileToDrive(currentCommande.NoControleur, folder, input.files[0]);
    const filled = await autoFillPJField(folder, webUrl);
    toast(filled ? 'PJ ajoutée et champ mis à jour' : 'PJ ajoutée');
    await renderPJ(currentCommande);
    if (filled) renderGeneral(currentCommande);
  } catch (e) {
    toast('Erreur: ' + e.message.substring(0, 80), 'error');
  }
  input.value = '';
  input.disabled = false;
  if (nameDisplay) nameDisplay.textContent = '';
}

function getFileExt(name) {
  return (name || '').split('.').pop().toLowerCase();
}

async function openPJModal(idx) {
  const b = currentPJButtons[idx];
  if (!b) return;

  const modal = document.getElementById('pjModal');
  const body = document.getElementById('pjModalBody');
  document.getElementById('pjModalTitle').textContent = `${b.label} - ${b.name}`;
  document.getElementById('pjModalOpen').href = b.webUrl;

  modal.classList.add('visible');
  body.innerHTML = '<div class="loading"><div class="spinner"></div> Chargement...</div>';

  const ext = getFileExt(b.name);
  let downloadUrl = b.downloadUrl;

  // If download URL expired, refresh it
  if (!downloadUrl) {
    try {
      const sid = await getSiteId();
      const item = await graphGet(`/sites/${sid}/drive/items/${b.driveItemId}`);
      downloadUrl = item['@microsoft.graph.downloadUrl'] || '';
      b.downloadUrl = downloadUrl;
    } catch (e) {
      body.innerHTML = `<div class="modal-download"><div class="file-icon">&#128196;</div><p>Impossible de charger le fichier</p><a class="btn btn-primary" href="${esc(b.webUrl)}" target="_blank">Ouvrir dans SharePoint</a></div>`;
      return;
    }
  }

  document.getElementById('pjModalDownload').href = downloadUrl;

  // PDF - fetch as blob, display in iframe (blob URL bypasses SharePoint X-Frame-Options)
  if (ext === 'pdf' || b.mimeType === 'application/pdf') {
    try {
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      if (window._currentBlobUrl) URL.revokeObjectURL(window._currentBlobUrl);
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window._currentBlobUrl = blobUrl;
      body.innerHTML = `<iframe src="${blobUrl}" style="width:100%;height:100%;border:none;"></iframe>`;
    } catch {
      body.innerHTML = `<div class="modal-download"><div class="file-icon">&#128196;</div><p>Impossible de charger le PDF</p><a class="btn btn-primary" href="${downloadUrl}" download="${esc(b.name)}">Télécharger</a></div>`;
    }
  }
  // Images - fetch as blob
  else if (['jpg','jpeg','png','gif','bmp','webp','svg'].includes(ext)) {
    try {
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      if (window._currentBlobUrl) URL.revokeObjectURL(window._currentBlobUrl);
      const blobUrl = URL.createObjectURL(blob);
      window._currentBlobUrl = blobUrl;
      body.innerHTML = `<img src="${blobUrl}" alt="${esc(b.name)}">`;
    } catch {
      body.innerHTML = `<div class="modal-download"><div class="file-icon">&#128247;</div><p>Impossible de charger l'image</p><a class="btn btn-primary" href="${downloadUrl}" download="${esc(b.name)}">Télécharger</a></div>`;
    }
  }
  // Office docs - fetch as PDF via Graph API conversion, fallback to download
  else if (['xls','xlsx','xlsm','doc','docx','ppt','pptx'].includes(ext)) {
    try {
      const sid = await getSiteId();
      const pdfRes = await fetch(`https://graph.microsoft.com/v1.0/sites/${sid}/drive/items/${b.driveItemId}/content?format=pdf`, {
        headers: { 'Authorization': 'Bearer ' + accessToken }
      });
      if (!pdfRes.ok) throw new Error('PDF conversion failed');
      const blob = await pdfRes.blob();
      if (window._currentBlobUrl) URL.revokeObjectURL(window._currentBlobUrl);
      const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
      window._currentBlobUrl = blobUrl;
      body.innerHTML = `<iframe src="${blobUrl}" style="width:100%;height:100%;border:none;"></iframe>`;
    } catch {
      // Fallback: open in Office Online in new tab
      const embedUrl = b.webUrl.includes('?') ? b.webUrl + '&web=1' : b.webUrl + '?web=1';
      body.innerHTML = `<div class="modal-download">
        <div class="file-icon">&#128196;</div>
        <p style="font-size:15px;font-weight:600;">${esc(b.name)}</p>
        <p>Aperçu non disponible — le fichier s'ouvrira dans Office Online</p>
        <div style="display:flex;gap:12px;">
          <a class="btn btn-primary" href="${esc(embedUrl)}" target="_blank">Ouvrir dans Office Online</a>
          <a class="btn btn-secondary" href="${downloadUrl}" download="${esc(b.name)}">Télécharger</a>
        </div>
      </div>`;
    }
  }
  // Text files - fetch content and display
  else if (['txt','csv','log','json','xml'].includes(ext)) {
    try {
      const res = await fetch(downloadUrl);
      const text = await res.text();
      body.innerHTML = `<pre style="width:100%;height:100%;overflow:auto;padding:16px;margin:0;font-size:13px;white-space:pre-wrap;word-break:break-word;background:white;">${esc(text)}</pre>`;
    } catch {
      body.innerHTML = `<div class="modal-download"><div class="file-icon">&#128196;</div><p>Impossible de charger le fichier</p><a class="btn btn-primary" href="${downloadUrl}" download="${esc(b.name)}">Télécharger</a></div>`;
    }
  }
  // Other: show download prompt
  else {
    body.innerHTML = `<div class="modal-download">
      <div class="file-icon">&#128196;</div>
      <p style="font-size:15px;font-weight:600;">${esc(b.name)}</p>
      <p>Aperçu non disponible pour ce type de fichier (.${esc(ext)})</p>
      <div style="display:flex;gap:12px;">
        <a class="btn btn-primary" href="${downloadUrl}" download="${esc(b.name)}">Télécharger</a>
        <a class="btn btn-secondary" href="${esc(b.webUrl)}" target="_blank">Ouvrir dans SharePoint</a>
      </div>
    </div>`;
  }
}

function closePJModal() {
  if (window._currentBlobUrl) { URL.revokeObjectURL(window._currentBlobUrl); window._currentBlobUrl = null; }
  const modal = document.getElementById('pjModal');
  modal.classList.remove('visible');
  document.getElementById('pjModalBody').innerHTML = '';
}

// Close modal on Escape
document.addEventListener('keydown', e => { if (e.key === 'Escape') { resolveConfirm(false); closePJModal(); closeAdmin(); closeAdminsPanel(); closeDiag(); } });

// ============ AUTOCOMPLETE ============
function showAC(field) { filterAC(field); }

function filterAC(field) {
  const input = document.querySelector(`[name="${field}"]`);
  const dropdown = document.getElementById('ac_' + field);
  if (!input || !dropdown) return;

  const val = input.value.toLowerCase();
  const opts = getOptionsForField(field);
  const filtered = val ? opts.filter(o => o.toLowerCase().includes(val)).slice(0, 30) : opts.slice(0, 30);

  if (filtered.length === 0 || (filtered.length === 1 && filtered[0] === input.value)) {
    dropdown.style.display = 'none';
    return;
  }

  dropdown.innerHTML = filtered.map((o, i) =>
    `<div onmousedown="selectAC('${field}',${i})" data-val="${esc(o)}">${esc(o)}</div>`
  ).join('');
  dropdown._filtered = filtered;
  dropdown.style.display = 'block';
}

function selectAC(field, idx) {
  const dropdown = document.getElementById('ac_' + field);
  const value = dropdown._filtered[idx];
  const input = document.querySelector(`[name="${field}"]`);
  if (input && value) input.value = value;
  hideAC(field);
}

function hideAC(field) {
  const dropdown = document.getElementById('ac_' + field);
  if (dropdown) dropdown.style.display = 'none';
}

// ============ UTILS ============
function stripHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .trim();
}
function decodeHtmlEntities(str) {
  if (str == null) return '';
  const txt = document.createElement('textarea');
  txt.innerHTML = String(str);
  return txt.value;
}
function esc(str) {
  if (str == null) return '';
  const s = decodeHtmlEntities(String(str));
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function getStatusColor(etat) {
  if (!etat) return 'status-gray';
  const e = etat.toLowerCase();
  if (e.includes('termin') || e.includes('livr') || e.includes('clotur') || e.includes('clos')) return 'status-green';
  if (e.includes('cours') || e.includes('command')) return 'status-blue';
  if (e.includes('attent') || e.includes('suspend')) return 'status-orange';
  if (e.includes('annul')) return 'status-red';
  return 'status-gray';
}

function truncate(str, max) {
  if (!str) return '';
  return str.length > max ? str.substring(0, max) + '...' : str;
}

function fmtDate(val) {
  if (!val) return '-';
  try {
    // Normalize date-only strings to avoid UTC timezone shift (2024-01-15 parsed as UTC midnight → J-1 in UTC+1)
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, day] = val.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return val;
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return val; }
}

function toInputDate(val) {
  if (!val) return '';
  try {
    let d;
    if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, day] = val.split('-').map(Number);
      d = new Date(y, m - 1, day);
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch { return ''; }
}

function fmtCur(val) {
  if (val == null || val === '') return '-';
  const num = parseFloat(val);
  if (isNaN(num)) return val;
  return num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' EUR';
}

function toast(msg, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// ============ DIAGNOSTIC ============
const DIAG_LISTS = [
  { section: 'Listes métier', entries: [
    { key: 'main',         spName: () => CONFIG.lists.main,           role: 'Commandes principales' },
    { key: 'receptions',   spName: () => CONFIG.lists.receptions,     role: 'Réceptions matériel' },
    { key: 'maintenances', spName: () => CONFIG.lists.maintenances,   role: 'Maintenances' },
    { key: 'factMateriel', spName: () => CONFIG.lists.factMateriel,   role: 'Facturation Hardware' },
    { key: 'factLicence',  spName: () => CONFIG.lists.factLicence,    role: 'Facturation Software' },
    { key: 'cmdClientSup', spName: () => CONFIG.lists.cmdClientSup,   role: 'Commandes client sup.' },
    { key: 'cmdFournSup',  spName: () => CONFIG.lists.cmdFournSup,    role: 'Commandes fournisseur sup.' },
  ]},
  { section: 'Listes de référence', entries: Object.entries(REF_LISTS).map(([k, v]) => ({
    key: k, spName: () => k, role: v.label,
  }))},
  { section: 'Gestion des accès', entries: [
    { key: 'admins',       spName: () => 'Admins',        role: 'Administrateurs' },
    { key: 'utilisateurs', spName: () => 'Utilisateurs',  role: 'Utilisateurs' },
  ]},
];

let diagnosticResults = {}; // key → { count, error, checkedAt }

async function countListItems(sid, spName) {
  let url = `/sites/${sid}/lists/${encodeURIComponent(spName)}/items?$top=5000&$select=id`;
  let total = 0;
  while (url) {
    const data = await graphGet(url.startsWith('http') ? url.replace(GRAPH_BASE, '') : url);
    total += (data.value || []).length;
    url = data['@odata.nextLink'] ? data['@odata.nextLink'].replace(GRAPH_BASE, '') : null;
  }
  return total;
}

async function checkOneList(key, spName) {
  try {
    const sid = await getSiteId();
    const count = await countListItems(sid, spName);
    diagnosticResults[key] = { count, error: null, checkedAt: new Date() };
  } catch (e) {
    diagnosticResults[key] = { count: null, error: e.message || String(e), checkedAt: new Date() };
  }
  renderDiagTable();
}

async function checkAllLists() {
  document.getElementById('diagSummary').textContent = 'Vérification en cours…';
  const all = DIAG_LISTS.flatMap(s => s.entries);
  // Mark all as pending
  all.forEach(({ key }) => { diagnosticResults[key] = { count: null, error: null, checkedAt: null, pending: true }; });
  renderDiagTable();
  await Promise.all(all.map(({ key, spName }) => checkOneList(key, spName())));
  const errors = all.filter(({ key }) => diagnosticResults[key]?.error).length;
  const empty  = all.filter(({ key }) => diagnosticResults[key]?.count === 0).length;
  document.getElementById('diagSummary').textContent =
    errors ? `${errors} erreur(s) détectée(s)` :
    empty  ? `${empty} liste(s) vide(s)` :
    `Tout est opérationnel (${all.length} listes)`;
}

function renderDiagTable() {
  const tbody = document.getElementById('diagTableBody');
  if (!tbody) return;
  let html = '';
  for (const { section, entries } of DIAG_LISTS) {
    html += `<tr class="diag-section-header"><td colspan="6">${section}</td></tr>`;
    for (const { key, spName, role } of entries) {
      const r = diagnosticResults[key];
      let badge, countCell, timeCell;
      if (!r || r.pending) {
        badge = '<span class="diag-badge pending">…</span>';
        countCell = '—';
        timeCell = '—';
      } else if (r.error) {
        badge = `<span class="diag-badge error">❌ Erreur</span><div class="diag-error-msg" title="${esc(r.error)}">${esc(r.error.substring(0, 80))}</div>`;
        countCell = '—';
        timeCell = r.checkedAt ? r.checkedAt.toLocaleTimeString('fr-FR') : '—';
      } else if (r.count === 0) {
        badge = '<span class="diag-badge empty">⚠️ Vide</span>';
        countCell = '0';
        timeCell = r.checkedAt ? r.checkedAt.toLocaleTimeString('fr-FR') : '—';
      } else {
        badge = '<span class="diag-badge ok">✅ OK</span>';
        countCell = typeof r.count === 'number' ? r.count.toLocaleString('fr-FR') : '?';
        timeCell = r.checkedAt ? r.checkedAt.toLocaleTimeString('fr-FR') : '—';
      }
      html += `<tr>
        <td class="diag-list-name">${esc(spName())}</td>
        <td class="diag-role">${esc(role)}</td>
        <td>${badge}</td>
        <td class="diag-count">${countCell}</td>
        <td class="diag-time">${timeCell}</td>
        <td><button class="btn-diag-refresh" onclick="checkOneList('${esc(key)}','${esc(spName())}')">↻</button></td>
      </tr>`;
    }
  }
  tbody.innerHTML = html;
}

function openDiag() {
  if (!isAdmin) return;
  document.getElementById('diagModal').classList.add('visible');
  renderDiagTable();
  if (Object.keys(diagnosticResults).length === 0) checkAllLists();
}

function closeDiag() {
  document.getElementById('diagModal').classList.remove('visible');
}

// ============ CONFIRM MODAL ============
let _confirmResolve = null;
function customConfirm(msg, btnLabel = 'Supprimer') {
  document.getElementById('confirmMsg').textContent = msg;
  document.getElementById('confirmOk').textContent = btnLabel;
  document.getElementById('confirmModal').classList.add('visible');
  return new Promise(resolve => { _confirmResolve = resolve; });
}
function resolveConfirm(val) {
  document.getElementById('confirmModal').classList.remove('visible');
  if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null; }
}

// ============ INIT ============
init();

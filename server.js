const express = require('express');
const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Configuration storage file path
const CONFIG_FILE = path.join(__dirname, 'config.json');

// Default config
let currentConfig = {
  spreadsheetId: process.env.SPREADSHEET_ID || '',
  sheetName: process.env.SHEET_NAME || 'Hoja 1',
  apiKey: process.env.GOOGLE_API_KEY || '',
  serviceAccountEmail: '',
  serviceAccountKey: '',
  cedulaColumn: 'Cedula',
  fechaColumn: 'Desde',
  useDemoData: false
};

// Load config if exists
if (fs.existsSync(CONFIG_FILE)) {
  try {
    const savedConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    currentConfig = { ...currentConfig, ...savedConfig };
  } catch (err) {
    console.error('Error loading config file:', err);
  }
}

// Save config helper
function saveConfig(config) {
  currentConfig = { ...currentConfig, ...config };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(currentConfig, null, 2));
}

// Demo data matching user's exact columns: Documento, Cedula, Nombre, Categoria, Cargo, Desde, RemuneracionMensual, Codigo, Status
const DEMO_DATA = [
  { "Documento": "V-12345678", "Cedula": "12345678", "Nombre": "Juan Pérez", "Categoria": "Fijo", "Cargo": "Analista de Sistemas", "Desde": "2023-01-15", "RemuneracionMensual": "$500", "Codigo": "COD-001", "Status": "Activo" },
  { "Documento": "V-87654321", "Cedula": "87654321", "Nombre": "María Rodríguez", "Categoria": "Contratado", "Cargo": "Coordinadora de RRHH", "Desde": "2022-05-20", "RemuneracionMensual": "$650", "Codigo": "COD-002", "Status": "Activo" },
  { "Documento": "V-11223344", "Cedula": "11223344", "Nombre": "Carlos Mendoza", "Categoria": "Fijo", "Cargo": "Desarrollador Frontend", "Desde": "2024-02-10", "RemuneracionMensual": "$700", "Codigo": "COD-003", "Status": "Activo" },
  { "Documento": "V-55667788", "Cedula": "55667788", "Nombre": "Ana Lucía Gómez", "Categoria": "Contratado", "Cargo": "Especialista en Marketing", "Desde": "2021-11-01", "RemuneracionMensual": "$450", "Codigo": "COD-004", "Status": "Inactivo" }
];

// Utility: Normalize text for matching
function normalizeText(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase().replace(/[\s\.\-\/\,]/g, '');
}

// Utility: Normalize dates (supports YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, etc.)
function normalizeDate(val) {
  if (!val) return '';
  const str = String(val).trim();
  
  // Try parsing ISO or common formats
  // Check DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Check YYYY/MM/DD or YYYY-MM-DD
  const ymdMatch = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return normalizeText(str);
}

// Helper: Fetch rows from Google Sheets API or Public CSV
async function fetchGoogleSheetRows(spreadsheetId, sheetName, apiKey, serviceAccountKey) {
  if (serviceAccountKey) {
    // Service Account Auth
    try {
      const credentials = typeof serviceAccountKey === 'string' ? JSON.parse(serviceAccountKey) : serviceAccountKey;
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      });
      const sheets = google.sheets({ version: 'v4', auth });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName ? `${sheetName}!A1:ZZ` : 'A1:ZZ',
      });
      return res.data.values || [];
    } catch (e) {
      throw new Error(`Error autenticando con Cuenta de Servicio: ${e.message}`);
    }
  } else if (apiKey) {
    // API Key Auth
    try {
      const sheets = google.sheets({ version: 'v4', auth: apiKey });
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: sheetName ? `${sheetName}!A1:ZZ` : 'A1:ZZ',
      });
      return res.data.values || [];
    } catch (e) {
      throw new Error(`Error usando Google API Key: ${e.message}`);
    }
  } else {
    // Try Public CSV Export URL
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName || '')}`;
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error('No se pudo acceder a la hoja pública. Asegúrate de compartir el documento como "Cualquier persona con el enlace puede ver" o configurar una API Key / Cuenta de servicio.');
      }
      const text = await response.text();
      // Parse CSV text into 2D array
      const lines = text.split(/\r?\n/);
      return lines.map(line => {
        // Simple CSV splitter handling quotes
        const row = [];
        let inQuote = false;
        let cell = '';
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuote = !inQuote;
          } else if (char === ',' && !inQuote) {
            row.push(cell.trim().replace(/^"|"$/g, ''));
            cell = '';
          } else {
            cell += char;
          }
        }
        row.push(cell.trim().replace(/^"|"$/g, ''));
        return row;
      });
    } catch (e) {
      throw new Error(`Error al leer la hoja pública: ${e.message}`);
    }
  }
}

// GET current config endpoint
app.get('/api/config', (req, res) => {
  res.json({
    spreadsheetId: currentConfig.spreadsheetId,
    sheetName: currentConfig.sheetName,
    hasApiKey: !!currentConfig.apiKey,
    hasServiceAccount: !!currentConfig.serviceAccountKey,
    cedulaColumn: currentConfig.cedulaColumn,
    fechaColumn: currentConfig.fechaColumn,
    useDemoData: currentConfig.useDemoData
  });
});

// POST save config endpoint
app.post('/api/config', (req, res) => {
  try {
    const { spreadsheetId, sheetName, apiKey, serviceAccountKey, cedulaColumn, fechaColumn, useDemoData } = req.body;
    
    saveConfig({
      spreadsheetId: spreadsheetId !== undefined ? spreadsheetId.trim() : currentConfig.spreadsheetId,
      sheetName: sheetName !== undefined ? sheetName.trim() : currentConfig.sheetName,
      apiKey: apiKey !== undefined ? apiKey.trim() : currentConfig.apiKey,
      serviceAccountKey: serviceAccountKey !== undefined ? serviceAccountKey : currentConfig.serviceAccountKey,
      cedulaColumn: cedulaColumn !== undefined ? cedulaColumn.trim() : currentConfig.cedulaColumn,
      fechaColumn: fechaColumn !== undefined ? fechaColumn.trim() : currentConfig.fechaColumn,
      useDemoData: useDemoData !== undefined ? Boolean(useDemoData) : currentConfig.useDemoData
    });

    res.json({ success: true, message: 'Configuración guardada exitosamente.' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Test Connection
app.post('/api/test-connection', async (req, res) => {
  try {
    const { spreadsheetId, sheetName, apiKey, serviceAccountKey } = req.body;
    
    const targetSpreadsheetId = spreadsheetId || currentConfig.spreadsheetId;
    const targetSheetName = sheetName || currentConfig.sheetName;
    const targetApiKey = apiKey !== undefined ? apiKey : currentConfig.apiKey;
    const targetServiceAccountKey = serviceAccountKey !== undefined ? serviceAccountKey : currentConfig.serviceAccountKey;

    if (!targetSpreadsheetId) {
      return res.status(400).json({ success: false, error: 'Por favor ingresa el ID del Spreadsheet de Google.' });
    }

    const rows = await fetchGoogleSheetRows(targetSpreadsheetId, targetSheetName, targetApiKey, targetServiceAccountKey);
    
    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: 'La hoja se leyó correctamente pero está vacía.' });
    }

    const headers = rows[0].map(h => String(h).trim());
    res.json({
      success: true,
      headers,
      totalRows: rows.length - 1,
      sampleRow: rows[1] ? rows[1] : []
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST Consultar Endpoint
app.post('/api/consultar', async (req, res) => {
  try {
    const { cedula, fechaIngreso } = req.body;

    if (!cedula || !fechaIngreso) {
      return res.status(400).json({
        success: false,
        error: 'Debes proporcionar la Cédula y la Fecha de Ingreso.'
      });
    }

    const inputCedulaNorm = normalizeText(cedula);
    const inputFechaNorm = normalizeDate(fechaIngreso);

    // If configured to use Demo Data or no spreadsheet configured yet
    if (currentConfig.useDemoData || !currentConfig.spreadsheetId) {
      const match = DEMO_DATA.find(item => {
        const itemCedulaNorm = normalizeText(item.Cedula || item.cedula);
        const itemFechaNorm = normalizeDate(item.Desde || item.fecha_ingreso);
        return itemCedulaNorm === inputCedulaNorm && itemFechaNorm === inputFechaNorm;
      });

      if (match) {
        return res.json({
          success: true,
          isDemo: true,
          data: match
        });
      } else {
        return res.json({
          success: false,
          isDemo: true,
          message: 'No se encontraron registros con esa Cédula y Fecha de Ingreso (Modo Demostración). Verifique los datos o configure la hoja real.'
        });
      }
    }

    // Real Google Sheet fetch
    const rows = await fetchGoogleSheetRows(
      currentConfig.spreadsheetId,
      currentConfig.sheetName,
      currentConfig.apiKey,
      currentConfig.serviceAccountKey
    );

    if (!rows || rows.length < 2) {
      return res.status(404).json({
        success: false,
        error: 'La hoja de cálculo no contiene filas de datos.'
      });
    }

    const headers = rows[0].map(h => String(h).trim());
    
    // Find column indexes
    const cedulaColName = (currentConfig.cedulaColumn || 'cedula').toLowerCase();
    const fechaColName = (currentConfig.fechaColumn || 'fecha_ingreso').toLowerCase();

    let cedulaIdx = headers.findIndex(h => normalizeText(h) === normalizeText(cedulaColName) || normalizeText(h).includes('cedula') || normalizeText(h).includes('identificacion') || normalizeText(h).includes('dni'));
    let fechaIdx = headers.findIndex(h => normalizeText(h) === normalizeText(fechaColName) || normalizeText(h).includes('fecha') || normalizeText(h).includes('ingreso'));

    // Fallback if not found by name
    if (cedulaIdx === -1) cedulaIdx = 0; // default to 1st column
    if (fechaIdx === -1) fechaIdx = 1;  // default to 2nd column

    let matchedRow = null;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const rowCedula = row[cedulaIdx];
      const rowFecha = row[fechaIdx];

      const rowCedulaNorm = normalizeText(rowCedula);
      const rowFechaNorm = normalizeDate(rowFecha);

      if (rowCedulaNorm === inputCedulaNorm && rowFechaNorm === inputFechaNorm) {
        matchedRow = row;
        break;
      }
    }

    if (!matchedRow) {
      return res.json({
        success: false,
        message: 'No se encontró ningún registro que coincida con la Cédula y Fecha de Ingreso indicadas.'
      });
    }

    // Map headers to row values
    const resultObj = {};
    headers.forEach((header, idx) => {
      if (header) {
        resultObj[header] = matchedRow[idx] !== undefined ? matchedRow[idx] : '';
      }
    });

    res.json({
      success: true,
      isDemo: false,
      data: resultObj
    });

  } catch (err) {
    console.error('Error al realizar la consulta:', err);
    res.status(500).json({
      success: false,
      error: `Error al realizar la consulta: ${err.message}`
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server corriendo en el puerto http://localhost:${PORT}`);
});

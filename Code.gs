/**
 * Google Apps Script - Backend API para Consulta y Edición de Hoja de Cálculo
 * Unidad de Ciencia y Tecnología - Universidad Politécnica Territorial
 * 
 * Instrucciones:
 * 1. En tu Hoja de Google, ve a: Extensiones -> Apps Script.
 * 2. Borra todo el código existente y pega este archivo completo.
 * 3. Haz clic en "Implementar" -> "Nueva implementación".
 * 4. Tipo: "Aplicación Web".
 * 5. Ejecutar como: "Yo" (tu cuenta de Google).
 * 6. Quién tiene acceso: "Cualquier persona".
 * 7. Copia la URL generada y pégala en la pestaña "Conexión" de la App Web.
 */

function doGet(e) {
  try {
    var params = e.parameter;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length < 1) {
      return jsonResponse({ success: false, message: "La hoja está vacía" });
    }
    
    var headers = data[0].map(function(h) { return String(h).trim(); });
    
    // Action: Read All Rows
    if (params.action === 'readAll') {
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var rowObj = {};
        for (var j = 0; j < headers.length; j++) {
          rowObj[headers[j]] = formatDateValue(data[i][j]);
        }
        rowObj["_rowIndex"] = i + 1; // 1-based sheet row index
        rows.push(rowObj);
      }
      return jsonResponse({ success: true, headers: headers, data: rows });
    }
    
    // Action: Query by Cedula and Fecha (Desde)
    var cedula = params.cedula || '';
    var fecha = params.fecha || '';
    
    var cedulaIdx = findColumnIndex(headers, ["cedula", "dni", "identificacion"]);
    var fechaIdx = findColumnIndex(headers, ["desde", "fecha_ingreso", "fecha"]);
    
    if (cedulaIdx === -1) cedulaIdx = 1; // Default to 2nd col if not found
    if (fechaIdx === -1) fechaIdx = 5;  // Default to 6th col (Desde)
    
    var normInputCedula = normalize(cedula);
    var normInputFecha = normalizeDate(fecha);
    
    for (var k = 1; k < data.length; k++) {
      var row = data[k];
      var rowCedulaNorm = normalize(row[cedulaIdx]);
      var rowFechaNorm = normalizeDate(row[fechaIdx]);
      
      if (rowCedulaNorm === normInputCedula && rowFechaNorm === normInputFecha) {
        var resultObj = {};
        for (var m = 0; m < headers.length; m++) {
          resultObj[headers[m]] = formatDateValue(row[m]);
        }
        resultObj["_rowIndex"] = k + 1;
        return jsonResponse({ success: true, data: resultObj });
      }
    }
    
    return jsonResponse({ success: false, message: "No se encontró ningún registro coincidente." });
    
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    var data = sheet.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h).trim(); });
    
    // Action: Update Single Row
    if (action === 'updateRow') {
      var rowIndex = contents.rowIndex;
      var updatedData = contents.data;
      
      if (!rowIndex || rowIndex < 2 || rowIndex > data.length) {
        // Find by Cedula if rowIndex not valid
        var cedulaVal = updatedData["Cedula"] || updatedData["cedula"];
        var cedulaIdx = findColumnIndex(headers, ["cedula", "dni"]);
        
        for (var r = 1; r < data.length; r++) {
          if (normalize(data[r][cedulaIdx]) === normalize(cedulaVal)) {
            rowIndex = r + 1;
            break;
          }
        }
      }
      
      if (!rowIndex) {
        return jsonResponse({ success: false, error: "No se pudo identificar la fila a actualizar." });
      }
      
      // Update cells in row
      for (var c = 0; c < headers.length; c++) {
        var headerName = headers[c];
        if (updatedData.hasOwnProperty(headerName)) {
          sheet.getRange(rowIndex, c + 1).setValue(updatedData[headerName]);
        }
      }
      
      return jsonResponse({ success: true, message: "Expediente actualizado exitosamente." });
    }
    
    // Action: Update Bulk Rows
    if (action === 'updateBulk') {
      var updatedRows = contents.rows; // Array of { rowIndex or Cedula, data }
      if (!Array.isArray(updatedRows)) {
        return jsonResponse({ success: false, error: "Formato de datos masivos no válido." });
      }
      
      var cedulaIdxBulk = findColumnIndex(headers, ["cedula", "dni"]);
      
      updatedRows.forEach(function(item) {
        var rIndex = item.rowIndex;
        var rowValues = item.data;
        
        if (!rIndex && rowValues) {
          var cVal = rowValues["Cedula"] || rowValues["cedula"];
          for (var idx = 1; idx < data.length; idx++) {
            if (normalize(data[idx][cedulaIdxBulk]) === normalize(cVal)) {
              rIndex = idx + 1;
              break;
            }
          }
        }
        
        if (rIndex && rIndex >= 2 && rIndex <= data.length + 1) {
          for (var col = 0; col < headers.length; col++) {
            var hName = headers[col];
            if (rowValues.hasOwnProperty(hName)) {
              sheet.getRange(rIndex, col + 1).setValue(rowValues[hName]);
            }
          }
        }
      });
      
      return jsonResponse({ success: true, message: "Actualización masiva realizada correctamente." });
    }
    
    return jsonResponse({ success: false, error: "Acción no reconocida." });
    
  } catch (error) {
    return jsonResponse({ success: false, error: error.message });
  }
}

// Helpers
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalize(val) {
  if (val === null || val === undefined) return '';
  return String(val).trim().toLowerCase().replace(/[\s\.\-\/\,]/g, '');
}

function normalizeDate(val) {
  if (!val) return '';
  if (val instanceof Date) {
    var year = val.getFullYear();
    var month = String(val.getMonth() + 1).padStart(2, '0');
    var day = String(val.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
  var str = String(val).trim();
  var dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmy) return dmy[3] + '-' + dmy[2].padStart(2, '0') + '-' + dmy[1].padStart(2, '0');
  var ymd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymd) return ymd[1] + '-' + ymd[2].padStart(2, '0') + '-' + ymd[3].padStart(2, '0');
  return normalize(str);
}

function formatDateValue(val) {
  if (val instanceof Date) {
    var year = val.getFullYear();
    var month = String(val.getMonth() + 1).padStart(2, '0');
    var day = String(val.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }
  return val;
}

function findColumnIndex(headers, keywords) {
  for (var i = 0; i < headers.length; i++) {
    var hNorm = normalize(headers[i]);
    for (var k = 0; k < keywords.length; k++) {
      if (hNorm.indexOf(keywords[k]) !== -1) return i;
    }
  }
  return -1;
}

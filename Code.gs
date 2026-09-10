/**
 * Google Apps Script - Backend API Unificado para Consulta, Edición, Constancias y Seguridad
 * UPTC - Unidad de Ciencia y Tecnología / Talento Humano
 */

function doGet(e) {
  try {
    var params = (e && e.parameter) ? e.parameter : {};
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    var mainSheet = ss.getSheetByName("constancias_trabajo") || ss.getSheets()[0];
    var data = mainSheet.getDataRange().getValues();
    var headers = data.length > 0 ? data[0].map(function(h) { return String(h).trim(); }) : [];

    var adminSheet = ss.getSheetByName("admin");
    if (!adminSheet) {
      adminSheet = ss.insertSheet("admin");
      adminSheet.appendRow(["usuario", "api_key", "rol", "status"]);
      adminSheet.appendRow(["admin", "admin123", "SUPER_ADMIN", "ACTIVO"]);
    }
    
    var adminData = adminSheet.getDataRange().getValues();
    
    function authCheck(usr, key) {
      if (usr === undefined || usr === null || key === undefined || key === null) return null;
      var normUsr = String(usr).trim().toLowerCase();
      var normKey = String(key).trim();
      if (!normUsr || !normKey) return null;
      
      for (var a = 1; a < adminData.length; a++) {
        var rawUsr = adminData[a][0];
        var rawKey = adminData[a][1];
        var rowUsr = String(rawUsr !== undefined && rawUsr !== null ? rawUsr : "").trim().toLowerCase();
        var rowKey = String(rawKey !== undefined && rawKey !== null ? rawKey : "").trim();
        if (typeof rawKey === 'number') {
          rowKey = Math.round(rawKey).toString().trim();
        }
        var rowRol = String(adminData[a][2] || "ADMIN").trim().toUpperCase();
        var rowStatus = String(adminData[a][3] || "ACTIVO").trim().toUpperCase();
        
        if (rowUsr === normUsr && rowKey === normKey && rowStatus === "ACTIVO") {
          return { usuario: String(rawUsr), rol: rowRol };
        }
      }
      return null;
    }

    if (params.busqueda !== undefined) {
      var terminoRaw = params.busqueda ? String(params.busqueda).trim() : '';
      var terminoNorm = normalizeClean(terminoRaw);
      if (!terminoNorm) return jsonResponse([]);

      var colCedula = findColumnIndexFlex(headers, ["cedula", "dni", "identificacion"]);
      var colCodigo = findColumnIndexFlex(headers, ["codigo", "serial", "cod"]);
      var colNombre = findColumnIndexFlex(headers, ["nombre", "empleado", "trabajador"]);
      var colCategoria = findColumnIndexFlex(headers, ["categoria", "cat"]);
      var colCargo = findColumnIndexFlex(headers, ["cargo"]);
      var colDesde = findColumnIndexFlex(headers, ["desde", "ingreso", "fecha"]);
      var colRemuneracion = findColumnIndexFlex(headers, ["remuneracion", "sueldo", "salario", "mensual"]);
      var colDocumento = findColumnIndexFlex(headers, ["documento", "doc"]);
      var colStatus = findColumnIndexFlex(headers, ["status", "estatus", "estado"]);

      var resultados = [];

      for (var r = 1; r < data.length; r++) {
        var row = data[r];
        var cedulaVal = colCedula !== -1 ? row[colCedula] : "";
        var codigoVal = colCodigo !== -1 ? row[colCodigo] : "";

        var cedulaNorm = normalizeClean(cedulaVal);
        var codigoNorm = normalizeClean(codigoVal);

        var cedulaOnlyDigits = cedulaNorm.replace(/^V|^E/, "");
        var terminoOnlyDigits = terminoNorm.replace(/^V|^E/, "");

        var esCoincidencia = (cedulaNorm && (cedulaNorm === terminoNorm || cedulaOnlyDigits === terminoOnlyDigits)) ||
                             (codigoNorm && codigoNorm === terminoNorm);

        if (esCoincidencia) {
          var desdeVal = colDesde !== -1 ? row[colDesde] : "";
          desdeVal = formatDateDDMMAAAA(desdeVal);
          
          var remVal = colRemuneracion !== -1 ? row[colRemuneracion] : "";
          remVal = formatRemuneracionBs(remVal);

          var empNombre = colNombre !== -1 ? String(row[colNombre] || "") : "";
          var empCedula = String(cedulaVal || "").trim();

          var usuarioAudit = params.usuario ? String(params.usuario).trim() : empNombre;
          if (!usuarioAudit || usuarioAudit === "CONSULTA WEB PUBLICA" || usuarioAudit === "WEB_PUBLIC") {
            usuarioAudit = empNombre || "CONSULTA WEB PUBLICA";
          }

          if (String(params.nolog).toLowerCase() !== 'true') {
            logConsulta(ss, usuarioAudit, empCedula, e);
          }

          resultados.push({
            Documento: colDocumento !== -1 ? String(row[colDocumento] || "") : "",
            Cedula: empCedula,
            Nombre: empNombre,
            Categoria: colCategoria !== -1 ? String(row[colCategoria] || "") : "",
            Cargo: colCargo !== -1 ? String(row[colCargo] || "") : "",
            Desde: desdeVal,
            RemuneracionMensual: remVal,
            Codigo: String(codigoVal || "").trim(),
            Status: colStatus !== -1 ? String(row[colStatus] || "") : ""
          });
        }
      }

      return jsonResponse(resultados);
    }

    var userAuth = authCheck(params.usuario, params.api_key);
    if (!userAuth && params.action !== 'validateAuth') {
      return jsonResponse({ status: "error", message: "Acceso no autorizado" });
    }

    if (params.action === 'validateAuth') {
      if (!userAuth) {
        return jsonResponse({ status: "error", success: false, message: "Usuario o API Key inválidos." });
      }
      return jsonResponse({ status: "success", success: true, usuario: userAuth.usuario, rol: userAuth.rol });
    }

    if (params.action === 'getStats') {
      var sheetConsultas = ss.getSheetByName("consultas");
      var logsData = sheetConsultas ? sheetConsultas.getDataRange().getValues() : [];
      var logsList = [];
      if (logsData.length > 1) {
        for (var l = 1; l < logsData.length; l++) {
          var fVal = logsData[l][3];
          var fStr = "";
          if (fVal instanceof Date) {
            fStr = formatDateDDMMAAAA(fVal) + " " + Utilities.formatDate(fVal, ss.getSpreadsheetTimeZone(), "HH:mm:ss");
          } else {
            fStr = String(fVal || '');
          }
          logsList.push({
            usuario: String(logsData[l][0] || ''),
            consultado: String(logsData[l][1] || ''),
            ip: String(logsData[l][2] || ''),
            fecha: fStr
          });
        }
      }
      return jsonResponse({
        success: true,
        totalRegistros: Math.max(0, data.length - 1),
        totalConsultas: logsList.length,
        consultasLogs: logsList
      });
    }

    if (params.action === 'listAdmins') {
      if (userAuth.rol !== 'SUPER_ADMIN') {
        return jsonResponse({ status: "error", message: "Se requiere rol SUPER_ADMIN" });
      }
      var adminList = [];
      for (var ad = 1; ad < adminData.length; ad++) {
        adminList.push({
          usuario: adminData[ad][0],
          api_key: adminData[ad][1],
          rol: adminData[ad][2],
          status: adminData[ad][3]
        });
      }
      return jsonResponse({ success: true, admins: adminList });
    }

    if (params.action === 'readAll') {
      var rows = [];
      for (var i = 1; i < data.length; i++) {
        var rowObj = {};
        for (var j = 0; j < headers.length; j++) {
          var headerName = headers[j];
          var cellVal = data[i][j];
          if (headerName.toLowerCase().indexOf("desde") !== -1 || headerName.toLowerCase().indexOf("fecha") !== -1) {
            rowObj[headerName] = formatDateDDMMAAAA(cellVal);
          } else if (headerName.toLowerCase().indexOf("remuneracion") !== -1 || headerName.toLowerCase().indexOf("sueldo") !== -1) {
            rowObj[headerName] = formatRemuneracionBs(cellVal);
          } else {
            rowObj[headerName] = cellVal;
          }
        }
        rowObj["_rowIndex"] = i + 1;
        rows.push(rowObj);
      }
      return jsonResponse({ success: true, headers: headers, data: rows, usuario: userAuth.usuario, rol: userAuth.rol });
    }

    var cedula = params.cedula || '';
    if (cedula) {
      var cedulaIdx = findColumnIndexFlex(headers, ["cedula", "dni", "identificacion"]);
      if (cedulaIdx === -1) cedulaIdx = 1;
      var normInputCedula = normalizeClean(cedula);
      var normInputDigits = normInputCedula.replace(/^V|^E/, "");

      for (var k = 1; k < data.length; k++) {
        var rowVal = data[k];
        var rowCedulaNorm = normalizeClean(rowVal[cedulaIdx]);
        var rowCedulaDigits = rowCedulaNorm.replace(/^V|^E/, "");

        if (rowCedulaNorm === normInputCedula || (normInputDigits && rowCedulaDigits === normInputDigits)) {
          var resultObj = {};
          for (var m = 0; m < headers.length; m++) {
            var hName = headers[m];
            var valM = rowVal[m];
            if (hName.toLowerCase().indexOf("desde") !== -1 || hName.toLowerCase().indexOf("fecha") !== -1) {
              resultObj[hName] = formatDateDDMMAAAA(valM);
            } else if (hName.toLowerCase().indexOf("remuneracion") !== -1 || hName.toLowerCase().indexOf("sueldo") !== -1) {
              resultObj[hName] = formatRemuneracionBs(valM);
            } else {
              resultObj[hName] = valM;
            }
          }
          resultObj["_rowIndex"] = k + 1;
          logConsulta(ss, "ADMIN (" + userAuth.usuario + ")", String(rowVal[cedulaIdx]).trim(), e);
          return jsonResponse({ success: true, data: resultObj });
        }
      }
      return jsonResponse({ success: false, message: "No se encontró ningún registro coincidente." });
    }

    return jsonResponse({ status: "error", message: "Parámetros de consulta no válidos." });

  } catch (error) {
    return jsonResponse({ status: "error", success: false, error: error.message });
  }
}

function doPost(e) {
  try {
    var contents = JSON.parse(e.postData.contents);
    var action = contents.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var mainSheet = ss.getSheetByName("constancias_trabajo") || ss.getSheets()[0];
    var data = mainSheet.getDataRange().getValues();
    var headers = data[0].map(function(h) { return String(h).trim(); });

    var adminSheet = ss.getSheetByName("admin");
    if (!adminSheet) {
      return jsonResponse({ status: "error", message: "Acceso no autorizado" });
    }
    
    var adminData = adminSheet.getDataRange().getValues();
    var normUsr = String(contents.usuario || "").trim().toLowerCase();
    var normKey = String(contents.api_key || "").trim();
    var authUser = null;

    for (var a = 1; a < adminData.length; a++) {
      var rawUsr = adminData[a][0];
      var rawKey = adminData[a][1];
      var rowUsr = String(rawUsr !== undefined && rawUsr !== null ? rawUsr : "").trim().toLowerCase();
      var rowKey = String(rawKey !== undefined && rawKey !== null ? rawKey : "").trim();
      if (typeof rawKey === 'number') {
        rowKey = Math.round(rawKey).toString().trim();
      }
      var rowStatus = String(adminData[a][3] || "ACTIVO").trim().toUpperCase();

      if (rowUsr === normUsr && rowKey === normKey && rowStatus === "ACTIVO") {
        authUser = { usuario: String(rawUsr), rol: String(adminData[a][2] || "ADMIN").trim().toUpperCase() };
        break;
      }
    }

    if (!authUser) {
      return jsonResponse({ status: "error", message: "Acceso no autorizado" });
    }

    function esClaveValidaBackend(pwd) {
      if (!pwd) return false;
      var str = String(pwd).trim();
      return str.length >= 6 && /[a-zA-Z]/.test(str) && /[0-9]/.test(str);
    }

    if (action === 'addAdmin') {
      if (authUser.rol !== 'SUPER_ADMIN') {
        return jsonResponse({ status: "error", message: "Acceso denegado. Se requiere rol SUPER_ADMIN." });
      }
      var nuevoUsr = String(contents.new_usuario || "").trim();
      var nuevoKey = String(contents.new_api_key || "").trim();
      var nuevoRol = String(contents.new_rol || "ADMIN").trim().toUpperCase();

      if (!nuevoUsr || !nuevoKey) {
        return jsonResponse({ success: false, error: "Usuario y API Key son obligatorios." });
      }

      if (!esClaveValidaBackend(nuevoKey)) {
        return jsonResponse({ success: false, error: "La contraseña debe ser alfanumérica (combinar letras y números) y tener como mínimo 6 caracteres." });
      }

      adminSheet.appendRow([nuevoUsr, "'" + nuevoKey, nuevoRol, "ACTIVO"]);
      var lastRow = adminSheet.getLastRow();
      adminSheet.getRange(lastRow, 2).setNumberFormat("@");
      return jsonResponse({ success: true, message: "Administrador " + nuevoUsr + " registrado exitosamente." });
    }

    if (action === 'changePassword') {
      var newKey = String(contents.new_api_key || "").trim();
      if (!esClaveValidaBackend(newKey)) {
        return jsonResponse({ success: false, error: "La nueva contraseña debe ser alfanumérica (combinar letras y números) y tener como mínimo 6 caracteres." });
      }
      for (var a = 1; a < adminData.length; a++) {
        var rUsr = adminData[a][0];
        if (String(rUsr || "").trim().toLowerCase() === normUsr &&
            String(adminData[a][3] || "ACTIVO").trim().toUpperCase() === "ACTIVO") {
          var range = adminSheet.getRange(a + 1, 2);
          range.setNumberFormat("@").setValue("'" + newKey);
          return jsonResponse({ success: true, message: "Contraseña actualizada exitosamente." });
        }
      }
      return jsonResponse({ success: false, error: "Usuario no encontrado." });
    }

    if (action === 'updateAdminPassword') {
      if (authUser.rol !== 'SUPER_ADMIN') {
        return jsonResponse({ status: "error", message: "Acceso denegado. Se requiere rol SUPER_ADMIN." });
      }
      var targetUsr = String(contents.target_usuario || "").trim().toLowerCase();
      var newKey = String(contents.new_api_key || "").trim();

      if (!targetUsr || !newKey) {
        return jsonResponse({ success: false, error: "Usuario y nueva contraseña son obligatorios." });
      }

      if (!esClaveValidaBackend(newKey)) {
        return jsonResponse({ success: false, error: "La contraseña debe ser alfanumérica (combinar letras y números) y tener como mínimo 6 caracteres." });
      }

      for (var a = 1; a < adminData.length; a++) {
        var rUsr = String(adminData[a][0] || "").trim().toLowerCase();
        var rRol = String(adminData[a][2] || "ADMIN").trim().toUpperCase();

        if (rUsr === targetUsr) {
          if (rRol === 'SUPER_ADMIN') {
            return jsonResponse({ success: false, error: "Un SUPER_ADMIN no puede cambiar la contraseña de otro SUPER_ADMIN." });
          }
          var range = adminSheet.getRange(a + 1, 2);
          range.setNumberFormat("@").setValue("'" + newKey);
          return jsonResponse({ success: true, message: "Contraseña del administrador " + adminData[a][0] + " actualizada exitosamente." });
        }
      }
      return jsonResponse({ success: false, error: "Usuario administrador no encontrado." });
    }

    if (action === 'updateRow') {
      var rowIndex = contents.rowIndex;
      var updatedData = contents.data;
      
      if (!rowIndex || rowIndex < 2 || rowIndex > data.length) {
        var cedulaVal = updatedData["Cedula"] || updatedData["cedula"];
        var cedulaIdx = findColumnIndexFlex(headers, ["cedula", "dni"]);
        
        for (var r = 1; r < data.length; r++) {
          if (normalizeClean(data[r][cedulaIdx]) === normalizeClean(cedulaVal)) {
            rowIndex = r + 1;
            break;
          }
        }
      }
      
      if (!rowIndex) {
        return jsonResponse({ success: false, error: "No se pudo identificar la fila a actualizar." });
      }
      
      for (var c = 0; c < headers.length; c++) {
        var headerName = headers[c];
        if (updatedData.hasOwnProperty(headerName)) {
          var valToSave = updatedData[headerName];
          if (headerName.toLowerCase().indexOf("desde") !== -1 || headerName.toLowerCase().indexOf("fecha") !== -1) {
            valToSave = formatDateDDMMAAAA(valToSave);
          } else if (headerName.toLowerCase().indexOf("remuneracion") !== -1 || headerName.toLowerCase().indexOf("sueldo") !== -1) {
            valToSave = formatRemuneracionBs(valToSave);
          }
          mainSheet.getRange(rowIndex, c + 1).setValue(valToSave);
        }
      }
      
      return jsonResponse({ success: true, message: "Expediente actualizado exitosamente." });
    }
    
    if (action === 'updateBulk') {
      var updatedRows = contents.rows;
      if (!Array.isArray(updatedRows)) {
        return jsonResponse({ success: false, error: "Formato de datos masivos no válido." });
      }
      
      var cedulaIdxBulk = findColumnIndexFlex(headers, ["cedula", "dni"]);
      
      updatedRows.forEach(function(item) {
        var rIndex = item.rowIndex;
        var rowValues = item.data;
        
        if (!rIndex && rowValues) {
          var cVal = rowValues["Cedula"] || rowValues["cedula"];
          for (var idx = 1; idx < data.length; idx++) {
            if (normalizeClean(data[idx][cedulaIdxBulk]) === normalizeClean(cVal)) {
              rIndex = idx + 1;
              break;
            }
          }
        }
        
        if (rIndex && rIndex >= 2 && rIndex <= data.length + 1) {
          for (var col = 0; col < headers.length; col++) {
            var hName = headers[col];
            if (rowValues.hasOwnProperty(hName)) {
              var valBulk = rowValues[hName];
              if (hName.toLowerCase().indexOf("desde") !== -1 || hName.toLowerCase().indexOf("fecha") !== -1) {
                valBulk = formatDateDDMMAAAA(valBulk);
              } else if (hName.toLowerCase().indexOf("remuneracion") !== -1 || hName.toLowerCase().indexOf("sueldo") !== -1) {
                valBulk = formatRemuneracionBs(valBulk);
              }
              mainSheet.getRange(rIndex, col + 1).setValue(valBulk);
            }
          }
        }
      });
      
      return jsonResponse({ success: true, message: "Actualización masiva realizada correctamente." });
    }
    
    return jsonResponse({ status: "error", error: "Acción no reconocida." });
    
  } catch (error) {
    return jsonResponse({ status: "error", success: false, error: error.message });
  }
}

function logConsulta(ss, usuario, consultado, e) {
  try {
    var sheet = ss.getSheetByName("consultas");
    if (!sheet) {
      sheet = ss.insertSheet("consultas");
      sheet.appendRow(["usuario", "consultado", "ip", "fecha"]);
    }
    var ip = (e && e.parameter && e.parameter.ip) ? e.parameter.ip : "127.0.0.1";
    var fechaNow = new Date();
    var fechaStr = formatDateDDMMAAAA(fechaNow) + " " + Utilities.formatDate(fechaNow, ss.getSpreadsheetTimeZone(), "HH:mm:ss");
    
    sheet.appendRow([
      String(usuario || "ADMIN").trim(),
      String(consultado || "").trim(),
      String(ip).trim(),
      fechaStr
    ]);
  } catch (err) {}
}

function formatDateDDMMAAAA(val) {
  if (val === null || val === undefined || val === '') return '';
  if (val instanceof Date) {
    try {
      var ss = SpreadsheetApp.getActiveSpreadsheet();
      var tz = ss ? ss.getSpreadsheetTimeZone() : "GMT";
      return Utilities.formatDate(val, tz, "dd/MM/yyyy");
    } catch(e) {
      var year = val.getFullYear();
      var month = String(val.getMonth() + 1).padStart(2, '0');
      var day = String(val.getDate()).padStart(2, '0');
      return day + '/' + month + '/' + year;
    }
  }
  var str = String(val).trim();
  if (!str) return '';
  // Detectar formato ISO: AAAA-MM-DD o AAAA/MM/DD (con o sin timestamp)
  var isoMatch = str.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
  if (isoMatch) {
    return isoMatch[3].padStart(2, '0') + '/' + isoMatch[2].padStart(2, '0') + '/' + isoMatch[1];
  }
  // Separar parte de fecha (antes de espacio o T) y luego dividir por separadores
  var datePart = str.split(/[\sT]/)[0];
  var parts = datePart.split(/[\/\-\.]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // Formato AAAA/MM/DD
      return parts[2].padStart(2, '0') + '/' + parts[1].padStart(2, '0') + '/' + parts[0];
    } else if (parts[2].length === 4) {
      // Formato DD/MM/AAAA - preservar tal cual
      var d = parts[0].padStart(2, '0');
      var m = parts[1].padStart(2, '0');
      var y = parts[2];
      // Solo intercambiar si el mes es > 12 (imposible) y el día <= 12
      if (parseInt(m, 10) > 12 && parseInt(d, 10) <= 12) {
        var tmp = d; d = m; m = tmp;
      }
      return d + '/' + m + '/' + y;
    }
  }
  return str;
}

function formatRemuneracionBs(val) {
  if (val === null || val === undefined || val === '') return '0,00 Bs';
  var str = String(val).replace(/[^\d,.-]/g, '').replace(',', '.');
  var num = parseFloat(str) || 0;
  var partes = num.toFixed(2).split('.');
  var enteras = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return enteras + "," + partes[1] + " Bs";
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function normalizeClean(val) {
  if (val === null || val === undefined) return '';
  var str = String(val).trim().toUpperCase();
  str = str.replace(/[ÁÀÄÂ]/g, "A")
           .replace(/[ÉÈËÊ]/g, "E")
           .replace(/[ÍÌÏÎ]/g, "I")
           .replace(/[ÓÒÖÔ]/g, "O")
           .replace(/[ÚÙÜÛ]/g, "U");
  return str.replace(/[^A-Z0-9]/g, "");
}

function findColumnIndexFlex(headers, keywords) {
  for (var i = 0; i < headers.length; i++) {
    var hNorm = normalizeClean(headers[i]);
    for (var k = 0; k < keywords.length; k++) {
      var keyNorm = normalizeClean(keywords[k]);
      if (hNorm.indexOf(keyNorm) !== -1) return i;
    }
  }
  return -1;
}

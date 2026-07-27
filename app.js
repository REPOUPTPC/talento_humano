// Unidad de Ciencia y Tecnología - Universidad Politécnica Territorial
// Application Script for GitHub Pages (Pure Client-Side Vanilla JS)

document.addEventListener('DOMContentLoaded', () => {

  // --- LOCAL DEMO DATA (Matching user's headers) ---
  let demoDatabase = [
    { "_rowIndex": 2, "Documento": "V-12345678", "Cedula": "12345678", "Nombre": "Juan Pérez", "Categoria": "Docente Fijo", "Cargo": "Profesor Agregado", "Desde": "2023-01-15", "RemuneracionMensual": "$500", "Codigo": "COD-001", "Status": "Activo" },
    { "_rowIndex": 3, "Documento": "V-87654321", "Cedula": "87654321", "Nombre": "María Rodríguez", "Categoria": "Administrativo", "Cargo": "Coordinadora de RRHH", "Desde": "2022-05-20", "RemuneracionMensual": "$650", "Codigo": "COD-002", "Status": "Activo" },
    { "_rowIndex": 4, "Documento": "V-11223344", "Cedula": "11223344", "Nombre": "Carlos Mendoza", "Categoria": "Docente Contratado", "Cargo": "Desarrollador de Software", "Desde": "2024-02-10", "RemuneracionMensual": "$700", "Codigo": "COD-003", "Status": "Activo" },
    { "_rowIndex": 5, "Documento": "V-55667788", "Cedula": "55667788", "Nombre": "Ana Lucía Gómez", "Categoria": "Obrero", "Cargo": "Especialista de Laboratorio", "Desde": "2021-11-01", "RemuneracionMensual": "$450", "Codigo": "COD-004", "Status": "Inactivo" }
  ];

  const defaultHeaders = ["Documento", "Cedula", "Nombre", "Categoria", "Cargo", "Desde", "RemuneracionMensual", "Codigo", "Status"];

  // State management via localStorage
  let appScriptUrl = localStorage.getItem('uct_app_script_url') || '';
  let useDemoMode = localStorage.getItem('uct_demo_mode') !== 'false';

  // Last fetched individual result
  let currentIndividualRecord = null;
  // Bulk table memory data
  let currentBulkData = [];
  let modifiedRows = new Set(); // Row indices modified in bulk table

  // Elements
  const statusBanner = document.getElementById('status-banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerText = document.getElementById('banner-text');

  const formConfig = document.getElementById('form-config');
  const inputAppScriptUrl = document.getElementById('appScriptUrl');
  const switchDemoMode = document.getElementById('switchDemoMode');
  const btnTestConn = document.getElementById('btnTestConn');
  const testConnResult = document.getElementById('testConnResult');

  const formConsulta = document.getElementById('form-consulta');
  const inputCedula = document.getElementById('inputCedula');
  const inputFecha = document.getElementById('inputFecha');
  const btnBuscar = document.getElementById('btnBuscar');
  const spinnerBuscar = document.getElementById('spinnerBuscar');

  const resultadoContainer = document.getElementById('resultadoContainer');
  const gridResultadoCampos = document.getElementById('gridResultadoCampos');
  const errorContainer = document.getElementById('errorContainer');
  const textErrorMsg = document.getElementById('textErrorMsg');
  const btnEditarIndividual = document.getElementById('btnEditarIndividual');

  const modalEdicionIndividual = new bootstrap.Modal(document.getElementById('modalEdicionIndividual'));
  const formEdicionCampos = document.getElementById('formEdicionCampos');
  const btnGuardarEdicionIndividual = document.getElementById('btnGuardarEdicionIndividual');
  const spinnerGuardarInd = document.getElementById('spinnerGuardarInd');
  const editRowIndexInput = document.getElementById('editRowIndex');

  const btnCargarMasivo = document.getElementById('btnCargarMasivo');
  const btnGuardarMasivo = document.getElementById('btnGuardarMasivo');
  const filterMasivoInput = document.getElementById('filterMasivoInput');
  const bodyTablaMasiva = document.getElementById('bodyTablaMasiva');
  const headersTablaMasiva = document.getElementById('headersTablaMasiva');
  const countMasivoText = document.getElementById('countMasivoText');

  // Initialize UI state
  initUI();

  function initUI() {
    inputAppScriptUrl.value = appScriptUrl;
    switchDemoMode.checked = useDemoMode || !appScriptUrl;
    updateBannerStatus();
  }

  function updateBannerStatus() {
    if (useDemoMode || !appScriptUrl) {
      statusBanner.className = 'alert alert-warning d-flex align-items-center justify-content-between shadow-sm mb-4';
      bannerTitle.textContent = 'Modo Demostración Activado (Offline)';
      bannerText.textContent = 'Utilizando datos locales de prueba. Para conectar tu hoja de Google Sheets ve a la pestaña "Conexión a Google Sheets".';
    } else {
      statusBanner.className = 'alert alert-success d-flex align-items-center justify-content-between shadow-sm mb-4';
      bannerTitle.textContent = 'Conectado a Google Sheets en Vivo';
      bannerText.textContent = 'La aplicación está sincronizada directamente con tu hoja de cálculo mediante Google Apps Script.';
    }
  }

  // --- CONFIG FORM & TEST CONNECTION ---
  formConfig.addEventListener('submit', (e) => {
    e.preventDefault();
    appScriptUrl = inputAppScriptUrl.value.trim();
    useDemoMode = switchDemoMode.checked;

    localStorage.setItem('uct_app_script_url', appScriptUrl);
    localStorage.setItem('uct_demo_mode', useDemoMode ? 'true' : 'false');

    updateBannerStatus();
    alert('✅ Configuración guardada correctamente.');
  });

  btnTestConn.addEventListener('click', async () => {
    const url = inputAppScriptUrl.value.trim();
    if (!url) {
      showTestResult('danger', 'Por favor ingresa primero la URL de tu Aplicación Web de Google Apps Script.');
      return;
    }

    btnTestConn.disabled = true;
    btnTestConn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Probando...';
    testConnResult.classList.add('d-none');

    try {
      const res = await fetch(`${url}?action=readAll`);
      const data = await res.json();

      if (data.success) {
        showTestResult('success', `<strong>¡Conexión Exitosa!</strong><br>Se detectaron <strong>${data.data ? data.data.length : 0}</strong> filas en tu hoja de Google Sheets.<br>Columnas: <code>${data.headers.join(', ')}</code>`);
      } else {
        showTestResult('danger', `<strong>Error en respuesta:</strong> ${data.message || data.error}`);
      }
    } catch (err) {
      showTestResult('danger', `<strong>Error de Red / CORS:</strong> ${err.message}. Asegúrate de haber publicado el script permitiendo acceso a "Cualquier persona".`);
    } finally {
      btnTestConn.disabled = false;
      btnTestConn.innerHTML = '<i class="bi bi-plug me-1"></i> Probar Conexión';
    }
  });

  function showTestResult(type, htmlContent) {
    testConnResult.className = `alert alert-${type} mt-3 mb-0`;
    testConnResult.innerHTML = htmlContent;
    testConnResult.classList.remove('d-none');
  }

  // --- TAB 1: CONSULTA INDIVIDUAL ---
  formConsulta.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cedula = inputCedula.value.trim();
    const fecha = inputFecha.value;

    if (!cedula || !fecha) return;

    btnBuscar.disabled = true;
    spinnerBuscar.classList.remove('d-none');
    resultadoContainer.classList.add('d-none');
    errorContainer.classList.add('d-none');

    try {
      let resultData = null;

      if (useDemoMode || !appScriptUrl) {
        // Query local demo database
        const normCed = normalizeText(cedula);
        const normFec = normalizeDate(fecha);
        
        resultData = demoDatabase.find(row => {
          return normalizeText(row.Cedula || row.cedula) === normCed &&
                 normalizeDate(row.Desde || row.fecha_ingreso || row.fecha) === normFec;
        });
      } else {
        // Query live Google Apps Script endpoint
        const res = await fetch(`${appScriptUrl}?action=query&cedula=${encodeURIComponent(cedula)}&fecha=${encodeURIComponent(fecha)}`);
        const json = await res.json();
        if (json.success && json.data) {
          resultData = json.data;
        }
      }

      if (resultData) {
        currentIndividualRecord = resultData;
        renderIndividualResult(resultData);
        resultadoContainer.classList.remove('d-none');
      } else {
        textErrorMsg.textContent = `No se encontró ningún expediente correspondiente a la Cédula "${cedula}" con fecha de ingreso "${fecha}".`;
        errorContainer.classList.remove('d-none');
      }
    } catch (err) {
      textErrorMsg.textContent = `Error al consultar datos: ${err.message}`;
      errorContainer.classList.remove('d-none');
    } finally {
      btnBuscar.disabled = false;
      spinnerBuscar.classList.add('d-none');
    }
  });

  function renderIndividualResult(record) {
    gridResultadoCampos.innerHTML = '';

    for (const [key, val] of Object.entries(record)) {
      if (key === '_rowIndex') continue; // Hidden sheet index

      const colDiv = document.createElement('div');
      colDiv.className = 'col-sm-6 col-md-4';

      const isStatus = key.toLowerCase() === 'status';
      let badgeHtml = escapeHtml(val || 'N/A');

      if (isStatus) {
        const isActivo = String(val).toLowerCase().includes('activo');
        badgeHtml = `<span class="badge ${isActivo ? 'bg-success' : 'bg-secondary'} px-3 py-2 fs-6">${escapeHtml(val)}</span>`;
      }

      colDiv.innerHTML = `
        <div class="p-3 bg-light rounded-3 border">
          <span class="text-uppercase small text-muted fw-bold d-block mb-1">${escapeHtml(key)}</span>
          <div class="fw-semibold fs-6 text-dark">${badgeHtml}</div>
        </div>
      `;
      gridResultadoCampos.appendChild(colDiv);
    }
  }

  // --- EDICIÓN INDIVIDUAL MODAL ---
  btnEditarIndividual.addEventListener('click', () => {
    if (!currentIndividualRecord) return;

    formEdicionCampos.innerHTML = '';
    editRowIndexInput.value = currentIndividualRecord._rowIndex || '';

    for (const [key, val] of Object.entries(currentIndividualRecord)) {
      if (key === '_rowIndex') continue;

      const colDiv = document.createElement('div');
      colDiv.className = 'col-md-6';

      const isDate = key.toLowerCase().includes('fecha') || key.toLowerCase() === 'desde';
      const inputType = isDate ? 'date' : 'text';

      colDiv.innerHTML = `
        <label class="form-label fw-bold small text-secondary">${escapeHtml(key)}</label>
        <input type="${inputType}" class="form-control" name="${escapeHtml(key)}" value="${escapeHtml(val || '')}" ${key.toLowerCase() === 'cedula' ? 'required' : ''}>
      `;
      formEdicionCampos.appendChild(colDiv);
    }

    modalEdicionIndividual.show();
  });

  // Guardar Cambios Individuales
  btnGuardarEdicionIndividual.addEventListener('click', async () => {
    const inputs = formEdicionCampos.querySelectorAll('input');
    const updatedData = {};

    inputs.forEach(input => {
      updatedData[input.name] = input.value.trim();
    });

    const rowIndex = parseInt(editRowIndexInput.value, 10);

    btnGuardarEdicionIndividual.disabled = true;
    spinnerGuardarInd.classList.remove('d-none');

    try {
      if (useDemoMode || !appScriptUrl) {
        // Update local demo data
        const matchIdx = demoDatabase.findIndex(r => r._rowIndex === rowIndex || r.Cedula === updatedData.Cedula);
        if (matchIdx !== -1) {
          demoDatabase[matchIdx] = { ...demoDatabase[matchIdx], ...updatedData };
          currentIndividualRecord = { ...demoDatabase[matchIdx] };
        } else {
          currentIndividualRecord = { ...updatedData, _rowIndex: rowIndex || 2 };
        }
        renderIndividualResult(currentIndividualRecord);
        modalEdicionIndividual.hide();
        alert('✅ Expediente actualizado exitosamente (Modo Demostración).');
      } else {
        // Post to Google Apps Script Web App
        const res = await fetch(appScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateRow',
            rowIndex: rowIndex,
            data: updatedData
          })
        });

        const json = await res.json();
        if (json.success) {
          currentIndividualRecord = { ...currentIndividualRecord, ...updatedData };
          renderIndividualResult(currentIndividualRecord);
          modalEdicionIndividual.hide();
          alert('✅ Expediente actualizado exitosamente en Google Sheets.');
        } else {
          alert('❌ Error al actualizar: ' + (json.error || json.message));
        }
      }
    } catch (err) {
      alert('❌ Error al guardar cambios: ' + err.message);
    } finally {
      btnGuardarEdicionIndividual.disabled = false;
      spinnerGuardarInd.classList.add('d-none');
    }
  });

  // --- TAB 2: EDICIÓN MASIVA EN TABLA ---
  btnCargarMasivo.addEventListener('click', cargarDatosMasivos);

  document.getElementById('tab-masiva-btn').addEventListener('shown.bs.tab', () => {
    if (currentBulkData.length === 0) {
      cargarDatosMasivos();
    }
  });

  async function cargarDatosMasivos() {
    btnCargarMasivo.disabled = true;
    btnCargarMasivo.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Cargando...';

    try {
      if (useDemoMode || !appScriptUrl) {
        currentBulkData = JSON.parse(JSON.stringify(demoDatabase));
        renderTablaMasiva(currentBulkData, defaultHeaders);
      } else {
        const res = await fetch(`${appScriptUrl}?action=readAll`);
        const json = await res.json();
        if (json.success && json.data) {
          currentBulkData = json.data;
          renderTablaMasiva(currentBulkData, json.headers || defaultHeaders);
        } else {
          alert('Error al cargar datos de la hoja: ' + (json.message || json.error));
        }
      }
      modifiedRows.clear();
    } catch (err) {
      alert('Error de conexión al cargar datos masivos: ' + err.message);
    } finally {
      btnCargarMasivo.disabled = false;
      btnCargarMasivo.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Recargar Datos';
    }
  }

  function renderTablaMasiva(rows, headers) {
    // Render headers
    headersTablaMasiva.innerHTML = '<th>#</th>';
    headers.forEach(h => {
      const th = document.createElement('th');
      th.textContent = h;
      headersTablaMasiva.appendChild(th);
    });

    bodyTablaMasiva.innerHTML = '';
    countMasivoText.textContent = `Total registros: ${rows.length}`;

    rows.forEach((row, idx) => {
      const tr = document.createElement('tr');
      tr.dataset.rowIndex = row._rowIndex || (idx + 2);

      let tdHtml = `<td><span class="badge bg-light text-dark border">${idx + 1}</span></td>`;

      headers.forEach(h => {
        const val = row[h] !== undefined ? row[h] : '';
        tdHtml += `
          <td>
            <input type="text" class="form-control form-control-sm cell-input" data-header="${escapeHtml(h)}" value="${escapeHtml(val)}" style="min-width: 110px;">
          </td>
        `;
      });

      tr.innerHTML = tdHtml;
      bodyTablaMasiva.appendChild(tr);
    });

    // Attach input edit event listeners
    bodyTablaMasiva.querySelectorAll('.cell-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        const rIndex = parseInt(tr.dataset.rowIndex, 10);
        modifiedRows.add(rIndex);
        tr.classList.add('table-warning');
      });
    });
  }

  // Filter Table
  filterMasivoInput.addEventListener('keyup', () => {
    const filter = filterMasivoInput.value.toLowerCase();
    const rows = bodyTablaMasiva.querySelectorAll('tr');

    rows.forEach(row => {
      const text = row.textContent.toLowerCase();
      row.style.display = text.includes(filter) ? '' : 'none';
    });
  });

  // Save Bulk Updates
  btnGuardarMasivo.addEventListener('click', async () => {
    if (modifiedRows.size === 0) {
      alert('ℹ️ No se han realizado modificaciones en la tabla.');
      return;
    }

    const payloadRows = [];

    bodyTablaMasiva.querySelectorAll('tr').forEach(tr => {
      const rIndex = parseInt(tr.dataset.rowIndex, 10);
      if (modifiedRows.has(rIndex)) {
        const rowData = {};
        tr.querySelectorAll('.cell-input').forEach(input => {
          rowData[input.dataset.header] = input.value.trim();
        });
        payloadRows.push({ rowIndex: rIndex, data: rowData });
      }
    });

    btnGuardarMasivo.disabled = true;
    btnGuardarMasivo.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...';

    try {
      if (useDemoMode || !appScriptUrl) {
        // Apply to local demo
        payloadRows.forEach(item => {
          const matchIdx = demoDatabase.findIndex(r => r._rowIndex === item.rowIndex);
          if (matchIdx !== -1) {
            demoDatabase[matchIdx] = { ...demoDatabase[matchIdx], ...item.data };
          }
        });
        alert(`✅ Se guardaron los cambios masivos de ${payloadRows.length} fila(s) en Modo Demostración.`);
        modifiedRows.clear();
        cargarDatosMasivos();
      } else {
        // Send to Apps Script Web App
        const res = await fetch(appScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateBulk',
            rows: payloadRows
          })
        });
        const json = await res.json();
        if (json.success) {
          alert(`✅ Se actualizaron exitosamente ${payloadRows.length} fila(s) en tu Hoja de Google Sheets.`);
          modifiedRows.clear();
          cargarDatosMasivos();
        } else {
          alert('❌ Error al realizar actualización masiva: ' + (json.error || json.message));
        }
      }
    } catch (err) {
      alert('❌ Error de red al guardar masivo: ' + err.message);
    } finally {
      btnGuardarMasivo.disabled = false;
      btnGuardarMasivo.innerHTML = '<i class="bi bi-floppy-fill me-1"></i> Guardar Cambios Masivos';
    }
  });

  // Utilities
  function normalizeText(val) {
    if (!val) return '';
    return String(val).trim().toLowerCase().replace(/[\s\.\-\/\,]/g, '');
  }

  function normalizeDate(val) {
    if (!val) return '';
    const str = String(val).trim();
    const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    const ymd = str.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
    if (ymd) return `${ymd[1]}-${ymd[2].padStart(2, '0')}-${ymd[3].padStart(2, '0')}`;
    return normalizeText(str);
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

});

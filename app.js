// Unidad de Ciencia y Tecnología - Universidad Politécnica Territorial
// Application Script for GitHub Pages (Pure Client-Side Vanilla JS)

document.addEventListener('DOMContentLoaded', () => {

  // --- LOCAL DEMO DATA (Matching user's headers) ---
  let demoDatabase = [
    { "_rowIndex": 2, "Documento": "V-15949430", "Cedula": "15949430", "Nombre": "Pedro Antonio Morales", "Categoria": "Administrativo", "Cargo": "Analista de Personal", "Desde": "01/02/2019", "RemuneracionMensual": "500.00 Bs", "Codigo": "COD-1594", "Status": "Activo" },
    { "_rowIndex": 3, "Documento": "V-12345678", "Cedula": "12345678", "Nombre": "Juan Carlos Pérez Gómez", "Categoria": "Docente Fijo", "Cargo": "Profesor Agregado", "Desde": "15/01/2023", "RemuneracionMensual": "500.00 Bs", "Codigo": "COD-001", "Status": "Activo" },
    { "_rowIndex": 4, "Documento": "V-87654321", "Cedula": "87654321", "Nombre": "María Alejandra Rodríguez López", "Categoria": "Administrativo", "Cargo": "Coordinadora de RRHH", "Desde": "20/05/2022", "RemuneracionMensual": "650.00 Bs", "Codigo": "COD-002", "Status": "Activo" },
    { "_rowIndex": 5, "Documento": "V-11223344", "Cedula": "11223344", "Nombre": "Carlos Eduardo Mendoza Silva", "Categoria": "Docente Contratado", "Cargo": "Desarrollador de Software", "Desde": "10/02/2024", "RemuneracionMensual": "700.00 Bs", "Codigo": "COD-003", "Status": "Activo" },
    { "_rowIndex": 6, "Documento": "V-55667788", "Cedula": "55667788", "Nombre": "Ana Lucía Gómez Fernández", "Categoria": "Obrero", "Cargo": "Especialista de Laboratorio", "Desde": "01/11/2021", "RemuneracionMensual": "450.00 Bs", "Codigo": "COD-004", "Status": "Inactivo" }
  ];

  let demoAdmins = [
    { usuario: "admin", api_key: "admin123", rol: "SUPER_ADMIN", status: "ACTIVO" },
    { usuario: "operador", api_key: "op123", rol: "ADMIN", status: "ACTIVO" }
  ];

  let demoConsultas = [
    { usuario: "Carlos Pérez (SUPER_ADMIN)", consultado: "15949430", ip: "192.168.1.1", fecha: "29/08/2026 09:00:00", rol: "SUPER_ADMIN" },
    { usuario: "ADMIN (operador)", consultado: "12345678", ip: "192.168.1.10", fecha: "29/08/2026 10:15:00", rol: "ADMIN" },
    { usuario: "María Rodríguez", consultado: "87654321", ip: "200.44.10.5", fecha: "29/08/2026 10:30:12", rol: "USER" },
    { usuario: "Público (Web)", consultado: "V-15949430", ip: "190.202.15.8", fecha: "29/08/2026 11:45:22", rol: "USER" }
  ];

  const defaultHeaders = ["Cedula", "Nombre", "Categoria", "Cargo", "Desde", "RemuneracionMensual", "Codigo", "Status"];
  let lastStatsLogs = [];
  let currentAdminsList = [];

  // State management via localStorage
  let appScriptUrl = localStorage.getItem('uct_app_script_url') || '';
  let appScriptUser = localStorage.getItem('uct_user') || '';
  let appScriptApiKey = localStorage.getItem('uct_api_key') || '';
  let useDemoMode = localStorage.getItem('uct_demo_mode') === 'true' || (!appScriptUrl && !appScriptUser);
  let currentUserRole = 'N/A';

  // Last fetched individual result & bulk table memory data
  let currentIndividualRecord = null;
  let currentBulkData = [];
  let modifiedRows = new Set();
  let chartConsultasInstance = null;

  // Elements
  const userRoleBadge = document.getElementById('userRoleBadge');
  const roleBadgeConfig = document.getElementById('roleBadgeConfig');
  const statusBanner = document.getElementById('status-banner');
  const bannerTitle = document.getElementById('banner-title');
  const bannerText = document.getElementById('banner-text');

  const formConfig = document.getElementById('form-config');
  const inputAppScriptUrl = document.getElementById('appScriptUrl');
  const inputAppScriptUser = document.getElementById('appScriptUser');
  const inputAppScriptApiKey = document.getElementById('appScriptApiKey');
  const switchDemoMode = document.getElementById('switchDemoMode');
  const btnTestConn = document.getElementById('btnTestConn');
  const testConnResult = document.getElementById('testConnResult');

  const modalCredencialesEl = document.getElementById('modalCredencialesRequeridas');
  const modalCredencialesBs = modalCredencialesEl ? new bootstrap.Modal(modalCredencialesEl) : null;
  const formModalCredenciales = document.getElementById('form-modal-credenciales');
  const modalInputUrl = document.getElementById('modalInputUrl');
  const modalInputUser = document.getElementById('modalInputUser');
  const modalInputApiKey = document.getElementById('modalInputApiKey');

  const secAdminManagement = document.getElementById('sec-admin-management');
  const formNuevoAdmin = document.getElementById('form-nuevo-admin');
  const bodyTablaAdmins = document.getElementById('bodyTablaAdmins');

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
  const btnGenerarPdfInd = document.getElementById('btnGenerarPdfInd');

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

  const btnCargarEstadisticas = document.getElementById('btnCargarEstadisticas');
  const btnExportarEstadisticasPdf = document.getElementById('btnExportarEstadisticasPdf');
  const btnFiltrarStats = document.getElementById('btnFiltrarStats');
  const btnLimpiarFiltrarStats = document.getElementById('btnLimpiarFiltrarStats');

  // --- INITIALIZATION ---
  initUI();
  setupHashNavigation();

  function initUI() {
    inputAppScriptUrl.value = appScriptUrl;
    inputAppScriptUser.value = appScriptUser;
    inputAppScriptApiKey.value = appScriptApiKey;
    switchDemoMode.checked = useDemoMode;

    updateBannerStatus();

    // Check credentials requirement
    if (!useDemoMode && (!appScriptUrl || !appScriptUser || !appScriptApiKey)) {
      if (modalCredencialesBs) {
        modalInputUrl.value = appScriptUrl;
        modalInputUser.value = appScriptUser;
        modalInputApiKey.value = appScriptApiKey;
        modalCredencialesBs.show();
      }
    } else if (!useDemoMode && appScriptUrl && appScriptUser && appScriptApiKey) {
      testConnection(false);
    }
  }

  // --- HASH NAVIGATION ---
  function setupHashNavigation() {
    const hashMap = {
      '#consulta': 'tab-consulta-btn',
      '#masiva': 'tab-masiva-btn',
      '#config': 'tab-config-btn',
      '#estadisticas': 'tab-estadisticas-btn',
      '#instrucciones': 'tab-instrucciones-btn'
    };

    function activateTabFromHash() {
      const hash = window.location.hash || '#consulta';
      const btnId = hashMap[hash] || 'tab-consulta-btn';
      const btn = document.getElementById(btnId);
      if (btn) {
        const tab = bootstrap.Tab.getOrCreateInstance(btn);
        tab.show();
      }
    }

    window.addEventListener('hashchange', activateTabFromHash);

    // Listen to tab changes to update URL hash
    document.querySelectorAll('#mainTab button[data-bs-toggle="tab"]').forEach(btn => {
      btn.addEventListener('shown.bs.tab', (e) => {
        const targetId = e.target.getAttribute('data-bs-target');
        const hash = targetId.replace('#pane-', '#');
        if (window.location.hash !== hash) {
          history.pushState(null, null, hash);
        }

        // Lazy load tab data
        if (hash === '#masiva' && currentBulkData.length === 0) {
          cargarDatosMasivos();
        } else if (hash === '#estadisticas') {
          cargarEstadisticas();
        }
      });
    });

    activateTabFromHash();
  }

  function updateBannerStatus() {
    if (useDemoMode || !appScriptUrl) {
      statusBanner.className = 'alert alert-warning d-flex align-items-center justify-content-between shadow-sm mb-4';
      bannerTitle.textContent = 'Modo Demostración Activado (Offline)';
      bannerText.textContent = 'Utilizando datos locales de prueba. Para conectar tu hoja de Google Sheets ve a la pestaña "Conexión a Google Sheets".';
      userRoleBadge.className = 'badge bg-warning text-dark px-3 py-2 rounded-pill fw-semibold';
      userRoleBadge.innerHTML = '<i class="bi bi-laptop me-1"></i> Modo DEMO';
      roleBadgeConfig.textContent = 'Rol: DEMO';
      if (secAdminManagement) secAdminManagement.classList.add('d-none');
    } else {
      statusBanner.className = 'alert alert-success d-flex align-items-center justify-content-between shadow-sm mb-4';
      bannerTitle.textContent = 'Conectado a Google Sheets en Vivo';
      bannerText.textContent = `Sincronizado con Apps Script como usuario "${appScriptUser}".`;
    }
  }

  // --- MODAL DE CREDENCIALES ---
  if (formModalCredenciales) {
    formModalCredenciales.addEventListener('submit', (e) => {
      e.preventDefault();
      appScriptUrl = modalInputUrl.value.trim();
      appScriptUser = modalInputUser.value.trim();
      appScriptApiKey = modalInputApiKey.value.trim();
      useDemoMode = false;

      localStorage.setItem('uct_app_script_url', appScriptUrl);
      localStorage.setItem('uct_user', appScriptUser);
      localStorage.setItem('uct_api_key', appScriptApiKey);
      localStorage.setItem('uct_demo_mode', 'false');

      inputAppScriptUrl.value = appScriptUrl;
      inputAppScriptUser.value = appScriptUser;
      inputAppScriptApiKey.value = appScriptApiKey;
      switchDemoMode.checked = false;

      if (modalCredencialesBs) modalCredencialesBs.hide();
      testConnection(true);
    });
  }

  // --- CONFIG FORM & TEST CONNECTION ---
  formConfig.addEventListener('submit', (e) => {
    e.preventDefault();
    appScriptUrl = inputAppScriptUrl.value.trim();
    appScriptUser = inputAppScriptUser.value.trim();
    appScriptApiKey = inputAppScriptApiKey.value.trim();
    useDemoMode = switchDemoMode.checked;

    localStorage.setItem('uct_app_script_url', appScriptUrl);
    localStorage.setItem('uct_user', appScriptUser);
    localStorage.setItem('uct_api_key', appScriptApiKey);
    localStorage.setItem('uct_demo_mode', useDemoMode ? 'true' : 'false');

    updateBannerStatus();
    if (!useDemoMode) {
      testConnection(true);
    } else {
      alert('✅ Configuración de Modo Demostración guardada correctamente.');
    }
  });

  btnTestConn.addEventListener('click', () => {
    appScriptUrl = inputAppScriptUrl.value.trim();
    appScriptUser = inputAppScriptUser.value.trim();
    appScriptApiKey = inputAppScriptApiKey.value.trim();
    testConnection(true);
  });

  async function testConnection(showToast = true) {
    if (!appScriptUrl || !appScriptUser || !appScriptApiKey) {
      showTestResult('danger', 'Por favor completa la URL, Usuario y API Key.');
      return;
    }

    btnTestConn.disabled = true;
    btnTestConn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Probando...';
    testConnResult.classList.add('d-none');

    try {
      const res = await fetch(`${appScriptUrl}?action=validateAuth&usuario=${encodeURIComponent(appScriptUser)}&api_key=${encodeURIComponent(appScriptApiKey)}`);
      const data = await res.json();

      if (data.status === 'success' || data.success) {
        currentUserRole = data.rol || 'ADMIN';
        userRoleBadge.className = 'badge bg-success px-3 py-2 rounded-pill fw-semibold';
        userRoleBadge.innerHTML = `<i class="bi bi-shield-check me-1"></i> ${escapeHtml(appScriptUser)} (${currentUserRole})`;
        roleBadgeConfig.className = 'badge bg-success text-white px-3 py-2 fw-bold';
        roleBadgeConfig.textContent = `Rol: ${currentUserRole}`;

        updateBannerStatus();

        if (showToast) {
          showTestResult('success', `<strong>¡Conexión Exitosa!</strong><br>Usuario autenticado: <strong>${escapeHtml(appScriptUser)}</strong> | Rol: <strong>${currentUserRole}</strong>`);
        }

        // Handle SUPER_ADMIN privileges
        if (currentUserRole === 'SUPER_ADMIN') {
          secAdminManagement.classList.remove('d-none');
          cargarListaAdmins();
        } else {
          secAdminManagement.classList.add('d-none');
        }
      } else {
        currentUserRole = 'N/A';
        userRoleBadge.className = 'badge bg-danger px-3 py-2 rounded-pill fw-semibold';
        userRoleBadge.innerHTML = '<i class="bi bi-exclamation-octagon me-1"></i> Sin Autorización';
        roleBadgeConfig.textContent = 'Rol: No Autorizado';
        secAdminManagement.classList.add('d-none');

        showTestResult('danger', `<strong>Acceso No Autorizado:</strong> ${data.message || 'Usuario o API Key incorrectos.'}`);
      }
    } catch (err) {
      showTestResult('danger', `<strong>Error de Red / CORS:</strong> ${err.message}. Verifica la URL e internet.`);
    } finally {
      btnTestConn.disabled = false;
      btnTestConn.innerHTML = '<i class="bi bi-plug me-1"></i> Probar Conexión & Validar Token';
    }
  }

  function showTestResult(type, htmlContent) {
    testConnResult.className = `alert alert-${type} mt-3 mb-0`;
    testConnResult.innerHTML = htmlContent;
    testConnResult.classList.remove('d-none');
  }

  // --- GESTIÓN DE ADMINISTRADORES (SUPER_ADMIN) ---
  async function cargarListaAdmins() {
    if (useDemoMode || !appScriptUrl) {
      renderTablaAdmins(demoAdmins);
      return;
    }

    try {
      const res = await fetch(`${appScriptUrl}?action=listAdmins&usuario=${encodeURIComponent(appScriptUser)}&api_key=${encodeURIComponent(appScriptApiKey)}`);
      const data = await res.json();
      if (data.success && data.admins) {
        currentAdminsList = data.admins;
        renderTablaAdmins(data.admins);
      } else {
        bodyTablaAdmins.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-2">${escapeHtml(data.message || 'No se pudo cargar la lista')}</td></tr>`;
      }
    } catch (e) {
      bodyTablaAdmins.innerHTML = `<tr><td colspan="4" class="text-center text-danger py-2">Error al cargar administradores: ${escapeHtml(e.message)}</td></tr>`;
    }
  }

  function renderTablaAdmins(admins) {
    bodyTablaAdmins.innerHTML = '';
    admins.forEach(ad => {
      const tr = document.createElement('tr');
      const isSuper = ad.rol === 'SUPER_ADMIN';
      tr.innerHTML = `
        <td class="fw-bold">${escapeHtml(ad.usuario)}</td>
        <td><code>${escapeHtml(ad.api_key)}</code></td>
        <td><span class="badge ${isSuper ? 'bg-primary' : 'bg-secondary'}">${escapeHtml(ad.rol)}</span></td>
        <td><span class="badge bg-success-subtle text-success border border-success">${escapeHtml(ad.status || 'ACTIVO')}</span></td>
      `;
      bodyTablaAdmins.appendChild(tr);
    });
  }

  if (formNuevoAdmin) {
    formNuevoAdmin.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newUsr = document.getElementById('newAdminUser').value.trim();
      const newKey = document.getElementById('newAdminKey').value.trim();
      const newRol = document.getElementById('newAdminRol').value;

      if (!newUsr || !newKey) return;

      const btnCrear = document.getElementById('btnCrearAdmin');
      btnCrear.disabled = true;

      try {
        if (useDemoMode || !appScriptUrl) {
          demoAdmins.push({ usuario: newUsr, api_key: newKey, rol: newRol, status: "ACTIVO" });
          renderTablaAdmins(demoAdmins);
          alert(`✅ Administrador "${newUsr}" registrado exitosamente (Modo Demo).`);
          formNuevoAdmin.reset();
        } else {
          const res = await fetch(appScriptUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'addAdmin',
              usuario: appScriptUser,
              api_key: appScriptApiKey,
              new_usuario: newUsr,
              new_api_key: newKey,
              new_rol: newRol
            })
          });
          const data = await res.json();
          if (data.success) {
            alert(`✅ ${data.message || 'Administrador registrado exitosamente.'}`);
            formNuevoAdmin.reset();
            cargarListaAdmins();
          } else {
            alert(`❌ Error: ${data.message || data.error}`);
          }
        }
      } catch (err) {
        alert('❌ Error de red al agregar administrador: ' + err.message);
      } finally {
        btnCrear.disabled = false;
      }
    });
  }

  // --- TAB 1: CONSULTA INDIVIDUAL ---
  formConsulta.addEventListener('submit', async (e) => {
    e.preventDefault();
    const cedulaInput = inputCedula.value.trim();

    if (!cedulaInput) return;

    btnBuscar.disabled = true;
    spinnerBuscar.classList.remove('d-none');
    resultadoContainer.classList.add('d-none');
    errorContainer.classList.add('d-none');

    try {
      let resultData = null;

      const searchNorm = normalizeClean(cedulaInput);
      const searchDigits = searchNorm.replace(/^V|^E/, '');

      if (useDemoMode || !appScriptUrl) {
        // Coincidencia exacta en modo demo (por texto completo o dígitos exactos)
        resultData = demoDatabase.find(row => {
          const rowVals = Object.values(row).map(v => normalizeClean(v));
          const rowDigits = rowVals.map(v => v.replace(/^V|^E/, ''));
          return rowVals.includes(searchNorm) || (searchDigits.length > 0 && rowDigits.includes(searchDigits));
        });
      } else {
        // Usar directamente el endpoint 'busqueda' como en consulta.html
        const res = await fetch(`${appScriptUrl}?busqueda=${encodeURIComponent(cedulaInput)}&usuario=${encodeURIComponent(appScriptUser)}&api_key=${encodeURIComponent(appScriptApiKey)}`);
        const json = await res.json();
        
        let arr = [];
        if (Array.isArray(json)) {
          arr = json;
        } else if (json && Array.isArray(json.data)) {
          arr = json.data;
        } else if (json && json.status === 'error') {
          alert(`❌ Acceso No Autorizado: ${json.message || 'Verifica tus credenciales'}`);
        }

        if (arr.length > 0) {
          // Robustez tipo consulta.html: filtrar localmente si el backend devuelve varios
          const coincidenciaExacta = arr.find(row => {
             const cNorm = normalizeClean(row.Cedula || row.identificacion || row.documento || '');
             const cDig = cNorm.replace(/^V|^E/, '');
             return cNorm === searchNorm || (cDig.length > 0 && cDig === searchDigits);
          });
          resultData = coincidenciaExacta || arr[0];
        }
      }

      if (resultData) {
        currentIndividualRecord = resultData;
        renderIndividualResult(resultData);
        resultadoContainer.classList.remove('d-none');
      } else {
        textErrorMsg.textContent = `No se encontró ningún expediente correspondiente a la Cédula "${cedulaInput}".`;
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
      if (key === '_rowIndex') continue;

      const colDiv = document.createElement('div');
      colDiv.className = 'col-sm-6 col-md-4';

      let displayVal = escapeHtml(val || 'N/A');

      if (key.toLowerCase().includes('fecha') || key.toLowerCase() === 'desde') {
        displayVal = formatDateDDMMAAAA(val);
      } else if (key.toLowerCase().includes('remuneracion') || key.toLowerCase().includes('sueldo')) {
        displayVal = formatearRemuneracionBs(val);
      }

      const isStatus = key.toLowerCase() === 'status';
      if (isStatus) {
        const isActivo = String(val).toLowerCase().includes('activo');
        displayVal = `<span class="badge ${isActivo ? 'bg-success' : 'bg-secondary'} px-3 py-2 fs-6">${escapeHtml(val)}</span>`;
      }

      colDiv.innerHTML = `
        <div class="p-3 bg-light rounded-3 border">
          <span class="text-uppercase small text-muted fw-bold d-block mb-1">${escapeHtml(key)}</span>
          <div class="fw-semibold fs-6 text-dark">${displayVal}</div>
        </div>
      `;
      gridResultadoCampos.appendChild(colDiv);
    }
  }

  // --- GENERAR PDF DESDE INDEX.HTML ---
  btnGenerarPdfInd.addEventListener('click', () => {
    if (currentIndividualRecord && currentIndividualRecord.Codigo) {
      generarPDF(currentIndividualRecord.Codigo);
    } else if (currentIndividualRecord && currentIndividualRecord.Cedula) {
      generarPDF(currentIndividualRecord.Cedula);
    } else {
      alert("No se identificó el código o serial del expediente.");
    }
  });

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
      const inputType = isDate ? 'text' : 'text';
      let valueFmt = val || '';
      if (isDate) valueFmt = formatDateDDMMAAAA(val);

      colDiv.innerHTML = `
        <label class="form-label fw-bold small text-secondary">${escapeHtml(key)}</label>
        <input type="${inputType}" class="form-control" name="${escapeHtml(key)}" value="${escapeHtml(valueFmt)}" ${isDate ? 'placeholder="DD/MM/AAAA"' : ''} ${key.toLowerCase() === 'cedula' ? 'required' : ''}>
      `;
      formEdicionCampos.appendChild(colDiv);
    }

    modalEdicionIndividual.show();
  });

  btnGuardarEdicionIndividual.addEventListener('click', async () => {
    const inputs = formEdicionCampos.querySelectorAll('input');
    const updatedData = {};

    inputs.forEach(input => {
      let val = input.value.trim();
      if (input.name.toLowerCase().includes('desde') || input.name.toLowerCase().includes('fecha')) {
        val = formatDateDDMMAAAA(val);
      } else if (input.name.toLowerCase().includes('remuneracion') || input.name.toLowerCase().includes('sueldo')) {
        val = formatearRemuneracionBs(val);
      }
      updatedData[input.name] = val;
    });

    const rowIndex = parseInt(editRowIndexInput.value, 10);

    btnGuardarEdicionIndividual.disabled = true;
    spinnerGuardarInd.classList.remove('d-none');

    try {
      if (useDemoMode || !appScriptUrl) {
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
        const res = await fetch(appScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateRow',
            usuario: appScriptUser,
            api_key: appScriptApiKey,
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

  // --- TAB 2: EDICIÓN MASIVA EN TABLA & BÚSQUEDA EN TIEMPO REAL ---
  btnCargarMasivo.addEventListener('click', cargarDatosMasivos);

  async function cargarDatosMasivos() {
    btnCargarMasivo.disabled = true;
    btnCargarMasivo.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Cargando...';

    try {
      if (useDemoMode || !appScriptUrl) {
        currentBulkData = JSON.parse(JSON.stringify(demoDatabase));
        renderTablaMasiva(currentBulkData, defaultHeaders);
      } else {
        const res = await fetch(`${appScriptUrl}?action=readAll&usuario=${encodeURIComponent(appScriptUser)}&api_key=${encodeURIComponent(appScriptApiKey)}`);
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
    const visibleHeaders = (headers && headers.length > 0 ? headers : defaultHeaders).filter(h => h.toLowerCase() !== 'documento');

    headersTablaMasiva.innerHTML = '<th>#</th>';
    visibleHeaders.forEach(h => {
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

      visibleHeaders.forEach(h => {
        let val = row[h] !== undefined ? row[h] : '';
        if (h.toLowerCase().includes('desde') || h.toLowerCase().includes('fecha')) {
          val = formatDateDDMMAAAA(val);
        } else if (h.toLowerCase().includes('remuneracion') || h.toLowerCase().includes('sueldo')) {
          val = formatearRemuneracionBs(val);
        }

        let minWidth = '120px';
        const lowerH = h.toLowerCase();
        if (lowerH === 'nombre') {
          minWidth = '240px';
        } else if (lowerH === 'cargo') {
          minWidth = '220px';
        } else if (lowerH === 'categoria') {
          minWidth = '160px';
        } else if (lowerH === 'cedula') {
          minWidth = '110px';
        } else if (lowerH === 'desde') {
          minWidth = '110px';
        } else if (lowerH.includes('remuneracion')) {
          minWidth = '140px';
        }

        tdHtml += `
          <td>
            <input type="text" class="form-control form-control-sm cell-input" data-header="${escapeHtml(h)}" value="${escapeHtml(val)}" style="min-width: ${minWidth}; font-size: 0.83rem; padding: 0.25rem 0.4rem;">
          </td>
        `;
      });

      tr.innerHTML = tdHtml;
      bodyTablaMasiva.appendChild(tr);
    });

    bodyTablaMasiva.querySelectorAll('.cell-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const tr = e.target.closest('tr');
        const rIndex = parseInt(tr.dataset.rowIndex, 10);
        modifiedRows.add(rIndex);
        tr.classList.add('table-warning');
      });
    });
  }

  // --- FILTRO EN TIEMPO REAL TOKENIZADO AVANZADO ---
  filterMasivoInput.addEventListener('input', () => {
    const rawFilter = filterMasivoInput.value.trim();
    if (!rawFilter) {
      bodyTablaMasiva.querySelectorAll('tr').forEach(r => r.style.display = '');
      return;
    }

    const tokens = rawFilter.split(/\s+/).map(t => normalizeClean(t)).filter(t => t.length > 0);

    bodyTablaMasiva.querySelectorAll('tr').forEach(tr => {
      // Extraer el contenido de texto (para celdas que no son inputs como el ID) + los campos input
      const cellInputs = tr.querySelectorAll('.cell-input');
      const combinedRowText = tr.textContent + ' ' + Array.from(cellInputs).map(inp => inp.value).join(' ');
      const textNorm = normalizeClean(combinedRowText);

      // Verificar si cada token de búsqueda coincide con la fila
      const isMatch = tokens.every(token => {
        const tokenOnlyDigits = token.replace(/^V|^E/, '');
        return textNorm.includes(token) || (tokenOnlyDigits.length > 0 && textNorm.includes(tokenOnlyDigits));
      });

      tr.style.display = isMatch ? '' : 'none';
    });
  });

  // Guardar Cambios Masivos
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
          let val = input.value.trim();
          const header = input.dataset.header;
          if (header.toLowerCase().includes('desde') || header.toLowerCase().includes('fecha')) {
            val = formatDateDDMMAAAA(val);
          } else if (header.toLowerCase().includes('remuneracion') || header.toLowerCase().includes('sueldo')) {
            val = formatearRemuneracionBs(val);
          }
          rowData[header] = val;
        });
        payloadRows.push({ rowIndex: rIndex, data: rowData });
      }
    });

    btnGuardarMasivo.disabled = true;
    btnGuardarMasivo.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Guardando...';

    try {
      if (useDemoMode || !appScriptUrl) {
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
        const res = await fetch(appScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'updateBulk',
            usuario: appScriptUser,
            api_key: appScriptApiKey,
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

  // --- HELPER FUNCIONES ROL & FECHAS AUDITORÍA ---
  function getUserRole(uStr, rStr) {
    if (rStr && (rStr.toUpperCase().includes('SUPER') || rStr.toUpperCase() === 'SUPER_ADMIN')) return 'SUPER_ADMIN';
    if (rStr && (rStr.toUpperCase().includes('ADMIN') || rStr.toUpperCase() === 'ADMIN')) return 'ADMIN';

    const cleanUser = String(uStr || '').trim().toLowerCase();
    if (!cleanUser) return 'USER';

    // 1. Verificar si es el usuario autenticado actualmente en la sesión
    const activeAppUser = String(appScriptUser || '').trim().toLowerCase();
    if (activeAppUser && cleanUser === activeAppUser) {
      if (currentUserRole === 'SUPER_ADMIN' || currentUserRole === 'ADMIN') {
        return currentUserRole;
      }
    }

    // 2. Verificar contra la lista cargada de administradores
    const adminsList = (currentAdminsList && currentAdminsList.length > 0) ? currentAdminsList : demoAdmins;
    const adminObj = adminsList.find(a => String(a.usuario || '').trim().toLowerCase() === cleanUser);
    if (adminObj) {
      const adminRole = String(adminObj.rol || '').toUpperCase();
      return adminRole.includes('SUPER') ? 'SUPER_ADMIN' : 'ADMIN';
    }

    // 3. Fallback por nombre (solo para datos que tengan explícitamente el rol en el string del usuario)
    const upperU = String(uStr || '').toUpperCase();
    if (upperU.includes('SUPER_ADMIN')) return 'SUPER_ADMIN';
    if (upperU.includes('(ADMIN') || upperU.includes('- ADMIN')) return 'ADMIN';

    return 'USER';
  }

  function getRoleBadgeInfo(uStr, rStr) {
    const role = getUserRole(uStr, rStr);
    if (role === 'SUPER_ADMIN') {
      return { class: 'bg-danger text-white', pdfBg: '#dc3545', pdfColor: '#ffffff' };
    } else if (role === 'ADMIN') {
      return { class: 'bg-warning text-dark', pdfBg: '#ffc107', pdfColor: '#000000' };
    } else {
      return { class: 'bg-primary text-white', pdfBg: '#0d6efd', pdfColor: '#ffffff' };
    }
  }

  function parseFechaAudit(fechaStr) {
    if (!fechaStr) return null;
    const str = String(fechaStr).trim();
    if (str.includes('/')) {
      const parts = str.split(' ')[0].split('/');
      if (parts.length === 3) {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    if (str.includes('-')) {
      const parts = str.split(' ')[0].split('-');
      if (parts.length === 3) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      }
    }
    const d = new Date(str);
    return isNaN(d.getTime()) ? null : d;
  }

  function getFilteredStatsLogs(allLogs) {
    const desdeVal = document.getElementById('statsFechaDesde')?.value;
    const hastaVal = document.getElementById('statsFechaHasta')?.value;

    if (!desdeVal && !hastaVal) return allLogs || [];

    const desdeDate = desdeVal ? new Date(desdeVal + 'T00:00:00') : null;
    const hastaDate = hastaVal ? new Date(hastaVal + 'T23:59:59') : null;

    return (allLogs || []).filter(l => {
      const d = parseFechaAudit(l.fecha);
      if (!d) return true;
      if (desdeDate && d < desdeDate) return false;
      if (hastaDate && d > hastaDate) return false;
      return true;
    });
  }

  // --- TAB 4: ESTADÍSTICAS Y AUDITORÍA ---
  btnCargarEstadisticas.addEventListener('click', cargarEstadisticas);
  btnExportarEstadisticasPdf.addEventListener('click', exportarEstadisticasPdf);

  if (btnFiltrarStats) {
    btnFiltrarStats.addEventListener('click', cargarEstadisticas);
  }
  if (btnLimpiarFiltrarStats) {
    btnLimpiarFiltrarStats.addEventListener('click', () => {
      const elDesde = document.getElementById('statsFechaDesde');
      const elHasta = document.getElementById('statsFechaHasta');
      if (elDesde) elDesde.value = '';
      if (elHasta) elHasta.value = '';
      cargarEstadisticas();
    });
  }

  async function cargarEstadisticas() {
    btnCargarEstadisticas.disabled = true;
    btnCargarEstadisticas.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Cargando...';

    let totalConsultas = 0;
    let consultasAdmin = 0;
    let consultasWeb = 0;
    let totalTrabajadores = 0;
    let rawLogs = [];

    try {
      if (useDemoMode || !appScriptUrl) {
        rawLogs = demoConsultas;
        totalTrabajadores = demoDatabase.length;
      } else {
        const res = await fetch(`${appScriptUrl}?action=getStats&usuario=${encodeURIComponent(appScriptUser)}&api_key=${encodeURIComponent(appScriptApiKey)}`);
        const data = await res.json();
        if (data.success) {
          rawLogs = data.consultasLogs || [];
          totalTrabajadores = data.totalRegistros || 0;
        }
        
        // Ensure currentAdminsList is loaded to correctly resolve roles
        if (currentAdminsList.length === 0) {
          try {
             const resAdmins = await fetch(`${appScriptUrl}?action=listAdmins&usuario=${encodeURIComponent(appScriptUser)}&api_key=${encodeURIComponent(appScriptApiKey)}`);
             const dataAdmins = await resAdmins.json();
             if (dataAdmins.success && dataAdmins.admins) {
                currentAdminsList = dataAdmins.admins;
             }
          } catch (e) {
             console.warn("No se pudo cargar la lista de administradores para las estadísticas.", e);
          }
        }
      }

      lastStatsLogs = rawLogs;
      const logsList = getFilteredStatsLogs(lastStatsLogs);

      totalConsultas = logsList.length;
      // Contar usuarios ADMIN y SUPER_ADMIN en la métrica de Consultas ADMIN (cruzando con lista de la pestaña admin)
      consultasAdmin = logsList.filter(l => {
        const role = getUserRole(l.usuario, l.rol);
        return role === 'ADMIN' || role === 'SUPER_ADMIN';
      }).length;
      consultasWeb = totalConsultas - consultasAdmin;

      document.getElementById('kpiTotalConsultas').textContent = totalConsultas;
      document.getElementById('kpiConsultasAdmin').textContent = consultasAdmin;
      document.getElementById('kpiConsultasWeb').textContent = consultasWeb;
      document.getElementById('kpiTotalTrabajadores').textContent = totalTrabajadores;

      // Render chart
      renderChartConsultas(consultasAdmin, consultasWeb);

      // Render logs table
      renderTablaConsultas(logsList);

    } catch (e) {
      console.error("Error al cargar estadísticas:", e);
    } finally {
      btnCargarEstadisticas.disabled = false;
      btnCargarEstadisticas.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i> Actualizar Métricas';
    }
  }

  function renderChartConsultas(adminCount, webCount) {
    const ctx = document.getElementById('chartConsultas');
    if (!ctx) return;

    if (chartConsultasInstance) {
      chartConsultasInstance.destroy();
    }

    chartConsultasInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Consultas Sistema ADMIN / SUPER_ADMIN', 'Consultas Web Pública'],
        datasets: [{
          data: [adminCount || 0, webCount || 0],
          backgroundColor: ['#0d6efd', '#0dcaf0'],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom' }
        }
      }
    });
  }

  function renderTablaConsultas(logs) {
    const body = document.getElementById('bodyTablaConsultas');
    if (!body) return;

    body.innerHTML = '';
    if (!logs || logs.length === 0) {
      body.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No hay registros de consultas en la base de datos para el filtro seleccionado.</td></tr>';
      return;
    }

    logs.forEach(l => {
      const tr = document.createElement('tr');
      const roleInfo = getRoleBadgeInfo(l.usuario, l.rol);
      tr.innerHTML = `
        <td><span class="badge ${roleInfo.class} px-2 py-1">${escapeHtml(l.usuario)}</span></td>
        <td class="fw-bold">${escapeHtml(l.consultado || l.cedula || 'N/A')}</td>
        <td><code>${escapeHtml(l.ip || 'N/A')}</code></td>
        <td><small class="text-muted">${escapeHtml(l.fecha || 'N/A')}</small></td>
      `;
      body.appendChild(tr);
    });
  }

  // EXPORTAR ESTADÍSTICAS A PDF
  async function exportarEstadisticasPdf() {
    showPdfProgress('Preparando Reporte de Estadísticas...', 'Generando gráficos y compilando auditoría...', 20);

    try {
      const kpiTotal = document.getElementById('kpiTotalConsultas')?.textContent || '0';
      const kpiAdmin = document.getElementById('kpiConsultasAdmin')?.textContent || '0';
      const kpiWeb = document.getElementById('kpiConsultasWeb')?.textContent || '0';
      const kpiTrab = document.getElementById('kpiTotalTrabajadores')?.textContent || '0';

      const logoBase64 = await cargarImagenDesdeURL('https://i.ibb.co/r29PSQ3Y/logo-talento-humano.png');

      const rawLogs = (lastStatsLogs && lastStatsLogs.length > 0) ? lastStatsLogs : demoConsultas;
      const logsToUse = getFilteredStatsLogs(rawLogs);

      const desdeVal = document.getElementById('statsFechaDesde')?.value;
      const hastaVal = document.getElementById('statsFechaHasta')?.value;
      let rangoStr = '';
      if (desdeVal || hastaVal) {
        const dFmt = desdeVal ? formatDateDDMMAAAA(desdeVal) : 'Inicio';
        const hFmt = hastaVal ? formatDateDDMMAAAA(hastaVal) : 'Actualidad';
        rangoStr = ` | Rango Filtrado: ${dFmt} al ${hFmt}`;
      }

      const logRows = logsToUse.length > 0 ? logsToUse.map(c => {
        const roleInfo = getRoleBadgeInfo(c.usuario, c.rol);
        return [
          { text: String(c.usuario || 'N/A'), fontSize: 9, bold: true, fillColor: roleInfo.pdfBg, color: roleInfo.pdfColor, alignment: 'center' },
          { text: String(c.consultado || c.cedula || 'N/A'), fontSize: 9, bold: true, alignment: 'center' },
          { text: String(c.ip || 'N/A'), fontSize: 9, alignment: 'center' },
          { text: String(c.fecha || 'N/A'), fontSize: 9, alignment: 'center' }
        ];
      }) : [
        [
          { text: 'Sin registros para el rango seleccionado', fontSize: 9, alignment: 'center' },
          { text: '-', fontSize: 9, alignment: 'center' },
          { text: '-', fontSize: 9, alignment: 'center' },
          { text: '-', fontSize: 9, alignment: 'center' }
        ]
      ];

      const docDef = {
        pageSize: 'LETTER',
        pageMargins: [30, 40, 30, 40],
        content: [
          {
            columns: [
              {
                image: logoBase64,
                width: 70,
                alignment: 'left'
              },
              {
                width: '*',
                text: [
                  { text: "DIRECCIÓN DE TALENTO HUMANO\n", bold: true, fontSize: 12 },
                  { text: "UNIVERSIDAD POLITÉCNICA TERRITORIAL DE PUERTO CABELLO\n", bold: true, fontSize: 10 },
                  { text: "RIF: G-20005608-8\n", fontSize: 9 },
                  { text: "Urb. La Elvira Zona Industrial Santa Rosa Galpón N° 8.\nPuerto Cabello, Estado Carabobo\nhttps://www.uptc.edu.ve\n", fontSize: 8 }
                ],
                alignment: 'center',
                margin: [0, 5, 0, 0]
              }
            ],
            margin: [0, 0, 0, 20]
          },
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 550, y2: 0, lineWidth: 2, lineColor: '#003366' }] },
          { text: 'REPORTE ESTADÍSTICO DE AUDITORÍA Y ACCESOS', style: 'titleHeader' },
          { text: `Fecha de Emisión: ${formatDateDDMMAAAA(new Date())} ${new Date().toLocaleTimeString('es-ES')}${rangoStr}`, style: 'subHeader' },

          { text: 'RESUMEN EJECUTIVO DE MÉTRICAS', style: 'sectionHeader' },
          {
            table: {
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: 'Total Consultas', style: 'thStyle' },
                  { text: 'Consultas ADMIN / SUPER', style: 'thStyle' },
                  { text: 'Consultas WEB', style: 'thStyle' },
                  { text: 'Trabajadores Registrados', style: 'thStyle' }
                ],
                [
                  { text: kpiTotal, style: 'tdNumStyle' },
                  { text: kpiAdmin, style: 'tdNumStyle' },
                  { text: kpiWeb, style: 'tdNumStyle' },
                  { text: kpiTrab, style: 'tdNumStyle' }
                ]
              ]
            },
            layout: 'lightHorizontalLines',
            margin: [0, 5, 0, 20]
          },

          { text: 'REGISTRO DETALLADO DE CONSULTAS (AUDITORÍA)', style: 'sectionHeader' },
          {
            table: {
              headerRows: 1,
              widths: ['*', '*', '*', '*'],
              body: [
                [
                  { text: 'Usuario', style: 'thStyle' },
                  { text: 'Cédula / Consultado', style: 'thStyle' },
                  { text: 'Dirección IP', style: 'thStyle' },
                  { text: 'Fecha y Hora', style: 'thStyle' }
                ],
                ...logRows
              ]
            },
            margin: [0, 5, 0, 20]
          }
        ],
        styles: {
          titleHeader: { fontSize: 14, bold: true, alignment: 'center', margin: [0, 15, 0, 5], color: '#003366' },
          subHeader: { fontSize: 9, alignment: 'center', margin: [0, 0, 0, 15], color: '#666666' },
          sectionHeader: { fontSize: 11, bold: true, margin: [0, 10, 0, 5], color: '#0d6efd' },
          thStyle: { bold: true, fontSize: 9, fillColor: '#f0f4f8', alignment: 'center' },
          tdNumStyle: { bold: true, fontSize: 12, alignment: 'center', color: '#003366' }
        }
      };

      showPdfProgress('Finalizando Reporte...', 'Iniciando descarga del archivo...', 90);

      pdfMake.createPdf(docDef).download(`Reporte_Estadisticas_UPTPC_${Date.now()}.pdf`);

      setTimeout(() => {
        hidePdfProgress();
      }, 800);

    } catch (err) {
      console.error("Error exportando reporte:", err);
      hidePdfProgress();
      alert("Error al exportar el reporte a PDF: " + err.message);
    }
  }

  // --- GENERACIÓN DE PDF DIRECTA EN INDEX.HTML ---
  async function generarPDF(codigo) {
    showPdfProgress('Iniciando Generación de PDF...', 'Consultando información del expediente...', 15);

    try {
      let emp = currentIndividualRecord;
      if (!emp || (emp.Codigo !== codigo && emp.Cedula !== codigo)) {
        if (!useDemoMode && appScriptUrl) {
          const res = await fetch(`${appScriptUrl}?busqueda=${encodeURIComponent(codigo)}&usuario=${encodeURIComponent(appScriptUser)}&api_key=${encodeURIComponent(appScriptApiKey)}`);
          const emps = await res.json();
          emp = emps && emps[0];
        }
      }

      if (!emp) {
        hidePdfProgress();
        alert("Error: No se encontraron datos para generar el PDF.");
        return;
      }

      showPdfProgress('Cargando Recursos...', 'Obteniendo membrete, logo y generando código QR...', 45);

      const nombre = emp.Nombre || '';
      const cedula = emp.Cedula || '';
      const categoriaReal = emp.Categoria || '';
      const cargoReal = emp.Cargo || '';
      const desde = formatDateDDMMAAAA(emp.Desde);
      const remuneracionMensual = emp.RemuneracionMensual || '';
      const status = emp.Status || '';

      const validez = (status === 'JUBILADO') ? "" : "Válido por 30 Días";

      const fechaEmision = new Date();
      const fechaCaducidad = new Date(fechaEmision);
      fechaCaducidad.setDate(fechaCaducidad.getDate() + 30);

      const fechaEmisionStr = formatDateDDMMAAAA(fechaEmision);
      const fechaCaducidadStr = formatDateDDMMAAAA(fechaCaducidad);
      const fechaCaducidadLetras = obtenerFechaCaducidadLetras(fechaCaducidad);

      const remuneracionNum = parseFloat(String(remuneracionMensual).replace(/[^\d,.-]/g, '').replace(',', '.')) || 0;
      const remuneracionRedondeada = Number(remuneracionNum.toFixed(2));
      const remuneracionFormateada = formatearRemuneracionBs(remuneracionRedondeada);
      const remuneracionEnLetras = NumeroALetras(remuneracionRedondeada);

      const desdePDF = desde;
      const mostrarDescuento = debeMostrarDescuentoIpasme(categoriaReal);

      let textoDescuento = "";
      if (mostrarDescuento) {
        textoDescuento = ` Al trabajador se le realiza un descuento del 6% del IPASME.`;
      }

      const textoCompleto = `Quien suscribe, Directora de Gestión de Talento Humano de la Universidad Politécnica Territorial de Puerto Cabello a través del presente hace constar que el ciudadano (a) ${nombre}, Titular de la Cédula de Identidad No. ${cedula}, presta servicio en esta institución como miembro del personal ${cargoReal}, categoria ${categoriaReal}, desde el ${desdePDF}, percibiendo una remuneración mensual de: (${remuneracionFormateada}) en letras: ${remuneracionEnLetras}.${textoDescuento}`;

      const textoFechas = `Constancia que se expide a solicitud de la parte interesada en la ciudad de PUERTO CABELLO, a los ${fechaEmisionStr} ${NumeroALetrasFecha(fechaEmision.getDate())} DÍAS DEL MES DE ${fechaEmision.toLocaleString('es-ES', { month: 'long' }).toUpperCase()} DE ${fechaEmision.getFullYear().toString()}. La presente constancia tiene una vigencia de (30)TREINTA DÍAS contados a partir de su fecha de emisión, siendo válida hasta el ${fechaCaducidadStr} ${fechaCaducidadLetras}.`;

      const qrText = `Nombre: ${nombre}\nCédula: ${cedula}\nCategoría: ${categoriaReal}\nCargo: ${cargoReal}\nDesde: ${desdePDF}\nEmisión: ${fechaEmisionStr}\nHasta: ${fechaCaducidadStr}\nRemuneración: ${remuneracionFormateada}\nSerial: ${codigo}`;

      const URL_IMAGEN_CABECERA = 'https://repouptpc.github.io/talento_humano/img/cabecera.png';
      const URL_IMAGEN_TALENTO = 'https://repouptpc.github.io/talento_humano/img/th.png';

      const [imagenCabeceraBase64, imagenTalentoBase64, imagenQrBase64] = await Promise.all([
        cargarImagenDesdeURL(URL_IMAGEN_CABECERA),
        cargarImagenDesdeURL(URL_IMAGEN_TALENTO),
        generarQRCodeDataUrl(qrText, 220)
      ]);

      showPdfProgress('Compilando Documento PDF...', 'Ensamblando diseño y estructura...', 80);

      const documentDefinition = {
        pageSize: 'LETTER',
        content: [
          {
            image: imagenCabeceraBase64,
            width: 595 - 40,
            alignment: 'center',
          },
          { text: 'CONSTANCIA DE TRABAJO', style: 'header' },
          {
            text: textoCompleto,
            style: 'paragraph'
          },
          {
            text: textoFechas,
            style: 'paragraph'
          },
          { text: `Serial: ${codigo}`, style: 'serial' }
        ],
        styles: {
          header: { fontSize: 18, bold: true, alignment: 'center', margin: [0, 20, 0, 20] },
          paragraph: { fontSize: 12, margin: [0, 10, 0, 10], alignment: 'justify', lineHeight: 1.5 },
          serial: { fontSize: 10, alignment: 'right' }
        },
        footer: function (currentPage, pageCount) {
          const anchoLogoQR = 80;
          const margenLateral = 10;
          const anchoTotal = 580 - 5 * margenLateral;
          const anchoTexto = anchoTotal - 2 * anchoLogoQR;

          return {
            stack: [
              {
                text: [
                  { text: "MSc. AMELIA TERESA PADRON MORENO\n", bold: true },
                  "Directora de Gestión y Talento Humano\n",
                  "Consejo de Gestión Universitario Nº CU-01/2024"
                ],
                alignment: 'center',
                fontSize: 12,
                margin: [0, 0, 0, 30]
              },
              {
                columns: [
                  {
                    image: imagenTalentoBase64,
                    width: anchoLogoQR,
                    alignment: 'center'
                  },
                  {
                    width: anchoTexto,
                    text: [
                      "UNIVERSIDAD POLITÉCNICA TERRITORIAL DE PUERTO CABELLO\n",
                      "RIF: G-20005608-8\n",
                      "Urb. La Elvira Zona Industrial Santa Rosa Galpón N° 8.\n",
                      "Puerto Cabello, Estado Carabobo\n",
                      "https://www.uptc.edu.ve\n"
                    ],
                    alignment: 'left',
                    fontSize: 8,
                    margin: [20, 20, 0, 0]
                  },
                  {
                    stack: [
                      {
                        image: imagenQrBase64,
                        width: anchoLogoQR,
                        alignment: 'center'
                      },
                      {
                        text: `Serial: ${codigo}`,
                        alignment: 'center',
                        fontSize: 8,
                        bold: true,
                        margin: [0, 2, 0, 0]
                      },
                      {
                        text: validez,
                        alignment: 'center',
                        fontSize: 8,
                        margin: [0, 2, 0, 0]
                      }
                    ]
                  }
                ],
                margin: [15, 0, 15, 0]
              },
              {
                text: "DOCUMENTO VÁLIDO SOLO CON FIRMA Y SELLO HÚMEDO",
                alignment: 'center',
                fontSize: 10,
                bold: true,
                margin: [0, 20, 0, 0]
              }
            ],
            margin: [15, -180, 15, 0]
          };
        }
      };

      showPdfProgress('Iniciando Descarga...', 'Su documento está listo para ser guardado.', 100);

      pdfMake.createPdf(documentDefinition).download(`Constancia_${cedula}.pdf`);

      setTimeout(() => {
        hidePdfProgress();
      }, 800);

    } catch (err) {
      console.error("Error generando PDF:", err);
      hidePdfProgress();
      alert("Error al generar el PDF: " + err.message);
    }
  }

  // --- UTILITIES ---
  function showPdfProgress(titleText, descText, percent) {
    const overlay = document.getElementById('pdfLoadingOverlay');
    const bar = document.getElementById('pdfProgressBar');
    const title = document.getElementById('pdfProgressTitle');
    const text = document.getElementById('pdfProgressText');

    if (bar) bar.style.width = percent + '%';
    if (title && titleText) title.textContent = titleText;
    if (text && descText) text.textContent = descText;
    if (overlay) overlay.style.display = 'flex';
  }

  function hidePdfProgress() {
    const overlay = document.getElementById('pdfLoadingOverlay');
    if (overlay) overlay.style.display = 'none';
  }

  function formatDateDDMMAAAA(val) {
    if (val === null || val === undefined || val === '') return '';
    
    if (val instanceof Date) {
      const d = String(val.getUTCDate()).padStart(2, '0');
      const m = String(val.getUTCMonth() + 1).padStart(2, '0');
      const y = val.getUTCFullYear();
      return `${d}/${m}/${y}`;
    }

    const s = String(val).trim();
    if (!s) return '';

    // Extraer AAAA-MM-DD incluso si viene con timestamp ISO (ej: 2019-01-01T04:00:00.000Z)
    const isoMatch = s.match(/^(\d{4})[\-\/](\d{1,2})[\-\/](\d{1,2})/);
    if (isoMatch) {
      const year = isoMatch[1];
      const month = isoMatch[2].padStart(2, '0');
      const day = isoMatch[3].padStart(2, '0');
      return `${day}/${month}/${year}`;
    }

    const parts = s.split(/[\/\-\.\sT]/)[0].split(/[\/\-\.]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        let day = parts[0].padStart(2, '0');
        let month = parts[1].padStart(2, '0');
        let year = parts[2];
        if (parseInt(month, 10) > 12) {
          const tmp = day; day = month; month = tmp;
        }
        return `${day}/${month}/${year}`;
      } else if (parts[0].length === 4) {
        let year = parts[0];
        let month = parts[1].padStart(2, '0');
        let day = parts[2].padStart(2, '0');
        return `${day}/${month}/${year}`;
      }
    }

    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) {
      const day = String(parsed.getUTCDate()).padStart(2, '0');
      const month = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const year = parsed.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }

    return s;
  }

  function formatearRemuneracionBs(val) {
    if (val === null || val === undefined || val === '') return '0,00 Bs';
    const limpio = String(val).replace(/[^\d,.-]/g, '').replace(',', '.');
    const numero = parseFloat(limpio) || 0;
    const partes = numero.toFixed(2).split('.');
    const enteras = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${enteras},${partes[1]} Bs`;
  }

  function normalizeClean(val) {
    if (!val) return '';
    let str = String(val).trim().toUpperCase();
    str = str.replace(/[ÁÀÄÂ]/g, "A")
             .replace(/[ÉÈËÊ]/g, "E")
             .replace(/[ÍÌÏÎ]/g, "I")
             .replace(/[ÓÒÖÔ]/g, "O")
             .replace(/[ÚÙÜÛ]/g, "U")
             .replace(/[Ñ]/g, "N");
    return str.replace(/[^A-Z0-9]/g, "");
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function crearPngFallback(tipo) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (tipo === 'cabecera') {
        canvas.width = 555;
        canvas.height = 80;
        ctx.fillStyle = '#003366';
        ctx.fillRect(0, 0, 555, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('UNIVERSIDAD POLITÉCNICA TERRITORIAL DE PUERTO CABELLO', 277, 40);
      } else if (tipo === 'talento') {
        canvas.width = 80;
        canvas.height = 80;
        ctx.fillStyle = '#0066cc';
        ctx.fillRect(0, 0, 80, 80);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('TALENTO', 40, 35);
        ctx.fillText('HUMANO', 40, 50);
      } else {
        canvas.width = 80;
        canvas.height = 80;
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, 80, 80);
        ctx.fillStyle = '#333333';
        ctx.font = 'bold 10px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('QR CODE', 40, 40);
      }
      return canvas.toDataURL('image/png');
    } catch (e) {
      return '';
    }
  }

  async function cargarImagenDesdeURL(url) {
    return new Promise((resolve) => {
      let tipo = 'general';
      if (url && url.includes('cabecera')) tipo = 'cabecera';
      else if (url && (url.includes('talento') || url.includes('th.png') || url.includes('logo'))) tipo = 'talento';

      if (!url) {
        return resolve(crearPngFallback(tipo));
      }

      let finished = false;
      const finish = (res) => {
        if (!finished) {
          finished = true;
          resolve(res);
        }
      };

      // Timeout descolgante de 2000ms para evitar que la promesa se quede colgada
      const timer = setTimeout(() => {
        finish(crearPngFallback(tipo));
      }, 2000);

      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = function() {
        clearTimeout(timer);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || (tipo === 'cabecera' ? 555 : 80);
          canvas.height = img.height || 80;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          finish(canvas.toDataURL('image/png'));
        } catch (e) {
          finish(crearPngFallback(tipo));
        }
      };
      img.onerror = function() {
        clearTimeout(timer);
        finish(crearPngFallback(tipo));
      };
      img.src = url + (url.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
    });
  }

  function generarQRCodeDataUrl(texto, size = 220) {
    return new Promise((resolve, reject) => {
      if (window.QRCode && typeof QRCode.toDataURL === 'function') {
        QRCode.toDataURL(texto, { errorCorrectionLevel: 'H', type: 'image/png', width: size }, function (err, url) {
          if (err) return reject(err);
          resolve(url);
        });
      } else {
        reject(new Error('Librería de QR no disponible'));
      }
    });
  }

  function NumeroALetras(num) {
    let data = {
      numero: num, enteros: Math.floor(num), centavos: Math.round((num - Math.floor(num)) * 100),
      letrasCentavos: "", letrasMonedaPlural: 'BOLIVARES', letrasMonedaSingular: 'BOLIVAR',
      letrasMonedaCentavoPlural: "CENTIMOS", letrasMonedaCentavoSingular: "CENTIMO"
    };
    function Unidades(n) {
      switch (n) { case 1: return "UN"; case 2: return "DOS"; case 3: return "TRES"; case 4: return "CUATRO"; case 5: return "CINCO"; case 6: return "SEIS"; case 7: return "SIETE"; case 8: return "OCHO"; case 9: return "NUEVE"; }
      return "";
    }
    function Decenas(n) {
      let decena = Math.floor(n / 10); let unidad = n - (decena * 10);
      switch (decena) {
        case 1: switch (unidad) { case 0: return "DIEZ"; case 1: return "ONCE"; case 2: return "DOCE"; case 3: return "TRECE"; case 4: return "CATORCE"; case 5: return "QUINCE"; default: return "DIECI" + Unidades(unidad); }
        case 2: switch (unidad) { case 0: return "VEINTE"; default: return "VEINTI" + Unidades(unidad); }
        case 3: return DecenasY("TREINTA", unidad); case 4: return DecenasY("CUARENTA", unidad); case 5: return DecenasY("CINCUENTA", unidad); case 6: return DecenasY("SESENTA", unidad); case 7: return DecenasY("SETENTA", unidad); case 8: return DecenasY("OCHENTA", unidad); case 9: return DecenasY("NOVENTA", unidad); case 0: return Unidades(unidad);
      }
    }
    function DecenasY(strSin, numUnidades) { return numUnidades > 0 ? strSin + " Y " + Unidades(numUnidades) : strSin; }
    function Centenas(n) {
      let centenas = Math.floor(n / 100); let decenas = n - (centenas * 100);
      switch (centenas) {
        case 1: return decenas > 0 ? "CIENTO " + Decenas(decenas) : "CIEN";
        case 2: return "DOSCIENTOS " + Decenas(decenas); case 3: return "TRESCIENTOS " + Decenas(decenas); case 4: return "CUATROCIENTOS " + Decenas(decenas); case 5: return "QUINIENTOS " + Decenas(decenas); case 6: return "SEISCIENTOS " + Decenas(decenas); case 7: return "SETECIENTOS " + Decenas(decenas); case 8: return "OCHOCIENTOS " + Decenas(decenas); case 9: return "NOVECIENTOS " + Decenas(decenas);
      }
      return Decenas(decenas);
    }
    function Seccion(n, divisor, strSingular, strPlural) {
      let cientos = Math.floor(n / divisor); let resto = n - (cientos * divisor); let letras = "";
      if (cientos > 0) letras = cientos > 1 ? Centenas(cientos) + " " + strPlural : strSingular;
      if (resto > 0) letras += " " + Centenas(resto);
      return letras;
    }
    function Miles(n) {
      let divisor = 1000; let cientos = Math.floor(n / divisor); let resto = n - (cientos * divisor);
      let strMiles = Seccion(cientos, 1, "UN MIL", "MIL"); let strCentenas = Centenas(resto);
      return strMiles === "" ? strCentenas : strMiles + " " + strCentenas;
    }
    function Millones(n) {
      let divisor = 1000000; let cientos = Math.floor(n / divisor); let resto = n - (cientos * divisor);
      let strMillones = Seccion(cientos, 1, "UN MILLON", "MILLONES"); let strMiles = Miles(resto);
      return strMillones === "" ? strMiles : strMillones + " " + strMiles;
    }
    if (data.centavos > 0) {
      data.letrasCentavos = "CON " + (data.centavos == 1 ? Decenas(data.centavos) + " " + data.letrasMonedaCentavoSingular : Decenas(data.centavos) + " " + data.letrasMonedaCentavoPlural);
    }
    if (data.enteros == 0) return "CERO " + data.letrasMonedaPlural + " " + data.letrasCentavos;
    if (data.enteros == 1) return Millones(data.enteros) + " " + data.letrasMonedaSingular + " " + data.letrasCentavos;
    return Millones(data.enteros) + " " + data.letrasMonedaPlural + " " + data.letrasCentavos;
  }

  function NumeroALetrasFecha(num) {
    const unidades = ["UN", "DOS", "TRES", "CUATRO", "CINCO", "SEIS", "SIETE", "OCHO", "NUEVE"];
    const decenas = ["DIEZ", "VEINTE", "TREINTA", "CUARENTA", "CINCUENTA", "SESENTA", "SETENTA", "OCHENTA", "NOVENTA"];
    const especiales = ["ONCE", "DOCE", "TRECE", "CATORCE", "QUINCE", "DIECI", "VEINTI"];
    if (num < 10) return unidades[num - 1];
    if (num >= 11 && num <= 15) return especiales[num - 11];
    if (num >= 16 && num <= 19) return "DIECI" + unidades[num - 11];
    if (num === 20) return "VEINTE";
    if (num >= 21 && num <= 29) return "VEINTI" + unidades[num - 21];
    if (num >= 30 && num <= 99) {
      const decena = Math.floor(num / 10); const unidad = num - (decena * 10);
      return decenas[decena - 1] + (unidad !== 0 ? " Y " + unidades[unidad - 1] : "");
    }
    return "";
  }

  function obtenerFechaCaducidadLetras(fecha) {
    const dias = fecha.getDate();
    const mes = fecha.toLocaleString('es-ES', { month: 'long' }).toUpperCase();
    const año = fecha.getFullYear();
    return `${NumeroALetrasFecha(dias)} DÍAS DEL MES DE ${mes} DE ${año}`;
  }

  function debeMostrarDescuentoIpasme(categoria) {
    if (!categoria) return true;
    const cat = categoria.toUpperCase().trim();
    const sinDescuento = ["OBRERO", "OBRERO FIJO", "OBRERO JUBILADO", "OBRERO CONTRATADO", "ADMINISTRATIVO JUBILADO", "DOCENTE JUBILADO"];
    return !sinDescuento.includes(cat);
  }

});

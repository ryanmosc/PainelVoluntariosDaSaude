feather.replace();

    const API = "https://api.voluntariosdasaude.com.br";
    const token = localStorage.getItem("token");

    // ─── JWT helpers ─────────────────────────────────────────────────────────
    function parseJwtPayload(jwt) {
      try {
        const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
      } catch { return null; }
    }

    function isAdmin() {
      if (!token) return false;
      const payload = parseJwtPayload(token);
      if (!payload) return false;
      if (payload.exp && Date.now() / 1000 > payload.exp) return false;
      const roles = payload.roles || payload.authorities || (payload.role ? [payload.role] : []);
      return roles.some(r =>
        r === "ROLE_ADMIN" || r === "ADMIN" ||
        r?.authority === "ROLE_ADMIN" || r?.authority === "ADMIN"
      );
    }

    // ─── Toast ────────────────────────────────────────────────────────────────
    function showToast(msg, type = 'info') {
      const icons = { success: 'check-circle', error: 'alert-circle', info: 'info' };
      const container = document.getElementById('toastContainer');
      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.innerHTML = `<i data-feather="${icons[type]}"></i><span>${msg}</span>`;
      container.appendChild(toast);
      feather.replace();
      setTimeout(() => toast.remove(), 3200);
    }

    // ─── Carregar balancete ───────────────────────────────────────────────────
    async function carregarBalancete() {
      const wrapper  = document.getElementById('pdfViewerWrapper');
      const loading  = document.getElementById('viewerLoading');
      const metaEl   = document.getElementById('balanceteMeta');

      try {
        const res = await fetch(`${API}/api/transparencia/visualizar`);

        if (res.status === 204 || !res.ok) {
          loading.innerHTML = '';
          wrapper.innerHTML = `
            <div class="viewer-placeholder">
              <i data-feather="file-x"></i>
              <p>Nenhum balancete disponível</p>
              <span>A administração ainda não publicou um balancete.</span>
            </div>`;
          feather.replace();
          return;
        }

        // Pega metadados do header se disponíveis
        const disposition = res.headers.get('Content-Disposition') || '';
        const textoHeader = res.headers.get('X-Texto') || '';

        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);

        // Monta viewer
        loading.style.display = 'none';
        wrapper.innerHTML = `<iframe src="${url}" title="Balancete"></iframe>`;

        // Mostra meta
        metaEl.style.display = 'flex';
        document.getElementById('balanceteTitulo').textContent = textoHeader || 'Balancete Financeiro';
        document.getElementById('balanceteData').textContent = 'Atualizado em ' + new Date().toLocaleDateString('pt-BR', { day:'2-digit', month:'long', year:'numeric' });
        feather.replace();

      } catch (err) {
        console.error(err);
        loading.innerHTML = '';
        wrapper.innerHTML = `
          <div class="viewer-placeholder">
            <i data-feather="wifi-off"></i>
            <p>Erro ao carregar o balancete</p>
            <span>Verifique sua conexão e tente novamente.</span>
          </div>`;
        feather.replace();
      }
    }

    // ─── Drag and drop ────────────────────────────────────────────────────────
    const dropZone = document.getElementById('dropZone');
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    });

    function onFileSelected(input) {
      if (input.files[0]) processFile(input.files[0]);
    }

    function processFile(file) {
      const hint = document.getElementById('pdfHint');
      if (file.type !== 'application/pdf') {
        hint.textContent = 'Apenas arquivos PDF são aceitos.';
        hint.className = 'field-hint error';
        dropZone.classList.remove('has-file');
        return;
      }
      dropZone.classList.add('has-file');
      document.getElementById('dropText').textContent = file.name;
      document.getElementById('dropSubtext').textContent = `${(file.size / 1024).toFixed(1)} KB`;
      hint.textContent = '✓ Arquivo PDF selecionado.';
      hint.className = 'field-hint success';
      // Armazena o arquivo no input
      const dt = new DataTransfer();
      dt.items.add(file);
      document.getElementById('pdfInput').files = dt.files;
    }

    // ─── Validações ───────────────────────────────────────────────────────────
    function validarTexto() {
      const val   = document.getElementById('textoInput').value.trim();
      const input = document.getElementById('textoInput');
      const hint  = document.getElementById('textoHint');
      if (!val) {
        input.classList.remove('input-success', 'input-error');
        hint.textContent = 'Identificação do documento (mínimo 5 caracteres).';
        hint.className = 'field-hint';
        return false;
      }
      const ok = val.length >= 5;
      input.classList.toggle('input-success', ok);
      input.classList.toggle('input-error', !ok);
      hint.textContent = ok ? '✓ Título válido.' : 'Mínimo 5 caracteres.';
      hint.className = ok ? 'field-hint success' : 'field-hint error';
      return ok;
    }

    function validarArquivo() {
      const input = document.getElementById('pdfInput');
      const hint  = document.getElementById('pdfHint');
      if (!input.files || !input.files[0]) {
        hint.textContent = 'Selecione um arquivo PDF.';
        hint.className = 'field-hint error';
        return false;
      }
      return true;
    }

    // ─── Enviar balancete ─────────────────────────────────────────────────────
    async function enviarBalancete() {
      const textoOk = validarTexto();
      const pdfOk   = validarArquivo();

      if (!textoOk || !pdfOk) {
        showToast('Corrija os campos antes de continuar.', 'error');
        return;
      }

      const btn = document.getElementById('btnEnviar');
      btn.disabled = true;
      btn.innerHTML = `<i data-feather="loader" style="animation:spin 0.8s linear infinite;"></i> Enviando...`;
      feather.replace();

      try {
        const formData = new FormData();
        formData.append('balancete', document.getElementById('pdfInput').files[0]);
        formData.append('texto', document.getElementById('textoInput').value.trim());

        const res = await fetch(`${API}/api/transparencia/enviar`, {
          method: 'PATCH',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });

        if (res.status === 401 || res.status === 403) {
          showToast('Sem permissão. Faça login como administrador.', 'error');
          return;
        }
        if (!res.ok) {
          const text = await res.text();
          showToast(`Erro ${res.status}: ${text || 'Tente novamente.'}`, 'error');
          return;
        }

        showToast('Balancete enviado com sucesso!', 'success');
        limparFormulario();
        carregarBalancete(); // Recarrega o viewer

      } catch (err) {
        console.error(err);
        showToast('Erro de conexão. Verifique sua rede.', 'error');
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-feather="upload-cloud"></i> Enviar Balancete`;
        feather.replace();
      }
    }

    // ─── Limpar formulário ────────────────────────────────────────────────────
    function limparFormulario() {
      document.getElementById('textoInput').value = '';
      document.getElementById('textoInput').classList.remove('input-success', 'input-error');
      document.getElementById('textoHint').textContent = 'Identificação do documento (mínimo 5 caracteres).';
      document.getElementById('textoHint').className = 'field-hint';

      document.getElementById('pdfInput').value = '';
      document.getElementById('dropText').textContent = 'Clique ou arraste o arquivo aqui';
      document.getElementById('dropSubtext').textContent = 'Somente arquivos PDF são aceitos';
      document.getElementById('pdfHint').textContent = 'Selecione um arquivo .pdf.';
      document.getElementById('pdfHint').className = 'field-hint';
      dropZone.classList.remove('has-file', 'drag-over');
    }

    // ─── Inicializar ──────────────────────────────────────────────────────────
    function init() {
      carregarBalancete();
      if (isAdmin()) {
        document.getElementById('enviarSection').style.display = 'block';
      }
    }

    // ─── Hamburger ────────────────────────────────────────────────────────────
    document.getElementById('navToggle').addEventListener('click', () => {
      document.getElementById('nav_list').classList.toggle('open');
    });

    init();
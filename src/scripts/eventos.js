const apiUrl  = "https://api.voluntariosdasaude.com.br/api/gerencia/eventos";
    const loginUrl = "https://voluntariosdasaude.com.br/";

    // ─── Auth & JWT ───────────────────────────────────────────────────────────
    const token = localStorage.getItem("token");

    if (!token) {
      window.location.href = loginUrl;
    } else {
      try {
        function parseJwt(t) {
          const base64Url = t.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          return JSON.parse(decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')));
        }
        const decoded = parseJwt(token);
        const now = Date.now() / 1000;
        if (!decoded.exp || decoded.exp < now) {
          showToast("Sessão expirada. Redirecionando...", "error");
          localStorage.removeItem("token");
          setTimeout(() => window.location.href = loginUrl, 1500);
        }
        if (!decoded.role || decoded.role !== "ADMIN") {
          showToast("Acesso negado. Apenas administradores.", "error");
          setTimeout(() => window.location.href = loginUrl, 1500);
        }
      } catch (error) {
        localStorage.removeItem("token");
        window.location.href = loginUrl;
      }
    }

    // ─── Toast ────────────────────────────────────────────────────────────────
    function showToast(msg, type = 'info') {
      const icons = { success: 'fas fa-check-circle', error: 'fas fa-exclamation-circle', info: 'fas fa-info-circle' };
      const c = document.getElementById('toastContainer');
      const t = document.createElement('div');
      t.className = `toast ${type}`;
      t.innerHTML = `<i class="${icons[type]}"></i><span>${msg}</span>`;
      c.appendChild(t);
      setTimeout(() => t.remove(), 3200);
    }

    // ─── Elements ─────────────────────────────────────────────────────────────
    const form      = document.getElementById("eventoForm");
    const btnText   = document.getElementById("btnText");
    const btnSubmit = document.getElementById("btnSubmit");
    const cancelBtn = document.getElementById("cancelEdit");

    // ─── Image preview ────────────────────────────────────────────────────────
    document.getElementById('file-1').addEventListener('change', function() {
      const file = this.files[0];
      const wrap = document.getElementById('previewWrap');
      const img  = document.getElementById('imgPreview');
      if (file) {
        const reader = new FileReader();
        reader.onload = e => { img.src = e.target.result; wrap.style.display = 'block'; };
        reader.readAsDataURL(file);
      } else {
        wrap.style.display = 'none';
      }
    });

    // ─── Submit ───────────────────────────────────────────────────────────────
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!form.texto.value.trim()) { showToast("O campo texto é obrigatório.", "error"); return; }

      const formData = new FormData();
      formData.append("texto", form.texto.value);

      if (form["file-1"].files[0]) {
        formData.append("file-1", form["file-1"].files[0]);
      } else if (!form.dataset.id) {
        showToast("Selecione uma imagem para o novo evento.", "error");
        return;
      }

      const id     = form.dataset.id;
      const method = id ? "PUT" : "POST";
      const url    = id ? `${apiUrl}/${id}` : apiUrl;

      btnSubmit.disabled = true;
      btnText.textContent = id ? "Atualizando..." : "Salvando...";

      try {
        const response = await fetch(url, {
          method,
          headers: { "Authorization": `Bearer ${token}` },
          body: formData
        });

        if (response.ok) {
          showToast(id ? "Evento atualizado com sucesso!" : "Evento salvo com sucesso!", "success");
          form.reset();
          document.getElementById('previewWrap').style.display = 'none';
          delete form.dataset.id;
          btnText.textContent = "Salvar Evento";
          cancelBtn.style.display = "none";
          carregarEventos();
        } else {
          const error = await response.text();
          showToast(`Erro: ${response.status} - ${error || 'Acesso negado'}`, "error");
          if (response.status === 401 || response.status === 403) window.location.href = loginUrl;
        }
      } catch (error) {
        showToast("Erro na requisição: " + error.message, "error");
      } finally {
        btnSubmit.disabled = false;
        btnText.textContent = form.dataset.id ? "Atualizar Evento" : "Salvar Evento";
        cancelBtn.style.display = form.dataset.id ? "inline-flex" : "none";
      }
    });

    cancelBtn.addEventListener("click", () => {
      form.reset();
      document.getElementById('previewWrap').style.display = 'none';
      delete form.dataset.id;
      btnText.textContent = "Salvar Evento";
      cancelBtn.style.display = "none";
    });

    // ─── Carregar Eventos ─────────────────────────────────────────────────────
    async function carregarEventos() {
      const div = document.getElementById("eventos");
      div.innerHTML = '<div class="loading"><div class="loading-ring"></div><p>Carregando eventos...</p></div>';

      try {
        const response = await fetch(apiUrl);
        const eventos  = await response.json();

        document.getElementById('countBadge').textContent = eventos?.length || 0;

        if (!eventos || eventos.length === 0) {
          div.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-calendar-times"></i>
              <p>Nenhum evento cadastrado ainda.</p>
              <small>Adicione o primeiro evento ao lado!</small>
            </div>`;
          return;
        }

        div.innerHTML = '<div class="events-grid"></div>';
        const grid = div.querySelector('.events-grid');

        eventos.forEach((ev, i) => {
          const card = document.createElement("div");
          card.className = "event-card";
          card.style.animationDelay = `${i * 40}ms`;

          const textoSeguro = ev.texto?.replace(/'/g, "\\'") || "";

          card.innerHTML = `
            <img src="${ev.imagem}" alt="Imagem do evento" class="event-image"
                 onerror="this.src='https://placehold.co/280x175/f3f4f6/9ca3af?text=Imagem+não+encontrada'">
            <div class="event-content">
              <p class="event-text">${ev.texto}</p>
            </div>
            <div class="event-actions">
              <button class="btn-edit" onclick="editarEvento(${ev.id}, '${textoSeguro}')">
                <i class="fas fa-pencil"></i> Editar
              </button>
              <button class="btn-danger" onclick="deletarEvento(${ev.id})">
                <i class="fas fa-trash"></i> Excluir
              </button>
            </div>
          `;
          grid.appendChild(card);
        });

      } catch (error) {
        document.getElementById("eventos").innerHTML = `
          <div class="empty-state">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Erro ao carregar eventos.</p>
            <small>Verifique sua conexão e tente novamente.</small>
          </div>`;
      }
    }

    // ─── Editar / Excluir ─────────────────────────────────────────────────────
    function editarEvento(id, texto) {
      form.texto.value = texto;
      form.dataset.id  = id;
      btnText.textContent = "Atualizar Evento";
      cancelBtn.style.display = "inline-flex";
      document.querySelector('.form-panel').scrollIntoView({ top: 0, behavior: 'smooth' });
      showToast("Editando evento — faça as alterações e salve.", "info");
    }

    async function deletarEvento(id) {
      if (!confirm("Tem certeza que deseja excluir este evento?")) return;

      try {
        const response = await fetch(`${apiUrl}/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${token}` }
        });

        if (response.ok) {
          showToast("Evento deletado com sucesso!", "success");
          carregarEventos();
        } else {
          const error = await response.text();
          showToast(`Erro: ${error || 'Acesso negado'}`, "error");
          if (response.status === 401 || response.status === 403) window.location.href = loginUrl;
        }
      } catch (error) {
        showToast("Erro na exclusão: " + error.message, "error");
      }
    }

    // ─── Hamburger ────────────────────────────────────────────────────────────
    document.getElementById('navToggle').addEventListener('click', () => {
      document.getElementById('nav_list').classList.toggle('open');
    });

    carregarEventos();
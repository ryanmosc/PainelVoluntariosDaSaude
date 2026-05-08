const apiUrl = "https://api.voluntariosdasaude.com.br/api/gerencia/atualizacoes";
    const loginUrl = "https://voluntariosdasaude.com.br/";

    // ─── Auth ─────────────────────────────────────────────────────────────────
    if (!localStorage.getItem("token")) window.location.href = loginUrl;

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
    const form      = document.getElementById("atualizacaoForm");
    const btnText   = document.getElementById("btnText");
    const btnSubmit = document.getElementById("btnSubmit");
    const cancelBtn = document.getElementById("cancelEdit");
    const lista     = document.getElementById("atualizacoes");

    // ─── Submit ───────────────────────────────────────────────────────────────
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const textoVal = form.texto.value.trim();
      if (!textoVal) { showToast("O campo texto é obrigatório.", "error"); return; }

      const formData = new FormData();
      formData.append("texto", textoVal);
      if (form["file-1"].files[0]) formData.append("file-1", form["file-1"].files[0]);

      const id     = form.dataset.id;
      const method = id ? "PUT" : "POST";
      const url    = id ? `${apiUrl}/${id}` : apiUrl;

      btnSubmit.disabled = true;
      btnText.textContent = id ? "Atualizando..." : "Publicando...";

      try {
        const response = await fetch(url, {
          method,
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` },
          body: formData
        });

        if (response.ok) {
          showToast(id ? "Atualização editada com sucesso!" : "Atualização publicada!", "success");
          form.reset();
          delete form.dataset.id;
          btnText.textContent = "Publicar Atualização";
          cancelBtn.style.display = "none";
          carregarAtualizacoes();
        } else {
          const erro = await response.text();
          showToast("Erro: " + (erro || "Permissão negada"), "error");
          if (response.status === 401 || response.status === 403) window.location.href = loginUrl;
        }
      } catch (err) {
        showToast("Erro de conexão: " + err.message, "error");
      } finally {
        btnSubmit.disabled = false;
        btnText.textContent = form.dataset.id ? "Salvar Alterações" : "Publicar Atualização";
      }
    });

    cancelBtn.addEventListener("click", () => {
      form.reset();
      delete form.dataset.id;
      btnText.textContent = "Publicar Atualização";
      cancelBtn.style.display = "none";
    });

    // ─── Carregar ─────────────────────────────────────────────────────────────
    async function carregarAtualizacoes() {
      lista.innerHTML = `<div class="loading"><div class="loading-ring"></div><p>Carregando...</p></div>`;

      try {
        const res  = await fetch(apiUrl);
        const dados = await res.json();

        document.getElementById('countBadge').textContent = dados?.length || 0;

        if (!dados || dados.length === 0) {
          lista.innerHTML = `
            <div class="empty-state">
              <i class="fas fa-photo-film"></i>
              <p>Nenhuma atualização publicada</p>
              <small>Use o formulário ao lado para publicar a primeira!</small>
            </div>`;
          return;
        }

        lista.innerHTML = "";
        dados.forEach((item, i) => {
          const card = document.createElement("div");
          card.className = "qr-card";
          card.style.animationDelay = `${i * 40}ms`;

          const textoSeguro = item.texto?.replace(/'/g, "\\'") || "";

          card.innerHTML = `
            <div class="qr-container">
              ${item.imagem
                ? `<img src="${item.imagem}" alt="Imagem" class="qr-image" onerror="this.src='https://placehold.co/280x180/f3f4f6/9ca3af?text=Sem+imagem'">`
                : `<div class="qr-placeholder"><i class="fas fa-image"></i>Sem imagem</div>`}
            </div>
            <p class="qr-title">${item.texto || "Sem título"}</p>
            <div class="qr-actions">
              <button class="btn-editar" onclick="editar(${item.id}, '${textoSeguro}')">
                <i class="fas fa-pencil"></i> Editar
              </button>
              <button class="btn-excluir" onclick="deletar(${item.id})">
                <i class="fas fa-trash"></i> Excluir
              </button>
            </div>
          `;
          lista.appendChild(card);
        });
      } catch (err) {
        lista.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>Erro ao carregar atualizações</p></div>`;
      }
    }

    // ─── Editar / Excluir ─────────────────────────────────────────────────────
    function editar(id, texto) {
      form.texto.value = texto;
      form.dataset.id  = id;
      btnText.textContent = "Salvar Alterações";
      cancelBtn.style.display = "inline-flex";
      document.querySelector('.form-panel').scrollIntoView({ behavior: "smooth", block: "start" });
      showToast("Editando atualização — faça as alterações e publique.", "info");
    }

    async function deletar(id) {
      if (!confirm("Excluir esta atualização permanentemente?")) return;
      try {
        const res = await fetch(`${apiUrl}/${id}`, {
          method: "DELETE",
          headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
        });
        if (res.ok) {
          showToast("Atualização excluída!", "success");
          carregarAtualizacoes();
        } else {
          showToast("Erro ao excluir.", "error");
          if (res.status === 401) window.location.href = loginUrl;
        }
      } catch (err) {
        showToast("Erro: " + err.message, "error");
      }
    }

    // ─── Hamburger ────────────────────────────────────────────────────────────
    document.getElementById('navToggle').addEventListener('click', () => {
      document.getElementById('nav_list').classList.toggle('open');
    });

    carregarAtualizacoes();
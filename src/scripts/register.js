feather.replace();

    const API = "https://api.voluntariosdasaude.com.br";
    const token = localStorage.getItem("token");

    // ─── Guard: JWT role check ────────────────────────────────────────────────
    function parseJwtPayload(jwt) {
      try {
        const base64 = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
        return JSON.parse(atob(base64));
      } catch {
        return null;
      }
    }

    function verificarAdmin() {
      if (!token) {
        showToast("Você não está logado. Redirecionando...", "error");
        setTimeout(() => window.location.href = "https://painel.voluntariosdasaude.com.br/index.html", 1500);
        return false;
      }

      const payload = parseJwtPayload(token);

      // Token inválido ou expirado
      if (!payload) {
        showToast("Token inválido. Faça login novamente.", "error");
        setTimeout(() => window.location.href = "https://painel.voluntariosdasaude.com.br/index.html", 1500);
        return false;
      }

      // Verifica expiração (campo "exp" é timestamp em segundos)
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        showToast("Sessão expirada. Faça login novamente.", "error");
        localStorage.removeItem("token");
        setTimeout(() => window.location.href = "https://painel.voluntariosdasaude.com.br/index.html", 1500);
        return false;
      }

      // Spring Security usa "ROLE_ADMIN" ou pode estar em "roles"/"authorities"
      const roles = payload.roles
        || payload.authorities
        || (payload.role ? [payload.role] : []);

      const isAdmin = roles.some(r =>
        r === "ROLE_ADMIN" || r === "ADMIN" ||
        r?.authority === "ROLE_ADMIN" || r?.authority === "ADMIN"
      );

      if (!isAdmin) {
        showToast("Acesso negado. Apenas administradores.", "error");
        setTimeout(() => window.location.href = "dashboard.html", 1500);
        return false;
      }

      return true;
    }

    verificarAdmin();

    // ─── Toast ──────────────────────────────────────────────────────────────
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

    // ─── Toggle senha ────────────────────────────────────────────────────────
    function toggleSenha(inputId, btnId) {
      const input = document.getElementById(inputId);
      const btn   = document.getElementById(btnId);
      const isHidden = input.type === 'password';
      input.type = isHidden ? 'text' : 'password';
      btn.innerHTML = `<i data-feather="${isHidden ? 'eye-off' : 'eye'}"></i>`;
      feather.replace();
    }

    // ─── Validar login ────────────────────────────────────────────────────────
    function validarLogin() {
      const val  = document.getElementById("loginInput").value.trim();
      const input = document.getElementById("loginInput");
      const hint  = document.getElementById("loginHint");

      if (!val) {
        input.classList.remove("input-success", "input-error");
        hint.textContent = "Sem espaços ou caracteres especiais.";
        hint.className = "field-hint";
        return false;
      }

      const valido = /^[a-zA-Z0-9._-]+$/.test(val) && val.length >= 3;
      input.classList.toggle("input-success", valido);
      input.classList.toggle("input-error", !valido);

      if (!valido) {
        hint.textContent = val.length < 3 ? "Mínimo 3 caracteres." : "Apenas letras, números, . _ -";
        hint.className = "field-hint error";
      } else {
        hint.textContent = "✓ Login válido.";
        hint.className = "field-hint success";
      }
      return valido;
    }

    // ─── Força da senha ──────────────────────────────────────────────────────
    function calcularForca(senha) {
      let score = 0;
      if (senha.length >= 6)  score++;
      if (senha.length >= 10) score++;
      if (/[A-Z]/.test(senha)) score++;
      if (/[0-9]/.test(senha)) score++;
      if (/[^A-Za-z0-9]/.test(senha)) score++;
      return score;
    }

    function validarSenha() {
      const val   = document.getElementById("senhaInput").value;
      const input = document.getElementById("senhaInput");
      const hint  = document.getElementById("senhaHint");
      const meter = document.getElementById("strengthMeter");
      const fill  = document.getElementById("strengthFill");
      const label = document.getElementById("strengthLabel");

      if (!val) {
        input.classList.remove("input-success","input-error");
        hint.textContent = "Use letras, números e símbolos.";
        hint.className = "field-hint";
        meter.style.display = "none";
        validarConfirmacao();
        return false;
      }

      meter.style.display = "block";
      const score = calcularForca(val);
      const levels = [
        { pct: "20%",  color: "#ef4444", text: "Muito fraca",  cls: "field-hint error"   },
        { pct: "40%",  color: "#f59e0b", text: "Fraca",        cls: "field-hint error"   },
        { pct: "60%",  color: "#f59e0b", text: "Razoável",     cls: "field-hint"         },
        { pct: "80%",  color: "#10b981", text: "Boa",          cls: "field-hint success" },
        { pct: "100%", color: "#10b981", text: "Forte ✓",      cls: "field-hint success" },
      ];
      const lvl = levels[Math.min(score, 4)];
      fill.style.width    = lvl.pct;
      fill.style.background = lvl.color;
      label.textContent   = lvl.text;
      label.className     = lvl.cls;

      const valido = val.length >= 6;
      input.classList.toggle("input-success", valido);
      input.classList.toggle("input-error", !valido);
      hint.textContent = valido ? "" : "Mínimo 6 caracteres.";
      hint.className   = valido ? "field-hint" : "field-hint error";

      validarConfirmacao();
      return valido;
    }

    // ─── Confirmar senha ─────────────────────────────────────────────────────
    function validarConfirmacao() {
      const senha      = document.getElementById("senhaInput").value;
      const confirmado = document.getElementById("confirmarInput").value;
      const input = document.getElementById("confirmarInput");
      const hint  = document.getElementById("confirmarHint");

      if (!confirmado) {
        input.classList.remove("input-success","input-error");
        hint.textContent = "As senhas devem ser idênticas.";
        hint.className = "field-hint";
        return false;
      }

      const igual = senha === confirmado;
      input.classList.toggle("input-success", igual);
      input.classList.toggle("input-error", !igual);
      hint.textContent = igual ? "✓ Senhas conferem." : "As senhas não coincidem.";
      hint.className   = igual ? "field-hint success" : "field-hint error";
      return igual;
    }

    // ─── Registrar usuário ───────────────────────────────────────────────────
    async function registrarUsuario() {
      const login    = document.getElementById("loginInput").value.trim();
      const password = document.getElementById("senhaInput").value;
      const confirm  = document.getElementById("confirmarInput").value;

      const loginOk    = validarLogin();
      const senhaOk    = validarSenha();
      const confirmOk  = validarConfirmacao();

      if (!loginOk || !senhaOk || !confirmOk) {
        showToast("Corrija os campos antes de continuar.", "error");
        return;
      }

      const btn = document.getElementById("btnRegistrar");
      btn.disabled = true;
      btn.innerHTML = `<i data-feather="loader" style="animation:spin 0.8s linear infinite;"></i> Registrando...`;
      feather.replace();

      try {
        const res = await fetch(`${API}/auth/register`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ login, password, role: "ADMIN" })
        });

        const text = await res.text();

        if (res.status === 403) {
          showToast("Sem permissão. Apenas admins podem registrar usuários.", "error");
          return;
        }

        if (res.status === 400) {
          showToast(text || "Usuário já existente.", "error");
          return;
        }

        if (!res.ok) {
          showToast(`Erro ${res.status}: ${text || "Tente novamente."}`, "error");
          return;
        }

        showToast(`Usuário "${login}" registrado com sucesso!`, "success");

        // Limpar campos
        document.getElementById("loginInput").value = "";
        document.getElementById("senhaInput").value = "";
        document.getElementById("confirmarInput").value = "";
        ["loginInput","senhaInput","confirmarInput"].forEach(id => {
          document.getElementById(id).classList.remove("input-success","input-error");
        });
        ["loginHint","senhaHint","confirmarHint"].forEach(id => {
          const el = document.getElementById(id);
          el.className = "field-hint";
        });
        document.getElementById("loginHint").textContent    = "Sem espaços ou caracteres especiais.";
        document.getElementById("senhaHint").textContent    = "Use letras, números e símbolos.";
        document.getElementById("confirmarHint").textContent = "As senhas devem ser idênticas.";
        document.getElementById("strengthMeter").style.display = "none";

      } catch (err) {
        console.error(err);
        showToast("Erro de conexão. Verifique sua rede.", "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = `<i data-feather="user-check"></i> Registrar Usuário`;
        feather.replace();
      }
    }

    // ─── Hamburger ───────────────────────────────────────────────────────────
    document.getElementById('navToggle').addEventListener('click', () => {
      document.getElementById('nav_list').classList.toggle('open');
    });

    // Enter para submeter
    document.addEventListener('keydown', e => {
      if (e.key === 'Enter' && ['loginInput','senhaInput','confirmarInput'].includes(e.target.id)) {
        registrarUsuario();
      }
    });
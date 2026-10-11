// Popup de acceso: pide el token de Hugging Face la primera vez y lo valida
// contra el server local. El token queda guardado en tu máquina (.hf-token).
(function () {
  function ready(cb) {
    if (document.readyState !== 'loading') cb();
    else document.addEventListener('DOMContentLoaded', cb);
  }

  ready(function () {
    fetch('/api/status').then(function (r) { return r.json(); }).then(function (s) {
      if (!s || !s.ok) show();
    }).catch(function () { /* si falla, asumimos que hay token */ });
  });

  function show() {
    var st = document.createElement('style');
    st.textContent =
      '#hftoken-overlay{position:fixed;inset:0;background:rgba(15,23,42,.72);display:flex;align-items:center;justify-content:center;z-index:9999;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
      + '#hftoken-overlay .hfc{background:#fff;border-radius:14px;padding:28px;max-width:440px;width:90%;box-shadow:0 20px 60px rgba(0,0,0,.35)}'
      + '#hftoken-overlay h2{margin:0 0 8px;color:#15181c;font-size:1.25rem}'
      + '#hftoken-overlay p{color:#5c636b;font-size:.9rem;margin:0 0 14px;line-height:1.5}'
      + '#hftoken-overlay input{width:100%;padding:10px 12px;border:1px solid #dfe2df;border-radius:8px;font:inherit;margin-bottom:12px}'
      + '#hftoken-overlay .hfb{display:flex;gap:12px;align-items:center;flex-wrap:wrap}'
      + '#hftoken-overlay button{background:#1e7a4d;color:#fff;border:0;border-radius:8px;padding:10px 18px;font:inherit;cursor:pointer}'
      + '#hftoken-overlay button:hover{background:#185f3c}'
      + '#hftoken-overlay a{color:#14502f;font-size:.85rem}'
      + '#hftoken-overlay .hfhint{color:#8a919b;font-size:.8rem;margin-top:12px}'
      + '#hftoken-overlay .hfm{color:#b91c1c;font-size:.85rem;margin-top:10px;min-height:1.1em}';
    document.head.appendChild(st);

    var ov = document.createElement('div');
    ov.id = 'hftoken-overlay';
    ov.innerHTML =
      '<div class="hfc">'
      + '<h2>🔒 Acceso al curso</h2>'
      + '<p>Para ver los cursos necesitás un <b>token de acceso</b>. Pegá acá el token que te compartieron y entrá.</p>'
      + '<input id="hftoken-input" type="password" placeholder="Pegá tu token (hf_...)" autocomplete="off" spellcheck="false">'
      + '<div class="hfb"><button id="hftoken-ok" type="button">Entrar</button></div>'
      + '<p class="hfhint">Se guarda solo en tu computadora y no se envía a ningún lado. Si no tenés token, pedíselo a quien te compartió el curso.</p>'
      + '<div class="hfm" id="hftoken-msg"></div>'
      + '</div>';
    document.body.appendChild(ov);

    var input = document.getElementById('hftoken-input');
    var msg = document.getElementById('hftoken-msg');
    input.focus();

    function submit() {
      var t = input.value.trim();
      if (!t) { msg.textContent = 'Ingresá un token.'; return; }
      msg.textContent = 'Validando…';
      fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: t })
      })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (j && j.ok) { location.reload(); }
          else { msg.textContent = 'Token inválido o sin acceso al curso.'; }
        })
        .catch(function () { msg.textContent = 'Error de conexión con el server.'; });
    }

    document.getElementById('hftoken-ok').addEventListener('click', submit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') submit(); });
  }
})();

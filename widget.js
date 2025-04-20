// WIDGET PROVADOR INTELIGENTE - POPUP COM BOTÃO FIXO
(function () {
  document.addEventListener("DOMContentLoaded", function () {
    // Evita duplicação
    if (document.getElementById("btn-provador")) return;

    // Cria botão fixo
    const botao = document.createElement("button");
    botao.id = "btn-provador";
    botao.innerText = "DESCUBRA SEU TAMANHO";
    botao.style.position = "fixed";
    botao.style.bottom = "20px";
    botao.style.right = "20px";
    botao.style.zIndex = "9999";
    botao.style.backgroundColor = "#000";
    botao.style.color = "#fff";
    botao.style.padding = "14px 20px";
    botao.style.border = "none";
    botao.style.borderRadius = "8px";
    botao.style.fontWeight = "bold";
    botao.style.fontSize = "13px";
    botao.style.cursor = "pointer";
    document.body.appendChild(botao);

    // Cria overlay
    const overlay = document.createElement("div");
    overlay.id = "overlay-fundo";
    overlay.style.position = "fixed";
    overlay.style.top = "0";
    overlay.style.left = "0";
    overlay.style.width = "100vw";
    overlay.style.height = "100vh";
    overlay.style.backgroundColor = "rgba(0, 0, 0, 0.6)";
    overlay.style.zIndex = "9998";
    overlay.style.display = "none";
    document.body.appendChild(overlay);

    // Cria container do popup
    const popup = document.createElement("div");
    popup.id = "provador-popup";
    popup.style.position = "fixed";
    popup.style.top = "50%";
    popup.style.left = "50%";
    popup.style.transform = "translate(-50%, -50%)";
    popup.style.zIndex = "9999";
    popup.style.width = "380px";
    popup.style.height = "570px";
    popup.style.backgroundColor = "#f2f2f2";
    popup.style.borderRadius = "8px";
    popup.style.display = "none";
    popup.style.overflow = "hidden";
    popup.style.boxShadow = "0 2px 10px rgba(0,0,0,0.3)";
    document.body.appendChild(popup);

    // Botão fechar (X)
    const btnFechar = document.createElement("button");
    btnFechar.innerHTML = "✕";
    btnFechar.style.position = "absolute";
    btnFechar.style.top = "-12px";
    btnFechar.style.right = "-12px";
    btnFechar.style.width = "30px";
    btnFechar.style.height = "30px";
    btnFechar.style.border = "none";
    btnFechar.style.borderRadius = "50%";
    btnFechar.style.backgroundColor = "#000";
    btnFechar.style.color = "#fff";
    btnFechar.style.fontSize = "14px";
    btnFechar.style.cursor = "pointer";
    btnFechar.style.zIndex = "10000";
    popup.appendChild(btnFechar);

    // Conteúdo do APP via iframe
    const iframe = document.createElement("iframe");
    iframe.src = "https://app.provadorinteligente.com.br/index.html";
    iframe.style.width = "100%";
    iframe.style.height = "100%";
    iframe.style.border = "none";
    popup.appendChild(iframe);

    // Abrir popup
    botao.addEventListener("click", function () {
      popup.style.display = "block";
      overlay.style.display = "block";
    });

    // Fechar popup
    btnFechar.addEventListener("click", function () {
      popup.style.display = "none";
      overlay.style.display = "none";
    });

    // Clicar no fundo escuro fecha também
    overlay.addEventListener("click", function () {
      popup.style.display = "none";
      overlay.style.display = "none";
    });
  });
})();

(function () {
  document.addEventListener("DOMContentLoaded", function () {
    if (document.getElementById("btn-provador")) return;

    // 🧠 Nome da loja com base na URL do script
    const scriptURL = document.currentScript?.src || "";
    const pathPart = new URL(scriptURL).pathname.split("/")[1] || "loja-parceira";
    const nomeLoja = pathPart.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());

    // Cria botão fixo
    const botao = document.createElement("button");
    botao.id = "btn-provador";
    botao.innerText = "DESCUBRA SEU TAMANHO";
    Object.assign(botao.style, {
      position: "fixed",
      bottom: "20px",
      right: "20px",
      zIndex: "9999",
      backgroundColor: "#000",
      color: "#fff",
      padding: "14px 20px",
      border: "none",
      borderRadius: "8px",
      fontWeight: "bold",
      fontSize: "13px",
      cursor: "pointer"
    });
    document.body.appendChild(botao);

    // Overlay
    const overlay = document.createElement("div");
    overlay.id = "overlay-fundo";
    Object.assign(overlay.style, {
      position: "fixed",
      top: "0",
      left: "0",
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      zIndex: "9998",
      display: "none"
    });
    document.body.appendChild(overlay);

    // Popup container
    const popup = document.createElement("div");
    popup.id = "provador-popup";
    Object.assign(popup.style, {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: "9999",
      width: "380px",
      height: "570px",
      backgroundColor: "#f2f2f2",
      borderRadius: "8px",
      display: "none",
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
    });
    document.body.appendChild(popup);

    // Botão de fechar
    const btnFechar = document.createElement("button");
    btnFechar.innerHTML = "✕";
    Object.assign(btnFechar.style, {
      position: "absolute",
      top: "-12px",
      right: "-12px",
      width: "30px",
      height: "30px",
      border: "none",
      borderRadius: "50%",
      backgroundColor: "#000",
      color: "#fff",
      fontSize: "14px",
      cursor: "pointer",
      zIndex: "10000"
    });
    popup.appendChild(btnFechar);

    // iframe com index.html
    const iframe = document.createElement("iframe");
    iframe.src = "https://app.provadorinteligente.com.br/index.html";
    Object.assign(iframe.style, {
      width: "100%",
      height: "100%",
      border: "none"
    });
    popup.appendChild(iframe);

    // Abrir e fechar popup
    botao.addEventListener("click", function () {
      popup.style.display = "block";
      overlay.style.display = "block";
    });

    btnFechar.addEventListener("click", function () {
      popup.style.display = "none";
      overlay.style.display = "none";
    });

    overlay.addEventListener("click", function () {
      popup.style.display = "none";
      overlay.style.display = "none";
    });

    // Enviar nome da loja para uso futuro
    window.nomeLoja = nomeLoja;
  });
})();

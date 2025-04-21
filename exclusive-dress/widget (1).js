
(function () {
  function iniciarWidget() {
    if (document.getElementById("btn-provador")) return;

    let nomeLoja = "Loja Parceira";
    try {
      const scriptURL = document.currentScript?.src || "";
      const path = new URL(scriptURL).pathname;
      nomeLoja = path.split("/")[1].replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
    } catch (e) {
      console.warn("Erro ao obter nome da loja:", e.message);
    }

    const botao = document.createElement("button");
    botao.id = "btn-provador";
    botao.innerText = "DESCUBRA SEU TAMANHO";
    Object.assign(botao.style, {
      backgroundColor: "#000",
      color: "#fff",
      padding: "12px 20px",
      border: "none",
      borderRadius: "6px",
      cursor: "pointer",
      fontSize: "14px",
      fontWeight: "bold",
      marginTop: "12px"
    });

    const target = document.querySelector(".page--product .product-info-content .product-action");
    if (target) {
      target.parentNode.insertBefore(botao, target);
    } else {
      document.body.appendChild(botao);
    }

    const overlay = document.createElement("div");
    overlay.id = "overlay-fundo";
    Object.assign(overlay.style, {
      display: "none",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.6)",
      zIndex: 9998
    });
    document.body.appendChild(overlay);

    const popup = document.createElement("div");
    popup.id = "provador-popup";
    Object.assign(popup.style, {
      display: "none",
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      zIndex: 9999,
      width: "380px",
      height: "570px",
      backgroundColor: "#f2f2f2",
      borderRadius: "8px",
      overflow: "hidden",
      boxShadow: "0 2px 10px rgba(0,0,0,0.3)"
    });

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
      zIndex: 10000
    });
    popup.appendChild(btnFechar);

    const iframe = document.createElement("iframe");
    iframe.src = "https://app.provadorinteligente.com.br/index.html";
    Object.assign(iframe.style, {
      width: "100%",
      height: "100%",
      border: "none"
    });
    popup.appendChild(iframe);

    document.body.appendChild(popup);

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

    window.nomeLoja = nomeLoja;
  }

  document.addEventListener("DOMContentLoaded", iniciarWidget);
  setInterval(iniciarWidget, 2000); // reinjeção a cada 2s para SPA
})();

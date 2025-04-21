(function () {
  const interval = setInterval(() => {
    const isProductPage = document.querySelector("body.page--product");
    const jaExiste = document.getElementById("btn-provador");

    if (isProductPage && !jaExiste) {
      clearInterval(interval);

      let scriptURL = "";
      let nomeLoja = "Loja Parceira";

      try {
        scriptURL = document.currentScript?.src || "";
        const path = new URL(scriptURL).pathname;
        const pathPart = path.split("/")[1] || "loja-parceira";
        nomeLoja = pathPart.replace(/-/g, " ").replace(/\b\w/g, l => l.toUpperCase());
      } catch (e) {
        console.warn("⚠️ Erro ao obter nome da loja:", e);
      }

      // Cria botão
      const botao = document.createElement("button");
      botao.id = "btn-provador";
      botao.innerText = "DESCUBRA SEU TAMANHO";
      Object.assign(botao.style, {
        backgroundColor: "#000",
        color: "#fff",
        padding: "14px 20px",
        border: "none",
        borderRadius: "8px",
        fontWeight: "bold",
        fontSize: "13px",
        cursor: "pointer",
        margin: "16px 0"
      });

      const target = document.querySelector(".page--product .product-info-content .product-action");
      if (target) target.parentNode.insertBefore(botao, target);

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

      // Popup
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

      // iframe do widget
      const iframe = document.createElement("iframe");
      iframe.src = "https://app.provadorinteligente.com.br/index.html";
      Object.assign(iframe.style, {
        width: "100%",
        height: "100%",
        border: "none"
      });
      popup.appendChild(iframe);

      // Lógica abrir/fechar
      botao.addEventListener("click", () => {
        popup.style.display = "block";
        overlay.style.display = "block";
      });

      btnFechar.addEventListener("click", () => {
        popup.style.display = "none";
        overlay.style.display = "none";
      });

      overlay.addEventListener("click", () => {
        popup.style.display = "none";
        overlay.style.display = "none";
      });

      // Exporta nome da loja
      window.nomeLoja = nomeLoja;
    }
  }, 500);
})();

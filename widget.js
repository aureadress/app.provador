(function () {
  document.addEventListener("DOMContentLoaded", function () {
    const checkInterval = setInterval(() => {
      const isProductPage = document.querySelector(".page--product");
      const target = document.querySelector(".page--product .product-info-content .product-action");

      if (isProductPage && target && !document.getElementById("btn-provador")) {
        clearInterval(checkInterval);

        const botao = document.createElement("button");
        botao.id = "btn-provador";
        botao.innerText = "DESCUBRA SEU TAMANHO";
        botao.style.backgroundColor = "#000";
        botao.style.color = "#fff";
        botao.style.padding = "12px 20px";
        botao.style.border = "none";
        botao.style.borderRadius = "6px";
        botao.style.cursor = "pointer";
        botao.style.fontSize = "14px";
        botao.style.fontWeight = "bold";
        botao.style.marginBottom = "16px";

        target.parentNode.insertBefore(botao, target);

        const overlay = document.createElement("div");
        overlay.id = "overlay-provador";
        overlay.style.position = "fixed";
        overlay.style.top = "0";
        overlay.style.left = "0";
        overlay.style.width = "100vw";
        overlay.style.height = "100vh";
        overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
        overlay.style.zIndex = "9998";
        overlay.style.display = "none";

        const popup = document.createElement("div");
        popup.id = "iframe-popup";
        popup.style.position = "fixed";
        popup.style.top = "50%";
        popup.style.left = "50%";
        popup.style.transform = "translate(-50%, -50%)";
        popup.style.zIndex = "9999";
        popup.style.width = "380px";
        popup.style.height = "570px";
        popup.style.border = "none";
        popup.style.borderRadius = "8px";
        popup.style.overflow = "hidden";
        popup.style.display = "none";
        popup.style.boxShadow = "0 2px 12px rgba(0,0,0,0.5)";
        popup.innerHTML = `
          <iframe id="provador-iframe" src="https://app.provadorinteligente.com.br" width="100%" height="100%" frameborder="0" style="border:none;"></iframe>
          <button id="fechar-provador" style="position:absolute;top:-12px;right:-12px;background:#000;color:#fff;border:none;border-radius:50%;width:28px;height:28px;cursor:pointer;font-weight:bold;">&times;</button>
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(popup);

        botao.addEventListener("click", () => {
          popup.style.display = "block";
          overlay.style.display = "block";
        });

        document.addEventListener("click", function (e) {
          if (e.target.id === "fechar-provador" || e.target.id === "overlay-provador") {
            popup.style.display = "none";
            overlay.style.display = "none";
          }
        });

        // ✅ Comunicação segura com o iframe (validação futura se necessário)
        window.addEventListener("message", (event) => {
          if (typeof event.data === "string" && event.data.includes("provador-error")) {
            alert("Houve um erro ao carregar o provador. Tente novamente.");
          }
        });
      }
    }, 300);

    setTimeout(() => clearInterval(checkInterval), 15000);
  });
})();

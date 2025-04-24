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
        botao.style.marginTop = "12px";

        botao.onclick = () => {
          const iframe = document.createElement("iframe");
          iframe.src = "https://app.provadorinteligente.com.br?url=" + encodeURIComponent(window.location.href);
          iframe.style.position = "fixed";
          iframe.style.top = "50%";
          iframe.style.left = "50%";
          iframe.style.transform = "translate(-50%, -50%)";
          iframe.style.width = "380px";
          iframe.style.height = "580px";
          iframe.style.zIndex = "9999";
          iframe.style.border = "none";
          iframe.style.borderRadius = "10px";
          iframe.id = "iframe-provador";

          const overlay = document.createElement("div");
          overlay.id = "overlay-fundo";
          overlay.style.position = "fixed";
          overlay.style.top = 0;
          overlay.style.left = 0;
          overlay.style.width = "100vw";
          overlay.style.height = "100vh";
          overlay.style.backgroundColor = "rgba(0,0,0,0.6)";
          overlay.style.zIndex = "9998";
          overlay.onclick = () => {
            document.body.removeChild(iframe);
            document.body.removeChild(overlay);
          };

          document.body.appendChild(overlay);
          document.body.appendChild(iframe);
        };

        target.insertBefore(botao, target.firstChild);
      }
    }, 500);
  });

  // 🔄 Ouve o comando de fechar vindo do iframe
  window.addEventListener("message", function (event) {
    if (event.data === "fechar-widget") {
      const iframe = document.getElementById("iframe-provador");
      const overlay = document.getElementById("overlay-fundo");
      if (iframe) document.body.removeChild(iframe);
      if (overlay) document.body.removeChild(overlay);
    }
  });
})();
 

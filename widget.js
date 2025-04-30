(function () {
  // Função para deixar iniciais maiúsculas
  function capitalizarNome(nome) {
    return nome
      .toLowerCase()
      .replace(/(^|\s|[-])([a-zá-ú])/g, (match, p1, p2) => p1 + p2.toUpperCase());
  }

  document.addEventListener("DOMContentLoaded", function () {
    const scripts = document.querySelectorAll('script[src*="provadorinteligente.com.br/widget.js"]');
    let nomeLoja = "Loja Padrão";

    scripts.forEach(script => {
      let node = script.previousSibling;
      while (node && node.nodeType !== Node.COMMENT_NODE) node = node.previousSibling;
      if (node && node.nodeType === Node.COMMENT_NODE) {
        const match = node.nodeValue.match(/PROVADOR INTELIGENTE - (.+)/i);
        if (match) {
          nomeLoja = capitalizarNome(match[1].trim());
        }
      }
    });

    // ⬇️ Widget popup padrão
    const checkInterval = setInterval(() => {
      const isProductPage = document.querySelector(".page--product");
      const target = document.querySelector(".page--product .product-info-content .product-action");

      if (isProductPage && target && !document.getElementById("btn-provador")) {
        clearInterval(checkInterval);

        // Ajusta espaçamento abaixo dos atributos de tamanho
        const atributos = document.querySelector(".product-attributes .attribute-values");
        if (atributos) {
          atributos.style.marginBottom = "16px";
        }

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
          iframe.src = "https://app.provadorinteligente.com.br?url=" + encodeURIComponent(window.location.href) + "&loja=" + encodeURIComponent(nomeLoja);
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

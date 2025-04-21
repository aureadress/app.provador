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

    const botao = $('<button id="btn-provador">DESCUBRA SEU TAMANHO</button>').css({
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

    const target = $(".page--product .product-info-content .product-action");
    if (target.length) {
      target.before(botao);
    } else {
      $("body").append(botao);
    }

    const overlay = $('<div id="overlay-fundo"></div>').css({
      display: "none",
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(0,0,0,0.6)",
      zIndex: 9998
    });

    const popup = $('<div id="provador-popup"></div>').css({
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

    const btnFechar = $('<button>✕</button>').css({
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

    const iframe = $('<iframe></iframe>').attr("src", "https://app.provadorinteligente.com.br/index.html").css({
      width: "100%",
      height: "100%",
      border: "none"
    });

    popup.append(btnFechar).append(iframe);

    $("body").append(overlay).append(popup);

    botao.on("click", function () {
      popup.show();
      overlay.show();
    });

    btnFechar.on("click", function () {
      popup.hide();
      overlay.hide();
    });

    overlay.on("click", function () {
      popup.hide();
      overlay.hide();
    });

    window.nomeLoja = nomeLoja;
  }

  $(document).ready(iniciarWidget);
  setInterval(iniciarWidget, 2000);
})();

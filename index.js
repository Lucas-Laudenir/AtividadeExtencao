document.addEventListener("DOMContentLoaded", () => {
  const pecasOriginais = document.querySelectorAll(".barra-superior svg.peca");
  const areaMontagem = document.getElementById("areaMontagem");

  // --- Drag start nas peças originais da barra superior ---
  pecasOriginais.forEach(peca => {
    peca.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", peca.id);
    });
  });

  // Permite drop na área de montagem
  areaMontagem.addEventListener("dragover", e => e.preventDefault());

  areaMontagem.addEventListener("drop", e => {
    e.preventDefault();
    const idPeca = e.dataTransfer.getData("text/plain");
    if (!idPeca) return;

    const svgOriginal = document.getElementById(idPeca);
    if (!svgOriginal) return;

    const rectArea = areaMontagem.getBoundingClientRect();
    const x = e.clientX - rectArea.left;
    const y = e.clientY - rectArea.top;

    const novaPeca = criarNovaPecaSVG(svgOriginal, x, y);
    areaMontagem.appendChild(novaPeca);
  });

  // Voltar
  document.getElementById("btn-voltar").addEventListener("click", () => {
    window.history.back();
  });

  // Salvar com html2canvas
  document.getElementById("btn-salvar").addEventListener("click", () => {
    if (!validarMontagem()) return;

    // html2canvas não captura SVG dentro de div com posição absoluta perfeitamente,
    // então criamos uma cópia do SVG em um container temporário
    html2canvas(areaMontagem).then(canvas => {
      const link = document.createElement("a");
      link.download = "meu-brinquedo.png";
      link.href = canvas.toDataURL();
      link.click();
    });
  });

  // ========= FUNÇÕES =========

  function criarNovaPecaSVG(svgOriginal, x, y) {
    // Clona o SVG da barra superior
    const nova = svgOriginal.cloneNode(true);
    nova.removeAttribute("id"); // para evitar conflito de IDs

    // Define estilo para posicionamento absoluto e cursor
    nova.style.position = "absolute";
    nova.style.left = `${x - nova.clientWidth / 2}px`;
    nova.style.top = `${y - nova.clientHeight / 2}px`;
    nova.style.cursor = "move";
    nova.style.userSelect = "none";
    nova.setAttribute("data-angulo", "0");
    nova.classList.add("arrastavel");

    // Adiciona retângulo invisível para redimensionar (canto inferior direito)
    const resizeHandle = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    resizeHandle.setAttribute("width", 10);
    resizeHandle.setAttribute("height", 10);
    resizeHandle.setAttribute("fill", "rgba(0,0,0,0.3)");
    resizeHandle.style.cursor = "nwse-resize";
    resizeHandle.style.position = "absolute"; // funciona dentro de svg? Não. Então vamos posicionar com atributos x,y

    // Posicionar resizeHandle no canto inferior direito do SVG
    // Como SVGs originais tem diferentes tamanhos, precisamos calcular.
    const bbox = nova.getBBox();
    resizeHandle.setAttribute("x", bbox.width - 10);
    resizeHandle.setAttribute("y", bbox.height - 10);

    nova.appendChild(resizeHandle);

    configurarMovimentacaoRedimensionamento(nova, resizeHandle);
    configurarRotacao(nova);

    return nova;
  }

  function configurarMovimentacaoRedimensionamento(svgElem, resizeHandle) {
    let isDragging = false, isResizing = false;
    let dragOffsetX = 0, dragOffsetY = 0;
    let startWidth, startHeight, startX, startY;

    // Drag movimentação
    svgElem.addEventListener("mousedown", e => {
      if (e.target === resizeHandle) return; // não iniciar drag se for no resizeHandle

      isDragging = true;
      const rect = svgElem.getBoundingClientRect();
      dragOffsetX = e.clientX - rect.left;
      dragOffsetY = e.clientY - rect.top;
      e.preventDefault();
    });

    // Drag redimensionar
    resizeHandle.addEventListener("mousedown", e => {
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;

      const bbox = svgElem.getBBox();
      startWidth = bbox.width;
      startHeight = bbox.height;

      e.stopPropagation();
      e.preventDefault();
    });

    document.addEventListener("mousemove", e => {
      if (isDragging) {
        const rectArea = areaMontagem.getBoundingClientRect();
        let x = e.clientX - rectArea.left - dragOffsetX;
        let y = e.clientY - rectArea.top - dragOffsetY;

        // Limitar dentro da área
        x = Math.max(0, Math.min(x, rectArea.width - svgElem.clientWidth));
        y = Math.max(0, Math.min(y, rectArea.height - svgElem.clientHeight));

        svgElem.style.left = `${x}px`;
        svgElem.style.top = `${y}px`;
      }
      if (isResizing) {
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        // Como SVGs são gráficos vetoriais, redimensionar muda width/height
        const novoWidth = Math.max(20, startWidth + deltaX);
        const novoHeight = Math.max(20, startHeight + deltaY);

        svgElem.setAttribute("width", novoWidth);
        svgElem.setAttribute("height", novoHeight);

        // Atualiza posição do resizeHandle
        resizeHandle.setAttribute("x", novoWidth - 10);
        resizeHandle.setAttribute("y", novoHeight - 10);
      }
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      isResizing = false;
    });
  }

  function configurarRotacao(svgElem) {
    svgElem.addEventListener("dblclick", () => {
      let angulo = parseInt(svgElem.getAttribute("data-angulo")) || 0;
      angulo = (angulo + 15) % 360;
      svgElem.style.transform = `rotate(${angulo}deg)`;
      svgElem.setAttribute("data-angulo", angulo);
    });
  }

  function getRotationDegrees(elem) {
    const style = window.getComputedStyle(elem);
    const transform = style.transform || "";
    if (transform === "none") return 0;
    const values = transform.match(/matrix\((.+)\)/);
    if (!values) return 0;
    const [a, b] = values[1].split(", ").map(parseFloat);
    let angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
    if (angle < 0) angle += 360;
    return angle;
  }

  function validarMontagem() {
    const margemPos = 15; // px tolerância posição
    const margemRot = 45; // graus tolerância rotação

    const pecasUsuario = Array.from(areaMontagem.querySelectorAll(".arrastavel"));
    const pecasSombra = Array.from(document.querySelectorAll(".modelo-peca.sombra"));

    if (pecasUsuario.length === 0) {
      alert("Adicione peças na área de montagem antes de salvar!");
      return false;
    }

    for (const sombra of pecasSombra) {
      const sombraRect = sombra.getBoundingClientRect();
      const sombraRot = getRotationDegrees(sombra);

      const encontrouMatch = pecasUsuario.some(p => {
        const pRect = p.getBoundingClientRect();
        const pRot = getRotationDegrees(p);

        const dx = Math.abs(pRect.left - sombraRect.left);
        const dy = Math.abs(pRect.top - sombraRect.top);
        const posOk = dx <= margemPos && dy <= margemPos;

        // Se sombra for círculo, ignorar rotação
        const isCircular = p.querySelector("circle") !== null;
        const rotOk = isCircular || rotacaoEquivalente(pRot, sombraRot, margemRot);

        return posOk && rotOk;
      });

      if (!encontrouMatch) {
        alert("A montagem não corresponde ao modelo da sombra. Verifique posição e rotação.");
        return false;
      }
    }

    return true;
  }

  function rotacaoEquivalente(rot1, rot2, tolerancia) {
    const diff = Math.abs((rot1 % 360) - (rot2 % 360));
    return diff <= tolerancia || Math.abs(360 - diff) <= tolerancia;
  }
});

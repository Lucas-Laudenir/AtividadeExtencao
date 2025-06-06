document.addEventListener("DOMContentLoaded", () => {
  const pecas = document.querySelectorAll(".barra-superior .peca > div[draggable='true']");
  const areaMontagem = document.getElementById("areaMontagem");

  // Arrastar da barra superior para a área de montagem
  pecas.forEach((peca) => {
    peca.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", peca.className);
    });
  });

  areaMontagem.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  function rotacionarElemento(el) {
    const transform = el.style.transform;
    const match = transform.match(/rotate\((\d+)deg\)/);
    let angle = match ? parseInt(match[1]) : 0;
    angle = (angle + 15) % 360;
    let newTransform = transform.replace(/rotate\(\d+deg\)/, "").trim();
    if (newTransform) newTransform += " ";
    newTransform += `rotate(${angle}deg)`;
    el.style.transform = newTransform;
  }

  areaMontagem.addEventListener("drop", (e) => {
    e.preventDefault();

    const className = e.dataTransfer.getData("text/plain");
    if (!className) return;

    const novaPeca = document.createElement("div");
    novaPeca.className = "peca " + className;
    novaPeca.style.position = "absolute";
    novaPeca.style.left = e.offsetX + "px";
    novaPeca.style.top = e.offsetY + "px";
    novaPeca.style.width = "100px";
    novaPeca.style.height = className.includes("barra") ? "20px" : "100px";
    novaPeca.style.cursor = "move";
    novaPeca.setAttribute("draggable", "false");
    novaPeca.style.boxShadow = "0 4px 8px rgba(0,0,0,0.3)";

    const resizeHandle = document.createElement("div");
    resizeHandle.classList.add("resize-handle");
    novaPeca.appendChild(resizeHandle);

    let isDragging = false;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    novaPeca.addEventListener("mousedown", (ev) => {
      if (ev.target === resizeHandle) return;
      isDragging = true;
      const rect = novaPeca.getBoundingClientRect();
      dragOffsetX = ev.clientX - rect.left;
      dragOffsetY = ev.clientY - rect.top;
      ev.preventDefault();
    });

    document.addEventListener("mousemove", (ev) => {
      if (!isDragging) return;
      const areaRect = areaMontagem.getBoundingClientRect();
      let x = ev.clientX - areaRect.left - dragOffsetX;
      let y = ev.clientY - areaRect.top - dragOffsetY;
      x = Math.max(0, Math.min(x, areaRect.width - novaPeca.offsetWidth));
      y = Math.max(0, Math.min(y, areaRect.height - novaPeca.offsetHeight));
      novaPeca.style.left = x + "px";
      novaPeca.style.top = y + "px";
    });

    document.addEventListener("mouseup", () => {
      isDragging = false;
      isResizing = false;
    });

    let isResizing = false;
    let startX, startY, startWidth, startHeight;

    resizeHandle.addEventListener("mousedown", (ev) => {
      isResizing = true;
      startX = ev.clientX;
      startY = ev.clientY;
      startWidth = novaPeca.offsetWidth;
      startHeight = novaPeca.offsetHeight;
      ev.stopPropagation();
      ev.preventDefault();
    });

    document.addEventListener("mousemove", (ev) => {
      if (!isResizing) return;
      let newWidth = startWidth + (ev.clientX - startX);
      let newHeight = startHeight + (ev.clientY - startY);
      const areaRect = areaMontagem.getBoundingClientRect();
      newWidth = Math.max(30, Math.min(newWidth, areaRect.width - novaPeca.offsetLeft));
      newHeight = Math.max(20, Math.min(newHeight, areaRect.height - novaPeca.offsetTop));
      novaPeca.style.width = newWidth + "px";
      novaPeca.style.height = newHeight + "px";
    });

    novaPeca.addEventListener("click", () => {
      rotacionarElemento(novaPeca);
      if (novaPeca.style.boxShadow === "0 4px 8px rgba(0, 0, 0, 0.3)") {
        novaPeca.style.boxShadow = "0 0 10px 2px rgba(0,0,0,0.15), 0 0 0 6px rgba(0,0,0,0.05)";
      } else {
        novaPeca.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.3)";
      }
    });

    areaMontagem.appendChild(novaPeca);
  });

  // Botão voltar
  document.getElementById("btn-voltar").addEventListener("click", () => {
    window.history.back();
  });

  // Função de validação da montagem
function validarMontagem() {
  const margem = 15; // px
  const margemRotacao = 45; // graus
  const pecasUsuario = Array.from(areaMontagem.querySelectorAll('.peca'));
  const pecasSombra = Array.from(document.querySelectorAll('.modelo-peca.sombra'));

  if (pecasUsuario.length === 0) {
    alert('Adicione peças na área de montagem antes de salvar!');
    return false;
  }

  for (const sombra of pecasSombra) {
    const sombraRect = sombra.getBoundingClientRect();
    const sombraRotation = getRotationDegrees(sombra);

    const encontrouMatch = pecasUsuario.some((p) => {
      const pRect = p.getBoundingClientRect();
      const pRotation = getRotationDegrees(p);

      const dx = Math.abs(pRect.left - sombraRect.left);
      const dy = Math.abs(pRect.top - sombraRect.top);
      const posicaoOK = dx <= margem && dy <= margem;

      const isCircular = p.classList.contains("circulo") || p.style.borderRadius === "50%";
      const rotacaoOK = isCircular || rotacaoEquivalente(pRotation, sombraRotation, margemRotacao);

      return posicaoOK && rotacaoOK;
    });

    if (!encontrouMatch) {
      alert('A montagem não corresponde ao modelo da sombra. Verifique a posição e rotação das peças.');
      return false;
    }
  }

  return true;
}

// Verifica se duas rotações são equivalentes com margem de erro
function rotacaoEquivalente(rot1, rot2, tolerancia) {
  const diff = Math.abs((rot1 % 360) - (rot2 % 360));
  return diff <= tolerancia || Math.abs(360 - diff) <= tolerancia;
}

  // Função auxiliar para extrair o ângulo de rotação de um elemento
  function getRotationDegrees(element) {
    const style = window.getComputedStyle(element);
    const transform = style.transform || style.webkitTransform || style.mozTransform;
    if (transform && transform !== "none") {
      const values = transform.match(/matrix\((.+)\)/);
      if (values) {
        const matrix = values[1].split(", ");
        const a = parseFloat(matrix[0]);
        const b = parseFloat(matrix[1]);
        const angle = Math.round(Math.atan2(b, a) * (180 / Math.PI));
        return (angle < 0) ? angle + 360 : angle;
      }
    }
    return 0;
  }

  // Botão salvar com validação
  document.getElementById("btn-salvar").addEventListener("click", () => {
    if (validarMontagem()) {
      html2canvas(areaMontagem).then((canvas) => {
        const link = document.createElement("a");
        link.download = "meu-brinquedo.png";
        link.href = canvas.toDataURL();
        link.click();
      });
    }
  });
});
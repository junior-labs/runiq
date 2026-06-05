/**
 * Engine de exportação de cartões (Story/Feed) via captura de tela limpa
 */
const RunIQCards = {
  exportElement(elementId, fileName) {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Garante estilo impecável temporariamente na exportação
    html2canvas(el, {
      backgroundColor: '#0a0a0c',
      scale: 2, // Aumenta resolução do PNG
      logging: false
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `${fileName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    });
  }
};

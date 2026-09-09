export function openPrintPreviewWindow() {
  const previewWindow = window.open("", "_blank");
  if (!previewWindow) return null;

  try {
    previewWindow.document.title = "Generando comprobante...";
    previewWindow.document.body.textContent = "Generando vista previa del comprobante...";
    Object.assign(previewWindow.document.body.style, {
      margin: "0",
      minHeight: "100vh",
      display: "grid",
      placeItems: "center",
      background: "#f8fafc",
      color: "#334155",
      fontFamily: "Arial, sans-serif",
      fontWeight: "600",
    });
  } catch {
    // La pestaña ya existe; la navegación al PDF seguirá siendo posible.
  }

  return previewWindow;
}

export function createPrintFrame() {
  const iframe = document.createElement("iframe");
  iframe.title = "Vista previa de impresión del comprobante";
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1px";
  iframe.style.height = "1px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  return iframe;
}

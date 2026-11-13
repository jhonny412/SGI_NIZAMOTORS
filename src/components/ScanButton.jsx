import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

// El escáner (y la librería ZXing) se carga solo cuando el usuario lo abre.
const BarcodeScannerModal = lazy(() => import("./BarcodeScannerModal"));

/**
 * Botón reutilizable para buscar un producto escaneando su QR o código de
 * barras con la cámara del dispositivo.
 *
 * El consumidor recibe el texto leído y devuelve:
 *   · true  → el código fue utilizado
 *   · false → no se encontró un producto con ese código (se avisa al usuario)
 *   · nada  → se asume que el código fue procesado
 *
 * @param {object} props
 * @param {(codigo: string) => boolean|void} props.onScan
 * @param {string} [props.title] Texto del tooltip / aria-label
 * @param {string} [props.className] Clases adicionales de tamaño/posición
 * @param {"default"|"inline"} [props.variant] "inline" para ir dentro de un input
 * @param {boolean} [props.disabled]
 */
export default function ScanButton({ onScan, title, className = "", variant = "default", disabled = false }) {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const etiqueta = title || t("scan.button");

  const estilos =
    variant === "inline"
      ? "border-transparent bg-transparent text-amber-600 hover:bg-amber-500/10 hover:text-amber-500 dark:text-amber-400 dark:hover:text-amber-300"
      : "border-slate-300 bg-white text-amber-600 hover:border-amber-400 hover:bg-amber-50 dark:border-[#334155] dark:bg-slate-900/70 dark:text-amber-400 dark:hover:border-amber-500/40 dark:hover:bg-amber-500/10 dark:hover:text-amber-300";

  const handleDetected = (codigo) => {
    setAbierto(false);
    let resultado;
    try {
      resultado = onScan?.(codigo);
    } catch (error) {
      console.error("[ScanButton] Error al procesar el código:", error);
      resultado = false;
    }

    if (resultado === false) {
      Swal.fire({
        icon: "warning",
        title: t("scan.not_found_title"),
        text: t("scan.not_found_text", { codigo }),
        confirmButtonColor: "#f59e0b",
        confirmButtonText: t("scan.accept"),
      });
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        disabled={disabled}
        title={etiqueta}
        aria-label={etiqueta}
        className={`inline-flex items-center justify-center rounded-xl border transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer ${estilos} ${className}`}
      >
        <span className="material-symbols-outlined text-lg leading-none">qr_code_scanner</span>
      </button>

      {abierto && (
        <Suspense fallback={null}>
          <BarcodeScannerModal onDetected={handleDetected} onCerrar={() => setAbierto(false)} />
        </Suspense>
      )}
    </>
  );
}

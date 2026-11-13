import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { BrowserMultiFormatReader, BrowserCodeReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";

// Formatos habituales en repuestos: QR de etiqueta, código de barras
// del fabricante (Code 128/39, EAN/UPC) y Data Matrix de empaques.
const FORMATOS = [
  BarcodeFormat.QR_CODE,
  BarcodeFormat.DATA_MATRIX,
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
  BarcodeFormat.CODE_93,
  BarcodeFormat.CODABAR,
  BarcodeFormat.EAN_13,
  BarcodeFormat.EAN_8,
  BarcodeFormat.UPC_A,
  BarcodeFormat.UPC_E,
  BarcodeFormat.ITF,
];

function construirHints() {
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return hints;
}

/** Pitido corto de confirmación (se ignora si el navegador lo bloquea). */
function pitar() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 900;
    gain.gain.value = 0.06;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
    setTimeout(() => ctx.close?.(), 250);
  } catch {
    // Sin audio disponible: no es un error funcional
  }
}

/**
 * Modal de escaneo de QR / código de barras.
 * Permite tres formas de lectura:
 *   · Cámara del dispositivo en vivo
 *   · Una imagen guardada (archivo, arrastrar y soltar o pegar del portapapeles)
 *   · Entrada manual del código
 * Se carga de forma diferida (lazy) para no penalizar el arranque de la app.
 */
export default function BarcodeScannerModal({ onDetected, onCerrar }) {
  const { t } = useTranslation();
  const videoRef = useRef(null);
  const controlsRef = useRef(null);
  const runTokenRef = useRef(0);
  const fileInputRef = useRef(null);
  const ultimoTextoRef = useRef("");
  const ultimoIntentoRef = useRef(0);
  const onDetectedRef = useRef(onDetected);

  const [estado, setEstado] = useState("iniciando"); // iniciando | activo | error
  const [mensajeError, setMensajeError] = useState("");
  const [camaras, setCamaras] = useState([]);
  const [camaraId, setCamaraId] = useState("");
  const [torchDisponible, setTorchDisponible] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [manualAbierto, setManualAbierto] = useState(false);
  const [manualCodigo, setManualCodigo] = useState("");
  const [imagenEstado, setImagenEstado] = useState(""); // "" | leyendo | error
  const [imagenMensaje, setImagenMensaje] = useState("");
  const [arrastrando, setArrastrando] = useState(false);

  useEffect(() => {
    onDetectedRef.current = onDetected;
  }, [onDetected]);

  // Bloquea el scroll del fondo mientras el escáner está abierto
  useEffect(() => {
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, []);

  const detenerCamara = useCallback(() => {
    const controls = controlsRef.current;
    controlsRef.current = null;
    if (controls) {
      try {
        controls.stop();
      } catch {
        // El stream ya estaba detenido
      }
    }
    const video = videoRef.current;
    const stream = video?.srcObject;
    if (stream && typeof stream.getTracks === "function") {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Track ya finalizado
        }
      });
    }
    if (video) video.srcObject = null;
  }, []);

  const describirError = useCallback(
    (error) => {
      const nombre = error?.name || "";
      if (nombre === "NotAllowedError" || nombre === "PermissionDeniedError" || nombre === "SecurityError") {
        return t("scan.errors.permission");
      }
      if (nombre === "NotFoundError" || nombre === "DevicesNotFoundError" || nombre === "OverconstrainedError") {
        return t("scan.errors.no_camera");
      }
      if (nombre === "NotReadableError" || nombre === "TrackStartError") {
        return t("scan.errors.busy");
      }
      return error?.message || t("scan.errors.generic");
    },
    [t]
  );

  /**
   * Lee un QR / código de barras desde una imagen.
   * Acepta archivos del equipo, imágenes arrastradas o pegadas del portapapeles.
   */
  const procesarArchivo = useCallback(
    async (file) => {
      if (!file) return;

      if (!file.type?.startsWith("image/")) {
        setImagenEstado("error");
        setImagenMensaje(t("scan.errors.not_image"));
        return;
      }

      setImagenEstado("leyendo");
      setImagenMensaje("");

      const url = URL.createObjectURL(file);
      try {
        const reader = new BrowserMultiFormatReader(construirHints());
        const resultado = await reader.decodeFromImageUrl(url);
        const texto = resultado?.getText?.() || "";
        if (!texto) throw new Error("Código no legible");

        runTokenRef.current += 1;
        detenerCamara();
        pitar();
        try {
          navigator.vibrate?.(60);
        } catch {
          // Vibración no soportada
        }
        onDetectedRef.current?.(texto);
      } catch {
        setImagenEstado("error");
        setImagenMensaje(t("scan.image_not_found"));
      } finally {
        URL.revokeObjectURL(url);
      }
    },
    [detenerCamara, t]
  );

  // Permite pegar una captura de pantalla con Ctrl+V
  useEffect(() => {
    const alPegar = (event) => {
      const items = Array.from(event.clipboardData?.items || []);
      const imagen = items.find((item) => item.type?.startsWith("image/"));
      if (!imagen) return;
      const archivo = imagen.getAsFile?.();
      if (archivo) {
        event.preventDefault();
        procesarArchivo(archivo);
      }
    };
    window.addEventListener("paste", alPegar);
    return () => window.removeEventListener("paste", alPegar);
  }, [procesarArchivo]);

  const iniciarCamara = useCallback(
    async (deviceId) => {
      const token = ++runTokenRef.current;
      detenerCamara();
      setEstado("iniciando");
      setMensajeError("");

      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        setEstado("error");
        setMensajeError(t("scan.errors.insecure"));
        return;
      }

      const reader = new BrowserMultiFormatReader(construirHints(), {
        delayBetweenScanAttempts: 150,
        delayBetweenScanSuccess: 700,
      });

      const constraints = deviceId
        ? { video: { deviceId: { exact: deviceId } } }
        : {
            video: {
              facingMode: { ideal: "environment" },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          };

      try {
        const controls = await reader.decodeFromConstraints(
          constraints,
          videoRef.current,
          (result) => {
            if (!result || token !== runTokenRef.current) return;
            const texto = result.getText?.() || "";
            if (!texto) return;

            // Evita disparar dos veces el mismo código en milisegundos
            const ahora = Date.now();
            if (texto === ultimoTextoRef.current && ahora - ultimoIntentoRef.current < 1200) return;
            ultimoTextoRef.current = texto;
            ultimoIntentoRef.current = ahora;

            runTokenRef.current += 1;
            detenerCamara();
            pitar();
            try {
              navigator.vibrate?.(60);
            } catch {
              // Vibración no soportada
            }
            onDetectedRef.current?.(texto);
          }
        );

        // Otro inicio (o un cierre) ocurrió mientras se abría la cámara
        if (token !== runTokenRef.current) {
          try {
            controls.stop();
          } catch {
            // Stream ya detenido
          }
          return;
        }

        controlsRef.current = controls;
        setEstado("activo");

        try {
          const dispositivos = await BrowserCodeReader.listVideoInputDevices();
          if (token === runTokenRef.current) setCamaras(dispositivos || []);
        } catch {
          setCamaras([]);
        }

        try {
          const track = videoRef.current?.srcObject?.getVideoTracks?.()[0];
          const compatible = Boolean(
            controls.switchTorch && track && BrowserCodeReader.mediaStreamIsTorchCompatibleTrack(track)
          );
          if (token === runTokenRef.current) setTorchDisponible(compatible);
        } catch {
          setTorchDisponible(false);
        }
      } catch (error) {
        if (token !== runTokenRef.current) return;
        setEstado("error");
        setMensajeError(describirError(error));
      }
    },
    [detenerCamara, describirError, t]
  );

  useEffect(() => {
    iniciarCamara(camaraId);
    return () => {
      // Invalida cualquier inicio pendiente y libera la cámara
      runTokenRef.current += 1;
      detenerCamara();
    };
  }, [iniciarCamara, camaraId, detenerCamara]);

  const alternarLinterna = async () => {
    const controls = controlsRef.current;
    if (!controls?.switchTorch) return;
    try {
      await controls.switchTorch(!torchOn);
      setTorchOn((prev) => !prev);
    } catch {
      setTorchDisponible(false);
    }
  };

  const usarCodigoManual = (event) => {
    event?.preventDefault?.();
    const codigo = manualCodigo.trim();
    if (!codigo) return;
    onDetectedRef.current?.(codigo);
  };

  const contenido = (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/85 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t("scan.title")}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCerrar?.();
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-[#334155] bg-slate-900 shadow-2xl animate-slide-up">
        {/* Encabezado */}
        <div className="flex items-start justify-between border-b border-[#334155]/70 bg-slate-950 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-2xl text-amber-400">qr_code_scanner</span>
            <div>
              <h3 className="text-base font-extrabold text-white">{t("scan.title")}</h3>
              <p className="mt-0.5 text-xs font-medium text-slate-400">{t("scan.subtitle")}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onCerrar?.()}
            aria-label={t("scan.close")}
            className="rounded-xl p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <div className="space-y-4 p-5">
          {/* Visor de cámara */}
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[#334155]/60 bg-black sm:aspect-video"
            onDragOver={(e) => {
              e.preventDefault();
              setArrastrando(true);
            }}
            onDragLeave={() => setArrastrando(false)}
            onDrop={(e) => {
              e.preventDefault();
              setArrastrando(false);
              const archivo = e.dataTransfer?.files?.[0];
              if (archivo) procesarArchivo(archivo);
            }}
          >
            <video ref={videoRef} className="h-full w-full object-cover" autoPlay muted playsInline />

            {/* Marco guía */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-3/5 w-4/5 max-w-[320px] rounded-2xl border-2 border-amber-400/70 shadow-[0_0_0_9999px_rgba(2,6,23,0.45)]">
                <span className="absolute left-0 top-0 h-5 w-5 rounded-tl-lg border-l-4 border-t-4 border-amber-400" />
                <span className="absolute right-0 top-0 h-5 w-5 rounded-tr-lg border-r-4 border-t-4 border-amber-400" />
                <span className="absolute bottom-0 left-0 h-5 w-5 rounded-bl-lg border-b-4 border-l-4 border-amber-400" />
                <span className="absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-4 border-r-4 border-amber-400" />
                {estado === "activo" && (
                  <span className="scan-line absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                )}
              </div>
            </div>

            {estado === "iniciando" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/70 text-center">
                <span className="h-8 w-8 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                <p className="text-xs font-bold text-slate-200">{t("scan.starting")}</p>
              </div>
            )}

            {estado === "error" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/85 px-6 text-center">
                <span className="material-symbols-outlined text-3xl text-rose-400">videocam_off</span>
                <p className="text-xs font-semibold text-slate-200">{mensajeError}</p>
                <button
                  type="button"
                  onClick={() => iniciarCamara(camaraId)}
                  className="btn-secondary px-3 py-1.5 text-xs"
                >
                  <span className="material-symbols-outlined text-sm">refresh</span>
                  {t("scan.retry")}
                </button>
              </div>
            )}

            {arrastrando && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-amber-400 bg-amber-500/15 text-center backdrop-blur-[1px]">
                <span className="material-symbols-outlined text-3xl text-amber-400">upload_file</span>
                <p className="text-xs font-bold text-amber-300">{t("scan.drop_here")}</p>
              </div>
            )}
          </div>

          {/* Estado / acciones */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] font-medium text-slate-400">
              {estado === "activo" ? t("scan.scanning") : t("scan.usb_hint")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {camaras.length > 1 && (
                <select
                  value={camaraId}
                  onChange={(e) => setCamaraId(e.target.value)}
                  className="select-field max-w-[190px] py-1.5 pl-3 text-xs"
                  aria-label={t("scan.camera")}
                >
                  <option value="">{t("scan.camera")}</option>
                  {camaras.map((cam, index) => (
                    <option key={cam.deviceId || index} value={cam.deviceId}>
                      {cam.label || `${t("scan.camera")} ${index + 1}`}
                    </option>
                  ))}
                </select>
              )}
              {torchDisponible && (
                <button
                  type="button"
                  onClick={alternarLinterna}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                    torchOn
                      ? "border-amber-500/50 bg-amber-500/15 text-amber-300"
                      : "border-[#334155] bg-slate-900/60 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">flashlight_on</span>
                  {t("scan.torch")}
                </button>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#334155] bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500"
              >
                <span className="material-symbols-outlined text-sm">image</span>
                {t("scan.image")}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const archivo = e.target.files?.[0];
                  e.target.value = "";
                  if (archivo) procesarArchivo(archivo);
                }}
              />
              <button
                type="button"
                onClick={() => setManualAbierto((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#334155] bg-slate-900/60 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:border-slate-500"
              >
                <span className="material-symbols-outlined text-sm">keyboard</span>
                {t("scan.manual")}
              </button>
            </div>
          </div>

          {imagenEstado === "leyendo" && (
            <p className="flex items-center gap-2 text-[11px] font-semibold text-amber-400">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
              {t("scan.image_processing")}
            </p>
          )}
          {imagenEstado === "error" && imagenMensaje && (
            <p className="flex items-start gap-1.5 text-[11px] font-semibold text-rose-400">
              <span className="material-symbols-outlined text-sm leading-none">error</span>
              {imagenMensaje}
            </p>
          )}

          {/* Entrada manual (respaldo si no hay cámara o el código no se lee) */}
          {manualAbierto && (
            <form onSubmit={usarCodigoManual} className="space-y-2 rounded-xl border border-[#334155]/60 bg-slate-950/60 p-3">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400">
                {t("scan.manual_title")}
              </label>
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={manualCodigo}
                  onChange={(e) => setManualCodigo(e.target.value)}
                  placeholder={t("scan.manual_placeholder")}
                  className="input-field flex-1 py-2 text-sm"
                />
                <button type="submit" className="btn-primary px-4 py-2 text-xs" disabled={!manualCodigo.trim()}>
                  {t("scan.manual_use")}
                </button>
              </div>
            </form>
          )}

          <div className="flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500">
            <span className="material-symbols-outlined text-sm leading-none">info</span>
            <div>
              <p>{t("scan.image_hint")}</p>
              <p className="mt-1">{t("scan.usb_hint")}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(contenido, document.body) : contenido;
}

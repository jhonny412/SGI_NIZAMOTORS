import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import {
  APP_VERSION,
  APP_RELEASE_DATE,
  debeMostrarAvisoVersion,
  formatearFechaAviso,
} from "../config/app";
import { mostrarAvisoVersion } from "../utils/versionNotice";

export const VERSION_CALLOUT_STORAGE_KEY = `sgi-version-callout-${APP_VERSION}`;

/**
 * Globo (callout) de novedades anclado al badge de versión del menú lateral.
 * Aparece una sola vez por versión durante los 5 días posteriores al lanzamiento
 * y permite abrir la alerta detallada o descartarlo.
 */
export default function VersionCallout() {
  const { t } = useTranslation();
  const [abierto, setAbierto] = useState(false);
  const [pos, setPos] = useState(null);
  const burbujaRef = useRef(null);

  const fecha = formatearFechaAviso(APP_RELEASE_DATE);

  const marcarVisto = useCallback(() => {
    try {
      localStorage.setItem(VERSION_CALLOUT_STORAGE_KEY, "1");
    } catch {
      // Almacenamiento no disponible
    }
  }, []);

  const cerrar = useCallback(() => {
    setAbierto(false);
    marcarVisto();
  }, [marcarVisto]);

  // Aparición automática (una vez por versión)
  useEffect(() => {
    if (!debeMostrarAvisoVersion()) return;

    let visto;
    try {
      visto = localStorage.getItem(VERSION_CALLOUT_STORAGE_KEY);
    } catch {
      visto = null;
    }
    if (visto === "1") return;

    const timer = setTimeout(() => setAbierto(true), 1100);
    return () => clearTimeout(timer);
  }, []);

  // Posición del globo respecto al badge de versión (o al menú en móvil)
  const calcular = useCallback(() => {
    const el = burbujaRef.current;
    if (!el) return;

    const badge = document.querySelector("[data-version-anchor]");
    const menu = document.querySelector("[data-menu-anchor]");
    const visible = (nodo) => {
      if (!nodo) return false;
      const r = nodo.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.left + r.width > 0 && r.left < window.innerWidth;
    };

    const ancla = visible(badge) ? badge : menu;
    if (!ancla) return;

    const a = ancla.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    const margen = 12;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const arriba = a.top > b.height + 28;

    let left = a.left + a.width / 2 - b.width / 2;
    left = Math.max(margen, Math.min(left, vw - b.width - margen));

    const top = arriba ? a.top - b.height - 8 : a.bottom + 8;

    setPos({
      left,
      top: Math.max(margen, Math.min(top, vh - b.height - margen)),
      tailLeft: Math.max(20, Math.min(a.left + a.width / 2 - left, b.width - 20)),
      arriba,
    });
  }, []);

  useLayoutEffect(() => {
    if (!abierto) {
      setPos(null);
      return;
    }
    calcular();
    window.addEventListener("resize", calcular);
    window.addEventListener("scroll", calcular, true);
    return () => {
      window.removeEventListener("resize", calcular);
      window.removeEventListener("scroll", calcular, true);
    };
  }, [abierto, calcular]);

  // Cerrar al hacer clic fuera o con Escape
  useEffect(() => {
    if (!abierto) return;

    const alClicFuera = (event) => {
      if (burbujaRef.current && !burbujaRef.current.contains(event.target)) cerrar();
    };
    const alTeclear = (event) => {
      if (event.key === "Escape") cerrar();
    };

    document.addEventListener("mousedown", alClicFuera);
    document.addEventListener("keydown", alTeclear);
    return () => {
      document.removeEventListener("mousedown", alClicFuera);
      document.removeEventListener("keydown", alTeclear);
    };
  }, [abierto, cerrar]);

  const verNovedades = () => {
    marcarVisto();
    setAbierto(false);
    mostrarAvisoVersion(t);
  };

  if (!abierto || typeof document === "undefined") return null;

  const contenido = (
    <div
      ref={burbujaRef}
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        left: pos ? `${pos.left}px` : 0,
        top: pos ? `${pos.top}px` : 0,
        width: "min(320px, calc(100vw - 24px))",
        visibility: pos ? "visible" : "hidden",
        zIndex: 130,
      }}
      className="animate-slide-up rounded-2xl border border-white/50 bg-[var(--aviso-bg)] text-[var(--aviso-ink)] shadow-[0_18px_45px_-10px_rgba(125,211,252,0.85)]"
    >
      {/* Cola del globo apuntando al badge de versión */}
      {pos && (
        <span
          aria-hidden="true"
          className="absolute h-3.5 w-3.5 rotate-45 bg-[var(--aviso-bg)]"
          style={{
            left: `${pos.tailLeft - 7}px`,
            ...(pos.arriba ? { bottom: "-6px" } : { top: "-6px" }),
          }}
        />
      )}

      <div className="relative z-10 p-3.5">
        <div className="flex items-start gap-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--aviso-ink)] text-[var(--aviso-soft)] shadow-md shadow-sky-900/30">
            <span className="material-symbols-outlined text-lg leading-none">rocket_launch</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-[var(--aviso-ink)]/80">
              {t("common.version_alert_badge")}
            </p>
            <p className="text-sm font-black leading-tight text-[var(--aviso-ink)]">
              {t("common.version_alert_title", { version: APP_VERSION })}
            </p>
            <p className="mt-0.5 text-[11px] font-semibold text-[var(--aviso-ink)]/75">
              {t("common.version_callout_updated", { fecha })}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrar}
            aria-label={t("scan.close")}
            className="-mr-1 -mt-1 cursor-pointer rounded-lg p-1 text-[var(--aviso-ink)]/70 transition-colors hover:bg-white/40 hover:text-[var(--aviso-ink)]"
          >
            <span className="material-symbols-outlined text-base leading-none">close</span>
          </button>
        </div>

        <div className="mt-2.5 flex items-center gap-1.5">
          <button
            type="button"
            onClick={verNovedades}
            className="flex flex-1 cursor-pointer items-center justify-center rounded-xl bg-[var(--aviso-ink)] px-3 py-1.5 text-[11px] font-bold text-white shadow-sm transition-all hover:opacity-90"
          >
            {t("common.version_callout_more")}
          </button>
          <button
            type="button"
            onClick={cerrar}
            className="cursor-pointer rounded-lg px-2 py-1.5 text-[11px] font-bold text-[var(--aviso-ink)]/80 transition-colors hover:bg-white/40 hover:text-[var(--aviso-ink)]"
          >
            {t("common.version_alert_ok")}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(contenido, document.body);
}

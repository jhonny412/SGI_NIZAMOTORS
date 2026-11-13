import Swal from "sweetalert2";
import { APP_VERSION, APP_RELEASE_DATE, formatearFechaAviso } from "../config/app";

/**
 * Abre la alerta detallada de actualización (SweetAlert2).
 * Se usa desde el globo de novedades y desde el aviso del menú lateral.
 */
export function mostrarAvisoVersion(t) {
  const fecha = formatearFechaAviso(APP_RELEASE_DATE);

  // Tono del aviso definido en index.css (--aviso-bg / --aviso-ink)
  const raiz = typeof document !== "undefined" ? getComputedStyle(document.documentElement) : null;
  const fondo = raiz?.getPropertyValue("--aviso-bg")?.trim() || "#7dd3fc";
  const tinta = raiz?.getPropertyValue("--aviso-ink")?.trim() || "#0c4a6e";

  return Swal.fire({
    html: `
      <div class="sgi-version-alert">
        <div class="sgi-version-alert__icon">
          <span class="material-symbols-outlined">rocket_launch</span>
        </div>
        <p class="sgi-version-alert__badge">${t("common.version_alert_badge")}</p>
        <h2 class="sgi-version-alert__title">${t("common.version_alert_title", { version: APP_VERSION })}</h2>
        <p class="sgi-version-alert__text">${t("common.version_notice_text", { version: APP_VERSION, fecha })}</p>
        <ul class="sgi-version-alert__list">
          <li>${t("common.version_alert_new_1")}</li>
          <li>${t("common.version_alert_new_2")}</li>
          <li>${t("common.version_alert_new_3")}</li>
        </ul>
      </div>`,
    confirmButtonText: t("common.version_alert_ok"),
    confirmButtonColor: tinta,
    background: fondo,
    color: tinta,
    width: 470,
    showCloseButton: true,
    customClass: { popup: "sgi-version-alert-popup" },
  });
}

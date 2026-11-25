// Controlador para el modal de Configuración, Intervals.icu y Forzar Actualización PWA
import {
    tieneIntervalsConfigurado,
    obtenerMetaIntervals,
    probarConexionIntervals,
    guardarConfigIntervals,
    eliminarConfigIntervals
} from "./intervals-api.js";

export function initConfig() {
    window.abrirModalConfig = abrirModalConfig;
    window.cerrarModalConfig = cerrarModalConfig;
    window.forzarActualizacionApp = forzarActualizacionApp;
    window.guardarIntervalsConfig = guardarIntervalsConfig;
    window.desconectarIntervalsConfig = desconectarIntervalsConfig;
    window.actualizarEstadoIntervalsUI = actualizarEstadoIntervalsUI;

    // Soporte para cerrar con tecla Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cerrarModalConfig();
        }
    });
}

export function actualizarEstadoIntervalsUI() {
    const conectado = tieneIntervalsConfigurado();
    const meta = obtenerMetaIntervals();
    const badge = document.getElementById("intervalsStatusBadge");
    const form = document.getElementById("intervalsConnectForm");
    const pill = document.getElementById("intervalsSyncIndicator");
    const text = document.getElementById("intervalsSyncText");

    if (conectado) {
        if (badge) { badge.textContent = "Conectado"; badge.classList.add("connected"); }
        if (form) form.style.display = "none";
        if (pill) pill.style.display = "flex";
        if (text) text.textContent = meta?.athleteName ? `Intervals · ${meta.athleteName}` : "Intervals.icu conectado";
    } else {
        if (badge) { badge.textContent = "Desconectado"; badge.classList.remove("connected"); }
        if (form) form.style.display = "flex";
        if (pill) pill.style.display = "none";
    }
}

function mostrarFeedbackIntervals(mensaje, color) {
    const fb = document.getElementById("intervalsFeedback");
    if (!fb) return;
    fb.textContent = mensaje;
    fb.style.color = color;
    fb.style.display = "block";
    setTimeout(() => {
        if (fb.textContent === mensaje) fb.style.display = "none";
    }, 5000);
}

export async function guardarIntervalsConfig() {
    const input = document.getElementById("inputIntervalsApiKey");
    const btn = document.getElementById("btnGuardarIntervals");
    const apiKey = (input?.value || "").trim();

    if (!apiKey) {
        mostrarFeedbackIntervals("Pega tu API Key de Intervals.icu primero.", "#facc15");
        return;
    }

    if (btn) {
        btn.disabled = true;
        btn.textContent = "Verificando conexión...";
    }

    try {
        const res = await probarConexionIntervals(apiKey);
        await guardarConfigIntervals(apiKey, {
            athleteId: res.athleteId,
            athleteName: res.athleteName
        });
        if (input) input.value = "";
        actualizarEstadoIntervalsUI();
        mostrarFeedbackIntervals(
            `✅ Conectado (${res.athleteName} · ${res.latencyMs} ms). Sincronizando Salud...`,
            "#4ade80"
        );
        if (window.salud?.fetchFitData) {
            window.salud.fetchFitData(null, { forzar: true }).catch(() => {});
        }
    } catch (err) {
        mostrarFeedbackIntervals(`❌ ${err.message || "No se pudo conectar con Intervals.icu"}`, "#f87171");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = "🔐 Probar y Conectar Intervals.icu";
        }
    }
}

export async function desconectarIntervalsConfig() {
    if (!confirm("¿Deseas desconectar tu API Key de Intervals.icu de este dispositivo?")) return;
    eliminarConfigIntervals();
    actualizarEstadoIntervalsUI();
    mostrarFeedbackIntervals("Intervals.icu desconectado.", "#94a3b8");
    if (window.salud?.onIntervalsDesconectado) {
        await window.salud.onIntervalsDesconectado();
    }
}

export function abrirModalConfig() {
    const modal = document.getElementById("modal-config");
    if (modal) {
        modal.classList.add("active");
        document.body.classList.add("modal-open");

        // Refrescar estado visual de Intervals.icu y Google Fit al abrir ajustes
        actualizarEstadoIntervalsUI();

        const valido = window.salud?.esTokenFitValido
            ? window.salud.esTokenFitValido()
            : !!localStorage.getItem("fitToken");
        if (window.salud?.actualizarEstadoGoogleFitUI) {
            window.salud.actualizarEstadoGoogleFitUI(valido);
        }
    }
}

export function cerrarModalConfig() {
    const modal = document.getElementById("modal-config");
    if (modal) {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }
}

/**
 * Anula los Service Workers registrados, borra cachés del navegador
 * y fuerza una recarga limpia omitiendo la caché local.
 */
export function forzarActualizacionApp() {
    const btn = document.getElementById("btn-forzar-actualizacion");
    if (btn) {
        btn.disabled = true;
        btn.innerText = "Limpiando caché y actualizando...";
        btn.style.opacity = "0.75";
        btn.style.cursor = "wait";
    }

    // Limpieza profunda de Cache Storage si está disponible
    if ('caches' in window) {
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    return caches.delete(cacheName);
                })
            );
        }).catch(function(err) {
            console.warn("Aviso al limpiar CacheStorage:", err);
        });
    }

    // Anulación de Service Workers y recarga limpia obligatoria
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
            for (let registration of registrations) {
                registration.unregister();
            }
            // Recarga forzada desde el servidor
            window.location.reload(true);
        }).catch(function() {
            window.location.reload(true);
        });
    } else {
        window.location.reload(true);
    }
}

// Asignar al objeto global para disponibilidad inmediata
window.abrirModalConfig = abrirModalConfig;
window.cerrarModalConfig = cerrarModalConfig;
window.forzarActualizacionApp = forzarActualizacionApp;
window.guardarIntervalsConfig = guardarIntervalsConfig;
window.desconectarIntervalsConfig = desconectarIntervalsConfig;
window.actualizarEstadoIntervalsUI = actualizarEstadoIntervalsUI;

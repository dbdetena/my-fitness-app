// Controlador para el modal de Configuración y Forzar Actualización PWA

export function initConfig() {
    window.abrirModalConfig = abrirModalConfig;
    window.cerrarModalConfig = cerrarModalConfig;
    window.forzarActualizacionApp = forzarActualizacionApp;

    // Soporte para cerrar con tecla Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            cerrarModalConfig();
        }
    });
}

export function abrirModalConfig() {
    const modal = document.getElementById("modal-config");
    if (modal) {
        modal.classList.add("active");
        document.body.classList.add("modal-open");

        // Refrescar estado visual de Google Fit al abrir el modal de ajustes
        const token = localStorage.getItem("fitToken");
        if (window.salud?.actualizarEstadoGoogleFitUI) {
            window.salud.actualizarEstadoGoogleFitUI(!!token);
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

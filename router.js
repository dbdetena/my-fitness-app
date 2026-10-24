import { initSalud, cleanupSalud } from "./salud.js";
import { initGimnasio, cleanupGimnasio } from "./gimnasio.js";
import { initDiario, cleanupDiario } from "./diario.js";
import { initCoach, cleanupCoach } from "./coach.js";
import { initFraseDelDia } from "./quotes.js";
import { initConfig } from "./config.js";
import { actualizarFabUniversal, obtenerSesionActiva } from "./session-manager.js";

// Estado de la vista actual
let vistaActual = null;

// Mapa de controladores de ciclo de vida para cada vista
const LIFECYCLE_HOOKS = {
    dashboard: {
        init: initSalud,
        cleanup: cleanupSalud
    },
    salud: {
        init: initSalud,
        cleanup: cleanupSalud
    },
    gimnasio: {
        init: initGimnasio,
        cleanup: cleanupGimnasio
    },
    diario: {
        init: initDiario,
        cleanup: cleanupDiario
    },
    coach: {
        init: initCoach,
        cleanup: cleanupCoach
    }
};

/**
 * Carga una vista HTML parcial en el contenedor principal #app-content
 * @param {string} vista - Nombre del archivo/vista (sin .html)
 */
export async function cargarVista(vista) {
    const contenedor = document.getElementById("app-content");
    if (!contenedor) return;

    // Si ya estamos en esta vista, restaurar sesión activa si aplica
    if (vistaActual === vista) {
        if (vista === "gimnasio") {
            const sesion = obtenerSesionActiva();
            if (sesion && window.gimnasio?.restaurarSesionActivaEnPantalla) {
                window.gimnasio.restaurarSesionActivaEnPantalla(sesion);
            }
        }
        return;
    }

    // 1. Ejecutar cleanup de la vista anterior si existe
    if (vistaActual && LIFECYCLE_HOOKS[vistaActual]?.cleanup) {
        try {
            LIFECYCLE_HOOKS[vistaActual].cleanup();
        } catch (err) {
            console.warn(`Error en cleanup de la vista ${vistaActual}:`, err);
        }
    }

    // 2. Transición suave de carga
    contenedor.style.opacity = "0.4";

    try {
        const respuesta = await fetch(`./${vista}.html`, {
            headers: { "Cache-Control": "no-cache" }
        });

        if (!respuesta.ok) {
            throw new Error(`Error ${respuesta.status} al cargar ${vista}.html`);
        }

        const html = await respuesta.text();
        contenedor.innerHTML = html;

        // 3. Actualizar estado de navegación activa
        actualizarNavegacion(vista);

        // 4. Ejecutar inicialización de scripts de la nueva vista
        if (LIFECYCLE_HOOKS[vista]?.init) {
            LIFECYCLE_HOOKS[vista].init();
        }

        vistaActual = vista;

        // 5. Actualizar estado del FAB universal de sesión activa
        actualizarFabUniversal();
    } catch (error) {
        console.error(`Error al cargar la vista '${vista}':`, error);
        contenedor.innerHTML = `
            <div class="card error-card" style="text-align: center; padding: 24px;">
                <span style="font-size: 2rem;">⚠️</span>
                <h3 style="margin: 12px 0 8px; color: #f87171;">Error al cargar vista</h3>
                <p style="color: var(--text-muted); font-size: 0.85rem;">No se pudo cargar '${vista}'. Comprueba que el archivo exista en el servidor.</p>
                <button onclick="window.router.cargarVista('dashboard')" class="btn-primary" style="margin-top: 16px;">Volver a Hoy</button>
            </div>
        `;
    } finally {
        contenedor.style.opacity = "1";
        window.scrollTo({ top: 0, behavior: "instant" });
    }
}

// Actualiza las clases 'active' en la barra de navegación inferior
function actualizarNavegacion(vista) {
    const botones = document.querySelectorAll(".bottom-nav .nav-item");
    botones.forEach(btn => {
        if (btn.dataset.view === vista) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });
}

// Configurar eventos de los botones de navegación inferior
function setupNavegacion() {
    const nav = document.querySelector(".bottom-nav");
    if (!nav) return;

    nav.addEventListener("click", (e) => {
        const boton = e.target.closest(".nav-item");
        if (!boton) return;

        const vista = boton.dataset.view;
        if (vista) {
            cargarVista(vista);
        }
    });
}

// Inicialización de la SPA
function initRouter() {
    setupNavegacion();

    // Inicializar configuración y forzar actualización PWA
    initConfig();

    // Inicializar frase motivadora del día
    initFraseDelDia();

    // Escuchar vuelta a primer plano de Android / PWA
    window.addEventListener("focus", () => {
        actualizarFabUniversal();
        window.gimnasio?.actualizarMiniBannerSesion?.();
    });
    document.addEventListener("visibilitychange", () => {
        if (!document.hidden) {
            actualizarFabUniversal();
            window.gimnasio?.actualizarMiniBannerSesion?.();
        }
    });

    // Abrir automáticamente la vista 'dashboard' al iniciar
    cargarVista("dashboard");
}

// Exportar globalmente para eventos inline
window.router = { 
    cargarVista,
    getVistaActual: () => vistaActual 
};

// Arrancar cuando el DOM esté listo
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initRouter);
} else {
    initRouter();
}

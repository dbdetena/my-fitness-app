// ========================================================
// MÓDULO: GESTOR DE SESIÓN ACTIVA EN SEGUNDO PLANO
// Gestiona el estado de la sesión, persistencia en localStorage,
// cálculo matemático de tiempos (inmune a congelación de PWA),
// botón flotante universal (FAB) y timeout por inactividad (60 min).
// ========================================================
import { guardarEntradaBitacora } from "./diario.js";

const STORAGE_KEY = "fitness_active_session";
const INACTIVITY_TIMEOUT_MS = 60 * 60 * 1000; // 1 hora de inactividad (3.600.000 ms)

let tickerInterval = null;

/**
 * Obtiene la sesión activa desde localStorage si existe y sigue vigente.
 * Si ha superado 1 hora sin actividad, la cierra automáticamente y registra la incidencia.
 */
export function obtenerSesionActiva() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const sesion = JSON.parse(raw);
        if (!sesion || !sesion.inicioTimestamp) {
            localStorage.removeItem(STORAGE_KEY);
            return null;
        }

        const ahora = Date.now();
        const ultimaActividad = sesion.ultimaActividadTimestamp || sesion.inicioTimestamp;

        // Comprobación de 1 hora de inactividad
        if (ahora - ultimaActividad > INACTIVITY_TIMEOUT_MS) {
            cerrarSesionPorInactividad(sesion);
            return null;
        }

        return sesion;
    } catch (e) {
        console.error("Error al leer sesión activa de localStorage:", e);
        return null;
    }
}

/**
 * Inicia una nueva sesión activa y la persiste en localStorage
 */
export function iniciarNuevaSesion({ rutina, tipo = "estandar" }) {
    detenerSesionActualSinGuardar();

    let seriesTotales = 0;
    (rutina.ejercicios || []).forEach(e => {
        seriesTotales += (e.series || 3);
    });

    const ahora = Date.now();
    const nuevaSesion = {
        rutinaId: rutina.id,
        tipo,
        nombre: rutina.nombre,
        inicioTimestamp: ahora,
        pausado: false,
        pausaTimestamp: null,
        tiempoPausadoAcumulado: 0,
        ultimaActividadTimestamp: ahora,
        calentamientoInicio: ahora,
        calentamientoFin: null,
        calentamientoSegundos: null,
        checksCalentamiento: {},
        seriesTotales,
        seriesCompletadas: 0,
        seriesInputs: {}, // { [rowId]: { peso: '', reps: '', completado: false, splitTiempo: '' } }
        splits: [],
        rpe: 8,
        porVoz: false,
        notaTexto: ""
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevaSesion));
    iniciarTickerGlobal();
    actualizarFabUniversal();

    return nuevaSesion;
}

/**
 * Registra actividad del usuario para resetear el contador de inactividad (1 hora)
 */
export function registrarActividadSesion() {
    const sesion = obtenerSesionActiva();
    if (!sesion) return;

    sesion.ultimaActividadTimestamp = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
}

/**
 * Guarda cambios parciales en la sesión activa
 */
export function actualizarDatosSesion(parcial) {
    const sesion = obtenerSesionActiva();
    if (!sesion) return;

    Object.assign(sesion, parcial);
    sesion.ultimaActividadTimestamp = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    actualizarFabUniversal();
}

/**
 * Calcula el tiempo exacto transcurrido en segundos usando timestamps.
 * Matemáticamente exacto aunque la PWA se congele, reciba una llamada o cambie de app.
 */
export function calcularTiempoTranscurridoSegundos(sesion) {
    if (!sesion || !sesion.inicioTimestamp) return 0;

    const ahora = Date.now();
    const tiempoPausado = sesion.tiempoPausadoAcumulado || 0;

    if (sesion.pausado && sesion.pausaTimestamp) {
        return Math.max(0, Math.floor((sesion.pausaTimestamp - sesion.inicioTimestamp - tiempoPausado) / 1000));
    }

    return Math.max(0, Math.floor((ahora - sesion.inicioTimestamp - tiempoPausado) / 1000));
}

/**
 * Alterna entre pausar y reanudar el cronómetro de la sesión
 */
export function togglePausarSesion() {
    const sesion = obtenerSesionActiva();
    if (!sesion) return null;

    const ahora = Date.now();
    sesion.ultimaActividadTimestamp = ahora;

    if (sesion.pausado) {
        // Reanudar
        if (sesion.pausaTimestamp) {
            const tiempoEnEstaPausa = ahora - sesion.pausaTimestamp;
            sesion.tiempoPausadoAcumulado = (sesion.tiempoPausadoAcumulado || 0) + tiempoEnEstaPausa;
        }
        sesion.pausado = false;
        sesion.pausaTimestamp = null;
    } else {
        // Pausar
        sesion.pausado = true;
        sesion.pausaTimestamp = ahora;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(sesion));
    actualizarFabUniversal();
    return sesion;
}

/**
 * Finaliza la sesión exitosamente y la elimina de localStorage
 */
export function finalizarSesion() {
    localStorage.removeItem(STORAGE_KEY);
    actualizarFabUniversal();
}

/**
 * Cancela/abandona la sesión activa
 */
export function cancelarSesion() {
    localStorage.removeItem(STORAGE_KEY);
    actualizarFabUniversal();
}

/**
 * Cierre automático por inactividad (+60 min sin registros)
 * Genera una incidencia en el Diario de Notas
 */
function cerrarSesionPorInactividad(sesion) {
    try {
        localStorage.removeItem(STORAGE_KEY);

        const duracionSeg = calcularTiempoTranscurridoSegundos(sesion);
        const duracionFormato = formatearSegundos(duracionSeg);

        // Guardar entrada en Diario de Notas clasificada como alerta/incidencia
        guardarEntradaBitacora({
            texto: `⚠️ Incidencia: Sesión cerrada automáticamente tras 1 hora de inactividad sin registros. Rutina: "${sesion.nombre}". Se registraron ${sesion.seriesCompletadas || 0} de ${sesion.seriesTotales || 0} series antes de la inactividad.`,
            categoria: "molestia",
            rutinaRelacionada: sesion.nombre,
            rpe: null,
            porVoz: false,
            metricas: {
                duracionSegundos: duracionSeg,
                duracionFormato,
                calentamientoFormato: sesion.calentamientoFin || null,
                seriesTotales: sesion.seriesTotales || 0,
                seriesCompletadas: sesion.seriesCompletadas || 0,
                splitsCount: sesion.splits ? sesion.splits.length : 0,
                incidencia: "Cierre automático por inactividad (+60 min)"
            }
        });

        // Notificación flotante informativa
        mostrarToastGlobal(`⚠️ Sesión cerrada por inactividad (+60 min). Incidencia registrada en el Diario de Notas.`);

        if (window.gimnasio?.minimizarSesionActiva) {
            window.gimnasio.minimizarSesionActiva();
        }
        if (window.gimnasio?.actualizarMiniBannerSesion) {
            window.gimnasio.actualizarMiniBannerSesion();
        }
    } catch (e) {
        console.error("Error al cerrar sesión por inactividad:", e);
    } finally {
        actualizarFabUniversal();
    }
}

function detenerSesionActualSinGuardar() {
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Formatea segundos a string MM:SS o H:MM:SS
 */
export function formatearSegundos(totalSegundos) {
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;

    const ss = String(s).padStart(2, "0");
    const mm = String(m).padStart(2, "0");

    if (h > 0) {
        return `${h}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
}

/**
 * Inicia el ticker global en segundo plano
 */
export function iniciarTickerGlobal() {
    if (tickerInterval) return;

    tickerInterval = setInterval(() => {
        const sesion = obtenerSesionActiva();
        if (!sesion) {
            actualizarFabUniversal();
            return;
        }
        actualizarFabUniversal();
    }, 1000);
}

/**
 * Actualiza la visibilidad y tiempo del Botón Flotante Universal (FAB)
 */
export function actualizarFabUniversal() {
    const fab = document.getElementById("fab-sesion-activa");
    if (!fab) return;

    const sesion = obtenerSesionActiva();
    if (!sesion) {
        fab.style.display = "none";
        return;
    }

    const seg = calcularTiempoTranscurridoSegundos(sesion);
    const tiempoStr = formatearSegundos(seg);

    const timerDisp = document.getElementById("fab-timer-display");
    if (timerDisp) timerDisp.textContent = tiempoStr;

    // Detectar si el usuario está actualmente en la mesa de entrenamiento activa de gimnasio
    const sesionPanel = document.getElementById("panel-sesion-activa");
    const enSesionActivaVisible = sesionPanel && sesionPanel.style.display !== "none" && sesionPanel.classList.contains("active");

    if (enSesionActivaVisible) {
        // En la pantalla activa del gimnasio no se muestra el FAB para no duplicar el cronómetro
        fab.style.display = "none";
    } else {
        // En cualquier otra pestaña (hoy, nutricion, diario, coach, o catálogo de gimnasio), mostrar el FAB flotante
        fab.style.display = "flex";
        if (sesion.pausado) {
            fab.classList.add("paused");
        } else {
            fab.classList.remove("paused");
        }
    }
}

/**
 * Vuelve instantáneamente a la sesión activa desde cualquier lugar
 */
export function volverASesionActiva() {
    if (window.router?.cargarVista) {
        window.router.cargarVista("gimnasio");
    }
    if (window.gimnasio?.restaurarSesionActivaEnPantalla) {
        window.gimnasio.restaurarSesionActivaEnPantalla();
    }
}

function mostrarToastGlobal(mensaje) {
    const toast = document.createElement("div");
    toast.className = "toast-notification toast-warning";
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Iniciar ticker y exponer función global al cargar
iniciarTickerGlobal();
window.volverASesionActiva = volverASesionActiva;
window.actualizarFabUniversal = actualizarFabUniversal;

// ========================================================
// MÓDULO: DIARIO DE ENTRENAMIENTO & DIARIO DE NOTAS
// Soporte para transcripción por voz (Web Speech API),
// marcas de tiempo automáticas, registro de notas,
// desglose de tiempos por actividad y comparativa de progreso.
// ========================================================
import { generarHtmlDesgloseEntrada } from "./progreso-manager.js";
import { db } from "./firebase-config.js";
import { collection, addDoc, doc, updateDoc, deleteDoc, getDocs, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORAGE_KEY = "fitness_bitacora_entries";

// Estado interno del diario
const state = {
    filtroActual: "todos",
    isRecording: false,
    grabandoVoz: false,
    reconocimientoVoz: null,
    targetInputVoz: null,
    transcriptAcumulado: "",
    ultimoIndiceProcesado: -1,
    notaEnEdicionId: null
};

/**
 * Iconografía SVG minimalista y limpia para las categorías y módulos del Diario (Estilo Acero & Neón)
 */
export const CATEGORIA_ICONS = {
    "todos": `<svg class="cat-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    "general": `<svg class="cat-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>`,
    "recuperacion": `<svg class="cat-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`,
    "post-entreno": `<svg class="cat-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12M4 7v10M20 7v10"></path></svg>`,
    "molestia": `<svg class="cat-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    "nutricion": `<svg class="cat-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 4 13C4 7 11 3 11 3s7 4 7 10a7 7 0 0 1-7 7z"></path><path d="M11 3v17"></path></svg>`
};

export const CATEGORIA_CONFIG = {
    "general": { label: "Nota Libre", labelLarga: "Nota Libre / Reflexión" },
    "recuperacion": { label: "Energía / Sueño", labelLarga: "Energía, Sueño & Descanso" },
    "post-entreno": { label: "Entrenamiento", labelLarga: "Resumen de Entrenamiento" },
    "molestia": { label: "Alerta / Incidencia", labelLarga: "Alerta / Incidencia / Molestia" },
    "nutricion": { label: "Nutrición", labelLarga: "Nutrición & Hidratación" }
};

/**
 * Entradas iniciales de ejemplo si el usuario no tiene ninguna guardada
 */
const ENTRADAS_DEFAULT = [
    {
        id: "entry-init-1",
        fechaIso: new Date(Date.now() - 86400000 * 2).toISOString(),
        fechaFormato: formatearFechaTimestamp(new Date(Date.now() - 86400000 * 2)),
        categoria: "post-entreno",
        categoriaLabel: "Entrenamiento",
        rutinaRelacionada: "Tirón / Pull (Espalda, Bíceps y Posterior)",
        rpe: 8,
        energia: "alta",
        texto: "Sensaciones increíbles en dominadas pronas. Subí a 8 reps limpias en las 4 series con parada en la cima. Subida a 24kg en remo (+2kg) y 14kg en curl (+2kg).",
        porVoz: true,
        metricas: {
            duracionSegundos: 2720, // 45:20
            duracionFormato: "45:20",
            calentamientoSegundos: 340, // 05:40
            calentamientoFormato: "05:40",
            seriesTotales: 11,
            seriesCompletadas: 11,
            rutinaId: "estandar-pull",
            splits: [
                { tipo: "calentamiento_paso", paso: 1, tiempo: "01:50", segundos: 110 },
                { tipo: "calentamiento_paso", paso: 2, tiempo: "03:40", segundos: 220 },
                { tipo: "calentamiento_paso", paso: 3, tiempo: "05:40", segundos: 340 },
                { tipo: "calentamiento_completo", tiempo: "05:40", segundos: 340 },
                // Dominadas (4 series x 8 reps)
                { tipo: "serie", ejercicio: "Dominadas", set: 1, peso: 0, reps: 8, tiempo: "08:30", segundos: 510 },
                { tipo: "serie", ejercicio: "Dominadas", set: 2, peso: 0, reps: 8, tiempo: "11:00", segundos: 660 },
                { tipo: "serie", ejercicio: "Dominadas", set: 3, peso: 0, reps: 8, tiempo: "13:30", segundos: 810 },
                { tipo: "serie", ejercicio: "Dominadas", set: 4, peso: 0, reps: 8, tiempo: "15:55", segundos: 955 },
                // Remo con mancuerna (3 series @ 24kg - Subida de carga +2kg!)
                { tipo: "serie", ejercicio: "Remo con mancuerna", set: 1, peso: 24, reps: 10, tiempo: "19:10", segundos: 1150 },
                { tipo: "serie", ejercicio: "Remo con mancuerna", set: 2, peso: 24, reps: 10, tiempo: "21:40", segundos: 1300 },
                { tipo: "serie", ejercicio: "Remo con mancuerna", set: 3, peso: 24, reps: 10, tiempo: "24:10", segundos: 1450 },
                // Curl de bíceps (4 series @ 14kg - Subida de carga +2kg!)
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 1, peso: 14, reps: 10, tiempo: "27:10", segundos: 1630 },
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 2, peso: 14, reps: 10, tiempo: "29:30", segundos: 1770 },
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 3, peso: 14, reps: 10, tiempo: "31:50", segundos: 1910 },
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 4, peso: 14, reps: 9, tiempo: "34:10", segundos: 2050 }
            ]
        }
    },
    {
        id: "entry-init-0",
        fechaIso: new Date(Date.now() - 86400000 * 4).toISOString(),
        fechaFormato: formatearFechaTimestamp(new Date(Date.now() - 86400000 * 4)),
        categoria: "post-entreno",
        categoriaLabel: "Entrenamiento",
        rutinaRelacionada: "Tirón / Pull (Espalda, Bíceps y Posterior)",
        rpe: 8,
        energia: "moderada",
        texto: "Primera sesión de referencia del ciclo. Calentamiento completo con rampa cardiovascular. Buena congestión en dorsales, adaptando cargas de inicio.",
        porVoz: false,
        metricas: {
            duracionSegundos: 2955, // 49:15
            duracionFormato: "49:15",
            calentamientoSegundos: 390, // 06:30
            calentamientoFormato: "06:30",
            seriesTotales: 10,
            seriesCompletadas: 10,
            rutinaId: "estandar-pull",
            splits: [
                { tipo: "calentamiento_paso", paso: 1, tiempo: "02:15", segundos: 135 },
                { tipo: "calentamiento_paso", paso: 2, tiempo: "04:20", segundos: 260 },
                { tipo: "calentamiento_paso", paso: 3, tiempo: "06:30", segundos: 390 },
                { tipo: "calentamiento_completo", tiempo: "06:30", segundos: 390 },
                // Dominadas (3 series)
                { tipo: "serie", ejercicio: "Dominadas", set: 1, peso: 0, reps: 8, tiempo: "09:50", segundos: 590 },
                { tipo: "serie", ejercicio: "Dominadas", set: 2, peso: 0, reps: 7, tiempo: "12:30", segundos: 750 },
                { tipo: "serie", ejercicio: "Dominadas", set: 3, peso: 0, reps: 6, tiempo: "15:10", segundos: 910 },
                // Remo con mancuerna (3 series @ 22kg)
                { tipo: "serie", ejercicio: "Remo con mancuerna", set: 1, peso: 22, reps: 10, tiempo: "19:20", segundos: 1160 },
                { tipo: "serie", ejercicio: "Remo con mancuerna", set: 2, peso: 22, reps: 10, tiempo: "22:15", segundos: 1335 },
                { tipo: "serie", ejercicio: "Remo con mancuerna", set: 3, peso: 22, reps: 9, tiempo: "25:05", segundos: 1505 },
                // Curl de bíceps (4 series @ 12kg)
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 1, peso: 12, reps: 10, tiempo: "28:30", segundos: 1710 },
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 2, peso: 12, reps: 10, tiempo: "31:10", segundos: 1870 },
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 3, peso: 12, reps: 9, tiempo: "33:45", segundos: 2025 },
                { tipo: "serie", ejercicio: "Curl de bíceps con mancuernas", set: 4, peso: 12, reps: 8, tiempo: "36:20", segundos: 2180 }
            ]
        }
    },
    {
        id: "entry-init-2",
        fechaIso: new Date(Date.now() - 86400000).toISOString(),
        fechaFormato: formatearFechaTimestamp(new Date(Date.now() - 86400000)),
        categoria: "recuperacion",
        categoriaLabel: "Energía / Sueño",
        rutinaRelacionada: null,
        rpe: null,
        energia: "moderada",
        texto: "Descanso activo. Buen descanso nocturno (7.5 horas). Agujetas moderadas en dorsales, hidratación al 100%. Listo para empuje mañana.",
        porVoz: false
    }
];

/**
 * Formatea una fecha a marca de tiempo legible completa
 */
export function formatearFechaTimestamp(dateObj) {
    const d = dateObj instanceof Date ? dateObj : new Date(dateObj);
    const dias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const meses = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
    
    const diaSemana = dias[d.getDay()];
    const diaNum = d.getDate();
    const mes = meses[d.getMonth()];
    const ano = d.getFullYear();
    const horas = String(d.getHours()).padStart(2, "0");
    const minutos = String(d.getMinutes()).padStart(2, "0");

    return `${diaSemana}, ${diaNum} ${mes} ${ano} • ${horas}:${minutos}`;
}

/**
 * Obtiene las entradas guardadas de la bitácora
 */
export function obtenerEntradasBitacora() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(ENTRADAS_DEFAULT));
            return [...ENTRADAS_DEFAULT];
        }
        let parsed = JSON.parse(raw);
        // Si las entradas por defecto no tenían métricas detalladas, enriquecerlas
        if (parsed.length > 0 && parsed.some(p => p.id === "entry-init-1" && !p.metricas?.splits)) {
            parsed = ENTRADAS_DEFAULT;
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        return parsed;
    } catch (e) {
        console.error("Error al leer bitácora de localStorage:", e);
        return [...ENTRADAS_DEFAULT];
    }
}

/**
 * Guarda una nueva entrada en la bitácora (Firestore & LocalStorage)
 */
export async function guardarEntradaBitacora({ texto, categoria = "general", rutinaRelacionada = null, rpe = null, energia = "normal", porVoz = false, metricas = null }) {
    if (!texto || !texto.trim()) return null;

    const entradas = obtenerEntradasBitacora();
    const ahora = new Date();

    const config = CATEGORIA_CONFIG[categoria] || CATEGORIA_CONFIG.general;

    const nuevaEntrada = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fechaIso: ahora.toISOString(),
        fechaFormato: formatearFechaTimestamp(ahora),
        categoria,
        categoriaLabel: config.label,
        rutinaRelacionada,
        rpe: rpe ? parseInt(rpe, 10) : null,
        energia,
        texto: texto.trim(),
        porVoz,
        metricas: metricas || null
    };

    // Guardado en Firestore
    try {
        if (db) {
            const docRef = await addDoc(collection(db, "diario_notas"), {
                idLocal: nuevaEntrada.id,
                fechaIso: nuevaEntrada.fechaIso,
                fechaFormato: nuevaEntrada.fechaFormato,
                categoria: nuevaEntrada.categoria,
                categoriaLabel: nuevaEntrada.categoriaLabel,
                rutinaRelacionada: nuevaEntrada.rutinaRelacionada,
                rpe: nuevaEntrada.rpe,
                energia: nuevaEntrada.energia,
                texto: nuevaEntrada.texto,
                porVoz: nuevaEntrada.porVoz,
                metricas: nuevaEntrada.metricas,
                creadoEn: serverTimestamp ? serverTimestamp() : new Date().toISOString()
            });
            if (docRef && docRef.id) {
                nuevaEntrada.firestoreId = docRef.id;
            }
        }
    } catch (e) {
        console.warn("Aviso al guardar nota en Firestore (se mantiene respaldo local):", e);
    }

    // Añadir al principio (orden cronológico inverso)
    entradas.unshift(nuevaEntrada);

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entradas));
    } catch (e) {
        console.error("Error al guardar en localStorage:", e);
    }

    // Actualizar vista si estamos en la pantalla diario
    renderizarListaBitacora();
    actualizarEstadisticasBitacora();

    return nuevaEntrada;
}

/**
 * Elimina una entrada por su ID (Firestore y LocalStorage tras confirmación)
 */
export async function eliminarEntradaBitacora(id) {
    if (!confirm("¿Deseas eliminar permanentemente esta nota del diario?")) {
        return;
    }

    let entradas = obtenerEntradasBitacora();
    const entradaAEliminar = entradas.find(e => e.id === id);

    // Borrado en Firestore
    try {
        if (db && entradaAEliminar) {
            if (entradaAEliminar.firestoreId) {
                await deleteDoc(doc(db, "diario_notas", entradaAEliminar.firestoreId));
            } else {
                const q = query(collection(db, "diario_notas"), where("idLocal", "==", id));
                const snap = await getDocs(q);
                snap.forEach(async (d) => {
                    await deleteDoc(doc(db, "diario_notas", d.id));
                });
            }
        }
    } catch (err) {
        console.warn("Aviso al eliminar de Firestore:", err);
    }

    // Borrado en localStorage
    entradas = entradas.filter(e => e.id !== id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entradas));
    } catch (e) {
        console.error("Error al eliminar entrada de localStorage:", e);
    }

    // Si la nota en edición era la eliminada, resetear formulario
    if (state.notaEnEdicionId === id) {
        cancelarEdicionNota();
    }

    renderizarListaBitacora();
    actualizarEstadisticasBitacora();
    mostrarNotificacionToast("🗑️ Nota eliminada del Diario");
}

/**
 * Configuración del reconocimiento de voz (Speech Recognition)
 */
export function alternarGrabacionVoz(targetInputId = "input-bitacora-texto", btnId = "btn-dictar-voz") {
    const inputEl = document.getElementById(targetInputId);
    const btnEl = document.getElementById(btnId);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        alert("Tu navegador no soporta transcripción por voz directa de la Web Speech API. Puedes escribir tu nota manualmente.");
        return;
    }

    // Gestión de Estado: Si isRecording es true, detener la escucha
    if (state.isRecording || state.grabandoVoz) {
        detenerGrabacionVoz(btnEl);
        return;
    }

    // Si había alguna instancia huérfana, abortarla limpiamente
    if (state.reconocimientoVoz) {
        try { state.reconocimientoVoz.abort(); } catch(e) {}
        state.reconocimientoVoz = null;
    }

    // Iniciar grabación limpia al hacer clic
    try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        // SOLUCIÓN RADICAL: Desactivar resultados provisionales (interimResults = false)
        // El navegador solo devuelve la frase final limpia evitando el bucle de actualización en vivo
        recognition.interimResults = false;

        state.reconocimientoVoz = recognition;
        state.targetInputVoz = inputEl;
        state.isRecording = true;
        state.grabandoVoz = true;

        // Limpieza de sesión garantizada al iniciar
        state.transcriptAcumulado = "";
        state.ultimoIndiceProcesado = -1;

        // Feedback Visual: clase CSS activa (resplandor neón cian) y texto 'Escuchando...'
        if (btnEl) {
            btnEl.classList.add("recording");
            btnEl.title = "Escuchando... Clic para detener";
            btnEl.innerHTML = `
                <span class="mic-pulse-ring"></span>
                <span id="btn-dictar-voz-label">Escuchando...</span>
            `;
        }

        const textoPrevio = inputEl ? inputEl.value.trim() : "";

        // Extracción directa sin bucles repetitivos sobre resultados pasados ni += descontrolado
        recognition.onresult = (event) => {
            const ultimoIndice = event.results.length - 1;
            if (ultimoIndice < 0 || ultimoIndice <= state.ultimoIndiceProcesado) return;
            state.ultimoIndiceProcesado = ultimoIndice;

            const ultimoResultado = event.results[ultimoIndice];
            if (!ultimoResultado || !ultimoResultado[0]) return;

            const nuevaFrase = ultimoResultado[0].transcript.trim();
            if (!nuevaFrase) return;

            // Acumular de forma controlada en la variable de sesión limpia
            if (state.transcriptAcumulado) {
                state.transcriptAcumulado += " " + nuevaFrase;
            } else {
                state.transcriptAcumulado = nuevaFrase;
            }

            if (inputEl) {
                const prefijo = textoPrevio ? textoPrevio + " " : "";
                inputEl.value = (prefijo + state.transcriptAcumulado).trimStart();
                inputEl.dataset.porVoz = "true";
            }
        };

        recognition.onerror = (event) => {
            console.warn("Error en transcripción por voz:", event.error);
            detenerGrabacionVoz(btnEl);
        };

        // Restablecimiento Automático (onend): si el navegador corta la escucha por silencio prolongado,
        // el botón regresa automáticamente a su estado y estilo inactivo inicial.
        recognition.onend = () => {
            detenerGrabacionVoz(btnEl);
        };

        // Vaciado estricto de variables temporales de sesión antes de arrancar
        state.transcriptAcumulado = "";
        state.ultimoIndiceProcesado = -1;
        recognition.start();

    } catch (err) {
        console.error("Error al iniciar reconocimiento de voz:", err);
        detenerGrabacionVoz(btnEl);
    }
}

function detenerGrabacionVoz(btnEl) {
    if (state.reconocimientoVoz) {
        try { state.reconocimientoVoz.stop(); } catch(e) {}
    }
    state.isRecording = false;
    state.grabandoVoz = false;
    state.reconocimientoVoz = null;
    state.transcriptAcumulado = "";
    state.ultimoIndiceProcesado = -1;

    if (btnEl) {
        btnEl.classList.remove("recording");
        btnEl.title = "Clic para iniciar dictado por voz";
        btnEl.innerHTML = `
            <svg class="mic-svg-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="23"></line>
                <line x1="8" y1="23" x2="16" y2="23"></line>
            </svg>
            <span id="btn-dictar-voz-label">Dictar por voz</span>
        `;
    }
}

/**
 * Renderiza el listado de entradas en la bitácora
 */
export function renderizarListaBitacora() {
    const contenedor = document.getElementById("contenedor-entradas-bitacora");
    if (!contenedor) return;

    const entradas = obtenerEntradasBitacora();
    const filtro = state.filtroActual;

    const filtradas = entradas.filter(entry => {
        if (filtro === "todos") return true;
        return entry.categoria === filtro;
    });

    const summaryEl = document.getElementById("timeline-summary-count");
    if (summaryEl) {
        summaryEl.textContent = `${filtradas.length} ${filtradas.length === 1 ? 'nota' : 'notas'}`;
    }

    if (filtradas.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-bitacora-card card-carbon animate-fade-in">
                <span class="empty-icon">
                    <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="#38bdf8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                </span>
                <h4>Sin notas registradas en este filtro</h4>
                <p>Escribe tu primera reflexión o dicta por voz lo que sientes hoy para que la IA supervise tu progreso.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = filtradas.map(e => {
        const catIcon = CATEGORIA_ICONS[e.categoria] || CATEGORIA_ICONS.general;
        const catConfig = CATEGORIA_CONFIG[e.categoria] || CATEGORIA_CONFIG.general;
        const badgeCategoria = `
            <span class="entry-category-badge badge-${e.categoria}">
                ${catIcon}
                <span>${catConfig.label}</span>
            </span>
        `;

        const badgeVoz = e.porVoz ? `
            <span class="badge-voice">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
                <span>Por voz</span>
            </span>
        ` : "";

        const badgeRutina = e.rutinaRelacionada ? `
            <span class="badge-routine-tag">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 5v14M18 5v14M2 9v6M22 9v6M6 12h12M4 7v10M20 7v10"></path></svg>
                <span>${e.rutinaRelacionada}</span>
            </span>
        ` : "";

        const badgeRpe = e.rpe ? `<span class="badge-rpe">RPE ${e.rpe}/10</span>` : "";

        const metricasHtml = e.metricas ? `
        <div class="entry-metrics-pills">
            <span class="metric-pill pill-duration">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>${e.metricas.duracionFormato || '00:00'}</span>
            </span>
            ${e.metricas.calentamientoFormato ? `
            <span class="metric-pill pill-warmup">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"></path></svg>
                <span>Calentamiento: ${e.metricas.calentamientoFormato}</span>
            </span>` : ''}
            <span class="metric-pill pill-sets">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span>Series: ${e.metricas.seriesCompletadas || 0}/${e.metricas.seriesTotales || 0}</span>
            </span>
            ${e.metricas.splits && e.metricas.splits.length ? `
            <span class="metric-pill pill-splits">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                <span>${e.metricas.splits.length} marcas</span>
            </span>` : ''}
        </div>
        ` : '';

        const botonDesgloseHtml = (e.metricas) ? `
        <div class="entry-actions-row">
            <button type="button" class="btn-toggle-progreso" onclick="window.diario?.toggleDesgloseProgreso('${e.id}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                <span id="label-toggle-${e.id}">Ver Desglose de Tiempos y Progreso ▼</span>
            </button>
        </div>
        <div id="desglose-box-${e.id}" class="desglose-progreso-box" style="display: none;"></div>
        ` : '';

        return `
        <div class="bitacora-entry-card card-carbon animate-fade-in" id="entry-${e.id}">
            <div class="entry-header">
                <div class="entry-meta-left">
                    ${badgeCategoria}
                    ${badgeRutina}
                    ${badgeRpe}
                    ${badgeVoz}
                </div>
                <div class="entry-meta-right">
                    <span class="entry-timestamp">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span>${e.fechaFormato}</span>
                    </span>
                    <div class="entry-actions-group" style="display: inline-flex; align-items: center; gap: 4px;">
                        <button class="btn-edit-entry" title="Editar nota" onclick="window.diario?.iniciarEdicionNota('${e.id}')">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>
                        </button>
                        <button class="btn-delete-entry" title="Eliminar nota" onclick="window.diario?.eliminarNota('${e.id}')">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </button>
                    </div>
                </div>
            </div>

            <div class="entry-body">
                ${metricasHtml}
                <p class="entry-text">${e.texto}</p>
                ${botonDesgloseHtml}
            </div>
        </div>
        `;
    }).join("");
}

/**
 * Actualiza las estadísticas resumidas y contadores de la botonera de filtros
 */
function actualizarEstadisticasBitacora() {
    const entradas = obtenerEntradasBitacora();

    const counts = {
        todos: entradas.length,
        general: entradas.filter(e => e.categoria === "general").length,
        recuperacion: entradas.filter(e => e.categoria === "recuperacion").length,
        "post-entreno": entradas.filter(e => e.categoria === "post-entreno").length,
        molestia: entradas.filter(e => e.categoria === "molestia").length,
        nutricion: entradas.filter(e => e.categoria === "nutricion").length
    };

    Object.entries(counts).forEach(([cat, count]) => {
        const el = document.getElementById(`filter-count-${cat}`);
        if (el) el.textContent = count;
    });

    const summaryEl = document.getElementById("timeline-summary-count");
    if (summaryEl) {
        const cant = state.filtroActual === "todos" 
            ? entradas.length 
            : entradas.filter(e => e.categoria === state.filtroActual).length;
        summaryEl.textContent = `${cant} ${cant === 1 ? 'nota' : 'notas'}`;
    }
}

/**
 * Cambia el filtro de visualización en la bitácora
 */
export function setFiltroBitacora(filtro) {
    state.filtroActual = filtro;
    document.querySelectorAll(".bitacora-pill-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.filtro === filtro);
    });
    renderizarListaBitacora();
    actualizarEstadisticasBitacora();
}

/**
 * Control del Dropdown Custom de Categorías
 */
export function alternarDropdownCategoria(forceOpen = null) {
    const container = document.getElementById("dropdown-categoria-container");
    const trigger = document.getElementById("dropdown-categoria-trigger");
    if (!container) return;

    const isOpen = forceOpen !== null ? forceOpen : !container.classList.contains("open");
    container.classList.toggle("open", isOpen);
    if (trigger) trigger.setAttribute("aria-expanded", String(isOpen));
}

export function seleccionarCategoriaDropdown(cat) {
    const hiddenInput = document.getElementById("select-bitacora-categoria");
    const triggerIcon = document.getElementById("dropdown-trigger-icon");
    const triggerLabel = document.getElementById("dropdown-trigger-label");
    const menu = document.getElementById("dropdown-categoria-menu");

    if (hiddenInput) {
        hiddenInput.value = cat;
        hiddenInput.dispatchEvent(new Event("change"));
    }

    const config = CATEGORIA_CONFIG[cat] || CATEGORIA_CONFIG.general;
    const iconSvg = CATEGORIA_ICONS[cat] || CATEGORIA_ICONS.general;

    if (triggerIcon) triggerIcon.innerHTML = iconSvg;
    if (triggerLabel) triggerLabel.textContent = config.labelLarga || config.label;

    if (menu) {
        menu.querySelectorAll(".custom-dropdown-item").forEach(item => {
            const isSel = item.dataset.value === cat;
            item.classList.toggle("selected", isSel);
            item.setAttribute("aria-selected", String(isSel));
        });
    }

    actualizarVisibilidadRpe(cat);
    alternarDropdownCategoria(false);
}

/**
 * Muestra u oculta la escala RPE según la categoría:
 * Visible solo para entrenamiento ('post-entreno') o notas libres ('general').
 * Oculta para 'recuperacion' (Energía/Sueño), 'nutricion', etc.
 */
export function actualizarVisibilidadRpe(cat) {
    const rpeSection = document.querySelector(".rpe-cylinder-section");
    if (!rpeSection) return;
    const categoriasConRpe = ["general", "post-entreno"];
    rpeSection.style.display = categoriasConRpe.includes(cat) ? "block" : "none";
}

/**
 * Alterna el cuerpo desplegable (acordeón) de Añadir Nota al Diario
 */
export function alternarFormularioNota(forzarEstado = null) {
    const card = document.getElementById("bitacora-composer-card");
    const toggleBtn = document.getElementById("btn-toggle-composer");
    const body = document.getElementById("composer-collapsible-body");
    if (!card || !body) return;

    const estaAbierto = card.classList.contains("open");
    const nuevoEstado = forzarEstado !== null ? !!forzarEstado : !estaAbierto;

    card.classList.toggle("open", nuevoEstado);
    if (toggleBtn) {
        toggleBtn.setAttribute("aria-expanded", String(nuevoEstado));
        toggleBtn.classList.toggle("active", nuevoEstado);
    }

    if (nuevoEstado) {
        const inputTexto = document.getElementById("input-bitacora-texto");
        if (inputTexto) {
            setTimeout(() => inputTexto.focus(), 120);
        }
    }
}

/**
 * Vuelca el contenido de una nota al formulario superior en modo edición
 */
export function iniciarEdicionNota(id) {
    const entradas = obtenerEntradasBitacora();
    const entrada = entradas.find(e => e.id === id);
    if (!entrada) return;

    state.notaEnEdicionId = id;

    const inputTexto = document.getElementById("input-bitacora-texto");
    const btnGuardarLabel = document.getElementById("btn-guardar-nota-label");
    const btnCancelar = document.getElementById("btn-cancelar-edicion");

    if (inputTexto) {
        inputTexto.value = entrada.texto || "";
    }

    seleccionarCategoriaDropdown(entrada.categoria || "general");

    if (entrada.rpe) {
        setRpeCylinderValue(entrada.rpe);
    }

    if (btnGuardarLabel) {
        btnGuardarLabel.textContent = "Actualizar Nota";
    }
    if (btnCancelar) {
        btnCancelar.style.display = "inline-flex";
    }

    // Desplegar el formulario si está contraído
    alternarFormularioNota(true);

    const card = document.getElementById("bitacora-composer-card");
    if (card) {
        card.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    mostrarNotificacionToast("✏️ Editando nota en el formulario superior");
}

/**
 * Cancela el modo de edición y resetea el formulario
 */
export function cancelarEdicionNota() {
    state.notaEnEdicionId = null;
    const inputTexto = document.getElementById("input-bitacora-texto");
    const btnGuardarLabel = document.getElementById("btn-guardar-nota-label");
    const btnCancelar = document.getElementById("btn-cancelar-edicion");

    if (inputTexto) {
        inputTexto.value = "";
        inputTexto.dataset.porVoz = "false";
    }
    if (btnGuardarLabel) {
        btnGuardarLabel.textContent = "Guardar en Diario";
    }
    if (btnCancelar) {
        btnCancelar.style.display = "none";
    }
    seleccionarCategoriaDropdown("general");
    setRpeCylinderValue(8);
}

/**
 * Procesa el envío del formulario de nueva nota o actualización de una existente
 */
export async function registrarNotaManual() {
    const inputTexto = document.getElementById("input-bitacora-texto");
    const selectCategoria = document.getElementById("select-bitacora-categoria");
    const inputRpe = document.getElementById("input-bitacora-rpe");
    const btnGuardar = document.getElementById("btn-guardar-nota");

    if (!inputTexto || !inputTexto.value.trim()) {
        alert("Por favor escribe o dicta alguna nota antes de guardar.");
        return;
    }

    const texto = inputTexto.value.trim();
    const categoria = selectCategoria ? selectCategoria.value : "general";
    const categoriasConRpe = ["general", "post-entreno"];
    const rpe = (categoriasConRpe.includes(categoria) && inputRpe && inputRpe.value) 
        ? parseInt(inputRpe.value, 10) 
        : null;
    const porVoz = inputTexto.dataset.porVoz === "true";

    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.style.opacity = "0.7";
    }

    try {
        if (state.notaEnEdicionId) {
            // ================= MODO EDICIÓN =================
            const entradas = obtenerEntradasBitacora();
            const idx = entradas.findIndex(e => e.id === state.notaEnEdicionId);
            if (idx !== -1) {
                const config = CATEGORIA_CONFIG[categoria] || CATEGORIA_CONFIG.general;
                const entrada = entradas[idx];
                entrada.texto = texto;
                entrada.categoria = categoria;
                entrada.categoriaLabel = config.label;
                entrada.rpe = rpe;
                entrada.fechaModificado = new Date().toISOString();

                // Actualizar en Firestore si está conectado
                try {
                    if (db) {
                        if (entrada.firestoreId) {
                            await updateDoc(doc(db, "diario_notas", entrada.firestoreId), {
                                texto,
                                categoria,
                                categoriaLabel: config.label,
                                rpe,
                                fechaModificado: serverTimestamp ? serverTimestamp() : new Date().toISOString()
                            });
                        } else {
                            const q = query(collection(db, "diario_notas"), where("idLocal", "==", entrada.id));
                            const snap = await getDocs(q);
                            snap.forEach(async (d) => {
                                await updateDoc(doc(db, "diario_notas", d.id), {
                                    texto,
                                    categoria,
                                    categoriaLabel: config.label,
                                    rpe,
                                    fechaModificado: serverTimestamp ? serverTimestamp() : new Date().toISOString()
                                });
                            });
                        }
                    }
                } catch (err) {
                    console.warn("Aviso al actualizar en Firestore:", err);
                }

                // Guardar en localStorage
                localStorage.setItem(STORAGE_KEY, JSON.stringify(entradas));
                renderizarListaBitacora();
                actualizarEstadisticasBitacora();

                cancelarEdicionNota();
                alternarFormularioNota(false);
                mostrarNotificacionToast("✅ Nota actualizada con éxito");
            }
        } else {
            // ================= MODO CREACIÓN =================
            const resultado = await guardarEntradaBitacora({
                texto,
                categoria,
                rpe,
                porVoz
            });

            if (resultado) {
                inputTexto.value = "";
                inputTexto.dataset.porVoz = "false";
                setRpeCylinderValue(8);
                seleccionarCategoriaDropdown("general");

                alternarFormularioNota(false);
                mostrarNotificacionToast("✅ Nota guardada en el Diario");
            }
        }
    } catch (err) {
        console.error("Error al registrar nota:", err);
        mostrarNotificacionToast("⚠️ Error al registrar nota en el Diario");
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.style.opacity = "1";
        }
    }
}

function mostrarNotificacionToast(mensaje) {
    const toast = document.createElement("div");
    toast.className = "toast-notification toast-success";
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Inicialización del módulo
export function initDiario() {
    renderizarListaBitacora();
    actualizarEstadisticasBitacora();
    initRpeCylinder(8);

    // Listener para visibilidad condicional de RPE al cambiar categoría
    const selectCat = document.getElementById("select-bitacora-categoria");
    if (selectCat && !selectCat._hasRpeListener) {
        selectCat.addEventListener("change", (e) => actualizarVisibilidadRpe(e.target.value));
        selectCat._hasRpeListener = true;
    }
    actualizarVisibilidadRpe(selectCat ? selectCat.value : "general");

    // Event listener en el botón del lápiz para alternar acordeón
    const btnToggle = document.getElementById("btn-toggle-composer");
    if (btnToggle && !btnToggle._hasToggleListener) {
        btnToggle.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            alternarFormularioNota();
        });
        btnToggle._hasToggleListener = true;
    }

    const titleClickable = document.getElementById("composer-title-clickable");
    if (titleClickable && !titleClickable._hasToggleListener) {
        titleClickable.addEventListener("click", () => alternarFormularioNota());
        titleClickable._hasToggleListener = true;
    }

    // Registrar listeners para cerrar dropdown al pulsar fuera o Escape
    if (!window._diarioDropdownListenerRegistered) {
        document.addEventListener("click", (e) => {
            const container = document.getElementById("dropdown-categoria-container");
            if (container && container.classList.contains("open") && !container.contains(e.target)) {
                alternarDropdownCategoria(false);
            }
        });
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                alternarDropdownCategoria(false);
            }
        });
        window._diarioDropdownListenerRegistered = true;
    }
}

export function cleanupDiario() {
    if (state.grabandoVoz) {
        detenerGrabacionVoz(document.getElementById("btn-dictar-voz"));
    }
}

/**
 * Inicializa el selector cilíndrico táctil horizontal de RPE (0 al 10)
 */
export function initRpeCylinder(valorInicial = 8) {
    const container = document.getElementById("rpe-cylinder-scroll");
    const badge = document.getElementById("rpe-cylinder-badge");
    const hiddenInput = document.getElementById("input-bitacora-rpe");
    if (!container) return;

    let isScrolling = false;

    const actualizarSeleccionCentro = () => {
        const containerRect = container.getBoundingClientRect();
        const centerLine = containerRect.left + containerRect.width / 2;

        let closestItem = null;
        let minDiff = Infinity;

        const items = container.querySelectorAll(".rpe-cylinder-item");
        items.forEach(item => {
            const itemRect = item.getBoundingClientRect();
            const itemCenter = itemRect.left + itemRect.width / 2;
            const diff = Math.abs(centerLine - itemCenter);
            if (diff < minDiff) {
                minDiff = diff;
                closestItem = item;
            }
        });

        if (closestItem) {
            const val = closestItem.getAttribute("data-val");
            items.forEach(it => it.classList.toggle("active", it === closestItem));
            if (hiddenInput) hiddenInput.value = val;
            if (badge) badge.textContent = `RPE ${val}`;
            container.setAttribute("aria-valuenow", val);
        }
    };

    container.addEventListener("scroll", () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                actualizarSeleccionCentro();
                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

    // Clicks en números para centrado táctil suave
    const items = container.querySelectorAll(".rpe-cylinder-item");
    items.forEach(item => {
        item.addEventListener("click", () => {
            item.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
            const val = item.getAttribute("data-val");
            items.forEach(it => it.classList.toggle("active", it === item));
            if (hiddenInput) hiddenInput.value = val;
            if (badge) badge.textContent = `RPE ${val}`;
            container.setAttribute("aria-valuenow", val);
        });
    });

    // Soporte para teclado (Flechas Izquierda / Derecha)
    container.addEventListener("keydown", (e) => {
        const currentVal = parseInt(hiddenInput ? hiddenInput.value : "8", 10);
        if (e.key === "ArrowLeft" && currentVal > 0) {
            e.preventDefault();
            setRpeCylinderValue(currentVal - 1);
        } else if (e.key === "ArrowRight" && currentVal < 10) {
            e.preventDefault();
            setRpeCylinderValue(currentVal + 1);
        }
    });

    // Centrar en el valor inicial tras render
    setTimeout(() => {
        setRpeCylinderValue(valorInicial);
    }, 60);
}

/**
 * Centra y activa un valor concreto en la rueda cilíndrica de RPE
 */
export function setRpeCylinderValue(val) {
    const container = document.getElementById("rpe-cylinder-scroll");
    const badge = document.getElementById("rpe-cylinder-badge");
    const hiddenInput = document.getElementById("input-bitacora-rpe");
    if (!container) return;

    const targetItem = container.querySelector(`.rpe-cylinder-item[data-val="${val}"]`);
    if (targetItem) {
        targetItem.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
        container.querySelectorAll(".rpe-cylinder-item").forEach(it => it.classList.toggle("active", it === targetItem));
        if (hiddenInput) hiddenInput.value = String(val);
        if (badge) badge.textContent = `RPE ${val}`;
        container.setAttribute("aria-valuenow", String(val));
    }
}

/**
 * Alterna el visor de desglose de actividades y comparativa de progreso
 */
export function toggleDesgloseProgreso(entradaId) {
    const box = document.getElementById(`desglose-box-${entradaId}`);
    const label = document.getElementById(`label-toggle-${entradaId}`);
    if (!box) return;

    if (box.style.display !== "none") {
        box.style.display = "none";
        if (label) label.textContent = "Ver Desglose de Tiempos y Progreso ▼";
    } else {
        box.innerHTML = generarHtmlDesgloseEntrada(entradaId);
        box.style.display = "block";
        if (label) label.textContent = "Ocultar Desglose ▲";
    }
}

// Exportar funciones globalmente para eventos en HTML
window.diario = {
    alternarGrabacionVoz,
    alternarFormularioNota,
    registrarNotaManual,
    eliminarNota: eliminarEntradaBitacora,
    iniciarEdicionNota,
    cancelarEdicionNota,
    actualizarVisibilidadRpe,
    setFiltro: setFiltroBitacora,
    guardarEntrada: guardarEntradaBitacora,
    obtenerEntradas: obtenerEntradasBitacora,
    toggleDesgloseProgreso,
    initRpeCylinder,
    setRpeCylinderValue,
    alternarDropdownCategoria,
    seleccionarCategoriaDropdown
};


// ========================================================
// MÓDULO: DIARIO DE ENTRENAMIENTO & DIARIO DE NOTAS
// Soporte para transcripción por voz (Web Speech API),
// marcas de tiempo automáticas, registro de notas,
// desglose de tiempos por actividad y comparativa de progreso.
// ========================================================
import { generarHtmlDesgloseEntrada } from "./progreso-manager.js";

const STORAGE_KEY = "fitness_bitacora_entries";

// Estado interno del diario
const state = {
    filtroActual: "todos",
    grabandoVoz: false,
    reconocimientoVoz: null,
    targetInputVoz: null
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
        categoriaLabel: "🏋️ Post-Entreno",
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
        categoriaLabel: "🏋️ Post-Entreno",
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
        categoriaLabel: "⚡ Recuperación & Sueño",
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
 * Guarda una nueva entrada en la bitácora
 */
export function guardarEntradaBitacora({ texto, categoria = "general", rutinaRelacionada = null, rpe = null, energia = "normal", porVoz = false, metricas = null }) {
    if (!texto || !texto.trim()) return null;

    const entradas = obtenerEntradasBitacora();
    const ahora = new Date();

    const categoriaLabels = {
        "post-entreno": "🏋️ Post-Entreno",
        "general": "📝 Nota Libre",
        "recuperacion": "⚡ Recuperación & Energía",
        "molestia": "🚨 Alerta / Molestia",
        "nutricion": "🥗 Nutrición & Digestión"
    };

    const nuevaEntrada = {
        id: `entry-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fechaIso: ahora.toISOString(),
        fechaFormato: formatearFechaTimestamp(ahora),
        categoria,
        categoriaLabel: categoriaLabels[categoria] || "📝 Diario",
        rutinaRelacionada,
        rpe: rpe ? parseInt(rpe, 10) : null,
        energia,
        texto: texto.trim(),
        porVoz,
        metricas: metricas || null
    };

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
 * Elimina una entrada por su ID
 */
export function eliminarEntradaBitacora(id) {
    let entradas = obtenerEntradasBitacora();
    entradas = entradas.filter(e => e.id !== id);
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entradas));
    } catch (e) {
        console.error("Error al eliminar entrada:", e);
    }
    renderizarListaBitacora();
    actualizarEstadisticasBitacora();
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

    if (state.grabandoVoz) {
        // Detener grabación
        detenerGrabacionVoz(btnEl);
        return;
    }

    // Iniciar grabación
    try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;

        state.reconocimientoVoz = recognition;
        state.targetInputVoz = inputEl;
        state.grabandoVoz = true;

        if (btnEl) {
            btnEl.classList.add("recording");
            btnEl.innerHTML = `<span class="mic-pulse-ring"></span><span>🔴 Escuchando... Pulsa para parar</span>`;
        }

        const textoPrevio = inputEl ? inputEl.value : "";
        let transcripcionFinal = "";

        recognition.onresult = (event) => {
            let interimTranscript = "";
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    transcripcionFinal += event.results[i][0].transcript + " ";
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (inputEl) {
                const esp = textoPrevio && !textoPrevio.endsWith(" ") ? " " : "";
                inputEl.value = (textoPrevio + esp + transcripcionFinal + interimTranscript).trimStart();
                inputEl.dataset.porVoz = "true";
            }
        };

        recognition.onerror = (event) => {
            console.warn("Error en transcripción por voz:", event.error);
            detenerGrabacionVoz(btnEl);
        };

        recognition.onend = () => {
            detenerGrabacionVoz(btnEl);
        };

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
    state.grabandoVoz = false;
    state.reconocimientoVoz = null;

    if (btnEl) {
        btnEl.classList.remove("recording");
        btnEl.innerHTML = `<span>🎙️ Dictar por voz</span>`;
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
        if (filtro === "post-entreno") return entry.categoria === "post-entreno";
        if (filtro === "voz") return entry.porVoz === true;
        if (filtro === "molestia") return entry.categoria === "molestia";
        return true;
    });

    if (filtradas.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-bitacora-card card-carbon animate-fade-in">
                <span class="empty-icon">📖</span>
                <h4>Sin notas registradas en esta vista</h4>
                <p>Escribe tu primera reflexión o dicta por voz lo que sientes hoy para que la IA supervise tu progreso.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = filtradas.map(e => {
        const badgeVoz = e.porVoz ? `<span class="badge-voice">🎙️ Dictado por voz</span>` : "";
        const badgeRutina = e.rutinaRelacionada ? `<span class="badge-routine-tag">🏋️ ${e.rutinaRelacionada}</span>` : "";
        const badgeRpe = e.rpe ? `<span class="badge-rpe">RPE ${e.rpe}/10</span>` : "";

        const metricasHtml = e.metricas ? `
        <div class="entry-metrics-pills">
            <span class="metric-pill pill-duration">⏱️ ${e.metricas.duracionFormato || '00:00'}</span>
            ${e.metricas.calentamientoFormato ? `<span class="metric-pill pill-warmup">🔥 Calentamiento: ${e.metricas.calentamientoFormato}</span>` : ''}
            <span class="metric-pill pill-sets">📊 Series: ${e.metricas.seriesCompletadas || 0}/${e.metricas.seriesTotales || 0}</span>
            ${e.metricas.splits && e.metricas.splits.length ? `<span class="metric-pill pill-splits">⚡ ${e.metricas.splits.length} marcas</span>` : ''}
        </div>
        ` : '';

        const botonDesgloseHtml = (e.metricas) ? `
        <div class="entry-actions-row">
            <button type="button" class="btn-toggle-progreso" onclick="window.diario?.toggleDesgloseProgreso('${e.id}')">
                <span class="btn-icon">📊</span>
                <span id="label-toggle-${e.id}">Ver Desglose de Tiempos y Progreso ▼</span>
            </button>
        </div>
        <div id="desglose-box-${e.id}" class="desglose-progreso-box" style="display: none;"></div>
        ` : '';

        return `
        <div class="bitacora-entry-card card-carbon animate-fade-in" id="entry-${e.id}">
            <div class="entry-header">
                <div class="entry-meta-left">
                    <span class="entry-category-badge badge-${e.categoria}">${e.categoriaLabel}</span>
                    ${badgeRutina}
                    ${badgeRpe}
                    ${badgeVoz}
                </div>
                <div class="entry-meta-right">
                    <span class="entry-timestamp">🕒 ${e.fechaFormato}</span>
                    <button class="btn-delete-entry" title="Eliminar nota" onclick="window.diario?.eliminarNota('${e.id}')">✕</button>
                </div>
            </div>

            <div class="entry-body">
                ${metricasHtml}
                <p class="entry-text">${e.texto}</p>
                ${botonDesgloseHtml}
            </div>

            <div class="entry-footer-ai">
                <span class="ai-sparkle">🤖</span>
                <span class="ai-learning-hint">Métricas y notas supervisadas para optimizar tus futuros calentamientos y progresiones.</span>
            </div>
        </div>
        `;
    }).join("");
}

/**
 * Actualiza las estadísticas resumidas de la bitácora
 */
function actualizarEstadisticasBitacora() {
    const totalEl = document.getElementById("stat-total-entradas");
    const postEntrenoEl = document.getElementById("stat-post-entreno");
    const vozEl = document.getElementById("stat-por-voz");

    const entradas = obtenerEntradasBitacora();

    if (totalEl) totalEl.textContent = entradas.length;
    if (postEntrenoEl) postEntrenoEl.textContent = entradas.filter(e => e.categoria === "post-entreno").length;
    if (vozEl) vozEl.textContent = entradas.filter(e => e.porVoz).length;
}

/**
 * Cambia el filtro de visualización en la bitácora
 */
export function setFiltroBitacora(filtro) {
    state.filtroActual = filtro;
    document.querySelectorAll(".bitacora-filter-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.filtro === filtro);
    });
    renderizarListaBitacora();
}

/**
 * Procesa el envío del formulario de nueva nota
 */
export function registrarNotaManual() {
    const inputTexto = document.getElementById("input-bitacora-texto");
    const selectCategoria = document.getElementById("select-bitacora-categoria");
    const inputRpe = document.getElementById("input-bitacora-rpe");

    if (!inputTexto || !inputTexto.value.trim()) {
        alert("Por favor escribe o dicta alguna nota antes de guardar.");
        return;
    }

    const texto = inputTexto.value;
    const categoria = selectCategoria ? selectCategoria.value : "general";
    const rpe = inputRpe && inputRpe.value ? inputRpe.value : null;
    const porVoz = inputTexto.dataset.porVoz === "true";

    guardarEntradaBitacora({
        texto,
        categoria,
        rpe,
        porVoz
    });

    // Limpiar formulario
    inputTexto.value = "";
    inputTexto.dataset.porVoz = "false";
    if (inputRpe) inputRpe.value = "";

    // Mensaje de confirmación
    mostrarNotificacionToast("✅ Nota registrada en el Diario de Notas");
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
}

export function cleanupDiario() {
    if (state.grabandoVoz) {
        detenerGrabacionVoz(document.getElementById("btn-dictar-voz"));
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
    registrarNotaManual,
    eliminarNota: eliminarEntradaBitacora,
    setFiltro: setFiltroBitacora,
    guardarEntrada: guardarEntradaBitacora,
    obtenerEntradas: obtenerEntradasBitacora,
    toggleDesgloseProgreso
};

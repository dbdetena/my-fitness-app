// ========================================================
// MÓDULO: DIARIO DE ENTRENAMIENTO & CUADERNO DE BITÁCORA
// Soporte para transcripción por voz (Web Speech API),
// marcas de tiempo automáticas y registro de notas
// ========================================================

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
        rutinaRelacionada: "Tirón & Espalda (Pull)",
        rpe: 8,
        energia: "alta",
        texto: "Sensaciones increíbles en dominadas pronas. Subí a 8 reps limpias con parada en la cima. Ligera tensión en el antebrazo derecho al terminar, la IA debería sugerir más estiramientos de flexores en el próximo calentamiento.",
        porVoz: true
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
        return JSON.parse(raw);
    } catch (e) {
        console.error("Error al leer bitácora de localStorage:", e);
        return [...ENTRADAS_DEFAULT];
    }
}

/**
 * Guarda una nueva entrada en la bitácora
 */
export function guardarEntradaBitacora({ texto, categoria = "general", rutinaRelacionada = null, rpe = null, energia = "normal", porVoz = false }) {
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
        categoriaLabel: categoriaLabels[categoria] || "📝 Bitácora",
        rutinaRelacionada,
        rpe: rpe ? parseInt(rpe, 10) : null,
        energia,
        texto: texto.trim(),
        porVoz
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
                <p class="entry-text">${e.texto}</p>
            </div>

            <div class="entry-footer-ai">
                <span class="ai-sparkle">🤖</span>
                <span class="ai-learning-hint">Registrado para supervisión de calentamiento y progresiones de la IA.</span>
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
    mostrarNotificacionToast("✅ Nota registrada en la bitácora con éxito");
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

// Exportar funciones globalmente para eventos en HTML
window.diario = {
    alternarGrabacionVoz,
    registrarNotaManual,
    eliminarNota: eliminarEntradaBitacora,
    setFiltro: setFiltroBitacora,
    guardarEntrada: guardarEntradaBitacora,
    obtenerEntradas: obtenerEntradasBitacora
};

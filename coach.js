// ========================================================
// MÓDULO: AI COACH DE RENDIMIENTO (MULTI-PROVEEDOR & FIRESTORE)
// Arquitectura de Memoria Persistente (coach_memory),
// Cliente IA Multi-Proveedor con Streaming SSE y Cancelación,
// Interacción por Voz (SpeechRecognition Toggle & TTS),
// y Visualización de Gráficas Biomecánicas (Chart.js).
// ========================================================
import { db } from "./firebase-config.js";
import {
    doc,
    getDoc,
    setDoc,
    deleteDoc,
    collection,
    getDocs,
    query,
    orderBy,
    limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { obtenerEntradasBitacora } from "./diario.js";
import { obtenerSesionActiva } from "./session-manager.js";
import { BASE_EJERCICIOS } from "./ejercicios-data.js";
import {
    guardarRutinaPersonalizada,
    obtenerRutinasPersonalizadas
} from "./rutinas-data.js";
import {
    AI_PROVIDERS,
    getProviderMeta,
    getAIConfig,
    saveAIConfig,
    saveProviderApiKey,
    getProviderApiKey,
    hasStoredKeySync,
    streamAICompletion,
    testAIConnection,
    cifrarApiKey,
    descifrarApiKey
} from "./ai-providers.js";

// Re-exportaciones de retrocompatibilidad
export { cifrarApiKey, descifrarApiKey };

const STORAGE_KEY_MEMORY = "fitness_coach_memory";
const STORAGE_KEY_VOICE = "fitness_coach_voice_enabled";
const STORAGE_KEY_CONVERSATIONS = "fitness_coach_conversations_v1";
const STORAGE_KEY_ACTIVE_CONV_ID = "fitness_coach_active_conv_id_v1";
const FIRESTORE_CONV_COLLECTION = "coach_conversaciones";
const MAX_CONVERSACIONES_LOCAL = 40;
const MAX_MENSAJES_POR_CONVERSACION = 80;
const FIRESTORE_TIMEOUT_MS = 2000;
const CONTEXT_CACHE_TTL_MS = 60000;

/**
 * Envuelve una promesa con un límite de tiempo estricto para evitar bloqueos en red móvil.
 */
function conTimeout(promesa, ms = FIRESTORE_TIMEOUT_MS, valorFallback = null) {
    let timerId;
    const timeoutPromesa = new Promise((resolve) => {
        timerId = setTimeout(() => resolve(valorFallback), ms);
    });
    return Promise.race([
        promesa.catch(() => valorFallback),
        timeoutPromesa
    ]).finally(() => clearTimeout(timerId));
}

export async function guardarApiKeyCifrada(apiKeyPlana, providerId = null) {
    const id = providerId || getAIConfig().providerId;
    await saveProviderApiKey(id, apiKeyPlana);
}

export async function obtenerApiKeyLocal(providerId = null) {
    const id = providerId || getAIConfig().providerId;
    return getProviderApiKey(id);
}

// Memoria base inicial por defecto si aún no existe en Firestore
const MEMORIA_BASE_DEFAULT = {
    objetivoActual: "Hipertrofia y desarrollo de fuerza funcional",
    focoBiomecanico: "Sobrecarga progresiva controlada, parada isométrica y control excéntrico",
    lesionesOMolestias: ["Molestia previa leve en hombro derecho (controlada con calentamiento)"],
    nivelUsuario: "Intermedio / Avanzado",
    resumenProgreso: "Buen progreso en tracciones (Dominadas pronas a 8 reps, remo con mancuernas a 24kg) con RPE medio en torno a 8.",
    metricasClave: {
        rpeMedioHistorico: 8.0,
        rutinaHabitual: "Tirón / Pull y Empuje",
        adherenciaCalentamiento: "100%"
    },
    notasCoach: "Vigilar fatiga acumulada si el RPE supera 8.5 en series consecutivas. Priorizar descansos de 2 a 3 minutos.",
    ultimaActualizacion: new Date().toISOString()
};

// Estado del módulo Coach
const state = {
    vozActivada: localStorage.getItem(STORAGE_KEY_VOICE) !== "false",
    memoriaActual: null,
    historialConversacion: [],
    conversaciones: [],
    conversacionActivaId: null,
    isRecording: false,
    grabandoPtt: false,
    reconocimientoVoz: null,
    transcriptAcumulado: "",
    ultimoIndiceAudioProcesado: -1,
    chartInstance: null,
    chartTipoActual: "rpe",
    enGeneracion: false,
    abortController: null,
    biometricCache: null,
    biometricCacheTimestamp: 0
};

// ========================================================
// 1. ARQUITECTURA DE MEMORIA PERSISTENTE (LOCAL-FIRST + FIRESTORE)
// ========================================================

/**
 * Sincroniza coach_memory con Firestore en segundo plano sin bloquear el chat.
 */
async function sincronizarMemoriaFirestoreBg() {
    try {
        const docRef = doc(db, "configuracion", "coach_memory");
        const docSnap = await conTimeout(getDoc(docRef), FIRESTORE_TIMEOUT_MS, null);
        if (docSnap && docSnap.exists()) {
            const data = docSnap.data();
            state.memoriaActual = data;
            localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(data));
            actualizarIndicadorMemoria(true, "Firestore Sincronizada");
            return data;
        }
    } catch (err) {
        console.warn("Aviso al sincronizar coach_memory:", err);
    }
    return null;
}

/**
 * Obtiene 'coach_memory' de forma instantánea (Local-First) y refresca desde Firestore en segundo plano.
 */
export async function obtenerMemoriaCoach() {
    if (state.memoriaActual) return state.memoriaActual;

    // 1. Lectura local inmediata (0 ms) para evitar esperas en el chat
    try {
        const local = localStorage.getItem(STORAGE_KEY_MEMORY);
        if (local) {
            state.memoriaActual = JSON.parse(local);
            actualizarIndicadorMemoria(false, "Memoria Local");
            // Refresco silencioso en segundo plano sin bloquear la respuesta
            sincronizarMemoriaFirestoreBg();
            return state.memoriaActual;
        }
    } catch (_) {}

    // 2. Si no había copia local, intentar Firestore con timeout rápido
    const remota = await sincronizarMemoriaFirestoreBg();
    if (remota) return remota;

    // 3. Inicializar con memoria base y persistir
    state.memoriaActual = { ...MEMORIA_BASE_DEFAULT };
    await guardarMemoriaCoach(state.memoriaActual);
    return state.memoriaActual;
}

/**
 * Sobrescribe 'coach_memory' en LocalStorage inmediatamente y en Firestore en segundo plano.
 */
export async function guardarMemoriaCoach(nuevaMemoria) {
    const memoriaConFecha = {
        ...nuevaMemoria,
        ultimaActualizacion: new Date().toISOString()
    };

    state.memoriaActual = memoriaConFecha;

    try {
        localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(memoriaConFecha));
    } catch (e) {
        console.error("Error guardando memoria en localStorage:", e);
    }

    try {
        const docRef = doc(db, "configuracion", "coach_memory");
        const guardado = await conTimeout(
            setDoc(docRef, memoriaConFecha, { merge: true }).then(() => true),
            FIRESTORE_TIMEOUT_MS,
            false
        );
        if (guardado) {
            actualizarIndicadorMemoria(true, "Firestore Sincronizada");
        } else {
            actualizarIndicadorMemoria(false, "Memoria Local (Offline)");
        }
    } catch (err) {
        console.warn("Aviso: Memoria guardada localmente pero falló Firestore:", err);
        actualizarIndicadorMemoria(false, "Memoria Local (Offline)");
    }

    return memoriaConFecha;
}

function actualizarIndicadorMemoria(online, texto) {
    const badge = document.getElementById("coach-memory-badge");
    const textEl = document.getElementById("coach-memory-status-text");
    if (!badge || !textEl) return;

    badge.classList.toggle("online", online);
    badge.classList.toggle("offline", !online);
    textEl.textContent = texto;
}

/**
 * Mantenido por retrocompatibilidad (sin duplicar consultas en enviarMensajeUsuario).
 */
export async function consolidarContextoUsuario() {
    const memoria = await obtenerMemoriaCoach();
    const entradasDiario = obtenerEntradasBitacora() || [];
    const sesionActiva = obtenerSesionActiva();
    const entrenos = entradasDiario.filter(e => e.categoria === "post-entreno");
    const molestias = entradasDiario.filter(e => e.categoria === "molestia");

    const rpesValidos = entrenos.map(e => e.rpe).filter(r => typeof r === "number" && !isNaN(r));
    const rpeMedio = rpesValidos.length > 0
        ? (rpesValidos.reduce((a, b) => a + b, 0) / rpesValidos.length).toFixed(1)
        : memoria.metricasClave?.rpeMedioHistorico || 8.0;

    return {
        memoria,
        totalEntrenos: entrenos.length,
        totalMolestias: molestias.length,
        rpeMedio,
        sesionActivaEnCurso: sesionActiva
            ? `Sesión en curso: "${sesionActiva.nombre}"`
            : "Ninguna sesión activa ahora mismo."
    };
}

// ========================================================
// 2. COMPILADOR DE CONTEXTO BIOMÉTRICO RÁPIDO (PARALELO + CACHÉ)
// ========================================================

/**
 * Compila los datos biométricos más recientes en un JSON minificado.
 * Ejecuta consultas Firestore en paralelo con timeout estricto de 2s y caché de 60s
 * para que las respuestas del Coach arranquen de inmediato.
 */
export async function buildCoachContext(forzarRefresco = false) {
    const ahora = Date.now();
    if (!forzarRefresco && state.biometricCache && (ahora - state.biometricCacheTimestamp) < CONTEXT_CACHE_TTL_MS) {
        return state.biometricCache;
    }

    let pesoActual = null;
    let ultimosPesajes = [];
    let suenoAnoche = null;
    let suenoMedio7d = null;
    let pasosHoy = null;
    let bpmActual = null;
    let fatigaEstimada = null;

    // 1. Consultas a Firestore EN PARALELO y con timeout estricto (máximo 2s total)
    const [snapPeso, snapNotas] = await Promise.all([
        conTimeout(
            getDocs(query(collection(db, "registros_peso"), orderBy("timestamp", "desc"), limit(5))),
            FIRESTORE_TIMEOUT_MS,
            null
        ),
        conTimeout(
            getDocs(query(collection(db, "diario_notas"), orderBy("fechaIso", "desc"), limit(8))),
            FIRESTORE_TIMEOUT_MS,
            null
        )
    ]);

    if (snapPeso && !snapPeso.empty) {
        ultimosPesajes = snapPeso.docs.map(d => {
            const data = d.data();
            return {
                peso: data.peso,
                fecha: data.fecha || (data.timestamp ? new Date(data.timestamp).toLocaleDateString("es-ES") : "Reciente")
            };
        });
        if (ultimosPesajes.length > 0 && typeof ultimosPesajes[0].peso === "number") {
            pesoActual = ultimosPesajes[0].peso;
        }
    }

    // Fallback instantáneo de peso desde estado local
    if (pesoActual === null) {
        if (window.salud?.estado?.hoy && typeof window.salud.estado.hoy.peso === "number") {
            pesoActual = window.salud.estado.hoy.peso;
        } else {
            const rawPeso = localStorage.getItem("ultimo_peso_registrado");
            if (rawPeso) pesoActual = parseFloat(rawPeso);
        }
    }

    // 2. Biometría local de Google Fit (0 ms)
    try {
        const rawHealth = localStorage.getItem("health_context_ai");
        if (rawHealth) {
            const h = JSON.parse(rawHealth);
            if (pesoActual === null) pesoActual = h.tendenciaPeso ?? h.pesoActual ?? null;
            suenoAnoche = h.suenoHoras ?? null;
            suenoMedio7d = h.suenoMedia7d ?? null;
            pasosHoy = h.pasosHoy ?? null;
            bpmActual = h.bpmUltimoHoy ?? h.bpmAvgHoy ?? null;
            fatigaEstimada = h.fatigaEstimada ?? null;
        }
    } catch (_) {}

    if (window.salud?.estado) {
        const shoy = window.salud.estado.hoy || {};
        const shist = window.salud.estado.historico || [];
        if (typeof shoy.peso === "number") pesoActual = shoy.peso;
        if (typeof shoy.suenoHoras === "number") suenoAnoche = shoy.suenoHoras;
        if (typeof shoy.pasos === "number") pasosHoy = shoy.pasos;
        if (typeof shoy.bpmUltimo === "number" || typeof shoy.bpmAvg === "number") {
            bpmActual = shoy.bpmUltimo || shoy.bpmAvg;
        }
        if (shist.length > 0 && !suenoMedio7d) {
            const suenosValidos = shist.map(d => d.suenoHoras).filter(s => typeof s === "number" && s > 0);
            if (suenosValidos.length > 0) {
                suenoMedio7d = parseFloat((suenosValidos.reduce((a, b) => a + b, 0) / suenosValidos.length).toFixed(1));
            }
        }
    }

    // 3. Notas del diario (Firestore si respondió a tiempo, o LocalStorage al instante)
    let notasDiario = [];
    if (snapNotas && !snapNotas.empty) {
        notasDiario = snapNotas.docs.map(d => d.data());
    } else {
        notasDiario = obtenerEntradasBitacora() || [];
    }

    const entrenos = notasDiario.filter(e => e.categoria === "post-entreno");
    const molestias = notasDiario.filter(e => e.categoria === "molestia").slice(0, 3).map(m => ({
        fecha: m.fechaFormato || "Reciente",
        nota: (m.texto || "").slice(0, 100)
    }));

    const ultimosRpe = entrenos
        .filter(e => typeof e.rpe === "number" && !isNaN(e.rpe))
        .slice(0, 5)
        .map(e => ({
            rpe: e.rpe,
            fecha: e.fechaFormato || (e.fechaIso ? new Date(e.fechaIso).toLocaleDateString("es-ES") : "Reciente"),
            rutina: e.rutinaRelacionada || "Entreno"
        }));

    const rpeMedio = ultimosRpe.length > 0
        ? parseFloat((ultimosRpe.reduce((acc, cur) => acc + cur.rpe, 0) / ultimosRpe.length).toFixed(1))
        : null;

    let ultimaRutina = null;
    if (entrenos.length > 0) {
        const u = entrenos[0];
        ultimaRutina = {
            nombre: u.rutinaRelacionada || "Sesión General",
            fecha: u.fechaFormato || (u.fechaIso ? new Date(u.fechaIso).toLocaleDateString("es-ES") : "Reciente"),
            rpe: u.rpe ?? null,
            series: u.metricas?.seriesCompletadas ?? null,
            duracion: u.metricas?.duracionFormato ?? null,
            sensaciones: u.texto ? u.texto.slice(0, 120) : ""
        };
    }

    const sesionViva = obtenerSesionActiva();
    const sesionActiva = sesionViva ? {
        nombre: sesionViva.nombre,
        hora_inicio: new Date(sesionViva.inicioTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } : null;

    const payload = {
        peso_actual_kg: pesoActual,
        historial_pesos: ultimosPesajes.slice(0, 3),
        sueno_anoche_h: suenoAnoche,
        sueno_medio_7d: suenoMedio7d,
        ultimos_rpe: ultimosRpe,
        rpe_medio: rpeMedio,
        ultima_rutina: ultimaRutina,
        molestias_recientes: molestias,
        sesion_activa: sesionActiva,
        pasos_hoy: pasosHoy,
        bpm_actual: bpmActual,
        fatiga_estimada: fatigaEstimada,
        sync_timestamp: new Date().toISOString()
    };

    const jsonMinificado = JSON.stringify(payload);
    state.biometricCache = jsonMinificado;
    state.biometricCacheTimestamp = ahora;
    return jsonMinificado;
}

/**
 * Genera el System Prompt inyectando la memoria y el JSON biométrico minificado
 */
function construirSystemPrompt(memoria, biometricJson) {
    return `Eres un entrenador personal de élite, experto en biomecánica, programación del entrenamiento y recuperación. Eres directo, motivador pero riguroso, y utilizas un lenguaje técnico pero accesible en español. Basa tus recomendaciones estrictamente en los datos del usuario.

=== CONTEXTO DEL USUARIO (MEMORIA PERSISTENTE) ===
• Objetivo Actual: ${memoria.objetivoActual}
• Foco Biomecánico: ${memoria.focoBiomecanico}
• Nivel de Experiencia: ${memoria.nivelUsuario}
• Lesiones / Puntos de Cuidado: ${JSON.stringify(memoria.lesionesOMolestias)}
• Resumen Histórico: ${memoria.resumenProgreso}
• Notas Previas del Coach: ${memoria.notasCoach}

=== CONTEXTO BIOMÉTRICO EN TIEMPO REAL (JSON MINIFICADO) ===
${biometricJson}

=== CATÁLOGO OFICIAL DE EJERCICIOS DE LA APP (ID: Nombre) ===
${BASE_EJERCICIOS.map(e => `${e.id}: ${e.nombre}`).join(" | ")}

=== REGLAS DE RESPUESTA ===
1. Responde con criterio científico: hipertrofia con tensión mecánica y rango completo, sobrecarga progresiva (+kg o +reps) y control del esfuerzo (RIR 1-2 / RPE 8-9).
2. Si el usuario pregunta por gráficas, progreso o evolución, activa la gráfica añadiendo [GRAFICA:rpe], [GRAFICA:cargas] o [GRAFICA:volumen] en una línea separada.
3. Si se establecen nuevos objetivos, una nueva molestia o un hito relevante, actualiza la memoria al final de tu mensaje con este bloque exacto:
\`\`\`json_memory
{
  "objetivoActual": "...",
  "focoBiomecanico": "...",
  "lesionesOMolestias": ["..."],
  "resumenProgreso": "...",
  "notasCoach": "..."
}
\`\`\`
4. SIEMPRE que sugieras o diseñes una rutina o batería concreta de ejercicios para entrenar, incluye al final de tu respuesta este bloque exacto (se renderizará como una tarjeta interactiva para que el usuario valide y guarde la rutina en "Mis Rutinas"):
\`\`\`json_routine
{
  "duracion": "40 min",
  "nivel": "Intermedio",
  "notaCoach": "Breve resumen técnico del enfoque de la sesión",
  "ejercicios": [
    {
      "ejercicioId": "id-exacto-del-catalogo",
      "nombre": "Nombre legible del ejercicio",
      "series": 3,
      "reps": "10 - 12",
      "descanso": 90,
      "rir": "2",
      "nota": "Indicación técnica breve"
    }
  ]
}
\`\`\`
Prioriza siempre los \`ejercicioId\` exactos del catálogo listado arriba cuando encajen; si necesitas algún ejercicio extra que no esté en el catálogo, pon un \`ejercicioId\` tipo slug y su \`nombre\` claro en español.
5. Sé conciso, práctico y sin rodeos innecesarios. Evita saludos genéricos largos.`;
}

// ========================================================
// 3. INTERACCIÓN POR VOZ (SPEECH RECOGNITION TOGGLE & TTS)
// ========================================================

export function configurarMicrofonoCoach() {
    const btnMic = document.getElementById("btn-coach-ptt") || document.getElementById("btn-coach-mic");
    if (!btnMic) return;

    if (btnMic.dataset.toggleConfigured === "true") return;
    btnMic.dataset.toggleConfigured = "true";

    btnMic.addEventListener("click", (e) => {
        e.preventDefault();
        alternarGrabacionCoach();
    });
}

export const configurarPushToTalk = configurarMicrofonoCoach;

export function alternarGrabacionCoach() {
    const btnMic = document.getElementById("btn-coach-ptt") || document.getElementById("btn-coach-mic");
    const hintEl = document.getElementById("coach-ptt-hint");
    const textarea = document.getElementById("coach-input-text");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        if (hintEl) hintEl.textContent = "Reconocimiento de voz no disponible en este navegador • Escribe tu consulta abajo";
        if (btnMic) {
            btnMic.style.opacity = "0.5";
            btnMic.title = "Reconocimiento de voz no soportado";
        }
        return;
    }

    if (state.isRecording) {
        detenerGrabacionCoach(btnMic, hintEl);
        return;
    }

    iniciarGrabacionCoach(btnMic, hintEl, textarea, SpeechRecognition);
}

function iniciarGrabacionCoach(btnMic, hintEl, textarea, SpeechRecognition) {
    if (state.reconocimientoVoz) {
        try { state.reconocimientoVoz.abort(); } catch (_) {}
        state.reconocimientoVoz = null;
    }

    try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = false;

        state.reconocimientoVoz = recognition;
        state.isRecording = true;
        state.grabandoPtt = true;
        state.transcriptAcumulado = "";
        state.ultimoIndiceAudioProcesado = -1;

        actualizarFeedbackVisualCoach(btnMic, hintEl, true);

        const textoPrevio = textarea ? textarea.value.trim() : "";

        recognition.onresult = (event) => {
            const ultimoIndice = event.results.length - 1;
            if (ultimoIndice < 0 || ultimoIndice <= state.ultimoIndiceAudioProcesado) return;
            state.ultimoIndiceAudioProcesado = ultimoIndice;

            const ultimoResultado = event.results[ultimoIndice];
            if (!ultimoResultado || !ultimoResultado[0]) return;

            const nuevaFrase = ultimoResultado[0].transcript.trim();
            if (!nuevaFrase) return;

            state.transcriptAcumulado = state.transcriptAcumulado
                ? `${state.transcriptAcumulado} ${nuevaFrase}`
                : nuevaFrase;

            if (textarea) {
                const prefijo = textoPrevio ? textoPrevio + " " : "";
                textarea.value = (prefijo + state.transcriptAcumulado).trimStart();
            }
        };

        recognition.onerror = (event) => {
            console.warn("Aviso en reconocimiento de voz del Coach:", event.error);
            detenerGrabacionCoach(btnMic, hintEl);
        };

        recognition.onend = () => {
            detenerGrabacionCoach(btnMic, hintEl);
        };

        recognition.start();
    } catch (err) {
        console.error("Error al iniciar el micrófono del Coach:", err);
        detenerGrabacionCoach(btnMic, hintEl);
    }
}

function detenerGrabacionCoach(btnMic, hintEl) {
    if (state.reconocimientoVoz) {
        try { state.reconocimientoVoz.stop(); } catch (_) {}
    }
    state.isRecording = false;
    state.grabandoPtt = false;
    state.reconocimientoVoz = null;
    state.transcriptAcumulado = "";
    state.ultimoIndiceAudioProcesado = -1;

    actualizarFeedbackVisualCoach(btnMic, hintEl, false);
}

function actualizarFeedbackVisualCoach(btnMic, hintEl, activo) {
    if (btnMic) {
        btnMic.classList.toggle("recording", activo);
        btnMic.title = activo ? "Escuchando... (Clic para detener)" : "Clic para hablar al Coach";
        btnMic.setAttribute("aria-label", activo ? "Escuchando... Clic para detener" : "Hablar al Coach");
    }

    if (hintEl) {
        hintEl.innerHTML = activo
            ? "🎙️ <strong style='color: #38bdf8;'>Escuchando...</strong> Clic en el micro para detener o pulsa enviar"
            : "Pulsa el micro para hablar • Clic para iniciar / detener";
    }
}

export function reproducirVozCoach(textoCompleto) {
    if (!state.vozActivada || !("speechSynthesis" in window)) return;

    window.speechSynthesis.cancel();

    const textoLimpio = textoCompleto
        .replace(/```json_memory[\s\S]*?```/g, "")
        .replace(/```json_routine[\s\S]*?```/g, "")
        .replace(/\[GRAFICA:[^\]]+\]/g, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s?/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();

    if (!textoLimpio) return;

    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    utterance.pitch = 0.98;

    const voces = window.speechSynthesis.getVoices();
    const vozEs = voces.find(v => v.lang.startsWith("es") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Pablo") || v.name.includes("Jorge")))
               || voces.find(v => v.lang.startsWith("es"));
    if (vozEs) utterance.voice = vozEs;

    const btnVoz = document.getElementById("btn-toggle-voz");
    if (btnVoz) btnVoz.classList.add("speaking");

    utterance.onend = () => { if (btnVoz) btnVoz.classList.remove("speaking"); };
    utterance.onerror = () => { if (btnVoz) btnVoz.classList.remove("speaking"); };

    window.speechSynthesis.speak(utterance);
}

export function alternarVoz() {
    state.vozActivada = !state.vozActivada;
    localStorage.setItem(STORAGE_KEY_VOICE, String(state.vozActivada));

    const iconOn = document.getElementById("icon-voice-on");
    const iconOff = document.getElementById("icon-voice-off");
    const label = document.getElementById("btn-voice-label");
    const btn = document.getElementById("btn-toggle-voz");

    if (iconOn) iconOn.style.display = state.vozActivada ? "inline-block" : "none";
    if (iconOff) iconOff.style.display = state.vozActivada ? "none" : "inline-block";
    if (label) label.textContent = state.vozActivada ? "Voz Activa" : "Silenciado";
    if (btn) btn.classList.toggle("active", state.vozActivada);

    if (!state.vozActivada && ("speechSynthesis" in window)) {
        window.speechSynthesis.cancel();
    }
}

// ========================================================
// 4. VISUALIZADOR DE GRÁFICAS BIOMÉTRICAS (CHART.JS)
// ========================================================

export function alternarVisorGrafica(forzarEstado = null) {
    const panel = document.getElementById("coach-chart-panel");
    const btn = document.getElementById("btn-toggle-chart");
    if (!panel) return;

    const abierto = forzarEstado !== null ? forzarEstado : panel.style.display === "none";
    panel.style.display = abierto ? "block" : "none";
    if (btn) btn.classList.toggle("active", abierto);

    if (abierto) {
        renderizarGraficaCoach(state.chartTipoActual);
    }
}

export function cambiarTipoGrafica(tipo) {
    state.chartTipoActual = tipo;
    document.querySelectorAll(".chart-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.chart === tipo);
    });
    renderizarGraficaCoach(tipo);
}

export function renderizarGraficaCoach(tipo = "rpe") {
    const canvas = document.getElementById("coach-chart-canvas");
    if (!canvas || typeof Chart === "undefined") return;

    const entradas = obtenerEntradasBitacora() || [];
    const entrenos = entradas.filter(e => e.categoria === "post-entreno").reverse();

    if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
    }

    const ctx = canvas.getContext("2d");
    let chartData = { labels: [], datasets: [] };

    if (tipo === "rpe") {
        const labels = entrenos.map(e => e.rutinaRelacionada ? e.rutinaRelacionada.split(" ")[0] : "Sesión");
        const dataRpe = entrenos.map(e => e.rpe || 8);

        const finalLabels = labels.length >= 2 ? labels : ["Pull Ref", "Tirón 1", "Tirón 2", "Empuje"];
        const finalData = dataRpe.length >= 2 ? dataRpe : [7, 8, 8, 8.5];

        chartData = {
            labels: finalLabels,
            datasets: [{
                label: "Esfuerzo Percibido (RPE)",
                data: finalData,
                borderColor: "#38bdf8",
                backgroundColor: "rgba(56, 189, 248, 0.15)",
                borderWidth: 2.5,
                fill: true,
                tension: 0,
                pointBackgroundColor: "#38bdf8",
                pointBorderColor: "#0f172a",
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        };
    } else if (tipo === "cargas") {
        chartData = {
            labels: ["Semana 1", "Semana 2", "Semana 3", "Actual"],
            datasets: [
                {
                    label: "Remo Mancuerna (kg)",
                    data: [20, 22, 22, 24],
                    borderColor: "#fbbf24",
                    backgroundColor: "rgba(251, 191, 36, 0.1)",
                    borderWidth: 2,
                    tension: 0,
                    pointBackgroundColor: "#fbbf24",
                    pointBorderColor: "#0f172a",
                    pointBorderWidth: 1.5,
                    pointRadius: 4.5,
                    pointHoverRadius: 6
                },
                {
                    label: "Curl Bíceps (kg)",
                    data: [10, 12, 12, 14],
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.1)",
                    borderWidth: 2,
                    tension: 0,
                    pointBackgroundColor: "#38bdf8",
                    pointBorderColor: "#0f172a",
                    pointBorderWidth: 1.5,
                    pointRadius: 4.5,
                    pointHoverRadius: 6
                }
            ]
        };
    } else {
        chartData = {
            labels: ["Espalda / Tirón", "Bíceps", "Deltoides", "Empuje / Pectoral", "Pierna"],
            datasets: [{
                label: "Series Efectivas Semanales",
                data: [14, 10, 8, 12, 10],
                backgroundColor: [
                    "rgba(56, 189, 248, 0.7)",
                    "rgba(56, 189, 248, 0.5)",
                    "rgba(251, 191, 36, 0.6)",
                    "rgba(74, 222, 128, 0.6)",
                    "rgba(192, 132, 252, 0.6)"
                ],
                borderColor: "#0f172a",
                borderWidth: 1.5,
                borderRadius: 6
            }]
        };
    }

    state.chartInstance = new Chart(ctx, {
        type: tipo === "volumen" ? "bar" : "line",
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    labels: {
                        color: "#cbd5e1",
                        font: { size: 11, weight: "bold", family: "system-ui" }
                    }
                },
                tooltip: {
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    titleColor: "#38bdf8",
                    bodyColor: "#f1f5f9",
                    borderColor: "rgba(56, 189, 248, 0.4)",
                    borderWidth: 1
                }
            },
            scales: {
                y: {
                    beginAtZero: tipo === "volumen",
                    min: tipo === "rpe" ? 5 : undefined,
                    max: tipo === "rpe" ? 10 : undefined,
                    grid: { color: "rgba(51, 65, 85, 0.35)" },
                    ticks: { color: "#94a3b8", font: { size: 10 } }
                },
                x: {
                    grid: { color: "rgba(51, 65, 85, 0.2)" },
                    ticks: { color: "#94a3b8", font: { size: 10 } }
                }
            }
        }
    });
}

// ========================================================
// 5. INTERFAZ DE CHAT, STREAMING SUAVE Y CANCELACIÓN
// ========================================================

function actualizarEstadoBotonEnviar(generando) {
    const btn = document.getElementById("btn-coach-send");
    const iconSend = document.getElementById("icon-coach-send");
    const iconStop = document.getElementById("icon-coach-stop");
    if (!btn) return;

    btn.classList.toggle("is-stopping", generando);
    btn.title = generando ? "Detener respuesta" : "Enviar mensaje";
    if (iconSend) iconSend.style.display = generando ? "none" : "block";
    if (iconStop) iconStop.style.display = generando ? "block" : "none";
}

export function detenerGeneracion() {
    if (state.abortController) {
        state.abortController.abort();
    }
}

export function manejarBotonEnviar() {
    if (state.enGeneracion) {
        detenerGeneracion();
    } else {
        enviarMensajeUsuario();
    }
}

// ========================================================
// 5A. PROPUESTAS DE RUTINA DEL COACH (TARJETA DE VALIDACIÓN)
// ========================================================
const propuestasRutinaMap = new Map();

function formatearFechaRutinaDefault(fecha = new Date()) {
    const d = fecha instanceof Date && !isNaN(fecha.getTime()) ? fecha : new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `Rutina ${dd}/${mm}/${yyyy}`;
}

function hashSimpleTexto(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(36);
}

function normalizarEjercicioPropuesta(item, idx) {
    if (!item || typeof item !== "object") return null;
    const rawId = String(item.ejercicioId || item.id || "").trim();
    const rawNombre = String(item.nombre || item.name || "").trim();

    // Buscar coincidencia exacta por ID o aproximada por nombre en el catálogo 3D
    let ejCatalogo = BASE_EJERCICIOS.find(e => e.id === rawId);
    if (!ejCatalogo && rawNombre) {
        const lower = rawNombre.toLowerCase();
        ejCatalogo = BASE_EJERCICIOS.find(e =>
            e.nombre.toLowerCase() === lower ||
            e.nombre.toLowerCase().includes(lower) ||
            lower.includes(e.nombre.toLowerCase().split("(")[0].trim())
        );
    }

    const slugFallback = rawId || rawNombre.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `ejercicio-coach-${idx + 1}`;

    const seriesNum = Math.max(1, Math.min(10, parseInt(item.series, 10) || 3));
    const descansoNum = Math.max(15, Math.min(300, parseInt(item.descanso, 10) || 90));

    return {
        ejercicioId: ejCatalogo ? ejCatalogo.id : slugFallback,
        nombre: ejCatalogo ? ejCatalogo.nombre : (rawNombre || rawId || `Ejercicio ${idx + 1}`),
        enCatalogo: Boolean(ejCatalogo),
        series: seriesNum,
        reps: String(item.reps || "10 - 12"),
        descanso: descansoNum,
        rir: String(item.rir || "2"),
        nota: String(item.nota || "").trim()
    };
}

function extraerPropuestaRutina(textoCompleto) {
    if (!textoCompleto) return null;
    const match = textoCompleto.match(/```json_routine\s*([\s\S]*?)\s*```/i);
    if (!match || !match[1]) return null;
    try {
        const parsed = JSON.parse(match[1]);
        const ejerciciosRaw = Array.isArray(parsed?.ejercicios) ? parsed.ejercicios : [];
        const ejercicios = ejerciciosRaw
            .map((item, idx) => normalizarEjercicioPropuesta(item, idx))
            .filter(Boolean);
        if (ejercicios.length === 0) return null;

        const firma = hashSimpleTexto(JSON.stringify(ejercicios.map(e => `${e.ejercicioId}:${e.series}:${e.reps}`)));
        return {
            propId: `prop_${firma}`,
            firma,
            duracion: String(parsed.duracion || "40 min"),
            nivel: String(parsed.nivel || "Adaptativo"),
            notaCoach: String(parsed.notaCoach || "Rutina diseñada por el AI Coach según tu conversación.").trim(),
            ejercicios
        };
    } catch (e) {
        console.warn("Aviso al parsear bloque json_routine:", e.message);
        return null;
    }
}

function limpiarBloquesTecnicos(texto, parcial = false) {
    let out = String(texto || "")
        .replace(/```json_memory[\s\S]*?```/gi, "")
        .replace(/```json_routine[\s\S]*?```/gi, "");
    if (parcial) {
        out = out
            .replace(/```json_memory[\s\S]*$/gi, "")
            .replace(/```json_routine[\s\S]*$/gi, "");
    }
    return out.trim();
}

function construirTarjetaPropuestaRutinaHtml(textoCompleto, fechaMsg = new Date()) {
    const propuesta = extraerPropuestaRutina(textoCompleto);
    if (!propuesta) return "";

    propuestasRutinaMap.set(propuesta.propId, propuesta);

    const escapeHtml = (s) => String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const yaGuardada = obtenerRutinasPersonalizadas().find(r => r.propuestaFirma === propuesta.firma);
    const nombreDefault = yaGuardada?.nombre || formatearFechaRutinaDefault(fechaMsg);

    const listaHtml = propuesta.ejercicios.map((ej, i) => `
        <div class="coach-routine-ex-row">
            <span class="coach-routine-ex-name">
                <strong>${i + 1}.</strong> ${escapeHtml(ej.nombre)}
                ${ej.enCatalogo ? '<span class="coach-routine-3d-tag">3D</span>' : ''}
            </span>
            <span class="coach-routine-ex-meta">${ej.series}×${escapeHtml(ej.reps)}</span>
        </div>
    `).join("");

    const accionesHtml = yaGuardada
        ? `
            <div class="coach-routine-saved-bar">
                <span class="coach-routine-saved-ok">✅ Guardada en Mis Rutinas</span>
                <div class="coach-routine-btn-row">
                    <button type="button" class="btn-ghost coach-routine-btn" onclick="window.coach?.abrirRutinaGuardada('${escaparAttr(yaGuardada.id)}', false)">
                        📂 Ver en Rutinas
                    </button>
                    <button type="button" class="btn-primary btn-neon-cyan coach-routine-btn" onclick="window.coach?.abrirRutinaGuardada('${escaparAttr(yaGuardada.id)}', true)">
                        🏋️‍♂️ Empezar ahora
                    </button>
                </div>
            </div>
        `
        : `
            <div class="coach-routine-name-row">
                <label class="coach-routine-name-lbl" for="input-rutina-${propuesta.propId}">Nombre:</label>
                <input type="text" id="input-rutina-${propuesta.propId}" class="coach-routine-name-input" value="${escapeHtml(nombreDefault)}" maxlength="70" />
            </div>
            <div class="coach-routine-btn-row">
                <button type="button" class="btn-ghost coach-routine-btn" onclick="window.coach?.guardarRutinaPropuesta('${propuesta.propId}', false)">
                    💾 Guardar en Mis Rutinas
                </button>
                <button type="button" class="btn-primary btn-neon-cyan coach-routine-btn" onclick="window.coach?.guardarRutinaPropuesta('${propuesta.propId}', true)">
                    🏋️‍♂️ Guardar y Empezar
                </button>
            </div>
        `;

    return `
        <div class="coach-routine-proposal-card" id="card-prop-${propuesta.propId}">
            <div class="coach-routine-prop-header">
                <span class="coach-routine-prop-tag">🤖 PROPUESTA DE RUTINA · ${propuesta.ejercicios.length} EJERCICIOS</span>
                <span class="coach-routine-prop-pills">⏱️ ${escapeHtml(propuesta.duracion)} · ${escapeHtml(propuesta.nivel)}</span>
            </div>
            <div class="coach-routine-ex-list">${listaHtml}</div>
            <div class="coach-routine-actions-zone" id="actions-prop-${propuesta.propId}">
                ${accionesHtml}
            </div>
        </div>
    `;
}

export function guardarRutinaPropuesta(propId, iniciarAhora = false) {
    const propuesta = propuestasRutinaMap.get(propId);
    if (!propuesta) {
        mostrarToastCoach("⚠️ No se encontró la propuesta de rutina");
        return;
    }

    const inputNombre = document.getElementById(`input-rutina-${propId}`);
    const nombreElegido = (inputNombre?.value || "").trim() || formatearFechaRutinaDefault(new Date());

    // Evitar duplicados exactos si pulsa dos veces
    const existente = obtenerRutinasPersonalizadas().find(r => r.propuestaFirma === propuesta.firma);
    const rutinaId = existente ? existente.id : `custom-coach-${Date.now()}`;

    const nuevaRutina = {
        id: rutinaId,
        propuestaFirma: propuesta.firma,
        nombre: nombreElegido,
        creador: "coach",
        creadorNombre: "AI Performance Coach",
        icono: "🤖",
        fechaCreacion: new Date().toISOString().split("T")[0],
        duracion: propuesta.duracion,
        nivel: propuesta.nivel,
        notaCoach: propuesta.notaCoach,
        ejercicios: propuesta.ejercicios.map(e => ({
            ejercicioId: e.ejercicioId,
            nombre: e.nombre,
            series: e.series,
            reps: e.reps,
            descanso: e.descanso,
            rir: e.rir,
            nota: e.nota
        }))
    };

    guardarRutinaPersonalizada(nuevaRutina);

    // Actualizar tarjeta en el chat para reflejar estado guardado + acceso directo
    const actionsZone = document.getElementById(`actions-prop-${propId}`);
    if (actionsZone) {
        actionsZone.innerHTML = `
            <div class="coach-routine-saved-bar">
                <span class="coach-routine-saved-ok">✅ Guardada como "${nombreElegido.replace(/</g, "&lt;")}"</span>
                <div class="coach-routine-btn-row">
                    <button type="button" class="btn-ghost coach-routine-btn" onclick="window.coach?.abrirRutinaGuardada('${escaparAttr(rutinaId)}', false)">
                        📂 Ver en Rutinas
                    </button>
                    <button type="button" class="btn-primary btn-neon-cyan coach-routine-btn" onclick="window.coach?.abrirRutinaGuardada('${escaparAttr(rutinaId)}', true)">
                        🏋️‍♂️ Empezar ahora
                    </button>
                </div>
            </div>
        `;
    }

    mostrarToastCoach(`✅ "${nombreElegido}" guardada en Mis Rutinas`);

    if (iniciarAhora) {
        abrirRutinaGuardada(rutinaId, true);
    }
}

export function abrirRutinaGuardada(rutinaId, iniciarSesion = false) {
    window._gimnasioPendingAction = iniciarSesion
        ? { tab: "personalizadas", startRoutineId: rutinaId }
        : { tab: "personalizadas", highlightRoutineId: rutinaId };

    if (window.router?.cargarVista) {
        window.router.cargarVista("gimnasio");
    }
}

function agregarMensajeAlChat(rol, texto, fecha = new Date(), guardarEnHistorial = false, opciones = {}) {
    const contenedor = document.getElementById("coach-chat-messages");
    if (!contenedor) return;

    const restaurando = Boolean(opciones.restaurando);
    const msgEl = document.createElement("div");
    msgEl.className = `chat-bubble-row ${rol === "user" ? "row-user" : "row-coach"}`;

    const fechaObj = fecha instanceof Date && !isNaN(fecha.getTime()) ? fecha : new Date();
    const horaStr = fechaObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const tarjetaRutinaHtml = rol !== "user" ? construirTarjetaPropuestaRutinaHtml(texto, fechaObj) : "";
    let textoRender = limpiarBloquesTecnicos(texto, false);

    const matchGrafica = textoRender.match(/\[GRAFICA:([a-z]+)\]/);
    if (matchGrafica) {
        textoRender = textoRender.replace(/\[GRAFICA:[a-z]+\]/g, "").trim();
        if (!restaurando) {
            const tipoG = matchGrafica[1];
            setTimeout(() => {
                alternarVisorGrafica(true);
                cambiarTipoGrafica(tipoG);
            }, 400);
        }
    }

    const htmlFormateado = formatearMarkdownSeguro(textoRender);

    if (rol === "user") {
        msgEl.innerHTML = `
            <div class="chat-bubble bubble-user">
                <div class="bubble-content">${htmlFormateado}${tarjetaRutinaHtml}</div>
                <span class="bubble-time">${horaStr}</span>
            </div>
        `;
    } else {
        msgEl.innerHTML = `
            <div class="chat-avatar-mini">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="#38bdf8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
            </div>
            <div class="chat-bubble bubble-coach">
                <div class="bubble-header-coach">
                    <span class="coach-tag">COACH ÉLITE</span>
                    <button class="btn-bubble-listen" title="Escuchar este mensaje" onclick="window.coach?.reproducirTexto('${escaparAttr(textoRender)}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    </button>
                </div>
                <div class="bubble-content">${htmlFormateado}${tarjetaRutinaHtml}</div>
                <span class="bubble-time">${horaStr}</span>
            </div>
        `;
    }

    contenedor.appendChild(msgEl);
    contenedor.scrollTop = contenedor.scrollHeight;

    if (guardarEnHistorial) {
        state.historialConversacion.push({ role: rol === "user" ? "user" : "model", text: texto });
        if (state.historialConversacion.length > 6) {
            state.historialConversacion = state.historialConversacion.slice(-6);
        }
    }
}

function mostrarTyping(mostrar, textoEstado = null) {
    const el = document.getElementById("coach-typing-indicator");
    const label = document.getElementById("coach-typing-label");
    if (label && textoEstado) label.textContent = textoEstado;
    if (el) el.style.display = mostrar ? "flex" : "none";
    const contenedor = document.getElementById("coach-chat-messages");
    if (contenedor && mostrar) contenedor.scrollTop = contenedor.scrollHeight;
}

/**
 * Burbuja con renderizado progresivo optimizado mediante requestAnimationFrame
 */
function iniciarBurbujaStreaming() {
    const contenedor = document.getElementById("coach-chat-messages");
    if (!contenedor) return null;

    const msgEl = document.createElement("div");
    msgEl.className = "chat-bubble-row row-coach";
    const horaStr = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    msgEl.innerHTML = `
        <div class="chat-avatar-mini">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="#38bdf8"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        </div>
        <div class="chat-bubble bubble-coach is-streaming">
            <div class="bubble-header-coach">
                <span class="coach-tag">COACH ÉLITE</span>
                <span class="stream-cursor-indicator" title="Generando respuesta en tiempo real">●</span>
            </div>
            <div class="bubble-content"><p><span class="streaming-text"></span><span class="typewriter-cursor">▋</span></p></div>
            <span class="bubble-time">${horaStr}</span>
        </div>
    `;

    contenedor.appendChild(msgEl);
    contenedor.scrollTop = contenedor.scrollHeight;

    const contentEl = msgEl.querySelector(".bubble-content");
    const headerEl = msgEl.querySelector(".bubble-header-coach");

    let ultimoTextoPendiente = "";
    let rafId = null;

    const pintarPendiente = () => {
        rafId = null;
        if (!contentEl) return;
        const textoLimpio = limpiarBloquesTecnicos(ultimoTextoPendiente, true)
            .replace(/\[GRAFICA:[a-z]+\]/g, "")
            .trim();
        contentEl.innerHTML = formatearMarkdownSeguro(textoLimpio) + `<span class="typewriter-cursor">▋</span>`;
        contenedor.scrollTop = contenedor.scrollHeight;
    };

    return {
        element: msgEl,
        actualizar(textoParcial) {
            ultimoTextoPendiente = textoParcial;
            if (!rafId) {
                rafId = requestAnimationFrame(pintarPendiente);
            }
        },
        finalizar(textoCompleto, sufijoEstado = "") {
            if (rafId) {
                cancelAnimationFrame(rafId);
                rafId = null;
            }
            const bubbleEl = msgEl.querySelector(".bubble-coach");
            if (bubbleEl) bubbleEl.classList.remove("is-streaming");

            const tarjetaRutinaHtml = construirTarjetaPropuestaRutinaHtml(textoCompleto, new Date());
            let textoRender = limpiarBloquesTecnicos(textoCompleto, false);
            const matchGrafica = textoRender.match(/\[GRAFICA:([a-z]+)\]/);
            if (matchGrafica) {
                textoRender = textoRender.replace(/\[GRAFICA:[a-z]+\]/g, "");
                const tipoG = matchGrafica[1];
                setTimeout(() => {
                    alternarVisorGrafica(true);
                    cambiarTipoGrafica(tipoG);
                }, 400);
            }

            if (contentEl) {
                const extra = sufijoEstado ? `<p class="stream-stopped-note">${sufijoEstado}</p>` : "";
                contentEl.innerHTML = formatearMarkdownSeguro(textoRender) + extra + tarjetaRutinaHtml;
            }

            if (headerEl) {
                headerEl.innerHTML = `
                    <span class="coach-tag">COACH ÉLITE</span>
                    <button class="btn-bubble-listen" title="Escuchar este mensaje" onclick="window.coach?.reproducirTexto('${escaparAttr(textoRender)}')">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                    </button>
                `;
            }
            contenedor.scrollTop = contenedor.scrollHeight;
        },
        eliminar() {
            if (rafId) cancelAnimationFrame(rafId);
            msgEl.remove();
        }
    };
}

// ========================================================
// 5B. HISTORIAL PERSISTENTE DE CONVERSACIONES (LOCAL + FIRESTORE)
// ========================================================

function generarTituloConversacion(texto) {
    const limpio = String(texto || "").replace(/\s+/g, " ").trim();
    if (!limpio) return "Conversación con Coach";
    return limpio.length > 52 ? `${limpio.slice(0, 52).trim()}…` : limpio;
}

function claveDiaLocal(fecha) {
    const d = fecha instanceof Date ? fecha : new Date(fecha);
    if (isNaN(d.getTime())) return "";
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

function etiquetaFechaGrupo(ms) {
    const hoyKey = claveDiaLocal(new Date());
    const ayerKey = claveDiaLocal(new Date(Date.now() - 86400000));
    const key = claveDiaLocal(ms);
    if (key === hoyKey) return "Hoy";
    if (key === ayerKey) return "Ayer";
    return new Date(ms).toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function actualizarBadgeHistorial() {
    const badge = document.getElementById("coach-history-count");
    if (!badge) return;
    const total = state.conversaciones.length;
    if (total > 0) {
        badge.textContent = String(total);
        badge.style.display = "inline-flex";
    } else {
        badge.style.display = "none";
    }
}

function cargarConversacionesLocal() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CONVERSATIONS);
        const lista = raw ? JSON.parse(raw) : [];
        state.conversaciones = Array.isArray(lista)
            ? lista.filter(c => c && c.id && Array.isArray(c.mensajes))
            : [];
        state.conversaciones.sort((a, b) => (b.actualizadoMs || 0) - (a.actualizadoMs || 0));
    } catch (_) {
        state.conversaciones = [];
    }

    try {
        const activeId = localStorage.getItem(STORAGE_KEY_ACTIVE_CONV_ID);
        if (activeId && state.conversaciones.some(c => c.id === activeId)) {
            state.conversacionActivaId = activeId;
        } else {
            state.conversacionActivaId = null;
        }
    } catch (_) {
        state.conversacionActivaId = null;
    }

    actualizarBadgeHistorial();
}

function guardarConversacionesLocal() {
    try {
        state.conversaciones.sort((a, b) => (b.actualizadoMs || 0) - (a.actualizadoMs || 0));
        if (state.conversaciones.length > MAX_CONVERSACIONES_LOCAL) {
            state.conversaciones = state.conversaciones.slice(0, MAX_CONVERSACIONES_LOCAL);
        }
        localStorage.setItem(STORAGE_KEY_CONVERSATIONS, JSON.stringify(state.conversaciones));
        if (state.conversacionActivaId) {
            localStorage.setItem(STORAGE_KEY_ACTIVE_CONV_ID, state.conversacionActivaId);
        } else {
            localStorage.removeItem(STORAGE_KEY_ACTIVE_CONV_ID);
        }
    } catch (e) {
        console.warn("No se pudo guardar conversaciones locales del Coach:", e.message);
    }
    actualizarBadgeHistorial();
}

function guardarConversacionEnFirestoreBg(conv) {
    if (!conv || !conv.id) return;
    const payload = {
        id: conv.id,
        titulo: conv.titulo || "Conversación con Coach",
        creadoEn: conv.creadoEn || new Date().toISOString(),
        actualizadoEn: conv.actualizadoEn || new Date().toISOString(),
        actualizadoMs: conv.actualizadoMs || Date.now(),
        proveedor: conv.proveedor || "",
        modelo: conv.modelo || "",
        mensajes: (conv.mensajes || []).slice(-MAX_MENSAJES_POR_CONVERSACION)
    };
    const docRef = doc(db, FIRESTORE_CONV_COLLECTION, conv.id);
    conTimeout(setDoc(docRef, payload, { merge: true }), 8000, null).catch(err => {
        console.warn("Aviso guardando conversación en Firestore:", err);
    });
}

async function sincronizarConversacionesFirestoreBg() {
    try {
        const q = query(
            collection(db, FIRESTORE_CONV_COLLECTION),
            orderBy("actualizadoMs", "desc"),
            limit(30)
        );
        const snap = await conTimeout(getDocs(q), 6000, null);
        if (!snap || snap.empty) return;

        const mapa = new Map();
        state.conversaciones.forEach(c => mapa.set(c.id, c));

        snap.docs.forEach(d => {
            const remota = d.data();
            if (!remota || !Array.isArray(remota.mensajes)) return;
            const id = remota.id || d.id;
            const normalizada = { ...remota, id };
            const local = mapa.get(id);
            if (!local || (normalizada.actualizadoMs || 0) >= (local.actualizadoMs || 0)) {
                mapa.set(id, normalizada);
            }
        });

        state.conversaciones = Array.from(mapa.values())
            .sort((a, b) => (b.actualizadoMs || 0) - (a.actualizadoMs || 0))
            .slice(0, MAX_CONVERSACIONES_LOCAL);

        // Si es un dispositivo nuevo sin conversación activa en pantalla y hay una de hoy en la nube, retomarla automáticamente
        const contenedor = document.getElementById("coach-chat-messages");
        const chatVacioEnPantalla = contenedor && contenedor.children.length === 0;
        if (!state.conversacionActivaId && chatVacioEnPantalla && state.conversaciones.length > 0) {
            const ultima = state.conversaciones[0];
            if (claveDiaLocal(ultima.actualizadoMs || 0) === claveDiaLocal(new Date())) {
                state.conversacionActivaId = ultima.id;
                renderizarConversacionActiva();
            }
        } else if (state.conversacionActivaId) {
            // Si la conversación activa recibió mensajes más recientes en otro dispositivo, refrescar si no estamos generando
            const activa = state.conversaciones.find(c => c.id === state.conversacionActivaId);
            if (activa && !state.enGeneracion && contenedor && contenedor.children.length < activa.mensajes.length) {
                renderizarConversacionActiva();
            }
        }

        guardarConversacionesLocal();

        const modal = document.getElementById("modal-coach-history");
        if (modal && modal.classList.contains("active")) {
            renderizarListaHistorial();
        }
    } catch (err) {
        console.warn("Aviso al sincronizar historial de conversaciones desde Firestore:", err);
    }
}

function obtenerConversacionActiva() {
    if (!state.conversacionActivaId) return null;
    return state.conversaciones.find(c => c.id === state.conversacionActivaId) || null;
}

function asegurarConversacionActiva(primerMensaje = "") {
    let conv = obtenerConversacionActiva();
    if (conv) return conv;

    const ahora = Date.now();
    const id = `conv_${ahora}_${Math.random().toString(36).slice(2, 7)}`;
    const aiConfig = getAIConfig();
    conv = {
        id,
        titulo: generarTituloConversacion(primerMensaje),
        creadoEn: new Date(ahora).toISOString(),
        actualizadoEn: new Date(ahora).toISOString(),
        actualizadoMs: ahora,
        proveedor: aiConfig.providerId,
        modelo: aiConfig.model,
        mensajes: []
    };
    state.conversaciones.unshift(conv);
    state.conversacionActivaId = id;
    guardarConversacionesLocal();
    return conv;
}

function registrarMensajeEnConversacion(role, text, aiConfig = null, sincronizarNube = true) {
    const limpio = String(text || "").trim();
    if (!limpio) return;

    const conv = asegurarConversacionActiva(role === "user" ? limpio : "");
    const ahora = Date.now();
    if (role === "user" && (!conv.mensajes || conv.mensajes.length === 0)) {
        conv.titulo = generarTituloConversacion(limpio);
    }

    conv.mensajes.push({
        role: role === "user" ? "user" : "model",
        text: limpio,
        ts: new Date(ahora).toISOString()
    });
    if (conv.mensajes.length > MAX_MENSAJES_POR_CONVERSACION) {
        conv.mensajes = conv.mensajes.slice(-MAX_MENSAJES_POR_CONVERSACION);
    }

    conv.actualizadoEn = new Date(ahora).toISOString();
    conv.actualizadoMs = ahora;
    if (aiConfig) {
        conv.proveedor = aiConfig.providerId;
        conv.modelo = aiConfig.model;
    }

    guardarConversacionesLocal();
    if (sincronizarNube) {
        guardarConversacionEnFirestoreBg(conv);
    }
}

function renderizarConversacionActiva() {
    const contenedor = document.getElementById("coach-chat-messages");
    if (!contenedor) return;

    contenedor.innerHTML = "";
    const conv = obtenerConversacionActiva();
    if (!conv || !Array.isArray(conv.mensajes) || conv.mensajes.length === 0) {
        state.historialConversacion = [];
        return;
    }

    conv.mensajes.forEach(m => {
        const rolUI = m.role === "user" ? "user" : "coach";
        const fecha = m.ts ? new Date(m.ts) : new Date();
        agregarMensajeAlChat(rolUI, m.text, fecha, false, { restaurando: true });
    });

    // Restaurar memoria rotativa de los últimos 6 mensajes para retomar el contexto con la IA
    state.historialConversacion = conv.mensajes.slice(-6).map(m => ({
        role: m.role === "user" ? "user" : "model",
        text: m.text
    }));
}

export function iniciarNuevaConversacion(cerrarModal = false) {
    detenerGeneracion();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    state.conversacionActivaId = null;
    state.historialConversacion = [];
    guardarConversacionesLocal();

    const contenedor = document.getElementById("coach-chat-messages");
    if (contenedor) contenedor.innerHTML = "";

    if (cerrarModal) cerrarHistorialConversaciones();

    const textarea = document.getElementById("coach-input-text");
    if (textarea) setTimeout(() => textarea.focus(), 60);
    mostrarToastCoach("✨ Nueva conversación iniciada");
}

export function retomarConversacion(convId) {
    const existe = state.conversaciones.find(c => c.id === convId);
    if (!existe) return;

    detenerGeneracion();
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();

    state.conversacionActivaId = convId;
    guardarConversacionesLocal();
    renderizarConversacionActiva();
    cerrarHistorialConversaciones();
    mostrarToastCoach("💬 Conversación retomada");
}

export async function eliminarConversacion(convId, event = null) {
    if (event) event.stopPropagation();
    if (!confirm("¿Eliminar esta conversación del historial permanentemente?")) return;

    state.conversaciones = state.conversaciones.filter(c => c.id !== convId);
    if (state.conversacionActivaId === convId) {
        state.conversacionActivaId = null;
        state.historialConversacion = [];
        const contenedor = document.getElementById("coach-chat-messages");
        if (contenedor) contenedor.innerHTML = "";
    }
    guardarConversacionesLocal();
    renderizarListaHistorial();

    try {
        await conTimeout(deleteDoc(doc(db, FIRESTORE_CONV_COLLECTION, convId)), 6000, null);
    } catch (err) {
        console.warn("Aviso eliminando conversación en Firestore:", err);
    }
    mostrarToastCoach("🗑️ Conversación eliminada");
}

function renderizarListaHistorial() {
    const listaEl = document.getElementById("coach-history-list");
    if (!listaEl) return;

    if (!state.conversaciones.length) {
        listaEl.innerHTML = '<div class="coach-history-empty">Aún no hay conversaciones guardadas. Cuando hables con el Coach, tus sesiones quedarán aquí organizadas por fecha.</div>';
        return;
    }

    // Agrupar conversaciones por fecha (Hoy, Ayer, fecha...)
    const grupos = new Map();
    state.conversaciones.forEach(conv => {
        const ms = conv.actualizadoMs || Date.parse(conv.actualizadoEn || conv.creadoEn) || Date.now();
        const etiqueta = etiquetaFechaGrupo(ms);
        if (!grupos.has(etiqueta)) grupos.set(etiqueta, []);
        grupos.get(etiqueta).push(conv);
    });

    const escapeHtml = (s) => String(s || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    let html = "";
    grupos.forEach((items, etiqueta) => {
        html += `<div class="coach-history-date-group"><span class="coach-history-date-label">${escapeHtml(etiqueta)}</span>`;
        items.forEach(conv => {
            const activa = conv.id === state.conversacionActivaId;
            const ms = conv.actualizadoMs || Date.parse(conv.actualizadoEn || conv.creadoEn) || Date.now();
            const hora = new Date(ms).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
            const numMsgs = (conv.mensajes || []).length;
            const ultimoMsg = numMsgs > 0 ? conv.mensajes[numMsgs - 1].text : "";
            const previewLimpio = limpiarBloquesTecnicos(ultimoMsg, true)
                .replace(/\[GRAFICA:[a-z]+\]/g, "")
                .replace(/\*\*/g, "")
                .replace(/\s+/g, " ")
                .trim();
            const preview = previewLimpio.length > 90 ? `${previewLimpio.slice(0, 90).trim()}…` : previewLimpio;

            html += `
                <div class="coach-history-item ${activa ? "active" : ""}" onclick="window.coach?.retomarConversacion('${escaparAttr(conv.id)}')">
                    <div class="coach-history-item-top">
                        <strong class="coach-history-item-title">${escapeHtml(conv.titulo || "Conversación")}</strong>
                        <button type="button" class="coach-history-del-btn" title="Eliminar conversación" aria-label="Eliminar conversación" onclick="window.coach?.eliminarConversacion('${escaparAttr(conv.id)}', event)">✕</button>
                    </div>
                    ${preview ? `<p class="coach-history-item-preview">${escapeHtml(preview)}</p>` : ""}
                    <div class="coach-history-item-meta">
                        <span>${hora} · ${numMsgs} mensaje${numMsgs === 1 ? "" : "s"}</span>
                        ${activa ? '<span class="coach-history-active-pill">Activa</span>' : '<span class="coach-history-resume-hint">Retomar →</span>'}
                    </div>
                </div>
            `;
        });
        html += `</div>`;
    });

    listaEl.innerHTML = html;
}

export function abrirHistorialConversaciones() {
    const modal = document.getElementById("modal-coach-history");
    if (!modal) return;
    renderizarListaHistorial();
    modal.classList.add("active");
    sincronizarConversacionesFirestoreBg();
}

export function cerrarHistorialConversaciones() {
    const modal = document.getElementById("modal-coach-history");
    if (modal) modal.classList.remove("active");
}

/**
 * Enviar mensaje del usuario al proveedor IA activo con streaming SSE instantáneo
 */
export async function enviarMensajeUsuario(textoForzado = null) {
    if (state.enGeneracion) return;

    const textarea = document.getElementById("coach-input-text");
    const texto = (textoForzado || (textarea ? textarea.value : "")).trim();
    if (!texto) return;

    // Verificar clave del proveedor activo ANTES de pintar estado de carga
    const aiConfig = getAIConfig();
    const providerMeta = getProviderMeta(aiConfig.providerId);
    const apiKey = await getProviderApiKey(aiConfig.providerId);
    if (!apiKey) {
        abrirModalKey();
        mostrarToastCoach(`⚙️ Configura tu API Key de ${providerMeta.nombre}`);
        return;
    }

    if (textarea) {
        textarea.value = "";
        textarea.style.height = "auto";
    }

    // Si estaba grabando voz, detener micrófono al enviar
    if (state.isRecording) {
        const btnMic = document.getElementById("btn-coach-ptt") || document.getElementById("btn-coach-mic");
        const hintEl = document.getElementById("coach-ptt-hint");
        detenerGrabacionCoach(btnMic, hintEl);
    }

    agregarMensajeAlChat("user", texto, new Date(), false);
    registrarMensajeEnConversacion("user", texto, aiConfig, false);
    mostrarTyping(true, `Conectando con ${providerMeta.nombre} (${aiConfig.model})...`);
    state.enGeneracion = true;
    state.abortController = new AbortController();
    actualizarEstadoBotonEnviar(true);

    let streamBubble = null;
    let textoParcialAcumulado = "";

    try {
        // 1. Memoria (0 ms) + Biometría (caché 60s o paralelo máx 2s)
        const [memoria, biometricPayload] = await Promise.all([
            obtenerMemoriaCoach(),
            buildCoachContext()
        ]);
        const systemInstruction = construirSystemPrompt(memoria, biometricPayload);

        // 2. Ventana rotativa de los últimos 6 mensajes + turno actual
        const messages = [
            ...state.historialConversacion.slice(-6).map(m => ({
                role: m.role === "user" ? "user" : "assistant",
                text: m.text
            })),
            { role: "user", text: texto }
        ];

        // 3. Streaming unificado multi-proveedor
        let primerChunk = true;
        const respuestaCompleta = await streamAICompletion({
            providerId: aiConfig.providerId,
            model: aiConfig.model,
            apiKey,
            systemInstruction,
            messages,
            signal: state.abortController.signal,
            onChunk: (acumulado) => {
                textoParcialAcumulado = acumulado;
                if (primerChunk) {
                    mostrarTyping(false);
                    streamBubble = iniciarBurbujaStreaming();
                    primerChunk = false;
                }
                if (streamBubble) {
                    streamBubble.actualizar(acumulado);
                }
            }
        });

        mostrarTyping(false);

        if (streamBubble) {
            streamBubble.finalizar(respuestaCompleta);
        } else {
            agregarMensajeAlChat("coach", respuestaCompleta, new Date(), false);
        }

        // 4. Actualizar memoria rotativa (últimos 6 mensajes) y persistir conversación (local + Firestore)
        state.historialConversacion.push({ role: "user", text: texto });
        state.historialConversacion.push({ role: "model", text: respuestaCompleta });
        if (state.historialConversacion.length > 6) {
            state.historialConversacion = state.historialConversacion.slice(-6);
        }
        registrarMensajeEnConversacion("model", respuestaCompleta, aiConfig, true);

        // 5. Actualización de memoria a largo plazo si la IA incluyó bloque json_memory
        const matchMemoria = respuestaCompleta.match(/```json_memory\s*([\s\S]*?)\s*```/);
        if (matchMemoria && matchMemoria[1]) {
            try {
                const jsonMemoria = JSON.parse(matchMemoria[1]);
                await guardarMemoriaCoach({
                    ...state.memoriaActual,
                    ...jsonMemoria
                });
                mostrarToastCoach("🧠 Memoria del Coach actualizada");
            } catch (errJson) {
                console.warn("Aviso al parsear json_memory del Coach:", errJson);
            }
        }

        // 6. Lectura por voz si está activada
        reproducirVozCoach(respuestaCompleta);

    } catch (err) {
        mostrarTyping(false);

        if (err.name === "AbortError") {
            if (streamBubble && textoParcialAcumulado.trim()) {
                streamBubble.finalizar(textoParcialAcumulado, "⏹ Generación detenida");
                registrarMensajeEnConversacion("model", textoParcialAcumulado, aiConfig, true);
                state.historialConversacion.push({ role: "user", text: texto });
                state.historialConversacion.push({ role: "model", text: textoParcialAcumulado });
                if (state.historialConversacion.length > 6) {
                    state.historialConversacion = state.historialConversacion.slice(-6);
                }
            } else if (streamBubble) {
                streamBubble.eliminar();
            }
            return;
        }

        if (streamBubble) {
            streamBubble.eliminar();
        }
        console.error("Error al procesar mensaje con el Coach:", err);
        const mensajeAmigable = `⚠️ **No he podido obtener respuesta de ${providerMeta.nombre}.**\n\n${err.message || "Comprueba tu conexión a internet o revisa tu configuración en Configurar IA."}`;
        agregarMensajeAlChat("coach", mensajeAmigable, new Date(), false);
    } finally {
        state.enGeneracion = false;
        state.abortController = null;
        actualizarEstadoBotonEnviar(false);
    }
}

export function enviarPreguntaRapida(pregunta) {
    enviarMensajeUsuario(pregunta);
}

// ========================================================
// 6. GESTIÓN DEL MODAL MULTI-PROVEEDOR & BÓVEDA CIFRADA
// ========================================================

function actualizarHeaderProveedor() {
    const config = getAIConfig();
    const meta = getProviderMeta(config.providerId);
    const badgeEl = document.getElementById("coach-provider-badge");
    const modelPill = document.getElementById("coach-model-pill");

    if (badgeEl) badgeEl.textContent = meta.badge;
    if (modelPill) {
        modelPill.textContent = config.model;
        modelPill.title = `${meta.nombre} · ${config.model}`;
    }
}

function poblarSelectModelos(providerId, modeloPreferido = "") {
    const meta = getProviderMeta(providerId);
    const selectModel = document.getElementById("select-ai-model");
    const customWrap = document.getElementById("custom-model-wrap");
    const customInput = document.getElementById("input-custom-model");
    if (!selectModel) return;

    selectModel.innerHTML = "";
    meta.modelos.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.label;
        selectModel.appendChild(opt);
    });

    const optCustom = document.createElement("option");
    optCustom.value = "__custom__";
    optCustom.textContent = "✏️ Otro modelo (escribir ID manual)...";
    selectModel.appendChild(optCustom);

    const esPredefinido = meta.modelos.some(m => m.id === modeloPreferido);
    if (modeloPreferido && !esPredefinido) {
        selectModel.value = "__custom__";
        if (customWrap) customWrap.style.display = "block";
        if (customInput) customInput.value = modeloPreferido;
    } else {
        selectModel.value = esPredefinido ? modeloPreferido : meta.defaultModel;
        if (customWrap) customWrap.style.display = "none";
        if (customInput) customInput.value = "";
    }
}

function obtenerModeloSeleccionadoModal(providerId) {
    const meta = getProviderMeta(providerId);
    const selectModel = document.getElementById("select-ai-model");
    const customInput = document.getElementById("input-custom-model");
    if (!selectModel) return meta.defaultModel;
    if (selectModel.value === "__custom__") {
        return (customInput?.value || "").trim() || meta.defaultModel;
    }
    return selectModel.value || meta.defaultModel;
}

async function refrescarCamposProveedorModal(providerId) {
    const meta = getProviderMeta(providerId);
    const config = getAIConfig();
    const modeloGuardado = config.modelosPorProveedor?.[providerId] || meta.defaultModel;

    poblarSelectModelos(providerId, modeloGuardado);

    const descEl = document.getElementById("provider-desc-hint");
    const labelKey = document.getElementById("label-ai-key");
    const inputKey = document.getElementById("input-gemini-key");
    const statusText = document.getElementById("gemini-key-status-text");
    const helpLink = document.getElementById("link-ai-key-help");

    if (descEl) descEl.textContent = meta.descripcion;
    if (labelKey) labelKey.textContent = meta.keyLabel;
    if (inputKey) {
        inputKey.placeholder = `Introduce tu clave ${meta.keyPlaceholder}`;
        inputKey.type = "password";
    }
    const eyeBtn = document.getElementById("btn-toggle-key-eye");
    if (eyeBtn) eyeBtn.textContent = "👁️";

    if (helpLink) {
        helpLink.href = meta.helpUrl;
        helpLink.textContent = meta.helpText;
    }

    const key = await getProviderApiKey(providerId);
    if (inputKey) inputKey.value = key || "";

    if (statusText) {
        if (key) {
            statusText.textContent = `🟢 Clave de ${meta.nombre} cifrada en bóveda`;
            statusText.className = "status-online";
        } else {
            statusText.textContent = `⚠️ Clave de ${meta.nombre} no configurada`;
            statusText.className = "status-warning";
        }
    }
}

export async function abrirModalKey() {
    const modal = document.getElementById("modal-gemini-key");
    const selectProvider = document.getElementById("select-ai-provider");
    const config = getAIConfig();

    if (modal) modal.classList.add("active");

    if (selectProvider) {
        selectProvider.innerHTML = "";
        Object.values(AI_PROVIDERS).forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.id;
            const marca = hasStoredKeySync(p.id) ? " ✓" : "";
            opt.textContent = `${p.nombre}${marca}`;
            selectProvider.appendChild(opt);
        });
        selectProvider.value = config.providerId;
    }

    await refrescarCamposProveedorModal(config.providerId);
}

export async function alCambiarProveedorModal() {
    const selectProvider = document.getElementById("select-ai-provider");
    if (!selectProvider) return;
    await refrescarCamposProveedorModal(selectProvider.value);
}

export function alCambiarModeloModal() {
    const selectModel = document.getElementById("select-ai-model");
    const customWrap = document.getElementById("custom-model-wrap");
    const customInput = document.getElementById("input-custom-model");
    if (!selectModel || !customWrap) return;

    const esCustom = selectModel.value === "__custom__";
    customWrap.style.display = esCustom ? "block" : "none";
    if (esCustom && customInput) {
        setTimeout(() => customInput.focus(), 60);
    }
}

export function cerrarModalKey() {
    const modal = document.getElementById("modal-gemini-key");
    if (modal) modal.classList.remove("active");
}

export async function guardarKey() {
    const selectProvider = document.getElementById("select-ai-provider");
    const input = document.getElementById("input-gemini-key");
    const statusText = document.getElementById("gemini-key-status-text");
    if (!input) return;

    const providerId = selectProvider ? selectProvider.value : getAIConfig().providerId;
    const meta = getProviderMeta(providerId);
    const model = obtenerModeloSeleccionadoModal(providerId);
    const val = input.value.trim();

    if (!val) {
        alert(`Por favor introduce una API Key válida para ${meta.nombre} o pulsa 'Borrar Clave'.`);
        return;
    }

    try {
        saveAIConfig(providerId, model);
        await saveProviderApiKey(providerId, val);
        actualizarHeaderProveedor();
        actualizarBotonKeyBadge(true);

        if (statusText) {
            statusText.textContent = `🟢 ${meta.nombre} (${model}) guardado en bóveda`;
            statusText.className = "status-online";
        }
        mostrarToastCoach(`🔒 ${meta.nombre} configurado (${model})`);
        setTimeout(() => cerrarModalKey(), 550);
    } catch (err) {
        console.error("Error al guardar configuración IA:", err);
        alert("Error al cifrar y guardar la clave: " + err.message);
    }
}

export async function borrarKey() {
    const selectProvider = document.getElementById("select-ai-provider");
    const providerId = selectProvider ? selectProvider.value : getAIConfig().providerId;
    const meta = getProviderMeta(providerId);

    await saveProviderApiKey(providerId, "");

    const input = document.getElementById("input-gemini-key");
    if (input) input.value = "";
    const statusText = document.getElementById("gemini-key-status-text");
    if (statusText) {
        statusText.textContent = `⚠️ Clave de ${meta.nombre} eliminada`;
        statusText.className = "status-warning";
    }

    // Actualizar badge principal si borró la del proveedor activo
    const configActiva = getAIConfig();
    actualizarBotonKeyBadge(hasStoredKeySync(configActiva.providerId));
    mostrarToastCoach(`🗑️ Clave de ${meta.nombre} eliminada`);
}

export async function probarConexionKey() {
    const selectProvider = document.getElementById("select-ai-provider");
    const input = document.getElementById("input-gemini-key");
    const statusText = document.getElementById("gemini-key-status-text");
    const btnTest = document.querySelector(".btn-test-key");

    const providerId = selectProvider ? selectProvider.value : getAIConfig().providerId;
    const meta = getProviderMeta(providerId);
    const model = obtenerModeloSeleccionadoModal(providerId);
    const keyAProbar = (input && input.value.trim()) || await getProviderApiKey(providerId);

    if (!keyAProbar) {
        if (statusText) {
            statusText.textContent = `⚠️ Introduce primero una API Key de ${meta.nombre}`;
            statusText.className = "status-warning";
        }
        return;
    }

    if (statusText) {
        statusText.textContent = `🔄 Probando ${meta.nombre} (${model})...`;
        statusText.className = "status-warning";
    }
    if (btnTest) {
        btnTest.disabled = true;
        btnTest.textContent = "Probando...";
    }

    try {
        const resultado = await testAIConnection({ providerId, model, apiKey: keyAProbar });
        if (statusText) {
            statusText.textContent = `🟢 ¡Conexión válida con ${resultado.providerNombre} (${resultado.model}) en ${resultado.latenciaMs} ms!`;
            statusText.className = "status-online";
        }
        mostrarToastCoach(`✅ ${resultado.providerNombre} OK (${resultado.latenciaMs} ms)`);
    } catch (err) {
        if (statusText) {
            statusText.textContent = `❌ ${err.message}`;
            statusText.className = "status-danger";
        }
    } finally {
        if (btnTest) {
            btnTest.disabled = false;
            btnTest.textContent = "Probar Conexión";
        }
    }
}

export function alternarVisibilidadKey() {
    const input = document.getElementById("input-gemini-key");
    const btn = document.getElementById("btn-toggle-key-eye");
    if (!input) return;

    if (input.type === "password") {
        input.type = "text";
        if (btn) btn.textContent = "🙈";
    } else {
        input.type = "password";
        if (btn) btn.textContent = "👁️";
    }
}

function actualizarBotonKeyBadge(tieneKey) {
    const label = document.getElementById("btn-key-label");
    const btn = document.getElementById("btn-config-key");
    if (label) label.textContent = tieneKey ? "IA Configurada" : "Configurar IA";
    if (btn) btn.classList.toggle("active", tieneKey);
}

/**
 * Exporta una copia de seguridad local completa en formato .json
 */
export async function exportarCopiaSeguridad() {
    try {
        const memoria = await obtenerMemoriaCoach();
        const entradasDiario = obtenerEntradasBitacora() || [];
        const aiConfig = getAIConfig();

        let registrosPeso = [];
        const snap = await conTimeout(
            getDocs(query(collection(db, "registros_peso"), orderBy("timestamp", "desc"), limit(25))),
            FIRESTORE_TIMEOUT_MS,
            null
        );
        if (snap && !snap.empty) {
            registrosPeso = snap.docs.map(d => d.data());
        }

        let biometriaLocal = {};
        try {
            biometriaLocal = JSON.parse(localStorage.getItem("health_context_ai") || "{}");
        } catch (_) {}

        const backupData = {
            aplicacion: "Antigravity Fitness AI Coach",
            version: "2.2",
            proveedor_ia: { providerId: aiConfig.providerId, model: aiConfig.model },
            exportadoEn: new Date().toISOString(),
            coach_memory: memoria,
            diario_entradas: entradasDiario,
            registros_peso: registrosPeso,
            biometria_salud: biometriaLocal,
            historial_chat_reciente: state.historialConversacion,
            conversaciones_guardadas: state.conversaciones
        };

        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);

        const fechaHoy = new Date().toISOString().split("T")[0];
        const a = document.createElement("a");
        a.href = url;
        a.download = `antigravity_backup_${fechaHoy}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        mostrarToastCoach("📥 Copia de seguridad exportada en .json");
    } catch (err) {
        console.error("Error al exportar copia de seguridad:", err);
        alert("Error al exportar la copia de seguridad: " + err.message);
    }
}

// ========================================================
// 7. INICIALIZACIÓN Y CICLO DE VIDA (SPA)
// ========================================================

export async function initCoach() {
    configurarMicrofonoCoach();

    // Actualizar cabecera con proveedor y modelo activos
    const config = getAIConfig();
    actualizarHeaderProveedor();
    const tieneKey = !!(await getProviderApiKey(config.providerId));
    actualizarBotonKeyBadge(tieneKey);

    // Sincronizar estado inicial de voz
    const iconOn = document.getElementById("icon-voice-on");
    const iconOff = document.getElementById("icon-voice-off");
    const labelVoz = document.getElementById("btn-voice-label");
    const btnVoz = document.getElementById("btn-toggle-voz");
    if (iconOn) iconOn.style.display = state.vozActivada ? "inline-block" : "none";
    if (iconOff) iconOff.style.display = state.vozActivada ? "none" : "inline-block";
    if (labelVoz) labelVoz.textContent = state.vozActivada ? "Voz Activa" : "Silenciado";
    if (btnVoz) btnVoz.classList.toggle("active", state.vozActivada);

    // Restaurar conversación activa al instante (0 ms) para no perder el chat al cambiar de pestaña
    cargarConversacionesLocal();
    renderizarConversacionActiva();

    // Precargar memoria, historial en la nube y contexto biométrico sin bloquear la UI
    obtenerMemoriaCoach();
    sincronizarConversacionesFirestoreBg();
    buildCoachContext(true);

    // Soporte para Enter en textarea
    const textarea = document.getElementById("coach-input-text");
    if (textarea) {
        textarea.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                enviarMensajeUsuario();
            }
        });
    }
}

export function cleanupCoach() {
    detenerGeneracion();

    if (state.reconocimientoVoz) {
        try { state.reconocimientoVoz.abort(); } catch (_) {}
        state.reconocimientoVoz = null;
    }
    state.isRecording = false;
    state.grabandoPtt = false;
    state.transcriptAcumulado = "";

    const btnMic = document.getElementById("btn-coach-ptt") || document.getElementById("btn-coach-mic");
    const hintEl = document.getElementById("coach-ptt-hint");
    actualizarFeedbackVisualCoach(btnMic, hintEl, false);

    if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
    }
    if (state.chartInstance) {
        state.chartInstance.destroy();
        state.chartInstance = null;
    }
}

// Helpers
function formatearMarkdownSeguro(texto) {
    if (!texto) return "";
    let html = texto
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    html = html.replace(/^•\s?(.*)$/gm, "<li>$1</li>");
    html = html.replace(/^- (.*)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
    html = html.replace(/\n\n/g, "</p><p>");
    html = html.replace(/\n/g, "<br>");
    return `<p>${html}</p>`;
}

function escaparAttr(txt) {
    return (txt || "").replace(/'/g, "\\'").replace(/"/g, "&quot;").replace(/\n/g, " ");
}

function mostrarToastCoach(msg) {
    const toast = document.createElement("div");
    toast.className = "toast-notification toast-success";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

// Exportar globalmente para handlers inline
window.coach = {
    alternarVoz,
    reproducirTexto: reproducirVozCoach,
    alternarVisorGrafica,
    cambiarTipoGrafica,
    alternarGrabacionCoach,
    alternarGrabacionVoz: alternarGrabacionCoach,
    enviarMensajeUsuario,
    manejarBotonEnviar,
    detenerGeneracion,
    enviarPreguntaRapida,
    buildCoachContext,
    abrirModalKey,
    cerrarModalKey,
    abrirHistorialConversaciones,
    cerrarHistorialConversaciones,
    iniciarNuevaConversacion,
    retomarConversacion,
    eliminarConversacion,
    guardarRutinaPropuesta,
    abrirRutinaGuardada,
    alCambiarProveedorModal,
    alCambiarModeloModal,
    guardarKey,
    borrarKey,
    probarConexionKey,
    alternarVisibilidadKey,
    exportarCopiaSeguridad,
    abrirModalMemoria: exportarCopiaSeguridad
};

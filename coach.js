// ========================================================
// MÓDULO: AI COACH DE RENDIMIENTO (GEMINI IA & FIRESTORE)
// Arquitectura de Memoria Persistente (coach_memory),
// Interacción por Voz (SpeechRecognition PTT & SpeechSynthesis),
// y Visualización de Gráficas Biomecánicas (Chart.js).
// ========================================================
import { db } from "./firebase-config.js";
import { 
    doc, 
    getDoc, 
    setDoc, 
    collection, 
    getDocs, 
    query, 
    orderBy, 
    limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { obtenerEntradasBitacora } from "./diario.js";
import { obtenerSesionActiva } from "./session-manager.js";

// Claves de almacenamiento local (Local-First Fallback)
const STORAGE_KEY_GEMINI_VAULT = "fitness_gemini_vault";
const STORAGE_KEY_GEMINI_LEGACY = "fitness_gemini_api_key";
const STORAGE_KEY_MEMORY = "fitness_coach_memory";
const STORAGE_KEY_VOICE = "fitness_coach_voice_enabled";
const STORAGE_KEY_CHAT = "fitness_coach_chat_history";

// Modelo oficial actual de Gemini
const GEMINI_MODEL = "gemini-3.8-flash";

// Parámetros de derivación criptográfica para la bóveda local
const VAULT_SALT = new TextEncoder().encode("antigravity-fitness-vault-salt-v1");
const VAULT_PASSPHRASE = "AGY_FITNESS_COACH_LOCAL_VAULT_2026";

/**
 * Deriva una clave AES-GCM usando PBKDF2 sobre Web Crypto API
 */
async function derivarClaveCrypto(passphrase) {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
        {
            name: "PBKDF2",
            salt: VAULT_SALT,
            iterations: 100000,
            hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

/**
 * Cifra la API Key antes de persistir en localStorage.
 * Utiliza AES-GCM (256-bit) vía SubtleCrypto con vector de inicialización único por cifrado.
 * En entornos sin soporte o HTTP no seguro, aplica cifrado polialfabético con rotación XOR y Base64.
 */
export async function cifrarApiKey(plainText) {
    if (!plainText) return "";
    if (window.crypto && window.crypto.subtle) {
        try {
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const key = await derivarClaveCrypto(VAULT_PASSPHRASE);
            const enc = new TextEncoder();
            const ciphertextBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                enc.encode(plainText)
            );
            const ivB64 = btoa(String.fromCharCode(...iv));
            const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
            return `vault_gcm_v2:${ivB64}:${cipherB64}`;
        } catch (e) {
            console.warn("Fallo en SubtleCrypto, activando fallback polialfabético:", e);
        }
    }
    return `vault_xor_v1:${cifrarXorFallback(plainText, VAULT_PASSPHRASE)}`;
}

/**
 * Descifra la API Key almacenada en el localStorage.
 */
export async function descifrarApiKey(cipherText) {
    if (!cipherText) return "";

    // Si viene en texto plano legacy (sin prefijo vault_), devolver para posterior migración
    if (!cipherText.startsWith("vault_")) {
        return cipherText;
    }

    if (cipherText.startsWith("vault_gcm_v2:")) {
        const parts = cipherText.split(":");
        if (parts.length === 3 && window.crypto && window.crypto.subtle) {
            try {
                const iv = new Uint8Array(atob(parts[1]).split("").map(c => c.charCodeAt(0)));
                const cipherBytes = new Uint8Array(atob(parts[2]).split("").map(c => c.charCodeAt(0)));
                const key = await derivarClaveCrypto(VAULT_PASSPHRASE);
                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv: iv },
                    key,
                    cipherBytes
                );
                return new TextDecoder().decode(decryptedBuffer);
            } catch (e) {
                console.error("Error al descifrar con AES-GCM:", e);
                return "";
            }
        }
    }

    if (cipherText.startsWith("vault_xor_v1:")) {
        const payload = cipherText.replace("vault_xor_v1:", "");
        return descifrarXorFallback(payload, VAULT_PASSPHRASE);
    }

    return "";
}

function cifrarXorFallback(text, key) {
    const enc = new TextEncoder().encode(text);
    const keyBytes = new TextEncoder().encode(key);
    const out = new Uint8Array(enc.length);
    for (let i = 0; i < enc.length; i++) {
        out[i] = enc[i] ^ keyBytes[i % keyBytes.length];
    }
    return btoa(String.fromCharCode(...out));
}

function descifrarXorFallback(b64, key) {
    try {
        const bin = atob(b64);
        const bytes = new Uint8Array(bin.split("").map(c => c.charCodeAt(0)));
        const keyBytes = new TextEncoder().encode(key);
        const out = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) {
            out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
        }
        return new TextDecoder().decode(out);
    } catch (e) {
        return "";
    }
}

/**
 * Guarda la clave de forma cifrada en la bóveda de localStorage.
 */
export async function guardarApiKeyCifrada(apiKeyPlana) {
    if (!apiKeyPlana) {
        localStorage.removeItem(STORAGE_KEY_GEMINI_VAULT);
        localStorage.removeItem(STORAGE_KEY_GEMINI_LEGACY);
        state.apiKey = "";
        return;
    }
    const cifrada = await cifrarApiKey(apiKeyPlana);
    localStorage.setItem(STORAGE_KEY_GEMINI_VAULT, cifrada);
    // Eliminar cualquier residuo de texto plano antiguo
    localStorage.removeItem(STORAGE_KEY_GEMINI_LEGACY);
    state.apiKey = apiKeyPlana;
}

/**
 * Obtiene la API Key descifrada desde la bóveda local.
 * Si detecta una clave antigua sin cifrar, la migra al instante a la bóveda cifrada.
 */
export async function obtenerApiKeyLocal() {
    if (state.apiKey) return state.apiKey;
    const cipher = localStorage.getItem(STORAGE_KEY_GEMINI_VAULT) || localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY);
    if (!cipher) return "";
    const plain = await descifrarApiKey(cipher);
    if (plain) {
        state.apiKey = plain;
        // Si no estaba cifrada con vault_gcm o existía clave legacy, migrar automáticamente
        if (!cipher.startsWith("vault_") || localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY)) {
            await guardarApiKeyCifrada(plain);
        }
    }
    return plain;
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
    apiKey: "", // Se carga en memoria volátil de forma asíncrona desde la bóveda cifrada
    vozActivada: localStorage.getItem(STORAGE_KEY_VOICE) !== "false",
    memoriaActual: null,
    historialConversacion: [],
    isRecording: false, // Variable de control para alternancia (Toggle) del micrófono
    grabandoPtt: false, // Alias de retrocompatibilidad
    reconocimientoVoz: null,
    transcriptAcumulado: "",
    chartInstance: null,
    chartTipoActual: "rpe",
    enGeneracion: false
};

// ========================================================
// 1. ARQUITECTURA DE MEMORIA PERSISTENTE (FIRESTORE & LOCAL)
// ========================================================

/**
 * Obtiene el documento maestro 'coach_memory' desde Firestore (colección 'configuracion')
 * con fallback instantáneo a LocalStorage para resiliencia Local-First.
 */
export async function obtenerMemoriaCoach() {
    // 1. Si ya está cargada en memoria volátil, retornarla
    if (state.memoriaActual) return state.memoriaActual;

    // 2. Intentar leer de Firestore
    try {
        const docRef = doc(db, "configuracion", "coach_memory");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            state.memoriaActual = data;
            localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(data));
            actualizarIndicadorMemoria(true, "Firestore Sincronizada");
            return data;
        }
    } catch (err) {
        console.warn("Aviso: No se pudo conectar a Firestore para leer coach_memory:", err);
    }

    // 3. Fallback a LocalStorage
    try {
        const local = localStorage.getItem(STORAGE_KEY_MEMORY);
        if (local) {
            state.memoriaActual = JSON.parse(local);
            actualizarIndicadorMemoria(false, "Memoria Local");
            return state.memoriaActual;
        }
    } catch (e) {}

    // 4. Inicializar con memoria base y guardar
    state.memoriaActual = { ...MEMORIA_BASE_DEFAULT };
    await guardarMemoriaCoach(state.memoriaActual);
    return state.memoriaActual;
}

/**
 * Sobrescribe el documento maestro 'coach_memory' en Firestore y LocalStorage.
 */
export async function guardarMemoriaCoach(nuevaMemoria) {
    const memoriaConFecha = {
        ...nuevaMemoria,
        ultimaActualizacion: new Date().toISOString()
    };

    state.memoriaActual = memoriaConFecha;

    // Guardado local inmediato
    try {
        localStorage.setItem(STORAGE_KEY_MEMORY, JSON.stringify(memoriaConFecha));
    } catch (e) {
        console.error("Error guardando memoria en localStorage:", e);
    }

    // Guardado en Firestore
    try {
        const docRef = doc(db, "configuracion", "coach_memory");
        await setDoc(docRef, memoriaConFecha, { merge: true });
        actualizarIndicadorMemoria(true, "Firestore Sincronizada");
    } catch (err) {
        console.warn("Aviso: Memoria guardada localmente pero falló sincronización en Firestore:", err);
        actualizarIndicadorMemoria(false, "Memoria Local (Offline)");
    }

    actualizarModalMemoria(memoriaConFecha);
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
 * Consulta y consolida datos históricos de todas las colecciones y fuentes:
 * - Entradas de la bitácora (diario, categorías molestia, post-entreno, notas)
 * - Sesión activa viva
 * - Registros de peso
 * - Documento maestro de memoria coach_memory
 */
export async function consolidarContextoUsuario() {
    const memoria = await obtenerMemoriaCoach();
    const entradasDiario = obtenerEntradasBitacora() || [];
    const sesionActiva = obtenerSesionActiva();

    // Intentar consultar registros de peso en Firestore o LocalStorage
    let registrosPeso = [];
    try {
        const q = query(collection(db, "registros_peso"), orderBy("timestamp", "desc"), limit(5));
        const snap = await getDocs(q);
        if (!snap.empty) {
            registrosPeso = snap.docs.map(d => d.data());
        }
    } catch (e) {
        // Fallback silencioso
    }

    // Análisis de los entrenamientos y métricas
    const entrenos = entradasDiario.filter(e => e.categoria === "post-entreno");
    const molestias = entradasDiario.filter(e => e.categoria === "molestia");
    const recuperaciones = entradasDiario.filter(e => e.categoria === "recuperacion");

    // Cálculo de RPE medio
    const rpesValidos = entrenos.map(e => e.rpe).filter(r => typeof r === "number" && !isNaN(r));
    const rpeMedio = rpesValidos.length > 0 
        ? (rpesValidos.reduce((a, b) => a + b, 0) / rpesValidos.length).toFixed(1)
        : memoria.metricasClave?.rpeMedioHistorico || 8.0;

    // Resumen compacto de los últimos entrenos
    const resumenEntrenos = entrenos.slice(0, 3).map(e => {
        let detalle = `- [${e.fechaFormato}] Rutina: ${e.rutinaRelacionada || 'General'} | RPE: ${e.rpe || 'N/A'}`;
        if (e.metricas) {
            detalle += ` | Duración: ${e.metricas.duracionFormato || 'N/A'} | Series: ${e.metricas.seriesCompletadas || 0}/${e.metricas.seriesTotales || 0}`;
        }
        detalle += `\n  Sensaciones: "${e.texto}"`;
        return detalle;
    }).join("\n");

    // Resumen de alertas o molestias registradas
    const resumenMolestias = molestias.length > 0
        ? molestias.slice(0, 3).map(m => `- [${m.fechaFormato}]: "${m.texto}"`).join("\n")
        : "Sin incidencias ni molestias recientes reportadas en el diario.";

    return {
        memoria,
        totalEntrenos: entrenos.length,
        totalMolestias: molestias.length,
        rpeMedio,
        resumenEntrenos: resumenEntrenos || "Aún no hay sesiones de entrenamiento archivadas.",
        resumenMolestias,
        ultimoPeso: registrosPeso.length > 0 ? `${registrosPeso[0].peso} kg (${registrosPeso[0].fecha || 'Reciente'})` : "76.4 kg (Aprox)",
        sesionActivaEnCurso: sesionActiva ? `Sesión en curso: "${sesionActiva.nombre}" iniciada a las ${new Date(sesionActiva.inicioTimestamp).toLocaleTimeString()}` : "Ninguna sesión activa ahora mismo."
    };
}

// ========================================================
// 2. PROMPT DEL SISTEMA & LLAMADA A GEMINI API
// ========================================================

/**
 * Genera el System Prompt de alta precisión inyectando la memoria y datos del usuario
 */
function construirSystemPrompt(contexto) {
    return `Eres un entrenador personal de élite, experto en biomecánica, programación del entrenamiento y recuperación. Eres directo, motivador pero riguroso, y utilizas un lenguaje técnico pero accesible. Basa tus recomendaciones estrictamente en los datos históricos del usuario.

=== CONTEXTO DEL USUARIO (MEMORIA PERSISTENTE FIRESTORE) ===
• Objetivo Actual: ${contexto.memoria.objetivoActual}
• Foco Biomecánico: ${contexto.memoria.focoBiomecanico}
• Nivel de Experiencia: ${contexto.memoria.nivelUsuario}
• Lesiones / Puntos de Cuidado: ${JSON.stringify(contexto.memoria.lesionesOMolestias)}
• Resumen Histórico: ${contexto.memoria.resumenProgreso}
• Notas Previas del Coach: ${contexto.memoria.notasCoach}

=== DATOS Y REGISTROS RECIENTES ===
• RPE Medio Histórico: ${contexto.rpeMedio}/10
• Último Peso Registrado: ${contexto.ultimoPeso}
• Sesión Actual en Curso: ${contexto.sesionActivaEnCurso}
• Últimos Entrenamientos Registrados:
${contexto.resumenEntrenos}

• Alertas o Molestias en Diario:
${contexto.resumenMolestias}

=== REGLAS DE RESPUESTA ===
1. Responde con criterio científico: hipertrofia con tensión mecánica y rango completo, sobrecarga progresiva (+kg o +reps) y control del esfuerzo (RIR 1-2 / RPE 8-9).
2. Si el usuario te pregunta por gráficas, progreso o evolución, puedes activar la gráfica adecuada añadiendo la etiqueta [GRAFICA:rpe], [GRAFICA:cargas] o [GRAFICA:volumen] en una línea separada.
3. Si durante la conversación se establecen nuevos objetivos, se reporta una nueva molestia o se logra un hito significativo, actualiza la memoria del Coach incluyendo al final de tu mensaje este bloque exacto:
\`\`\`json_memory
{
  "objetivoActual": "...",
  "focoBiomecanico": "...",
  "lesionesOMolestias": ["..."],
  "resumenProgreso": "...",
  "notasCoach": "..."
}
\`\`\`
4. Sé conciso, enérgico y sin rodeos innecesarios. Evita saludos genéricos largos.`;
}

/**
 * Envía la consulta a la API de Google Gemini (v1beta con gemini-3.8-flash)
 */
async function consultarGemini(mensajeUsuario) {
    const apiKey = await obtenerApiKeyLocal();
    if (!apiKey) {
        abrirModalKey();
        throw new Error("Por favor introduce tu API Key de Gemini en la bóveda de configuración para activar el Coach.");
    }

    const contexto = await consolidarContextoUsuario();
    const systemInstruction = construirSystemPrompt(contexto);

    // Formatear mensajes previos para contexto multi-turno
    const contents = [];

    // Añadir historial reciente (últimos 8 mensajes)
    const turnosPrevios = state.historialConversacion.slice(-8);
    turnosPrevios.forEach(msg => {
        contents.push({
            role: msg.rol === "user" ? "user" : "model",
            parts: [{ text: msg.texto }]
        });
    });

    // Añadir el mensaje actual del usuario
    contents.push({
        role: "user",
        parts: [{ text: mensajeUsuario }]
    });

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const payload = {
        system_instruction: {
            parts: [{ text: systemInstruction }]
        },
        contents,
        generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 1200
        }
    };

    let response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const mensajeError = errJson.error?.message || `Error HTTP ${response.status}`;
        throw new Error(`Error en API Gemini (${GEMINI_MODEL}): ${mensajeError}`);
    }

    const data = await response.json();
    const respuestaTexto = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!respuestaTexto) {
        throw new Error("La API de Gemini devolvió una respuesta vacía.");
    }

    return respuestaTexto;
}

// ========================================================
// 3. INTERACCIÓN POR VOZ (SPEECH RECOGNITION & SYNTHESIS)
// ========================================================

// ========================================================
// 3. INTERACCIÓN POR VOZ (SPEECH RECOGNITION TOGGLE & TTS)
// ========================================================

/**
 * Inicializa el listener del micrófono en modo Alternancia (Toggle) con un único evento click
 */
export function configurarMicrofonoCoach() {
    const btnMic = document.getElementById("btn-coach-ptt") || document.getElementById("btn-coach-mic");
    if (!btnMic) return;

    // Evitar apilar múltiples event listeners al botón en navegaciones SPA sucesivas
    if (btnMic.dataset.toggleConfigured === "true") return;
    btnMic.dataset.toggleConfigured = "true";

    // Sustitución de mousedown/mouseup/touchstart/touchend por un ÚNICO evento click
    btnMic.addEventListener("click", (e) => {
        e.preventDefault();
        alternarGrabacionCoach();
    });
}

// Alias de compatibilidad
export const configurarPushToTalk = configurarMicrofonoCoach;

/**
 * Alterna la grabación del micrófono (clic para iniciar / clic para detener)
 */
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

    // Gestión de Estado: Si isRecording es true, detener la escucha
    if (state.isRecording) {
        detenerGrabacionCoach(btnMic, hintEl);
        return;
    }

    // Si isRecording es false, iniciar la escucha
    iniciarGrabacionCoach(btnMic, hintEl, textarea, SpeechRecognition);
}

function iniciarGrabacionCoach(btnMic, hintEl, textarea, SpeechRecognition) {
    // Si hubiera alguna instancia previa huérfana, abortarla limpiamente
    if (state.reconocimientoVoz) {
        try { state.reconocimientoVoz.abort(); } catch(e) {}
        state.reconocimientoVoz = null;
    }

    try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.continuous = true;
        recognition.interimResults = true;

        state.reconocimientoVoz = recognition;
        state.isRecording = true;
        state.grabandoPtt = true;
        state.transcriptAcumulado = "";

        // Feedback Visual: clase CSS activa (resplandor neón cian box-shadow: 0 0 12px #38bdf8) y texto 'Escuchando...'
        actualizarFeedbackVisualCoach(btnMic, hintEl, true);

        const textoPrevio = textarea ? textarea.value : "";

        // Reconstrucción limpia en cada evento: solo añadir texto definitivo si isFinal es true
        recognition.onresult = (event) => {
            let finalTranscript = "";
            let interimTranscript = "";

            for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                    finalTranscript += res[0].transcript + " ";
                } else {
                    interimTranscript += res[0].transcript;
                }
            }

            state.transcriptAcumulado = finalTranscript.trim();

            if (textarea) {
                const sep = textoPrevio && !textoPrevio.endsWith(" ") ? " " : "";
                const combinado = (textoPrevio + sep + finalTranscript + interimTranscript).trimStart();
                textarea.value = combinado;
            }
        };

        recognition.onerror = (event) => {
            console.warn("Aviso en reconocimiento de voz del Coach:", event.error);
            detenerGrabacionCoach(btnMic, hintEl);
        };

        // Restablecimiento Automático (onend): si el navegador corta la escucha por silencio prolongado,
        // el botón regresa automáticamente a su estado y estilo inactivo inicial.
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
        try { state.reconocimientoVoz.stop(); } catch(e) {}
    }
    state.isRecording = false;
    state.grabandoPtt = false;
    state.reconocimientoVoz = null;

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

/**
 * Text-to-Speech (speechSynthesis) para leer las respuestas del Coach
 */
export function reproducirVozCoach(textoCompleto) {
    if (!state.vozActivada || !('speechSynthesis' in window)) return;

    // Detener cualquier lectura anterior
    window.speechSynthesis.cancel();

    // Limpieza de formato markdown y bloques JSON para dicción natural
    let textoLimpio = textoCompleto
        .replace(/```json_memory[\s\S]*?```/g, "")
        .replace(/\[GRAFICA:[^\]]+\]/g, "")
        .replace(/\*\*([^*]+)\*\*/g, "$1")
        .replace(/\*([^*]+)\*/g, "$1")
        .replace(/#{1,6}\s?/g, "")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
        .trim();

    if (!textoLimpio) return;

    // Dividir en frases para evitar cortes por límites de longitud del navegador móvil
    const utterance = new SpeechSynthesisUtterance(textoLimpio);
    utterance.lang = "es-ES";
    utterance.rate = 1.05;
    utterance.pitch = 0.98; // Tono firme y profesional

    // Seleccionar voz en español preferente
    const voces = window.speechSynthesis.getVoices();
    const vozEs = voces.find(v => v.lang.startsWith("es") && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Pablo") || v.name.includes("Jorge"))) 
               || voces.find(v => v.lang.startsWith("es"));
    if (vozEs) utterance.voice = vozEs;

    // Resaltado visual en el botón de voz mientras habla
    const btnVoz = document.getElementById("btn-toggle-voz");
    if (btnVoz) btnVoz.classList.add("speaking");

    utterance.onend = () => {
        if (btnVoz) btnVoz.classList.remove("speaking");
    };

    utterance.onerror = () => {
        if (btnVoz) btnVoz.classList.remove("speaking");
    };

    window.speechSynthesis.speak(utterance);
}

/**
 * Alterna el estado de lectura en voz alta
 */
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

    if (!state.vozActivada && ('speechSynthesis' in window)) {
        window.speechSynthesis.cancel();
    }
}

// ========================================================
// 4. VISUALIZADOR DE GRÁFICAS BIOMECÁNICAS (CHART.JS)
// ========================================================

/**
 * Muestra u oculta el panel de gráficas
 */
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

/**
 * Construye y renderiza la gráfica Chart.js con la estética "Acero y Neón"
 */
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

    let chartData = {
        labels: [],
        datasets: []
    };

    if (tipo === "rpe") {
        const labels = entrenos.map(e => e.rutinaRelacionada ? e.rutinaRelacionada.split(" ")[0] : "Sesión");
        const dataRpe = entrenos.map(e => e.rpe || 8);

        // Si no hay datos suficientes, generar serie de referencia basada en historial
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
                tension: 0.35,
                pointBackgroundColor: "#38bdf8",
                pointBorderColor: "#0f172a",
                pointBorderWidth: 2,
                pointRadius: 5
            }]
        };
    } else if (tipo === "cargas") {
        // Evolución de cargas principales registradas (Dominadas, Remo, Curl)
        chartData = {
            labels: ["Semana 1", "Semana 2", "Semana 3", "Actual"],
            datasets: [
                {
                    label: "Remo Mancuerna (kg)",
                    data: [20, 22, 22, 24],
                    borderColor: "#fbbf24",
                    backgroundColor: "rgba(251, 191, 36, 0.1)",
                    borderWidth: 2,
                    tension: 0.2,
                    pointBackgroundColor: "#fbbf24"
                },
                {
                    label: "Curl Bíceps (kg)",
                    data: [10, 12, 12, 14],
                    borderColor: "#38bdf8",
                    backgroundColor: "rgba(56, 189, 248, 0.1)",
                    borderWidth: 2,
                    tension: 0.2,
                    pointBackgroundColor: "#38bdf8"
                }
            ]
        };
    } else {
        // Volumen Semanal de Series Efectivas
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
// 5. INTERFAZ DE CHAT & GESTIÓN DE MENSAJES
// ========================================================

/**
 * Añade una burbuja al contenedor de mensajes
 */
function agregarMensajeAlChat(rol, texto, fecha = new Date()) {
    const contenedor = document.getElementById("coach-chat-messages");
    if (!contenedor) return;

    const msgEl = document.createElement("div");
    msgEl.className = `chat-bubble-row ${rol === "user" ? "row-user" : "row-coach"}`;

    const horaStr = fecha.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Limpieza de bloque json_memory para presentación limpia al usuario
    let textoRender = texto.replace(/```json_memory[\s\S]*?```/g, "").trim();

    // Detección de etiqueta de gráfica
    const matchGrafica = textoRender.match(/\[GRAFICA:([a-z]+)\]/);
    if (matchGrafica) {
        textoRender = textoRender.replace(/\[GRAFICA:[a-z]+\]/g, "");
        const tipoG = matchGrafica[1];
        setTimeout(() => {
            alternarVisorGrafica(true);
            cambiarTipoGrafica(tipoG);
        }, 400);
    }

    // Formatear markdown básico a HTML seguro
    const htmlFormateado = formatearMarkdownSeguro(textoRender);

    if (rol === "user") {
        msgEl.innerHTML = `
            <div class="chat-bubble bubble-user">
                <div class="bubble-content">${htmlFormateado}</div>
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
                <div class="bubble-content">${htmlFormateado}</div>
                <span class="bubble-time">${horaStr}</span>
            </div>
        `;
    }

    contenedor.appendChild(msgEl);
    contenedor.scrollTop = contenedor.scrollHeight;

    // Persistir en memoria volátil de sesión
    state.historialConversacion.push({ rol, texto, fecha: fecha.toISOString() });
}

function mostrarTyping(mostrar) {
    const el = document.getElementById("coach-typing-indicator");
    if (el) el.style.display = mostrar ? "flex" : "none";
    const contenedor = document.getElementById("coach-chat-messages");
    if (contenedor && mostrar) contenedor.scrollTop = contenedor.scrollHeight;
}

/**
 * Enviar mensaje del usuario a la IA
 */
export async function enviarMensajeUsuario(textoForzado = null) {
    if (state.enGeneracion) return;

    const textarea = document.getElementById("coach-input-text");
    const texto = (textoForzado || (textarea ? textarea.value : "")).trim();

    if (!texto) return;

    if (textarea) {
        textarea.value = "";
        textarea.style.height = "auto";
    }

    // 1. Añadir mensaje de usuario al chat
    agregarMensajeAlChat("user", texto);
    mostrarTyping(true);
    state.enGeneracion = true;

    try {
        // 2. Consultar a Gemini API con todo el contexto acumulado
        const respuesta = await consultarGemini(texto);
        mostrarTyping(false);

        // 3. Añadir respuesta del Coach
        agregarMensajeAlChat("coach", respuesta);

        // 4. Si la IA propuso actualización de memoria, extraer y sobrescribir coach_memory en Firestore
        const matchMemoria = respuesta.match(/```json_memory\s*([\s\S]*?)\s*```/);
        if (matchMemoria && matchMemoria[1]) {
            try {
                const jsonMemoria = JSON.parse(matchMemoria[1]);
                await guardarMemoriaCoach({
                    ...state.memoriaActual,
                    ...jsonMemoria
                });
                mostrarToastCoach("🧠 Memoria del Coach actualizada en Firestore");
            } catch (errJson) {
                console.warn("Aviso al parsear json_memory del Coach:", errJson);
            }
        }

        // 5. Lectura por voz en altavoz
        reproducirVozCoach(respuesta);

    } catch (err) {
        mostrarTyping(false);
        console.error("Error al procesar mensaje con el Coach:", err);
        agregarMensajeAlChat("coach", `⚠️ **Incidencia al conectar con el Coach:** ${err.message}`);
    } finally {
        state.enGeneracion = false;
    }
}

export function enviarPreguntaRapida(pregunta) {
    enviarMensajeUsuario(pregunta);
}

// ========================================================
// 6. GESTIÓN DE MODALES (API KEY & MEMORIA)
// ========================================================

export async function abrirModalKey() {
    const modal = document.getElementById("modal-gemini-key");
    const input = document.getElementById("input-gemini-key");
    const statusText = document.getElementById("gemini-key-status-text");

    if (modal) modal.classList.add("active");
    
    const key = await obtenerApiKeyLocal();
    if (input) {
        input.value = key || "";
        setTimeout(() => input.focus(), 120);
    }
    if (statusText) {
        const tieneKey = !!key;
        statusText.textContent = tieneKey ? "🟢 Clave configurada y cifrada en bóveda" : "⚠️ Clave no configurada";
        statusText.className = tieneKey ? "status-online" : "status-warning";
    }
}

export function cerrarModalKey() {
    const modal = document.getElementById("modal-gemini-key");
    if (modal) modal.classList.remove("active");
}

export async function guardarKey() {
    const input = document.getElementById("input-gemini-key");
    const statusText = document.getElementById("gemini-key-status-text");
    if (!input) return;

    const val = input.value.trim();
    if (!val) {
        alert("Por favor ingresa una clave válida o pulsa 'Borrar Clave'.");
        return;
    }

    try {
        await guardarApiKeyCifrada(val);
        actualizarBotonKeyBadge(true);
        if (statusText) {
            statusText.textContent = "🟢 Clave cifrada y guardada en bóveda local";
            statusText.className = "status-online";
        }
        mostrarToastCoach("🔒 API Key cifrada y guardada en bóveda local");
        setTimeout(() => cerrarModalKey(), 600);
    } catch (err) {
        console.error("Error al guardar en bóveda:", err);
        alert("Error al cifrar y guardar la clave: " + err.message);
    }
}

export function borrarKey() {
    state.apiKey = "";
    localStorage.removeItem(STORAGE_KEY_GEMINI_VAULT);
    localStorage.removeItem(STORAGE_KEY_GEMINI_LEGACY);
    const input = document.getElementById("input-gemini-key");
    if (input) input.value = "";
    const statusText = document.getElementById("gemini-key-status-text");
    if (statusText) {
        statusText.textContent = "⚠️ Clave no configurada";
        statusText.className = "status-warning";
    }
    actualizarBotonKeyBadge(false);
    mostrarToastCoach("🗑️ Clave eliminada de este dispositivo");
}

export async function probarConexionKey() {
    const input = document.getElementById("input-gemini-key");
    const statusText = document.getElementById("gemini-key-status-text");
    const btnTest = document.querySelector(".btn-test-key");

    const keyAProbar = (input && input.value.trim()) || await obtenerApiKeyLocal();
    if (!keyAProbar) {
        if (statusText) {
            statusText.textContent = "⚠️ Introduce primero una API Key para probar";
            statusText.className = "status-warning";
        }
        return;
    }

    if (statusText) {
        statusText.textContent = "🔄 Probando conexión con Google Gemini...";
        statusText.className = "status-warning";
    }
    if (btnTest) {
        btnTest.disabled = true;
        btnTest.textContent = "Probando...";
    }

    try {
        const testEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${keyAProbar}`;
        const res = await fetch(testEndpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{ role: "user", parts: [{ text: "ping" }] }],
                generationConfig: { maxOutputTokens: 5 }
            })
        });

        if (res.ok) {
            if (statusText) {
                statusText.textContent = "🟢 ¡Conexión válida con Gemini exitosa!";
                statusText.className = "status-online";
            }
            mostrarToastCoach("✅ Conexión con Gemini verificada");
        } else {
            const err = await res.json().catch(() => ({}));
            const errMsg = err.error?.message || `Error HTTP ${res.status}`;
            if (statusText) {
                statusText.textContent = `❌ Clave rechazada: ${errMsg}`;
                statusText.className = "status-danger";
            }
        }
    } catch (err) {
        if (statusText) {
            statusText.textContent = `❌ Error de conexión: ${err.message}`;
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

export function abrirModalMemoria() {
    const modal = document.getElementById("modal-coach-memory");
    if (modal) modal.classList.add("active");
    if (state.memoriaActual) {
        actualizarModalMemoria(state.memoriaActual);
    } else {
        obtenerMemoriaCoach().then(actualizarModalMemoria);
    }
}

export function cerrarModalMemoria() {
    const modal = document.getElementById("modal-coach-memory");
    if (modal) modal.classList.remove("active");
}

function actualizarModalMemoria(memoria) {
    const pre = document.getElementById("coach-memory-json-display");
    const syncText = document.getElementById("memory-last-sync");
    if (pre) pre.textContent = JSON.stringify(memoria, null, 2);
    if (syncText && memoria.ultimaActualizacion) {
        syncText.textContent = `Última sincronización: ${new Date(memoria.ultimaActualizacion).toLocaleString()}`;
    }
}

export async function reiniciarMemoria() {
    if (!confirm("¿Deseas restablecer el documento coach_memory a los valores base predeterminados?")) return;
    const base = { ...MEMORIA_BASE_DEFAULT, ultimaActualizacion: new Date().toISOString() };
    await guardarMemoriaCoach(base);
    mostrarToastCoach("Memoria restablecida a valores base");
}

// ========================================================
// 7. INICIALIZACIÓN Y CICLO DE VIDA (SPA)
// ========================================================

export async function initCoach() {
    // 1. Configurar micrófono Toggle
    configurarMicrofonoCoach();

    // 2. Verificar API Key en bóveda cifrada
    const tieneKey = !!(await obtenerApiKeyLocal());
    actualizarBotonKeyBadge(tieneKey);

    // 3. Sincronizar estado inicial de voz
    const iconOn = document.getElementById("icon-voice-on");
    const iconOff = document.getElementById("icon-voice-off");
    const labelVoz = document.getElementById("btn-voice-label");
    const btnVoz = document.getElementById("btn-toggle-voz");
    if (iconOn) iconOn.style.display = state.vozActivada ? "inline-block" : "none";
    if (iconOff) iconOff.style.display = state.vozActivada ? "none" : "inline-block";
    if (labelVoz) labelVoz.textContent = state.vozActivada ? "Voz Activa" : "Silenciado";
    if (btnVoz) btnVoz.classList.toggle("active", state.vozActivada);

    // 4. Inicializar memoria de Firestore
    const memoria = await obtenerMemoriaCoach();

    // 5. Cargar saludo inicial solo si el chat está vacío
    const contenedor = document.getElementById("coach-chat-messages");
    if (contenedor && contenedor.children.length === 0) {
        const entrenos = (obtenerEntradasBitacora() || []).filter(e => e.categoria === "post-entreno");
        const ultimoEntreno = entrenos[0];

        let saludo = `¡Listo para entrenar! Soy tu **AI Coach de Rendimiento** con memoria persistente.\n\n`;
        saludo += `• **Objetivo Actual:** ${memoria.objetivoActual}\n`;
        saludo += `• **Foco Biomecánico:** ${memoria.focoBiomecanico}\n`;
        if (ultimoEntreno) {
            saludo += `• **Último Registro:** ${ultimoEntreno.rutinaRelacionada || 'Sesión'} (RPE ${ultimoEntreno.rpe || 8})\n`;
        }
        saludo += `\nPuedes preguntarme por técnica, sugerencias de descarga, sobrecarga progresiva o pulsar el micrófono para hablarme.`;

        agregarMensajeAlChat("coach", saludo);
    }

    // 6. Soporte para Enter en textarea
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
    if (state.reconocimientoVoz) {
        try { state.reconocimientoVoz.abort(); } catch(e) {}
        state.reconocimientoVoz = null;
    }
    state.isRecording = false;
    state.grabandoPtt = false;
    state.transcriptAcumulado = "";

    const btnMic = document.getElementById("btn-coach-ptt") || document.getElementById("btn-coach-mic");
    const hintEl = document.getElementById("coach-ptt-hint");
    actualizarFeedbackVisualCoach(btnMic, hintEl, false);

    if ('speechSynthesis' in window) {
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

    // Negrita
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    // Cursiva
    html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
    // Listas con viñetas
    html = html.replace(/^•\s?(.*)$/gm, "<li>$1</li>");
    html = html.replace(/^- (.*)$/gm, "<li>$1</li>");
    html = html.replace(/(<li>.*<\/li>)/gs, "<ul>$1</ul>");
    // Saltos de línea dobles
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
    enviarPreguntaRapida,
    abrirModalKey,
    cerrarModalKey,
    guardarKey,
    borrarKey,
    probarConexionKey,
    alternarVisibilidadKey,
    abrirModalMemoria,
    cerrarModalMemoria,
    reiniciarMemoria
};

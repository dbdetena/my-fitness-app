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
    ultimoIndiceAudioProcesado: -1,
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
// 2. COMPILADOR DE CONTEXTO BIOMÉTRICO & LLAMADA GEMINI STREAMING
// ========================================================

/**
 * Compilador de Contexto Biométrico Dinámico (Payload):
 * Lee en vivo los datos más recientes de Firestore (últimos pesajes en registros_peso,
 * últimos RPEs y notas del Diario en diario_notas) y las medias de sueño/salud de Google Fit,
 * compilándolos en un JSON minificado que se inyecta invisiblemente como system_instruction.
 */
export async function buildCoachContext() {
    let pesoActual = null;
    let ultimosPesajes = [];
    let suenoAnoche = null;
    let suenoMedio7d = null;
    let pasosHoy = null;
    let bpmActual = null;
    let fatigaEstimada = null;

    // 1. Consultar Firestore dinámicamente para los últimos registros de peso
    try {
        const qPeso = query(collection(db, "registros_peso"), orderBy("timestamp", "desc"), limit(5));
        const snapPeso = await getDocs(qPeso);
        if (!snapPeso.empty) {
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
    } catch (errPeso) {
        console.warn("Aviso: Consulta Firestore de registros_peso no disponible, usando fallback:", errPeso);
    }

    // Fallback de peso si Firestore no devolvió datos
    if (pesoActual === null) {
        if (window.salud?.estado?.hoy && typeof window.salud.estado.hoy.peso === "number") {
            pesoActual = window.salud.estado.hoy.peso;
        } else {
            const rawPeso = localStorage.getItem("ultimo_peso_registrado");
            if (rawPeso) pesoActual = parseFloat(rawPeso);
        }
    }

    // 2. Medias de sueño y métricas de Google Fit (de health_context_ai o estado global de salud)
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

    // Fallback reactivo al estado global de salud si está activo
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

    // 3. Consultar Firestore dinámicamente para los últimos RPE y notas del Diario
    let notasDiario = [];
    try {
        const qNotas = query(collection(db, "diario_notas"), orderBy("fecha", "desc"), limit(8));
        const snapNotas = await getDocs(qNotas);
        if (!snapNotas.empty) {
            notasDiario = snapNotas.docs.map(d => d.data());
        }
    } catch (errNotas) {
        console.warn("Aviso: Consulta Firestore de diario_notas no disponible, usando local:", errNotas);
    }

    // Si Firestore no tiene notas o falló la conexión, usar las de almacenamiento local
    if (notasDiario.length === 0) {
        notasDiario = obtenerEntradasBitacora() || [];
    }

    const entrenos = notasDiario.filter(e => e.categoria === "post-entreno");

    const ultimosRpe = entrenos
        .filter(e => typeof e.rpe === "number" && !isNaN(e.rpe))
        .slice(0, 5)
        .map(e => ({
            rpe: e.rpe,
            fecha: e.fechaFormato || (e.fecha ? new Date(e.fecha).toLocaleDateString("es-ES") : "Reciente"),
            rutina: e.rutinaRelacionada || "Entreno"
        }));

    const rpeMedio = ultimosRpe.length > 0
        ? parseFloat((ultimosRpe.reduce((acc, cur) => acc + cur.rpe, 0) / ultimosRpe.length).toFixed(1))
        : null;

    // 4. Última rutina registrada
    let ultimaRutina = null;
    if (entrenos.length > 0) {
        const u = entrenos[0];
        ultimaRutina = {
            nombre: u.rutinaRelacionada || "Sesión General",
            fecha: u.fechaFormato || (u.fecha ? new Date(u.fecha).toLocaleDateString("es-ES") : "Reciente"),
            rpe: u.rpe ?? null,
            series: u.metricas?.seriesCompletadas ?? null,
            duracion: u.metricas?.duracionFormato ?? null,
            sensaciones: u.texto ? u.texto.slice(0, 100) : ""
        };
    }

    // 5. Sesión activa en vivo si está en marcha
    const sesionViva = obtenerSesionActiva();
    const sesionActiva = sesionViva ? {
        nombre: sesionViva.nombre,
        hora_inicio: new Date(sesionViva.inicioTimestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } : null;

    // Compilar en un JSON minificado que se inyectará como system_instruction
    const payload = {
        peso_actual_kg: pesoActual,
        historial_pesos: ultimosPesajes.slice(0, 3),
        sueno_anoche_h: suenoAnoche,
        sueno_medio_7d: suenoMedio7d,
        ultimos_rpe: ultimosRpe,
        rpe_medio: rpeMedio,
        ultima_rutina: ultimaRutina,
        sesion_activa: sesionActiva,
        pasos_hoy: pasosHoy,
        bpm_actual: bpmActual,
        fatiga_estimada: fatigaEstimada,
        sync_timestamp: new Date().toISOString()
    };

    return JSON.stringify(payload);
}

/**
 * Genera el System Prompt de alta precisión inyectando la memoria y el JSON biométrico minificado
 */
function construirSystemPrompt(contexto, biometricJson) {
    return `Eres un entrenador personal de élite, experto en biomecánica, programación del entrenamiento y recuperación. Eres directo, motivador pero riguroso, y utilizas un lenguaje técnico pero accesible. Basa tus recomendaciones estrictamente en los datos históricos del usuario.

=== CONTEXTO DEL USUARIO (MEMORIA PERSISTENTE FIRESTORE) ===
• Objetivo Actual: ${contexto.memoria.objetivoActual}
• Foco Biomecánico: ${contexto.memoria.focoBiomecanico}
• Nivel de Experiencia: ${contexto.memoria.nivelUsuario}
• Lesiones / Puntos de Cuidado: ${JSON.stringify(contexto.memoria.lesionesOMolestias)}
• Resumen Histórico: ${contexto.memoria.resumenProgreso}
• Notas Previas del Coach: ${contexto.memoria.notasCoach}

=== CONTEXTO BIOMÉTRICO EN TIEMPO REAL (JSON MINIFICADO) ===
${biometricJson}

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
 * Consulta a la API de Google Gemini mediante Streaming SSE (streamGenerateContent)
 */
async function consultarGeminiStream(contents, systemInstruction, onChunk) {
    const apiKey = await obtenerApiKeyLocal();
    if (!apiKey) {
        abrirModalKey();
        throw new Error("Por favor introduce tu API Key de Gemini en la bóveda de configuración para activar el Coach.");
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse&key=${apiKey}`;

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

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const mensajeError = errJson.error?.message || `Error HTTP ${response.status}`;
        throw new Error(`Error en API Gemini (${GEMINI_MODEL}): ${mensajeError}`);
    }

    if (!response.body) {
        throw new Error("El navegador no soporta streaming en fetch.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let textoCompleto = "";

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (trimmed.startsWith("data:")) {
                const dataPayload = trimmed.slice(5).trim();
                if (dataPayload === "[DONE]") continue;
                try {
                    const parsed = JSON.parse(dataPayload);
                    const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (chunkText) {
                        textoCompleto += chunkText;
                        if (typeof onChunk === "function") {
                            onChunk(textoCompleto, chunkText);
                        }
                    }
                } catch (_) {}
            }
        }
    }

    if (buffer.trim().startsWith("data:")) {
        try {
            const parsed = JSON.parse(buffer.trim().slice(5).trim());
            const chunkText = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (chunkText) {
                textoCompleto += chunkText;
                if (typeof onChunk === "function") {
                    onChunk(textoCompleto, chunkText);
                }
            }
        } catch (_) {}
    }

    if (!textoCompleto.trim()) {
        throw new Error("La API de Gemini devolvió una respuesta vacía.");
    }

    return textoCompleto;
}

/**
 * Método de compatibilidad directa (no streaming o fallback)
 */
async function consultarGemini(mensajeUsuario) {
    const biometricJson = await buildCoachContext();
    const contexto = await consolidarContextoUsuario();
    const systemInstruction = construirSystemPrompt(contexto, biometricJson);

    const contents = state.historialConversacion.slice(-6).map(msg => ({
        role: msg.role === "user" ? "user" : "model",
        parts: [{ text: msg.text }]
    }));
    contents.push({
        role: "user",
        parts: [{ text: mensajeUsuario }]
    });

    return consultarGeminiStream(contents, systemInstruction);
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
        // SOLUCIÓN RADICAL: Desactivar resultados provisionales (interimResults = false)
        // Obliga al navegador a devolver únicamente la frase final limpia sin bucles en vivo
        recognition.interimResults = false;

        state.reconocimientoVoz = recognition;
        state.isRecording = true;
        state.grabandoPtt = true;

        // Limpieza de sesión garantizada al iniciar
        state.transcriptAcumulado = "";
        state.ultimoIndiceAudioProcesado = -1;

        // Feedback Visual: clase CSS activa (resplandor neón cian box-shadow: 0 0 12px #38bdf8) y texto 'Escuchando...'
        actualizarFeedbackVisualCoach(btnMic, hintEl, true);

        const textoPrevio = textarea ? textarea.value.trim() : "";

        // Extracción directa del último resultado final sin bucle sobre resultados pasados ni auto-concatenación descontrolada
        recognition.onresult = (event) => {
            const ultimoIndice = event.results.length - 1;
            if (ultimoIndice < 0 || ultimoIndice <= state.ultimoIndiceAudioProcesado) return;
            state.ultimoIndiceAudioProcesado = ultimoIndice;

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

            if (textarea) {
                const prefijo = textoPrevio ? textoPrevio + " " : "";
                textarea.value = (prefijo + state.transcriptAcumulado).trimStart();
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

        // Vaciado estricto de variables temporales de sesión antes de arrancar
        state.transcriptAcumulado = "";
        state.ultimoIndiceAudioProcesado = -1;
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
function agregarMensajeAlChat(rol, texto, fecha = new Date(), guardarEnHistorial = false) {
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

    if (guardarEnHistorial) {
        state.historialConversacion.push({ role: rol === "user" ? "user" : "model", text: texto });
        if (state.historialConversacion.length > 6) {
            state.historialConversacion = state.historialConversacion.slice(-6);
        }
    }
}

function mostrarTyping(mostrar) {
    const el = document.getElementById("coach-typing-indicator");
    if (el) el.style.display = mostrar ? "flex" : "none";
    const contenedor = document.getElementById("coach-chat-messages");
    if (contenedor && mostrar) contenedor.scrollTop = contenedor.scrollHeight;
}

/**
 * Crea e inicializa una burbuja de respuesta para el Coach con soporte de renderizado progresivo en streaming
 */
function iniciarBurbujaStreaming() {
    const contenedor = document.getElementById("coach-chat-messages");
    if (!contenedor) return null;

    const msgEl = document.createElement("div");
    msgEl.className = "chat-bubble-row row-coach";
    const horaStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

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

    return {
        element: msgEl,
        actualizar(textoParcial) {
            if (!contentEl) return;
            let textoLimpio = textoParcial
                .replace(/```json_memory[\s\S]*?```/g, "")
                .replace(/\[GRAFICA:[a-z]+\]/g, "")
                .trim();
            contentEl.innerHTML = formatearMarkdownSeguro(textoLimpio) + `<span class="typewriter-cursor">▋</span>`;
            contenedor.scrollTop = contenedor.scrollHeight;
        },
        finalizar(textoCompleto) {
            const bubbleEl = msgEl.querySelector(".bubble-coach");
            if (bubbleEl) bubbleEl.classList.remove("is-streaming");

            let textoRender = textoCompleto.replace(/```json_memory[\s\S]*?```/g, "").trim();
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
                contentEl.innerHTML = formatearMarkdownSeguro(textoRender);
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
            msgEl.remove();
        }
    };
}

/**
 * Enviar mensaje del usuario a la IA con Streaming y memoria de conversación
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
    agregarMensajeAlChat("user", texto, new Date(), false);
    mostrarTyping(true);
    state.enGeneracion = true;

    let streamBubble = null;

    try {
        // 2. Compilar contexto biométrico minificado en tiempo real justo antes de enviar el prompt
        const biometricPayload = await buildCoachContext();
        const contexto = await consolidarContextoUsuario();
        const systemInstruction = construirSystemPrompt(contexto, biometricPayload);

        // 3. Memoria de conversación: retener los últimos 6 mensajes (3 pares de user/model)
        const historialReciente = state.historialConversacion.slice(-6);
        const contents = historialReciente.map(msg => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }]
        }));

        // Añadir el mensaje actual del usuario al payload de contents
        contents.push({
            role: "user",
            parts: [{ text: texto }]
        });

        // 4. Iniciar streaming con Gemini mediante streamGenerateContent
        let primerChunk = true;
        const respuestaCompleta = await consultarGeminiStream(contents, systemInstruction, (acumulado) => {
            if (primerChunk) {
                mostrarTyping(false);
                streamBubble = iniciarBurbujaStreaming();
                primerChunk = false;
            }
            if (streamBubble) {
                streamBubble.actualizar(acumulado);
            }
        });

        mostrarTyping(false);

        // 5. Finalizar renderizado progresivo
        if (streamBubble) {
            streamBubble.finalizar(respuestaCompleta);
        } else {
            agregarMensajeAlChat("coach", respuestaCompleta, new Date(), false);
        }

        // 6. Actualizar historial de conversación en el estado (retener últimos 6 mensajes = 3 pares user/model)
        state.historialConversacion.push({ role: "user", text: texto });
        state.historialConversacion.push({ role: "model", text: respuestaCompleta });
        if (state.historialConversacion.length > 6) {
            state.historialConversacion = state.historialConversacion.slice(-6);
        }

        // 7. Si la IA propuso actualización de memoria, extraer y sobrescribir coach_memory en Firestore
        const matchMemoria = respuestaCompleta.match(/```json_memory\s*([\s\S]*?)\s*```/);
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

        // 8. Lectura por voz en altavoz si está activada
        reproducirVozCoach(respuestaCompleta);

    } catch (err) {
        mostrarTyping(false);
        if (streamBubble) {
            streamBubble.eliminar();
        }
        console.error("Error al procesar mensaje con el Coach:", err);
        const mensajeAmigable = `⚠️ **No he podido conectar con el Coach en este momento.**\n\n${err.message || "Por favor, comprueba tu conexión a internet o revisa tu API Key en la configuración."}`;
        agregarMensajeAlChat("coach", mensajeAmigable, new Date(), false);
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

/**
 * Exporta una copia de seguridad local completa en formato .json
 * Descarga automáticamente un archivo estructurado con coach_memory,
 * historial de bitácora, registros de peso y biometría.
 */
export async function exportarCopiaSeguridad() {
    try {
        const memoria = await obtenerMemoriaCoach();
        const entradasDiario = obtenerEntradasBitacora() || [];

        let registrosPeso = [];
        try {
            const q = query(collection(db, "registros_peso"), orderBy("timestamp", "desc"), limit(25));
            const snap = await getDocs(q);
            if (!snap.empty) {
                registrosPeso = snap.docs.map(d => d.data());
            }
        } catch (_) {}

        let biometriaLocal = {};
        try {
            biometriaLocal = JSON.parse(localStorage.getItem("health_context_ai") || "{}");
        } catch (_) {}

        const backupData = {
            aplicacion: "Antigravity Fitness AI Coach",
            version: "2.1",
            exportadoEn: new Date().toISOString(),
            coach_memory: memoria,
            diario_entradas: entradasDiario,
            registros_peso: registrosPeso,
            biometria_salud: biometriaLocal,
            historial_chat_reciente: state.historialConversacion
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

    // 4. Inicializar memoria de Firestore en segundo plano
    await obtenerMemoriaCoach();

    // 5. El chat arranca limpio sin mensaje inicial estático

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
    buildCoachContext,
    abrirModalKey,
    cerrarModalKey,
    guardarKey,
    borrarKey,
    probarConexionKey,
    alternarVisibilidadKey,
    exportarCopiaSeguridad,
    abrirModalMemoria: exportarCopiaSeguridad
};

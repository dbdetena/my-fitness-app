// ========================================================
// MÓDULO: CLIENTE INTERVALS.ICU (API v1 · CORS NATIVO)
// Conexión directa desde PWA para Amazfit / Zepp y Salud
// conectada vía Intervals.icu, sin popups OAuth ni tokens
// de 60 min. API Key cifrada localmente con PBKDF2 + AES-GCM.
// ========================================================

const INTERVALS_BASE_URL = "https://intervals.icu/api/v1";
const STORAGE_KEY_INTERVALS_VAULT = "fitness_intervals_vault_v1";
const STORAGE_KEY_INTERVALS_META = "fitness_intervals_meta_v1";

const VAULT_SALT = new TextEncoder().encode("antigravity-intervals-vault-salt-v1");
const VAULT_PASSPHRASE = "AGY_FITNESS_INTERVALS_LOCAL_VAULT_2026";
const REQUEST_TIMEOUT_MS = 15000;

let cachedApiKey = null;

// ========================================================
// 1. BÓVEDA LOCAL CIFRADA (PBKDF2 + AES-GCM 256-BIT)
// ========================================================

async function derivarClaveCrypto(passphrase) {
    const raw = new TextEncoder().encode(passphrase);
    const keyMaterial = await crypto.subtle.importKey(
        "raw",
        raw,
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
        { name: "PBKDF2", salt: VAULT_SALT, iterations: 100000, hash: "SHA-256" },
        keyMaterial,
        { name: "AES-GCM", length: 256 },
        false,
        ["encrypt", "decrypt"]
    );
}

async function cifrarTexto(texto) {
    const key = await derivarClaveCrypto(VAULT_PASSPHRASE);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(texto);
    const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
    const combined = new Uint8Array(iv.length + cipherBuf.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(cipherBuf), iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function descifrarTexto(base64Str) {
    const key = await derivarClaveCrypto(VAULT_PASSPHRASE);
    const combined = Uint8Array.from(atob(base64Str), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const cipherBytes = combined.slice(12);
    const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipherBytes);
    return new TextDecoder().decode(plainBuf);
}

// ========================================================
// 2. GESTIÓN DE CREDENCIALES Y METADATOS
// ========================================================

export function tieneIntervalsConfigurado() {
    try {
        return Boolean(localStorage.getItem(STORAGE_KEY_INTERVALS_VAULT));
    } catch (_) {
        return false;
    }
}

export function obtenerMetaIntervals() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_INTERVALS_META);
        return raw ? JSON.parse(raw) : null;
    } catch (_) {
        return null;
    }
}

export async function guardarConfigIntervals(apiKey, meta = {}) {
    const limpia = String(apiKey || "").trim();
    if (!limpia) throw new Error("La API Key de Intervals.icu está vacía.");

    if (window.crypto?.subtle) {
        const cifrada = await cifrarTexto(limpia);
        localStorage.setItem(STORAGE_KEY_INTERVALS_VAULT, JSON.stringify({ v: 1, enc: true, data: cifrada }));
    } else {
        localStorage.setItem(STORAGE_KEY_INTERVALS_VAULT, JSON.stringify({ v: 1, enc: false, data: btoa(limpia) }));
    }
    cachedApiKey = limpia;

    const metaFinal = {
        athleteId: meta.athleteId || "0",
        athleteName: meta.athleteName || "",
        connectedAt: Date.now()
    };
    localStorage.setItem(STORAGE_KEY_INTERVALS_META, JSON.stringify(metaFinal));
    return metaFinal;
}

export async function cargarApiKeyIntervals() {
    if (cachedApiKey) return cachedApiKey;
    try {
        const raw = localStorage.getItem(STORAGE_KEY_INTERVALS_VAULT);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed?.data) return null;

        if (parsed.enc && window.crypto?.subtle) {
            cachedApiKey = await descifrarTexto(parsed.data);
        } else {
            cachedApiKey = atob(parsed.data);
        }
        return cachedApiKey;
    } catch (e) {
        console.warn("No se pudo descifrar API Key de Intervals.icu:", e.message);
        return null;
    }
}

export function eliminarConfigIntervals() {
    cachedApiKey = null;
    try {
        localStorage.removeItem(STORAGE_KEY_INTERVALS_VAULT);
        localStorage.removeItem(STORAGE_KEY_INTERVALS_META);
    } catch (_) {}
}

// ========================================================
// 3. PETICIONES REST API v1 (BASIC AUTH: API_KEY:<key>)
// ========================================================

function crearHeadersBasic(apiKey) {
    const token = btoa(`API_KEY:${apiKey}`);
    return {
        "Authorization": `Basic ${token}`,
        "Accept": "application/json"
    };
}

async function fetchIntervals(ruta, apiKeyOpcional = null) {
    const apiKey = apiKeyOpcional || await cargarApiKeyIntervals();
    if (!apiKey) {
        const err = new Error("Intervals.icu no está configurado (falta API Key).");
        err.status = 401;
        throw err;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        const resp = await fetch(`${INTERVALS_BASE_URL}${ruta}`, {
            method: "GET",
            headers: crearHeadersBasic(apiKey),
            signal: controller.signal
        });

        if (resp.status === 401 || resp.status === 403) {
            const err = new Error("API Key de Intervals.icu inválida o sin permisos.");
            err.status = resp.status;
            throw err;
        }
        if (resp.status === 429) {
            const err = new Error("Demasiadas peticiones a Intervals.icu (429). Intenta en unos segundos.");
            err.status = 429;
            throw err;
        }
        if (!resp.ok) {
            const err = new Error(`Error de Intervals.icu (${resp.status} ${resp.statusText})`);
            err.status = resp.status;
            throw err;
        }
        return await resp.json();
    } catch (e) {
        if (e.name === "AbortError") {
            const err = new Error("Tiempo de espera agotado conectando con Intervals.icu.");
            err.status = 408;
            throw err;
        }
        throw e;
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Comprueba la validez de una API Key contra /api/v1/athlete/0
 */
export async function probarConexionIntervals(apiKey) {
    const limpia = String(apiKey || "").trim();
    if (!limpia) throw new Error("Introduce tu API Key de Intervals.icu.");

    const t0 = performance.now();
    const perfil = await fetchIntervals("/athlete/0", limpia);
    const latencyMs = Math.round(performance.now() - t0);

    return {
        ok: true,
        athleteId: perfil?.id || "0",
        athleteName: perfil?.name || perfil?.firstname || perfil?.email || "Atleta conectado",
        weight: typeof perfil?.weight === "number" ? perfil.weight : null,
        latencyMs
    };
}

/**
 * Obtiene registros diarios de wellness (steps, sleepSecs, restingHR, weight, hrv, etc.)
 * @param {string} oldestIso YYYY-MM-DD
 * @param {string} newestIso YYYY-MM-DD
 */
export async function obtenerWellnessIntervals(oldestIso, newestIso) {
    const meta = obtenerMetaIntervals();
    const id = meta?.athleteId || "0";
    const qs = new URLSearchParams({ oldest: oldestIso, newest: newestIso });
    const data = await fetchIntervals(`/athlete/${encodeURIComponent(id)}/wellness?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
}

/**
 * Obtiene actividades (entrenos/cardio) en el rango pedido
 * @param {string} oldestIso YYYY-MM-DD
 * @param {string} newestIso YYYY-MM-DD
 */
export async function obtenerActividadesIntervals(oldestIso, newestIso) {
    const meta = obtenerMetaIntervals();
    const id = meta?.athleteId || "0";
    const qs = new URLSearchParams({ oldest: oldestIso, newest: newestIso });
    const data = await fetchIntervals(`/athlete/${encodeURIComponent(id)}/activities?${qs.toString()}`);
    return Array.isArray(data) ? data : [];
}

/**
 * Obtiene la curva de frecuencia cardíaca (time + heartrate) de una actividad concreta.
 * Tolerante a fallos: devuelve null si la actividad no tiene stream de pulso.
 */
export async function obtenerStreamCorazonActividad(activityId) {
    if (!activityId) return null;
    try {
        const data = await fetchIntervals(`/activity/${encodeURIComponent(activityId)}/streams.json?types=time,heartrate`);
        if (Array.isArray(data)) {
            const timeObj = data.find(s => s?.type === "time");
            const hrObj = data.find(s => s?.type === "heartrate");
            if (Array.isArray(timeObj?.data) && Array.isArray(hrObj?.data)) {
                return { time: timeObj.data, heartrate: hrObj.data };
            }
        } else if (data && Array.isArray(data.time) && Array.isArray(data.heartrate)) {
            return { time: data.time, heartrate: data.heartrate };
        }
        return null;
    } catch (_) {
        return null;
    }
}

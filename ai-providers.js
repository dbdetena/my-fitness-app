// ========================================================
// MÓDULO: CLIENTE IA MULTI-PROVEEDOR & BÓVEDA LOCAL CIFRADA
// Soporta OpenAI, Groq, OpenRouter, DeepSeek y Google Gemini
// con streaming SSE en tiempo real, CORS directo en navegador,
// timeouts/cancelación (AbortController) y cifrado AES-GCM.
// ========================================================

const STORAGE_KEY_AI_CONFIG = "fitness_ai_provider_config_v1";
const STORAGE_KEY_VAULT_PREFIX = "fitness_ai_vault_";
const STORAGE_KEY_GEMINI_LEGACY_VAULT = "fitness_gemini_vault";
const STORAGE_KEY_GEMINI_LEGACY_PLAIN = "fitness_gemini_api_key";

const VAULT_SALT = new TextEncoder().encode("antigravity-fitness-vault-salt-v1");
const VAULT_PASSPHRASE = "AGY_FITNESS_COACH_LOCAL_VAULT_2026";

export const DEFAULT_PROVIDER_ID = "openai";

/**
 * Catálogo oficial de proveedores compatibles con navegador (CORS nativo)
 */
export const AI_PROVIDERS = {
    openai: {
        id: "openai",
        nombre: "OpenAI",
        badge: "OPENAI COACH",
        protocolo: "openai",
        endpoint: "https://api.openai.com/v1/chat/completions",
        defaultModel: "gpt-4o-mini",
        keyPlaceholder: "sk-proj-...",
        keyLabel: "API Key de OpenAI:",
        helpUrl: "https://platform.openai.com/api-keys",
        helpText: "Obtener API Key en OpenAI Platform ↗",
        descripcion: "Muy estable, excelente criterio biomecánico y bajo coste por token.",
        modelos: [
            { id: "gpt-4o-mini", label: "gpt-4o-mini (Rápido y económico · Recomendado)" },
            { id: "gpt-4o", label: "gpt-4o (Alta precisión)" },
            { id: "gpt-6-luna", label: "gpt-6-luna (Nueva generación rápida)" }
        ]
    },
    groq: {
        id: "groq",
        nombre: "Groq (Ultrarrápido)",
        badge: "GROQ COACH",
        protocolo: "openai",
        endpoint: "https://api.groq.com/openai/v1/chat/completions",
        defaultModel: "llama-3.3-70b-versatile",
        keyPlaceholder: "gsk_...",
        keyLabel: "API Key de Groq:",
        helpUrl: "https://console.groq.com/keys",
        helpText: "Obtener API Key en Groq Console ↗",
        descripcion: "Latencia mínima (respuestas casi instantáneas), ideal para usar con voz.",
        modelos: [
            { id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile (Recomendado)" },
            { id: "meta-llama/llama-4-scout-17b-16e-instruct", label: "Llama 4 Scout 17B (Rápido)" },
            { id: "llama-3.1-8b-instant", label: "Llama 3.1 8B Instant (Instantáneo)" }
        ]
    },
    openrouter: {
        id: "openrouter",
        nombre: "OpenRouter (Multi-modelo)",
        badge: "OPENROUTER COACH",
        protocolo: "openai",
        endpoint: "https://openrouter.ai/api/v1/chat/completions",
        defaultModel: "openai/gpt-4o-mini",
        keyPlaceholder: "sk-or-v1-...",
        keyLabel: "API Key de OpenRouter:",
        helpUrl: "https://openrouter.ai/keys",
        helpText: "Obtener API Key en OpenRouter ↗",
        descripcion: "Una sola cuenta de prepago para alternar entre OpenAI, Claude, Llama o DeepSeek.",
        modelos: [
            { id: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini (Recomendado)" },
            { id: "anthropic/claude-sonnet-4", label: "Anthropic Claude Sonnet 4" },
            { id: "deepseek/deepseek-chat", label: "DeepSeek Chat" },
            { id: "meta-llama/llama-3.3-70b-instruct", label: "Meta Llama 3.3 70B" }
        ]
    },
    deepseek: {
        id: "deepseek",
        nombre: "DeepSeek",
        badge: "DEEPSEEK COACH",
        protocolo: "openai",
        endpoint: "https://api.deepseek.com/chat/completions",
        defaultModel: "deepseek-chat",
        keyPlaceholder: "sk-...",
        keyLabel: "API Key de DeepSeek:",
        helpUrl: "https://platform.deepseek.com/api_keys",
        helpText: "Obtener API Key en DeepSeek Platform ↗",
        descripcion: "Excelente relación calidad/precio por token con formato estándar OpenAI.",
        modelos: [
            { id: "deepseek-chat", label: "deepseek-chat (Rápido y económico · Recomendado)" },
            { id: "deepseek-reasoner", label: "deepseek-reasoner (Razonamiento profundo)" }
        ]
    },
    gemini: {
        id: "gemini",
        nombre: "Google Gemini (Optimizado)",
        badge: "GEMINI COACH",
        protocolo: "gemini",
        endpoint: "https://generativelanguage.googleapis.com/v1beta/models",
        defaultModel: "gemini-3.5-flash-lite",
        keyPlaceholder: "AIzaSy...",
        keyLabel: "API Key de Google Gemini:",
        helpUrl: "https://aistudio.google.com/app/apikey",
        helpText: "Obtener API Key en Google AI Studio ↗",
        descripcion: "Opción de respaldo con modelo ligero de baja latencia.",
        modelos: [
            { id: "gemini-3.5-flash-lite", label: "gemini-3.5-flash-lite (Baja latencia · Recomendado)" },
            { id: "gemini-3.8-flash", label: "gemini-3.8-flash (Flash estándar)" }
        ]
    }
};

// Caché volátil en memoria de claves ya descifradas por proveedor
const keyMemoryCache = new Map();

// ========================================================
// 1. BÓVEDA CRYPTO (PBKDF2 + AES-GCM 256-BIT)
// ========================================================

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
    } catch (_) {
        return "";
    }
}

export async function cifrarApiKey(plainText) {
    if (!plainText) return "";
    if (window.crypto && window.crypto.subtle) {
        try {
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const key = await derivarClaveCrypto(VAULT_PASSPHRASE);
            const enc = new TextEncoder();
            const ciphertextBuffer = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv },
                key,
                enc.encode(plainText)
            );
            const ivB64 = btoa(String.fromCharCode(...iv));
            const cipherB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertextBuffer)));
            return `vault_gcm_v2:${ivB64}:${cipherB64}`;
        } catch (e) {
            console.warn("Fallo en SubtleCrypto, activando fallback XOR:", e);
        }
    }
    return `vault_xor_v1:${cifrarXorFallback(plainText, VAULT_PASSPHRASE)}`;
}

export async function descifrarApiKey(cipherText) {
    if (!cipherText) return "";
    if (!cipherText.startsWith("vault_")) return cipherText;

    if (cipherText.startsWith("vault_gcm_v2:")) {
        const parts = cipherText.split(":");
        if (parts.length === 3 && window.crypto && window.crypto.subtle) {
            try {
                const iv = new Uint8Array(atob(parts[1]).split("").map(c => c.charCodeAt(0)));
                const cipherBytes = new Uint8Array(atob(parts[2]).split("").map(c => c.charCodeAt(0)));
                const key = await derivarClaveCrypto(VAULT_PASSPHRASE);
                const decryptedBuffer = await window.crypto.subtle.decrypt(
                    { name: "AES-GCM", iv },
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
        return descifrarXorFallback(cipherText.replace("vault_xor_v1:", ""), VAULT_PASSPHRASE);
    }

    return "";
}

// ========================================================
// 2. CONFIGURACIÓN ACTIVA Y BÓVEDA POR PROVEEDOR
// ========================================================

export function getProviderMeta(providerId) {
    return AI_PROVIDERS[providerId] || AI_PROVIDERS[DEFAULT_PROVIDER_ID];
}

export function getAIConfig() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_AI_CONFIG);
        if (raw) {
            const parsed = JSON.parse(raw);
            const providerId = AI_PROVIDERS[parsed.providerId] ? parsed.providerId : DEFAULT_PROVIDER_ID;
            const meta = getProviderMeta(providerId);
            const modelosPorProveedor = parsed.modelosPorProveedor || {};
            const model = modelosPorProveedor[providerId] || parsed.model || meta.defaultModel;
            return {
                providerId,
                model,
                modelosPorProveedor: {
                    ...modelosPorProveedor,
                    [providerId]: model
                }
            };
        }
    } catch (_) {}

    // Migración suave: si nunca configuró el nuevo formato pero sí tenía clave legacy de Gemini
    const tieneLegacyGemini = !!(
        localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY_VAULT) ||
        localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY_PLAIN)
    );
    const providerId = tieneLegacyGemini ? "gemini" : DEFAULT_PROVIDER_ID;
    const meta = getProviderMeta(providerId);
    return {
        providerId,
        model: meta.defaultModel,
        modelosPorProveedor: { [providerId]: meta.defaultModel }
    };
}

export function saveAIConfig(providerId, model) {
    const meta = getProviderMeta(providerId);
    const actual = getAIConfig();
    const modeloFinal = (model || "").trim() || meta.defaultModel;
    const nuevaConfig = {
        providerId: meta.id,
        model: modeloFinal,
        modelosPorProveedor: {
            ...(actual.modelosPorProveedor || {}),
            [meta.id]: modeloFinal
        }
    };
    localStorage.setItem(STORAGE_KEY_AI_CONFIG, JSON.stringify(nuevaConfig));
    return nuevaConfig;
}

export async function saveProviderApiKey(providerId, apiKeyPlana) {
    const meta = getProviderMeta(providerId);
    const storageKey = `${STORAGE_KEY_VAULT_PREFIX}${meta.id}`;
    const limpia = (apiKeyPlana || "").trim();

    if (!limpia) {
        localStorage.removeItem(storageKey);
        if (meta.id === "gemini") {
            localStorage.removeItem(STORAGE_KEY_GEMINI_LEGACY_VAULT);
            localStorage.removeItem(STORAGE_KEY_GEMINI_LEGACY_PLAIN);
        }
        keyMemoryCache.delete(meta.id);
        return;
    }

    const cifrada = await cifrarApiKey(limpia);
    localStorage.setItem(storageKey, cifrada);
    if (meta.id === "gemini") {
        localStorage.removeItem(STORAGE_KEY_GEMINI_LEGACY_VAULT);
        localStorage.removeItem(STORAGE_KEY_GEMINI_LEGACY_PLAIN);
    }
    keyMemoryCache.set(meta.id, limpia);
}

export async function getProviderApiKey(providerId) {
    const meta = getProviderMeta(providerId);
    if (keyMemoryCache.has(meta.id)) {
        return keyMemoryCache.get(meta.id);
    }

    const storageKey = `${STORAGE_KEY_VAULT_PREFIX}${meta.id}`;
    let cipher = localStorage.getItem(storageKey);
    let vieneDeLegacy = false;

    if (!cipher && meta.id === "gemini") {
        cipher = localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY_VAULT) ||
                 localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY_PLAIN);
        vieneDeLegacy = !!cipher;
    }

    if (!cipher) return "";

    const plain = await descifrarApiKey(cipher);
    if (plain) {
        keyMemoryCache.set(meta.id, plain);
        if (vieneDeLegacy || !cipher.startsWith("vault_")) {
            await saveProviderApiKey(meta.id, plain);
        }
    }
    return plain;
}

export function hasStoredKeySync(providerId) {
    const meta = getProviderMeta(providerId);
    if (keyMemoryCache.get(meta.id)) return true;
    if (localStorage.getItem(`${STORAGE_KEY_VAULT_PREFIX}${meta.id}`)) return true;
    if (meta.id === "gemini") {
        return !!(
            localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY_VAULT) ||
            localStorage.getItem(STORAGE_KEY_GEMINI_LEGACY_PLAIN)
        );
    }
    return false;
}

// ========================================================
// 3. CLIENTE UNIFICADO DE STREAMING SSE Y ERRORES LEGIBLES
// ========================================================

function formatearErrorHttp(providerNombre, status, rawMessage) {
    if (status === 401) {
        return `API Key inválida o caducada en ${providerNombre}. Revísala en "Configurar IA".`;
    }
    if (status === 402) {
        return `Saldo insuficiente en ${providerNombre}. Recarga créditos en tu cuenta del proveedor.`;
    }
    if (status === 404) {
        return `Modelo no encontrado en ${providerNombre} (${rawMessage || "404"}). Selecciona otro modelo en "Configurar IA".`;
    }
    if (status === 429) {
        return `Límite de peticiones o cuota alcanzada en ${providerNombre}. Espera unos segundos o cambia de proveedor/modelo.`;
    }
    return `Error en ${providerNombre} (HTTP ${status}): ${rawMessage || "Respuesta no válida"}`;
}

function construirHeadersOpenAI(meta, apiKey) {
    const headers = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
    };
    if (meta.id === "openrouter") {
        headers["HTTP-Referer"] = window.location.origin || "https://dbdetena.github.io/my-fitness-app";
        headers["X-Title"] = "Mi Panel Fitness - AI Coach";
    }
    return headers;
}

/**
 * Envía conversación con Streaming SSE al proveedor activo.
 * @param {Object} params
 * @param {string} params.providerId
 * @param {string} params.model
 * @param {string} params.apiKey
 * @param {string} params.systemInstruction
 * @param {Array<{role: 'user'|'assistant'|'model', text: string}>} params.messages
 * @param {(acumulado: string, delta: string) => void} [params.onChunk]
 * @param {AbortSignal} [params.signal]
 * @param {number} [params.timeoutMs=30000]
 */
export async function streamAICompletion({
    providerId,
    model,
    apiKey,
    systemInstruction,
    messages,
    onChunk,
    signal,
    timeoutMs = 30000
}) {
    const meta = getProviderMeta(providerId);
    const modeloActivo = (model || "").trim() || meta.defaultModel;

    if (!apiKey) {
        throw new Error(`Configura tu API Key de ${meta.nombre} en "Configurar IA" para activar el Coach.`);
    }

    // Combinar timeout de conexión inicial con cancelación manual del usuario
    const timeoutController = new AbortController();
    let timeoutDisparado = false;
    const timeoutId = setTimeout(() => {
        timeoutDisparado = true;
        timeoutController.abort();
    }, timeoutMs);

    const onExternalAbort = () => timeoutController.abort();
    if (signal) {
        if (signal.aborted) {
            clearTimeout(timeoutId);
            const abortErr = new Error("Generación detenida por el usuario.");
            abortErr.name = "AbortError";
            throw abortErr;
        }
        signal.addEventListener("abort", onExternalAbort, { once: true });
    }

    try {
        if (meta.protocolo === "gemini") {
            return await ejecutarStreamGemini({
                meta,
                model: modeloActivo,
                apiKey,
                systemInstruction,
                messages,
                onChunk,
                signal: timeoutController.signal,
                onFirstByte: () => clearTimeout(timeoutId)
            });
        }

        return await ejecutarStreamOpenAICompatible({
            meta,
            model: modeloActivo,
            apiKey,
            systemInstruction,
            messages,
            onChunk,
            signal: timeoutController.signal,
            onFirstByte: () => clearTimeout(timeoutId)
        });
    } catch (err) {
        if (timeoutDisparado) {
            throw new Error(`Tiempo de espera agotado (${Math.round(timeoutMs / 1000)}s) conectando con ${meta.nombre}. Comprueba tu red o cambia de modelo.`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
        if (signal) {
            signal.removeEventListener("abort", onExternalAbort);
        }
    }
}

async function ejecutarStreamOpenAICompatible({
    meta,
    model,
    apiKey,
    systemInstruction,
    messages,
    onChunk,
    signal,
    onFirstByte
}) {
    const apiMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map(m => ({
            role: m.role === "user" ? "user" : "assistant",
            content: m.text
        }))
    ];

    const body = {
        model,
        messages: apiMessages,
        temperature: 0.65,
        max_tokens: 1200,
        stream: true
    };

    const response = await fetch(meta.endpoint, {
        method: "POST",
        headers: construirHeadersOpenAI(meta, apiKey),
        body: JSON.stringify(body),
        signal
    });

    if (onFirstByte) onFirstByte();

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const rawMsg = errJson.error?.message || errJson.message || `HTTP ${response.status}`;
        throw new Error(formatearErrorHttp(meta.nombre, response.status, rawMsg));
    }

    if (!response.body) {
        throw new Error("El navegador no soporta streaming en fetch.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let textoCompleto = "";

    const procesarLinea = (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":")) return;
        if (!trimmed.startsWith("data:")) return;

        const dataPayload = trimmed.slice(5).trim();
        if (!dataPayload || dataPayload === "[DONE]") return;

        try {
            const parsed = JSON.parse(dataPayload);
            if (parsed.error?.message) {
                throw new Error(`Error en ${meta.nombre}: ${parsed.error.message}`);
            }
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string" && delta.length > 0) {
                textoCompleto += delta;
                if (typeof onChunk === "function") {
                    onChunk(textoCompleto, delta);
                }
            }
        } catch (parseErr) {
            if (parseErr.message?.startsWith("Error en ")) {
                throw parseErr;
            }
        }
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            procesarLinea(line);
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
        procesarLinea(buffer);
    }

    if (!textoCompleto.trim()) {
        throw new Error(`${meta.nombre} devolvió una respuesta vacía.`);
    }

    return textoCompleto;
}

async function ejecutarStreamGemini({
    meta,
    model,
    apiKey,
    systemInstruction,
    messages,
    onChunk,
    signal,
    onFirstByte
}) {
    const endpoint = `${meta.endpoint}/${encodeURIComponent(model)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

    const contents = messages.map(m => ({
        role: m.role === "user" ? "user" : "model",
        parts: [{ text: m.text }]
    }));

    const payload = {
        system_instruction: {
            parts: [{ text: systemInstruction }]
        },
        contents,
        generationConfig: {
            temperature: 0.65,
            maxOutputTokens: 2048
        }
    };

    const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal
    });

    if (onFirstByte) onFirstByte();

    if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        const rawMsg = errJson.error?.message || `HTTP ${response.status}`;
        throw new Error(formatearErrorHttp(meta.nombre, response.status, rawMsg));
    }

    if (!response.body) {
        throw new Error("El navegador no soporta streaming en fetch.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";
    let textoCompleto = "";

    const procesarLinea = (line) => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(":") || !trimmed.startsWith("data:")) return;
        const dataPayload = trimmed.slice(5).trim();
        if (!dataPayload || dataPayload === "[DONE]") return;

        try {
            const parsed = JSON.parse(dataPayload);
            const parts = parsed.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                // Ignorar bloques de pensamiento interno en modelos Gemini con thinking
                if (part?.thought === true) continue;
                if (typeof part?.text === "string" && part.text.length > 0) {
                    textoCompleto += part.text;
                    if (typeof onChunk === "function") {
                        onChunk(textoCompleto, part.text);
                    }
                }
            }
        } catch (_) {}
    };

    while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
            procesarLinea(line);
        }
    }

    buffer += decoder.decode();
    if (buffer.trim()) {
        procesarLinea(buffer);
    }

    if (!textoCompleto.trim()) {
        throw new Error("Gemini devolvió una respuesta vacía (prueba con gemini-3.5-flash-lite o cambia a OpenAI/Groq).");
    }

    return textoCompleto;
}

/**
 * Prueba real de conexión y medición de latencia para cualquier proveedor.
 */
export async function testAIConnection({ providerId, model, apiKey }) {
    const meta = getProviderMeta(providerId);
    const modeloActivo = (model || "").trim() || meta.defaultModel;
    const inicio = performance.now();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
        if (meta.protocolo === "gemini") {
            const endpoint = `${meta.endpoint}/${encodeURIComponent(modeloActivo)}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const res = await fetch(endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ role: "user", parts: [{ text: "Responde solo: OK" }] }],
                    generationConfig: { maxOutputTokens: 20 }
                }),
                signal: controller.signal
            });
            const latenciaMs = Math.round(performance.now() - inicio);
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(formatearErrorHttp(meta.nombre, res.status, err.error?.message));
            }
            return { ok: true, latenciaMs, providerNombre: meta.nombre, model: modeloActivo };
        }

        const res = await fetch(meta.endpoint, {
            method: "POST",
            headers: construirHeadersOpenAI(meta, apiKey),
            body: JSON.stringify({
                model: modeloActivo,
                messages: [{ role: "user", content: "Responde solo: OK" }],
                max_tokens: 10
            }),
            signal: controller.signal
        });
        const latenciaMs = Math.round(performance.now() - inicio);
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(formatearErrorHttp(meta.nombre, res.status, err.error?.message || err.message));
        }
        return { ok: true, latenciaMs, providerNombre: meta.nombre, model: modeloActivo };
    } catch (err) {
        if (err.name === "AbortError") {
            throw new Error(`Timeout de 15s probando ${meta.nombre}.`);
        }
        throw err;
    } finally {
        clearTimeout(timeoutId);
    }
}

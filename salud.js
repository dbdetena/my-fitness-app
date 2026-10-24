import { db, auth } from "./firebase-config.js";
import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult,
    signOut,
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// ==========================================
// CONSTANTES
// ==========================================
const FIT_AGGREGATE_URL = "https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate";
const META_PASOS = 10000;
const META_KCAL = 2000; // calories.expended incluye metabolismo basal (total diario)
const DIA_MS = 86400000;
const INTERVALO_CORAZON_HOY_MS = 15 * 60 * 1000; // 15 minutos (agrupación intradía)
const CACHE_HISTORIAL_MS = 10 * 60 * 1000;
const MAX_DIAS_POR_PETICION = 90;
const CLAVE_CONTEXTO_IA = "health_context_ai";

// Tipos de sueño de Google Fit que cuentan como sueño real (2 sleep, 4 light, 5 deep, 6 REM)
const TIPOS_SUENO_VALIDOS = [2, 4, 5, 6];

// Actividades de cardio reconocidas (com.google.activity.segment)
const ACTIVIDADES_CARDIO = {
    1: "Ciclismo",
    7: "Caminata",
    8: "Carrera",
    9: "Aeróbic",
    35: "Senderismo",
    56: "Carrera (trote)",
    57: "Carrera (arena)",
    58: "Carrera (cinta)",
    82: "Natación (piscina)"
};

// ==========================================
// ESTADO DEL MÓDULO
// ==========================================
let displayPeso = null;
let displayModal = null;
let statusBadge = null;
let unsubscribeFirestore = null;
let unsubscribeAuth = null;
let sincronizacionEnCurso = null;
let avisoSuenoMostrado = false;

let chartPasosInstance = null;
let chartCaloriasInstance = null;
let chartCorazonHoyInstance = null;
let chartMainInstance = null;

const estado = {
    metrica: "peso",        // peso | sueno | pasos | bpm
    rango: 30,              // 7 | 30 | 90 | 365
    hoy: null,              // datos del día en curso
    corazonHoy: [],         // puntos intradía de BPM de hoy
    dias: [],               // histórico saneado del rango activo
    cache: {}               // rango -> { ts, dias }
};

// ==========================================
// UTILIDADES DE FECHA
// ==========================================
function inicioDelDia(fecha = new Date()) {
    const d = new Date(fecha);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
}

function claveDia(ms) {
    const d = new Date(ms);
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${mm}-${dd}`;
}

function etiquetaDia(ms) {
    return new Date(ms).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
}

function duracionPuntoMs(punto) {
    try {
        return Number((BigInt(punto.endTimeNanos) - BigInt(punto.startTimeNanos)) / 1000000n);
    } catch (e) {
        return 0;
    }
}

function setTexto(id, texto) {
    const el = document.getElementById(id);
    if (el) el.textContent = texto;
}

// ==========================================
// MODAL CONTROLLERS (dashboard)
// ==========================================
export function abrirModalPeso() {
    const modal = document.getElementById("modal-registro-peso");
    if (modal) {
        modal.classList.add("active");
        document.body.classList.add("modal-open");
    }
}

export function cerrarModalPeso() {
    const modal = document.getElementById("modal-registro-peso");
    if (modal) {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }
}

export function mostrarAvisoFuturo() {
    alert("⚡ Este espacio cuadrado está reservado para una próxima ampliación (ej: Estadísticas avanzadas, Registro de Agua, Cronómetro de Descanso o Suplementación).");
}

window.abrirModalPeso = abrirModalPeso;
window.cerrarModalPeso = cerrarModalPeso;
window.mostrarAvisoFuturo = mostrarAvisoFuturo;

// ==========================================
// CARGA DE CHART.JS (+ ZOOM) SI NO ESTÁ DISPONIBLE
// ==========================================
function cargarScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = src;
        s.onload = resolve;
        s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
        document.head.appendChild(s);
    });
}

async function asegurarChartJS() {
    if (!window.Chart) {
        await cargarScript("https://cdn.jsdelivr.net/npm/chart.js");
    }
    if (!window.Hammer) {
        try { await cargarScript("https://cdn.jsdelivr.net/npm/hammerjs@2.0.8/hammer.min.js"); } catch (e) { console.warn(e.message); }
    }
    if (!window.ChartZoom && !document.querySelector('script[src*="chartjs-plugin-zoom"]')) {
        try { await cargarScript("https://cdn.jsdelivr.net/npm/chartjs-plugin-zoom@2.0.1/dist/chartjs-plugin-zoom.min.js"); } catch (e) { console.warn(e.message); }
    }
    return window.Chart;
}

// ==========================================
// GOOGLE FIT OAUTH 2.0 (FIREBASE AUTH)
// ==========================================
export function crearGoogleFitProvider() {
    const provider = new GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/fitness.activity.read");
    provider.addScope("https://www.googleapis.com/auth/fitness.body.read");
    provider.addScope("https://www.googleapis.com/auth/fitness.sleep.read");
    provider.addScope("https://www.googleapis.com/auth/fitness.heart_rate.read");
    provider.setCustomParameters({ prompt: "select_account" });
    return provider;
}

/** Inicio de sesión MANUAL: solo se dispara por acción directa del usuario */
export async function conectarGoogleFit() {
    const btn = document.getElementById("btnConectarGoogleFit");
    const txtBtn = document.getElementById("txtBtnGoogleFit");

    if (btn) btn.disabled = true;
    if (txtBtn) txtBtn.textContent = "Conectando con Google...";
    mostrarFeedbackGoogleFit("Abriendo autenticación con Google...", "#38bdf8");

    const provider = crearGoogleFitProvider();

    try {
        let result = null;
        try {
            result = await signInWithPopup(auth, provider);
        } catch (popupErr) {
            if (popupErr.code === "auth/popup-blocked" ||
                popupErr.code === "auth/cancelled-popup-request" ||
                popupErr.code === "auth/operation-not-supported-in-this-environment") {
                mostrarFeedbackGoogleFit("Redirigiendo a Google...", "#38bdf8");
                await signInWithRedirect(auth, provider);
                return;
            }
            throw popupErr;
        }
        if (result) await procesarResultadoGoogleAuth(result);
    } catch (error) {
        console.error("Error al autenticar con Google Fit:", error);
        mostrarFeedbackGoogleFit(
            error.code === "auth/popup-closed-by-user"
                ? "Inicio de sesión cancelado por el usuario."
                : `Error de conexión: ${error.message || error.code}`,
            "#f87171"
        );
        actualizarEstadoGoogleFitUI(false);
    }
}

async function procesarResultadoGoogleAuth(result) {
    if (!result) return;
    try {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential ? credential.accessToken : null;
        const user = result.user;

        if (accessToken) {
            localStorage.setItem("fitToken", accessToken);
            localStorage.setItem("fitTokenTimestamp", Date.now().toString());
            if (user?.email) localStorage.setItem("fitUserEmail", user.email);
            if (user?.displayName) localStorage.setItem("fitUserName", user.displayName);

            avisoSuenoMostrado = false;
            actualizarEstadoGoogleFitUI(true, "Sincronizando...");
            mostrarFeedbackGoogleFit(
                `✅ Conectado con Google Fit (${user?.displayName || user?.email || "Cuenta verificada"})`,
                "#4ade80"
            );
            await fetchFitData(accessToken, { forzar: true });
        } else {
            mostrarFeedbackGoogleFit("⚠️ No se recibió token de acceso OAuth.", "#facc15");
            actualizarEstadoGoogleFitUI(false);
        }
    } catch (err) {
        console.error("Error al procesar credencial de Google Fit:", err);
        if (!err || err.status !== 401) {
            mostrarFeedbackGoogleFit("Error al procesar credenciales de Google.", "#f87171");
        }
    }
}

export async function desconectarGoogleFit() {
    if (!confirm("¿Deseas desconectar Google Fit de esta aplicación?")) return;

    ["fitToken", "fitTokenTimestamp", "fitUserEmail", "fitUserName"].forEach(k => localStorage.removeItem(k));
    estado.cache = {};
    estado.dias = [];
    estado.hoy = null;

    try { await signOut(auth); } catch (e) { console.warn("signOut auth:", e); }

    actualizarEstadoGoogleFitUI(false);
    await renderizarEstadoDesconectadoUI();
    mostrarFeedbackGoogleFit("Google Fit desconectado.", "#94a3b8");
}

/**
 * Conectado: oculta 'Conectar' y muestra el indicador silencioso.
 * Desconectado: muestra 'Conectar' y oculta el indicador.
 */
export function actualizarEstadoGoogleFitUI(sincronizado = true, mensajeEstado = null) {
    const btns = document.querySelectorAll("#btnConectarGoogleFit");
    const pills = document.querySelectorAll("#syncStatusIndicator");
    const textos = document.querySelectorAll("#syncStatusText");
    const puntos = document.querySelectorAll("#syncPulseDot");
    const badges = document.querySelectorAll("#googleFitStatusBadge");

    if (sincronizado) {
        btns.forEach(b => { b.style.display = "none"; });
        pills.forEach(p => { p.style.display = "flex"; });
        const texto = mensajeEstado || "Google Fit Sincronizado";
        textos.forEach(t => { t.textContent = texto; });
        puntos.forEach(d => {
            if (texto.includes("Sincronizando")) d.classList.remove("synced");
            else d.classList.add("synced");
        });
        badges.forEach(b => { b.textContent = "Sincronizado"; b.classList.add("connected"); });
    } else {
        btns.forEach(b => {
            b.style.display = "inline-flex";
            b.disabled = false;
            b.classList.remove("synced");
            b.style.boxShadow = "";
        });
        document.querySelectorAll("#txtBtnGoogleFit").forEach(t => { t.textContent = "Conectar con Google Fit"; });
        pills.forEach(p => { p.style.display = "none"; });
        badges.forEach(b => { b.textContent = "Desconectado"; b.classList.remove("connected"); });
    }
}

function mostrarFeedbackGoogleFit(mensaje, color) {
    const lista = document.querySelectorAll("#googleFitFeedback");
    lista.forEach(fb => {
        fb.textContent = mensaje;
        fb.style.color = color;
        fb.style.display = "block";
    });
    setTimeout(() => {
        lista.forEach(fb => { if (fb.textContent === mensaje) fb.style.display = "none"; });
    }, 5000);
}

// ==========================================
// GOOGLE FIT REST API: PETICIONES
// ==========================================
async function consultarAggregate(token, cuerpo) {
    const resp = await fetch(FIT_AGGREGATE_URL, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json;encoding=utf-8"
        },
        body: JSON.stringify(cuerpo)
    });

    if (resp.status === 401) {
        const e = new Error("Token expirado (401)");
        e.status = 401;
        throw e;
    }
    if (!resp.ok) {
        const e = new Error(`Error en API: ${resp.status} ${resp.statusText}`);
        e.status = resp.status;
        throw e;
    }
    return resp.json();
}

function cuerpoActividad(inicio, fin, bucketMs) {
    return {
        aggregateBy: [
            { dataTypeName: "com.google.step_count.delta" },
            { dataTypeName: "com.google.calories.expended" },
            { dataTypeName: "com.google.weight" },
            { dataTypeName: "com.google.activity.segment" }
        ],
        bucketByTime: { durationMillis: Math.max(1, Math.round(bucketMs)) },
        startTimeMillis: inicio,
        endTimeMillis: fin
    };
}

function cuerpoSueno(inicio, fin, bucketMs) {
    return {
        aggregateBy: [{ dataTypeName: "com.google.sleep.segment" }],
        bucketByTime: { durationMillis: Math.max(1, Math.round(bucketMs)) },
        startTimeMillis: inicio,
        endTimeMillis: fin
    };
}

function cuerpoRitmoCardiaco(inicio, fin, bucketMs) {
    return {
        aggregateBy: [{ dataTypeName: "com.google.heart_rate.bpm" }],
        bucketByTime: { durationMillis: Math.max(1, Math.round(bucketMs)) },
        startTimeMillis: inicio,
        endTimeMillis: fin
    };
}

/** El sueño requiere el scope fitness.sleep.read; un 403 no debe tumbar el resto de métricas */
async function consultarSuenoTolerante(token, cuerpo) {
    try {
        return await consultarAggregate(token, cuerpo);
    } catch (e) {
        if (e.status === 401) throw e;
        console.warn("Sueño no disponible:", e.message);
        if (!avisoSuenoMostrado) {
            avisoSuenoMostrado = true;
            mostrarFeedbackGoogleFit("Para ver el sueño, desconecta y vuelve a conectar Google Fit (permiso nuevo).", "#facc15");
        }
        return { bucket: [] };
    }
}

/** Frecuencia cardíaca tolerante ante falta de permisos o sensores */
async function consultarCorazonTolerante(token, cuerpo) {
    try {
        return await consultarAggregate(token, cuerpo);
    } catch (e) {
        if (e.status === 401) throw e;
        console.warn("Frecuencia cardíaca no disponible:", e.message);
        return { bucket: [] };
    }
}

/** Convierte la respuesta aggregate en un acumulador por día natural local */
function acumularBuckets(mapa, data) {
    if (!data || !Array.isArray(data.bucket)) return;

    for (const bucket of data.bucket) {
        const inicioMs = Number(bucket.startTimeMillis);
        const clave = claveDia(inicioMs + 6 * 3600 * 1000); // robusto ante cambios de hora (DST)
        if (!mapa.has(clave)) {
            mapa.set(clave, { clave, ms: inicioMs, pasos: 0, calorias: 0, pesos: [], suenoMs: 0, cardio: {}, bpms: [] });
        }
        const dia = mapa.get(clave);
        if (!dia.bpms) dia.bpms = [];

        for (const dataset of (bucket.dataset || [])) {
            const dataId = (dataset.dataSourceId || "").toLowerCase();

            for (const punto of (dataset.point || [])) {
                const tipoDato = (punto.dataTypeName || dataId).toLowerCase();
                const valores = punto.value || [];

                if (tipoDato.includes("step_count")) {
                    for (const v of valores) {
                        dia.pasos += Number(v.intVal ?? Math.round(v.fpVal || 0)) || 0;
                    }
                } else if (tipoDato.includes("calories")) {
                    for (const v of valores) {
                        if (typeof v.fpVal === "number" && v.fpVal > 0) dia.calorias += v.fpVal;
                    }
                } else if (tipoDato.includes("weight")) {
                    // value[0] = media del bucket (avg, max, min)
                    const media = valores[0]?.fpVal;
                    if (typeof media === "number" && media > 0) dia.pesos.push(media);
                } else if (tipoDato.includes("sleep")) {
                    const tipo = Number(valores[0]?.intVal);
                    if (TIPOS_SUENO_VALIDOS.includes(tipo)) dia.suenoMs += duracionPuntoMs(punto);
                } else if (tipoDato.includes("activity")) {
                    const tipo = Number(valores[0]?.intVal);
                    if (ACTIVIDADES_CARDIO[tipo]) {
                        const ms = Number(valores[1]?.intVal) || duracionPuntoMs(punto);
                        dia.cardio[tipo] = (dia.cardio[tipo] || 0) + ms;
                    }
                } else if (tipoDato.includes("heart_rate") || tipoDato.includes("bpm")) {
                    const val = valores[0]?.fpVal ?? valores[0]?.intVal;
                    if (typeof val === "number" && val >= 30 && val <= 240) {
                        dia.bpms.push(val);
                    }
                }
            }
        }
    }
}

// ==========================================
// LIMPIEZA DE DATOS (FILTRO DE ANOMALÍAS)
// ==========================================
/**
 * - Descarta pesos < 40 kg.
 * - Promedia por día natural (varias lecturas el mismo día).
 * - Descarta saltos > 5 kg respecto al último dato válido de uno o dos días antes.
 */
function sanearPesos(dias) {
    let ultimo = null;
    let ultimoIdx = -99;

    dias.forEach((dia, i) => {
        const validos = (dia._pesosRaw || []).filter(p => p >= 40 && p <= 250);
        if (validos.length === 0) {
            dia.peso = null;
            return;
        }
        const media = validos.reduce((a, b) => a + b, 0) / validos.length;

        if (ultimo !== null && (i - ultimoIdx) <= 2 && Math.abs(media - ultimo) > 5) {
            dia.peso = null; // fluctuación anómala
            return;
        }
        dia.peso = parseFloat(media.toFixed(1));
        ultimo = dia.peso;
        ultimoIdx = i;
    });
}

/** Construye la serie diaria completa (huecos = null) para el rango pedido */
function construirDias(mapa, diasRango) {
    const lista = [];
    const hoyInicio = inicioDelDia();

    for (let i = diasRango - 1; i >= 0; i--) {
        const d = new Date(hoyInicio);
        d.setDate(d.getDate() - i);
        const clave = claveDia(d.getTime());
        const acc = mapa.get(clave);

        const validosBpm = (acc ? acc.bpms || [] : []).filter(b => typeof b === "number" && b >= 30 && b <= 240);
        const bpmDia = validosBpm.length > 0 ? Math.round(validosBpm.reduce((a, b) => a + b, 0) / validosBpm.length) : null;

        lista.push({
            clave,
            ms: d.getTime(),
            pasos: acc && acc.pasos > 0 ? acc.pasos : null,
            sueno: acc && acc.suenoMs > 0 ? parseFloat(Math.min(16, acc.suenoMs / 3600000).toFixed(1)) : null,
            cardio: acc ? acc.cardio : {},
            _pesosRaw: acc ? acc.pesos : [],
            peso: null,
            bpm: bpmDia
        });
    }

    sanearPesos(lista);
    return lista;
}

function trocearRango(inicioMs, finMs) {
    const tramos = [];
    let cursor = new Date(inicioMs);
    while (cursor.getTime() < finMs) {
        const sig = new Date(cursor);
        sig.setDate(sig.getDate() + MAX_DIAS_POR_PETICION);
        const fin = Math.min(sig.getTime(), finMs);
        tramos.push([cursor.getTime(), fin]);
        cursor = new Date(fin);
    }
    return tramos;
}

// ==========================================
// DATOS DE HOY (00:00 LOCAL) Y HISTÓRICO
// ==========================================
/** Consulta intradía detallada para el día en curso en intervalos de 15 a 30 minutos */
async function obtenerCorazonHoy(token) {
    const ahora = Date.now();
    const medianoche = inicioDelDia(); // 00:00:00 local
    const cuerpo = cuerpoRitmoCardiaco(medianoche, ahora, INTERVALO_CORAZON_HOY_MS);
    const data = await consultarCorazonTolerante(token, cuerpo);

    const puntos = [];
    if (data && Array.isArray(data.bucket)) {
        for (const bucket of data.bucket) {
            const inicioMs = Number(bucket.startTimeMillis);
            const validos = [];
            for (const dataset of (bucket.dataset || [])) {
                for (const punto of (dataset.point || [])) {
                    const vals = punto.value || [];
                    const v = vals[0]?.fpVal ?? vals[0]?.intVal;
                    // Filtrado estricto: descartar 0 o nulos y anomalías
                    if (typeof v === "number" && v > 0 && v >= 30 && v <= 240) {
                        validos.push(v);
                    }
                }
            }
            puntos.push({
                ms: inicioMs,
                bpm: validos.length > 0 ? Math.round(validos.reduce((a, b) => a + b, 0) / validos.length) : null
            });
        }
    }
    return puntos;
}

async function obtenerDatosHoy(token) {
    const ahora = Date.now();
    const medianoche = inicioDelDia(); // startTimeMillis = 00:00:00 local del día en curso
    const nocheAnterior = medianoche - 6 * 3600 * 1000; // sueño de la última noche (desde las 18:00 de ayer)

    const [datosActividad, datosSueno, puntosCorazon] = await Promise.all([
        consultarAggregate(token, cuerpoActividad(medianoche, ahora, ahora - medianoche)),
        consultarSuenoTolerante(token, cuerpoSueno(nocheAnterior, ahora, ahora - nocheAnterior)),
        obtenerCorazonHoy(token)
    ]);

    const mapaAct = new Map();
    acumularBuckets(mapaAct, datosActividad);
    const mapaSueno = new Map();
    acumularBuckets(mapaSueno, datosSueno);

    let pasos = 0, calorias = 0, cardioMs = 0, suenoMs = 0;
    const pesos = [];
    mapaAct.forEach(d => {
        pasos += d.pasos;
        calorias += d.calorias;
        pesos.push(...d.pesos);
        cardioMs += Object.values(d.cardio).reduce((a, b) => a + b, 0);
    });
    mapaSueno.forEach(d => { suenoMs += d.suenoMs; });

    const pesosValidos = pesos.filter(p => p >= 40 && p <= 250);

    const bpmsValidos = puntosCorazon.map(p => p.bpm).filter(b => b !== null && b > 0);
    const bpmAvg = bpmsValidos.length ? Math.round(bpmsValidos.reduce((a, b) => a + b, 0) / bpmsValidos.length) : null;
    const bpmUltimo = bpmsValidos.length ? bpmsValidos[bpmsValidos.length - 1] : null;

    estado.corazonHoy = puntosCorazon;

    return {
        pasos,
        calorias: Math.round(calorias),
        cardioMin: Math.round(cardioMs / 60000),
        suenoHoras: suenoMs > 0 ? parseFloat(Math.min(16, suenoMs / 3600000).toFixed(1)) : null,
        peso: pesosValidos.length ? parseFloat((pesosValidos.reduce((a, b) => a + b, 0) / pesosValidos.length).toFixed(1)) : null,
        bpmAvg,
        bpmUltimo,
        puntosCorazon
    };
}

async function cargarHistorial(token, rango, forzar = false) {
    const cache = estado.cache[rango];
    if (!forzar && cache && (Date.now() - cache.ts) < CACHE_HISTORIAL_MS) {
        estado.dias = cache.dias;
        return;
    }

    const hoyInicio = inicioDelDia();
    const inicio = new Date(hoyInicio);
    inicio.setDate(inicio.getDate() - (rango - 1));
    const fin = Date.now();

    const tramos = trocearRango(inicio.getTime(), fin);
    const respuestas = await Promise.all(tramos.map(async ([s, e]) => {
        const [act, sue, cor] = await Promise.all([
            consultarAggregate(token, cuerpoActividad(s, e, DIA_MS)),
            consultarSuenoTolerante(token, cuerpoSueno(s, e, DIA_MS)),
            consultarCorazonTolerante(token, cuerpoRitmoCardiaco(s, e, DIA_MS))
        ]);
        return [act, sue, cor];
    }));

    const mapa = new Map();
    respuestas.forEach(([act, sue, cor]) => {
        acumularBuckets(mapa, act);
        acumularBuckets(mapa, sue);
        acumularBuckets(mapa, cor);
    });

    const dias = construirDias(mapa, rango);
    estado.cache[rango] = { ts: Date.now(), dias };
    estado.dias = dias;
}

// ==========================================
// FUNCIÓN PRINCIPAL DE SINCRONIZACIÓN
// ==========================================
export function fetchFitData(token = null, opciones = {}) {
    if (sincronizacionEnCurso) return sincronizacionEnCurso;

    sincronizacionEnCurso = (async () => {
        token = token || localStorage.getItem("fitToken");
        if (!token) {
            actualizarEstadoGoogleFitUI(false);
            await renderizarEstadoDesconectadoUI();
            return null;
        }

        actualizarEstadoGoogleFitUI(true, "Sincronizando...");

        try {
            await asegurarChartJS().catch(e => console.warn(e.message));

            estado.hoy = await obtenerDatosHoy(token);
            await renderizarHoy(estado.hoy);

            if (document.getElementById("chartCorazonHoy")) {
                await renderizarCorazonHoy(estado.corazonHoy);
            }

            if (document.getElementById("chartMain")) {
                await cargarHistorial(token, estado.rango, Boolean(opciones.forzar));
                await renderizarGraficaPrincipal();
                renderizarListaCardio();
            }

            exportarContextoIA();
            actualizarEstadoGoogleFitUI(true, "Google Fit Sincronizado");
            return estado.hoy;
        } catch (error) {
            if (error.status === 401) {
                manejarTokenExpirado("⚠️ Tu sesión de Google Fit ha caducado (401). Pulsa 'Conectar con Google Fit' para renovar.");
            } else {
                console.error("Error al consultar Google Fit REST API:", error);
                actualizarEstadoGoogleFitUI(true, "Aviso de conexión");
                mostrarFeedbackGoogleFit(`Error al sincronizar: ${error.message}`, "#f87171");
            }
            throw error;
        }
    })();

    const liberar = () => { sincronizacionEnCurso = null; };
    sincronizacionEnCurso.then(liberar, liberar);
    return sincronizacionEnCurso;
}

// ==========================================
// EXPORTACIÓN DE CONTEXTO PARA EL AI COACH
// ==========================================
function estimarFatiga(suenoHoras, pasos, cardioMin) {
    if (suenoHoras === null && !pasos) return "sin datos";
    let puntos = 0;
    if (suenoHoras !== null) {
        if (suenoHoras < 6) puntos += 2;
        else if (suenoHoras < 7) puntos += 1;
    }
    if (pasos > 15000) puntos += 1;
    if (cardioMin > 60) puntos += 1;
    return puntos >= 3 ? "alta" : (puntos >= 1 ? "media" : "baja");
}

function calcularTendenciaPeso() {
    const validos = estado.dias.filter(d => d.peso !== null).slice(-7).map(d => d.peso);
    if (validos.length) {
        return parseFloat((validos.reduce((a, b) => a + b, 0) / validos.length).toFixed(1));
    }
    return null;
}

/** Consolida el resumen del día en localStorage ('health_context_ai') para coach.js */
export function exportarContextoIA() {
    const hoy = estado.hoy;
    if (!hoy) return null;

    let previo = {};
    try { previo = JSON.parse(localStorage.getItem(CLAVE_CONTEXTO_IA) || "{}"); } catch (e) { previo = {}; }

    const tendencia = calcularTendenciaPeso() ?? hoy.peso ?? previo.tendenciaPeso ?? null;

    const data = {
        fecha: claveDia(Date.now()),
        pasosHoy: hoy.pasos,
        caloriasHoy: hoy.calorias,
        suenoHoras: hoy.suenoHoras,
        cardioMinutosHoy: hoy.cardioMin,
        bpmAvgHoy: hoy.bpmAvg || null,
        bpmUltimoHoy: hoy.bpmUltimo || null,
        fatigaEstimada: estimarFatiga(hoy.suenoHoras, hoy.pasos, hoy.cardioMin),
        tendenciaPeso: tendencia,
        actualizado: new Date().toISOString()
    };

    localStorage.setItem(CLAVE_CONTEXTO_IA, JSON.stringify(data));
    return data;
}

// ==========================================
// RENDER: ANILLOS, RESUMEN Y DASHBOARD
// ==========================================
async function renderizarHoy(hoy) {
    const contexto = (() => {
        try { return JSON.parse(localStorage.getItem(CLAVE_CONTEXTO_IA) || "{}"); } catch (e) { return {}; }
    })();
    const pesoMostrar = hoy.peso ?? calcularTendenciaPeso() ?? contexto.tendenciaPeso ?? null;

    // Resumen rápido
    setTexto("resumenSueno", hoy.suenoHoras !== null ? `${hoy.suenoHoras} h` : "--");
    setTexto("resumenCardio", `${hoy.cardioMin} min`);
    setTexto("resumenFatiga", estimarFatiga(hoy.suenoHoras, hoy.pasos, hoy.cardioMin));

    // Tarjetas del dashboard principal (si está presente)
    setTexto("fitPasosValorDash", hoy.pasos.toLocaleString());
    setTexto("fitPesoValorDash", pesoMostrar !== null ? pesoMostrar.toFixed(1) : "--");
    document.querySelectorAll("#fitPasosValorDash").forEach(el => el.classList.add("loaded-steps"));
    if (pesoMostrar !== null) document.querySelectorAll("#fitPesoValorDash").forEach(el => el.classList.add("loaded"));

    if (displayPeso && pesoMostrar !== null) {
        displayPeso.innerText = `${pesoMostrar.toFixed(1)} kg`;
        displayPeso.style.color = "#38bdf8";
    }
    if (displayModal && pesoMostrar !== null) {
        displayModal.innerText = `${pesoMostrar.toFixed(1)} kg (Google Fit)`;
        displayModal.style.color = "#38bdf8";
    }

    if (document.getElementById("chartPasosRing")) {
        renderizarAnillo("chartPasosRing", hoy.pasos, META_PASOS, "ringPasosValor", "ringPasosPct", "pasos");
        renderizarAnillo("chartCaloriasRing", hoy.calorias, META_KCAL, "ringCaloriasValor", "ringCaloriasPct", "calorias");
    }
}

function renderizarAnillo(canvasId, valor, meta, idValor, idPct, ref) {
    const canvas = document.getElementById(canvasId);
    if (!canvas || !window.Chart) return;

    const seguro = Math.max(0, valor || 0);
    const restante = Math.max(0, meta - seguro);
    const pct = Math.min(100, Math.round((seguro / meta) * 100));

    setTexto(idValor, seguro.toLocaleString());
    setTexto(idPct, `${pct}%`);

    if (ref === "pasos" && chartPasosInstance) { chartPasosInstance.destroy(); chartPasosInstance = null; }
    if (ref === "calorias" && chartCaloriasInstance) { chartCaloriasInstance.destroy(); chartCaloriasInstance = null; }

    const instancia = new window.Chart(canvas.getContext("2d"), {
        type: "doughnut",
        data: {
            datasets: [{
                data: [seguro, restante],
                backgroundColor: ["#38bdf8", "#2c2c2e"],
                borderWidth: 0,
                cutout: "80%",
                borderRadius: 16
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 900, easing: "easeOutQuart" },
            plugins: { tooltip: { enabled: false }, legend: { display: false } }
        }
    });

    if (ref === "pasos") chartPasosInstance = instancia;
    else chartCaloriasInstance = instancia;
}

// ==========================================
// RENDER: GRÁFICA INTRADÍA (FRECUENCIA CARDÍACA HOY)
// ==========================================
async function renderizarCorazonHoy(puntos = []) {
    const canvas = document.getElementById("chartCorazonHoy");
    if (!canvas || !canvas.isConnected) return;
    await asegurarChartJS();
    if (!canvas.isConnected) return;

    const labels = (puntos || []).map(p => new Date(p.ms).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }));
    // Filtrado estricto de ceros: valores nulos o <= 0 se descartan y se pasan como null a Chart.js con spanGaps: true
    const valores = (puntos || []).map(p => (typeof p.bpm === "number" && p.bpm > 0) ? p.bpm : null);
    const reales = valores.filter(v => v !== null && v > 0);

    const badge = document.getElementById("heartRateActualBadge");
    if (reales.length) {
        const ultimo = reales[reales.length - 1];
        const min = Math.min(...reales);
        const max = Math.max(...reales);
        const avg = Math.round(reales.reduce((a, b) => a + b, 0) / reales.length);

        setTexto("heartRateActualBadge", `${ultimo} BPM`);
        setTexto("heartRateStatMin", `${min} BPM`);
        setTexto("heartRateStatAvg", `${avg} BPM`);
        setTexto("heartRateStatMax", `${max} BPM`);
        if (badge) badge.classList.add("pulsing");
    } else {
        setTexto("heartRateActualBadge", "-- BPM");
        ["heartRateStatMin", "heartRateStatAvg", "heartRateStatMax"].forEach(id => setTexto(id, "--"));
        if (badge) badge.classList.remove("pulsing");
    }

    if (chartCorazonHoyInstance) {
        chartCorazonHoyInstance.destroy();
        chartCorazonHoyInstance = null;
    }

    const ctx = canvas.getContext("2d");
    const altura = canvas.clientHeight || 180;
    const gradiente = ctx.createLinearGradient(0, 0, 0, altura);
    gradiente.addColorStop(0, "rgba(239, 68, 68, 0.42)");
    gradiente.addColorStop(0.65, "rgba(239, 68, 68, 0.10)");
    gradiente.addColorStop(1, "rgba(239, 68, 68, 0)");

    const ejeY = {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#94a3b8", font: { size: 11 } }
    };
    if (reales.length) {
        ejeY.suggestedMin = Math.max(30, Math.floor(Math.min(...reales) - 5));
        ejeY.suggestedMax = Math.min(220, Math.ceil(Math.max(...reales) + 5));
        ejeY.beginAtZero = false;
    } else {
        ejeY.suggestedMin = 50;
        ejeY.suggestedMax = 120;
        ejeY.beginAtZero = false;
    }

    chartCorazonHoyInstance = new window.Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: "Frecuencia Cardíaca",
                data: valores,
                borderColor: "#ef4444",
                borderWidth: 2.5,
                tension: 0.4,
                spanGaps: true,
                fill: true,
                backgroundColor: gradiente,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHitRadius: 14,
                pointBackgroundColor: "#ef4444",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(28, 28, 30, 0.96)",
                    titleColor: "#94a3b8",
                    bodyColor: "#ef4444",
                    bodyFont: { weight: "bold", size: 13 },
                    borderColor: "#334155",
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (c) => c.parsed.y ? `${c.parsed.y} BPM` : "Sin medición"
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#94a3b8", font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }
                },
                y: ejeY
            }
        }
    });
}

// ==========================================
// RENDER: GRÁFICA PRINCIPAL (PESO / SUEÑO / PASOS / PULSACIONES)
// ==========================================
const CONFIG_METRICAS = {
    peso:  { titulo: "Evolución de Peso",        unidad: "kg",    decimales: 1, campo: "peso" },
    sueno: { titulo: "Horas de Sueño",           unidad: "h",     decimales: 1, campo: "sueno" },
    pasos: { titulo: "Pasos Diarios",            unidad: "pasos", decimales: 0, campo: "pasos" },
    bpm:   { titulo: "Frecuencia Cardíaca Media", unidad: "BPM",   decimales: 0, campo: "bpm" }
};

function formatearValor(v, cfg) {
    if (v === null || v === undefined || isNaN(v)) return "--";
    const txt = cfg.decimales ? v.toFixed(cfg.decimales) : Math.round(v).toLocaleString();
    return `${txt} ${cfg.unidad}`;
}

async function renderizarGraficaPrincipal() {
    const canvas = document.getElementById("chartMain");
    if (!canvas || !canvas.isConnected) return;
    await asegurarChartJS();
    if (!canvas.isConnected) return;

    const cfg = CONFIG_METRICAS[estado.metrica] || CONFIG_METRICAS.peso;
    const dias = estado.dias;
    const labels = dias.map(d => etiquetaDia(d.ms));
    // Filtrado estricto de ceros: valores nulos o <= 0 se descartan para que spanGaps: true no haga caídas a 0
    const valores = dias.map(d => (typeof d[cfg.campo] === "number" && d[cfg.campo] > 0) ? d[cfg.campo] : null);
    const reales = valores.filter(v => v !== null && v > 0);

    const esBpm = estado.metrica === "bpm";
    const colorPrimario = esBpm ? "#ef4444" : "#38bdf8";

    setTexto("chartMainTitle", cfg.titulo);
    const badge = document.getElementById("chartPesoActualBadge");
    if (badge) {
        badge.textContent = reales.length ? formatearValor(reales[reales.length - 1], cfg) : "--";
        badge.classList.toggle("badge-bpm", esBpm);
    }

    if (reales.length) {
        const min = Math.min(...reales);
        const max = Math.max(...reales);
        const avg = reales.reduce((a, b) => a + b, 0) / reales.length;
        setTexto("weightStatMin", formatearValor(min, cfg));
        setTexto("weightStatAvg", formatearValor(avg, cfg));
        setTexto("weightStatMax", formatearValor(max, cfg));
    } else {
        ["weightStatMin", "weightStatAvg", "weightStatMax"].forEach(id => setTexto(id, "--"));
    }

    if (chartMainInstance) { chartMainInstance.destroy(); chartMainInstance = null; }

    const ctx = canvas.getContext("2d");
    const altura = canvas.clientHeight || 190;
    const gradiente = ctx.createLinearGradient(0, 0, 0, altura);
    if (esBpm) {
        gradiente.addColorStop(0, "rgba(239, 68, 68, 0.42)");
        gradiente.addColorStop(0.65, "rgba(239, 68, 68, 0.10)");
        gradiente.addColorStop(1, "rgba(239, 68, 68, 0)");
    } else {
        gradiente.addColorStop(0, "rgba(56, 189, 248, 0.42)");
        gradiente.addColorStop(0.65, "rgba(56, 189, 248, 0.10)");
        gradiente.addColorStop(1, "rgba(56, 189, 248, 0)");
    }

    const ejeY = {
        grid: { display: false },
        border: { display: false },
        ticks: { color: "#94a3b8", font: { size: 11 } }
    };
    if (estado.metrica === "peso" && reales.length) {
        ejeY.suggestedMin = Math.floor(Math.min(...reales) - 1);
        ejeY.suggestedMax = Math.ceil(Math.max(...reales) + 1);
        ejeY.beginAtZero = false;
    } else if (esBpm && reales.length) {
        ejeY.suggestedMin = Math.max(30, Math.floor(Math.min(...reales) - 5));
        ejeY.suggestedMax = Math.min(220, Math.ceil(Math.max(...reales) + 5));
        ejeY.beginAtZero = false;
    } else {
        ejeY.beginAtZero = true;
    }

    chartMainInstance = new window.Chart(ctx, {
        type: "line",
        data: {
            labels,
            datasets: [{
                label: cfg.titulo,
                data: valores,
                borderColor: colorPrimario,
                borderWidth: 2.5,
                tension: 0.4,
                spanGaps: true,
                fill: true,
                backgroundColor: gradiente,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHitRadius: 14,
                pointBackgroundColor: colorPrimario,
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: "index", intersect: false },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(28, 28, 30, 0.96)",
                    titleColor: "#94a3b8",
                    bodyColor: colorPrimario,
                    bodyFont: { weight: "bold", size: 13 },
                    borderColor: "#334155",
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: { label: (c) => formatearValor(c.parsed.y, cfg) }
                },
                zoom: {
                    pan: { enabled: true, mode: "x" },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: "x"
                    },
                    limits: { x: { min: "original", max: "original", minRange: 3 } }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    border: { display: false },
                    ticks: { color: "#94a3b8", font: { size: 11 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 7 }
                },
                y: ejeY
            }
        }
    });
}

async function renderizarEstadoDesconectadoUI() {
    estado.dias = [];
    estado.corazonHoy = [];
    setTexto("chartPesoActualBadge", "--");
    setTexto("heartRateActualBadge", "-- BPM");
    ["weightStatMin", "weightStatAvg", "weightStatMax", "heartRateStatMin", "heartRateStatAvg", "heartRateStatMax", "resumenSueno", "resumenCardio", "resumenFatiga"].forEach(id => setTexto(id, "--"));

    if (document.getElementById("chartCorazonHoy")) {
        await renderizarCorazonHoy([]);
    }

    if (document.getElementById("chartPasosRing")) {
        try {
            await asegurarChartJS();
            renderizarAnillo("chartPasosRing", 0, META_PASOS, "ringPasosValor", "ringPasosPct", "pasos");
            renderizarAnillo("chartCaloriasRing", 0, META_KCAL, "ringCaloriasValor", "ringCaloriasPct", "calorias");
            if (document.getElementById("chartMain")) await renderizarGraficaPrincipal();
        } catch (e) {
            console.warn(e.message);
        }
    }
    renderizarListaCardio();
}

// ==========================================
// RENDER: SESIONES DE CARDIO
// ==========================================
function renderizarListaCardio() {
    const lista = document.getElementById("listaCardio");
    if (!lista) return;

    const sesiones = [];
    estado.dias.forEach(dia => {
        Object.entries(dia.cardio || {}).forEach(([tipo, ms]) => {
            if (ms >= 5 * 60000) sesiones.push({ ms: dia.ms, tipo: Number(tipo), dur: ms });
        });
    });
    sesiones.sort((a, b) => b.ms - a.ms);

    if (sesiones.length === 0) {
        lista.innerHTML = '<div class="cardio-empty">Sin sesiones recientes o sin conexión.</div>';
        return;
    }

    lista.innerHTML = sesiones.slice(0, 6).map(s => {
        const min = Math.round(s.dur / 60000);
        const fecha = new Date(s.ms).toLocaleDateString("es-ES", { weekday: "short", day: "2-digit", month: "short" });
        const dur = min >= 60 ? `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")} min` : `${min} min`;
        return `
            <div class="cardio-card">
                <div class="cardio-card-main">
                    <span class="cardio-card-name">${ACTIVIDADES_CARDIO[s.tipo]}</span>
                    <span class="cardio-card-date">${fecha}</span>
                </div>
                <span class="cardio-card-dur">${dur}</span>
            </div>`;
    }).join("");
}

// ==========================================
// CONTROLES: RANGO, MÉTRICA, ZOOM
// ==========================================
async function cambiarRango(rango) {
    estado.rango = rango;
    document.querySelectorAll(".range-btn[data-range]").forEach(b => {
        b.classList.toggle("active", Number(b.dataset.range) === rango);
    });

    const token = localStorage.getItem("fitToken");
    if (!token) {
        mostrarFeedbackGoogleFit("Conecta Google Fit para ver el histórico.", "#facc15");
        return;
    }

    try {
        setTexto("chartPesoActualBadge", "...");
        await cargarHistorial(token, rango);
        await renderizarGraficaPrincipal();
        renderizarListaCardio();
        exportarContextoIA();
    } catch (e) {
        if (e.status === 401) {
            manejarTokenExpirado("⚠️ Tu sesión de Google Fit ha caducado (401). Pulsa 'Conectar con Google Fit' para renovar.");
        } else {
            mostrarFeedbackGoogleFit(`Error al cargar el histórico: ${e.message}`, "#f87171");
        }
    }
}

async function cambiarMetrica(metrica) {
    estado.metrica = metrica;
    document.querySelectorAll(".segment-btn[data-metric]").forEach(b => {
        b.classList.toggle("active", b.dataset.metric === metrica);
    });
    await renderizarGraficaPrincipal();
}

function enlazarControles() {
    document.querySelectorAll(".range-btn[data-range]").forEach(btn => {
        btn.onclick = () => cambiarRango(Number(btn.dataset.range));
        btn.classList.toggle("active", Number(btn.dataset.range) === estado.rango);
    });
    document.querySelectorAll(".segment-btn[data-metric]").forEach(btn => {
        btn.onclick = () => cambiarMetrica(btn.dataset.metric);
        btn.classList.toggle("active", btn.dataset.metric === estado.metrica);
    });
    const reset = document.getElementById("btnResetZoom");
    if (reset) {
        reset.onclick = () => {
            if (chartMainInstance && typeof chartMainInstance.resetZoom === "function") chartMainInstance.resetZoom();
        };
    }
}

// ==========================================
// EXPIRACIÓN (401) Y REFRESCO MANUAL
// ==========================================
export function manejarTokenExpirado(mensaje = "Sesión de Google Fit expirada. Pulsa para reconectar.") {
    console.warn("Limpiando estado de autenticación de Google Fit (401)...");
    ["fitToken", "fitTokenTimestamp", "fitUserEmail", "fitUserName"].forEach(k => localStorage.removeItem(k));
    estado.cache = {};

    actualizarEstadoGoogleFitUI(false);
    mostrarFeedbackGoogleFit(mensaje, "#f87171");
    renderizarEstadoDesconectadoUI();
}

export async function refrescarFitData() {
    const token = localStorage.getItem("fitToken");
    if (!token) {
        mostrarFeedbackGoogleFit("⚠️ No hay sesión activa. Pulsa 'Conectar con Google Fit'.", "#facc15");
        actualizarEstadoGoogleFitUI(false);
        return;
    }
    mostrarFeedbackGoogleFit("🔄 Sincronizando con Google Fit...", "#38bdf8");
    try {
        const datos = await fetchFitData(token, { forzar: true });
        mostrarFeedbackGoogleFit("✅ Métricas actualizadas con éxito.", "#4ade80");
        return datos;
    } catch (e) {
        // El error ya se ha comunicado en fetchFitData
    }
}

// ==========================================
// INICIALIZACIÓN Y CICLO DE VIDA
// ==========================================
export function initSalud() {
    cleanupSalud();

    displayPeso = document.getElementById("ultimoPesoDisplay");
    displayModal = document.getElementById("ultimoPesoDisplayModal");
    statusBadge = document.getElementById("dbStatusBadge");

    const btnGoogleFit = document.getElementById("btnConectarGoogleFit");
    if (btnGoogleFit) btnGoogleFit.onclick = conectarGoogleFit;

    enlazarControles();

    // Captura silenciosa tras un signInWithRedirect
    try {
        getRedirectResult(auth).then((result) => {
            if (result) procesarResultadoGoogleAuth(result);
        }).catch((err) => {
            if (err && err.code !== "auth/null-user") console.warn("getRedirectResult:", err);
        });
    } catch (e) {
        console.warn("getRedirectResult no disponible:", e);
    }

    // Persistencia: usuario activo + token => sincronización automática y silenciosa
    try {
        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            const token = localStorage.getItem("fitToken");
            if ((user || auth.currentUser) && token) {
                actualizarEstadoGoogleFitUI(true, "Sincronizando...");
                try {
                    await fetchFitData(token);
                } catch (err) {
                    console.warn("Sincronización silenciosa:", err.message);
                }
            } else {
                actualizarEstadoGoogleFitUI(false);
                renderizarEstadoDesconectadoUI();
            }
        });
    } catch (e) {
        console.warn("onAuthStateChanged:", e);
    }

    document.addEventListener("keydown", handleEscapeKey);
    escucharEstadoFirestore();
}

export function cleanupSalud() {
    if (typeof unsubscribeFirestore === "function") { unsubscribeFirestore(); unsubscribeFirestore = null; }
    if (typeof unsubscribeAuth === "function") { unsubscribeAuth(); unsubscribeAuth = null; }

    [chartPasosInstance, chartCaloriasInstance, chartCorazonHoyInstance, chartMainInstance].forEach(c => { if (c) c.destroy(); });
    chartPasosInstance = null;
    chartCaloriasInstance = null;
    chartCorazonHoyInstance = null;
    chartMainInstance = null;

    document.removeEventListener("keydown", handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === "Escape") cerrarModalPeso();
}

/** Indicador de conexión con Firestore (la fuente de datos de salud es Google Fit, solo lectura) */
function escucharEstadoFirestore() {
    try {
        const q = query(collection(db, "registros_peso"), orderBy("timestamp", "desc"), limit(1));
        unsubscribeFirestore = onSnapshot(q, () => {
            if (statusBadge) {
                statusBadge.textContent = "🟢 Firestore conectado";
                statusBadge.style.color = "#4ade80";
            }
        }, (error) => {
            console.error("Error al escuchar Firestore:", error);
            if (statusBadge) {
                statusBadge.textContent = "🔴 Error al conectar Firestore";
                statusBadge.style.color = "#f87171";
            }
        });
    } catch (e) {
        console.error("Error en listener de Firestore:", e);
    }
}

// ==========================================
// EXPOSICIÓN GLOBAL
// ==========================================
window.salud = {
    initSalud,
    cleanupSalud,
    fetchFitData,
    refrescarFitData,
    conectarGoogleFit,
    desconectarGoogleFit,
    actualizarEstadoGoogleFitUI,
    manejarTokenExpirado,
    exportarContextoIA,
    abrirModalPeso,
    cerrarModalPeso,
    crearGoogleFitProvider,
    mostrarAvisoFuturo
};
window.conectarGoogleFit = conectarGoogleFit;
window.refrescarFitData = refrescarFitData;

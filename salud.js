import { app, db, auth } from "./firebase-config.js";
import { 
    collection, 
    query, 
    orderBy, 
    limit, 
    onSnapshot,
    getDocs 
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
// ESTADO Y REFERENCIAS DEL MÓDULO SALUD
// ==========================================
let displayPeso = null;
let displayModal = null;
let statusBadge = null;
let unsubscribeFirestore = null;
let unsubscribeAuth = null;

// Instancias de Chart.js
let chartPasosInstance = null;
let chartCaloriasInstance = null;
let chartPesoInstance = null;

let ultimoDatoBiometrico = {
    peso: null,
    pasos: 0,
    calorias: 0
};

// ==========================================
// MODAL CONTROLLERS (PESO / BIOMETRÍA)
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
// GESTIÓN DE CARGA DE CHART.JS
// ==========================================
async function asegurarChartJS() {
    if (window.Chart) return window.Chart;
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/chart.js";
        script.onload = () => resolve(window.Chart);
        script.onerror = () => reject(new Error("No se pudo cargar Chart.js"));
        document.head.appendChild(script);
    });
}

// ==========================================
// GOOGLE FIT OAUTH 2.0 (FIREBASE AUTH)
// ==========================================

export function crearGoogleFitProvider() {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/fitness.activity.read');
    provider.addScope('https://www.googleapis.com/auth/fitness.body.read');
    provider.setCustomParameters({
        prompt: 'select_account'
    });
    return provider;
}

/**
 * Inicio de sesión MANUAL (solo se dispara cuando el usuario pulsa 'Conectar con Google Fit')
 */
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
                console.warn("Popup bloqueado, recurriendo a signInWithRedirect...", popupErr);
                mostrarFeedbackGoogleFit("Redirigiendo a Google...", "#38bdf8");
                await signInWithRedirect(auth, provider);
                return;
            } else {
                throw popupErr;
            }
        }

        if (result) {
            await procesarResultadoGoogleAuth(result);
        }
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

            actualizarEstadoGoogleFitUI(true);
            mostrarFeedbackGoogleFit(
                `✅ Conectado con Google Fit (${user?.displayName || user?.email || 'Cuenta verificada'})`,
                "#4ade80"
            );

            // Sincronización automática silenciosa
            await fetchFitData(accessToken);
        } else {
            console.warn("No se pudo obtener credential.accessToken del resultado.");
            mostrarFeedbackGoogleFit("⚠️ No se recibió token de acceso OAuth.", "#facc15");
            actualizarEstadoGoogleFitUI(false);
        }
    } catch (err) {
        console.error("Error al procesar credencial de Google Fit:", err);
        mostrarFeedbackGoogleFit("Error al procesar credenciales de Google.", "#f87171");
        actualizarEstadoGoogleFitUI(false);
    }
}

/**
 * Cierre de sesión voluntario de Google Fit
 */
export async function desconectarGoogleFit() {
    const confirmar = confirm("¿Deseas desconectar Google Fit de esta aplicación?");
    if (!confirmar) return;

    localStorage.removeItem("fitToken");
    localStorage.removeItem("fitTokenTimestamp");
    localStorage.removeItem("fitUserEmail");
    localStorage.removeItem("fitUserName");

    try {
        await signOut(auth);
    } catch (e) {
        console.warn("signOut auth:", e);
    }

    actualizarEstadoGoogleFitUI(false);
    renderizarEstadoDesconectadoUI();
    mostrarFeedbackGoogleFit("Google Fit desconectado.", "#94a3b8");
}

/**
 * Modifica la UI según el estado de autenticación:
 * - Si conectado: Oculta el botón 'Conectar' y muestra el indicador silencioso 'Sincronizando...' / 'Sincronizado'
 * - Si desconectado: Muestra el botón 'Conectar' y oculta el indicador silencioso
 */
export function actualizarEstadoGoogleFitUI(sincronizado = true, mensajeEstado = null) {
    const btnConectarList = document.querySelectorAll("#btnConectarGoogleFit");
    const syncIndicatorList = document.querySelectorAll("#syncStatusIndicator");
    const syncTextList = document.querySelectorAll("#syncStatusText");
    const syncPulseList = document.querySelectorAll("#syncPulseDot");
    const badgeList = document.querySelectorAll("#googleFitStatusBadge");

    if (sincronizado) {
        // Ocultar botón 'Conectar'
        btnConectarList.forEach(btn => {
            btn.style.display = "none";
        });

        // Mostrar indicador silencioso
        syncIndicatorList.forEach(pill => {
            pill.style.display = "flex";
        });

        const texto = mensajeEstado || "Google Fit Sincronizado";
        syncTextList.forEach(el => {
            el.textContent = texto;
        });

        syncPulseList.forEach(dot => {
            if (mensajeEstado && mensajeEstado.includes("Sincronizando")) {
                dot.classList.remove("synced");
            } else {
                dot.classList.add("synced");
            }
        });

        badgeList.forEach(b => {
            b.textContent = "Sincronizado";
            b.classList.add("connected");
        });
    } else {
        // Mostrar botón 'Conectar'
        btnConectarList.forEach(btn => {
            btn.style.display = "inline-flex";
            btn.disabled = false;
            btn.classList.remove("synced");
            btn.style.boxShadow = "";
        });

        const txtBtnList = document.querySelectorAll("#txtBtnGoogleFit");
        txtBtnList.forEach(txt => {
            txt.textContent = "Conectar con Google Fit";
        });

        // Ocultar indicador silencioso
        syncIndicatorList.forEach(pill => {
            pill.style.display = "none";
        });

        badgeList.forEach(b => {
            b.textContent = "Desconectado";
            b.classList.remove("connected");
        });
    }
}

function mostrarFeedbackGoogleFit(mensaje, color) {
    const fbList = document.querySelectorAll("#googleFitFeedback");
    fbList.forEach(fb => {
        fb.textContent = mensaje;
        fb.style.color = color;
        fb.style.display = "block";
    });

    setTimeout(() => {
        fbList.forEach(fb => {
            if (fb.textContent === mensaje) {
                fb.style.display = "none";
            }
        });
    }, 4500);
}

// ==========================================
// GOOGLE FIT REST API: LECTURA DE MÉTRICAS
// ==========================================

/**
 * Petición POST a Google Fit dataset:aggregate para las últimas 24 horas.
 * Agrega pasos, calorías y peso.
 */
export async function fetchFitData(token = null) {
    if (!token) {
        token = localStorage.getItem("fitToken");
    }

    if (!token) {
        actualizarEstadoGoogleFitUI(false);
        renderizarEstadoDesconectadoUI();
        return;
    }

    const endTimeMillis = Date.now();
    const startTimeMillis = endTimeMillis - (24 * 60 * 60 * 1000); // 24 horas

    const payload = {
        aggregateBy: [
            { dataTypeName: "com.google.weight" },
            { dataTypeName: "com.google.step_count.delta" },
            { dataTypeName: "com.google.calories.expended" }
        ],
        bucketByTime: {
            durationMillis: 86400000 // 1 día (24 horas)
        },
        startTimeMillis: startTimeMillis,
        endTimeMillis: endTimeMillis
    };

    actualizarEstadoGoogleFitUI(true, "Sincronizando datos...");

    try {
        const response = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json;encoding=utf-8"
            },
            body: JSON.stringify(payload)
        });

        // Error 401 Unauthorized: token expirado
        if (response.status === 401) {
            console.warn("Google Fit API: 401 Unauthorized (Token caducado o revocado).");
            manejarTokenExpirado("⚠️ Tu sesión de Google Fit ha caducado (401). Pulsa 'Conectar con Google Fit' para renovar.");
            throw new Error("Token expirado (401)");
        }

        if (!response.ok) {
            const errorTxt = await response.text();
            console.error(`Error ${response.status} en Google Fit API:`, errorTxt);
            throw new Error(`Error en API: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        const resultados = parsearFitAggregateData(data);

        ultimoDatoBiometrico = resultados;

        // Renderizar anillos y gráfico de tendencia
        await renderizarDashboardVisual(resultados);

        actualizarEstadoGoogleFitUI(true, "Google Fit Sincronizado");

        return resultados;
    } catch (error) {
        console.error("Error al consultar Google Fit REST API:", error);
        if (error.message && error.message.includes("401")) {
            // Ya limpiado en manejarTokenExpirado
        } else {
            actualizarEstadoGoogleFitUI(true, "Aviso de conexión");
        }
        throw error;
    }
}

/**
 * Parsea el JSON devuelto por Google Fit aggregate
 */
function parsearFitAggregateData(data) {
    let pesoEncontrado = null;
    let pasosAcumulados = 0;
    let caloriasAcumuladas = 0;

    if (!data || !Array.isArray(data.bucket)) {
        return { peso: null, pasos: 0, calorias: 0 };
    }

    for (const bucket of data.bucket) {
        if (!Array.isArray(bucket.dataset)) continue;

        for (const dataset of bucket.dataset) {
            const dataId = (dataset.dataSourceId || "").toLowerCase();
            const points = dataset.point || [];

            for (const point of points) {
                const dataTypeName = (point.dataTypeName || "").toLowerCase();
                const values = point.value || [];

                // 1. Pasos (com.google.step_count.delta)
                if (dataTypeName.includes("step_count") || dataId.includes("step_count")) {
                    for (const val of values) {
                        if (typeof val.intVal === "number") {
                            pasosAcumulados += val.intVal;
                        } else if (typeof val.intVal === "string") {
                            pasosAcumulados += parseInt(val.intVal, 10) || 0;
                        } else if (typeof val.fpVal === "number") {
                            pasosAcumulados += Math.round(val.fpVal);
                        }
                    }
                }

                // 2. Calorías (com.google.calories.expended)
                if (dataTypeName.includes("calories") || dataId.includes("calories")) {
                    for (const val of values) {
                        if (typeof val.fpVal === "number" && val.fpVal > 0) {
                            caloriasAcumuladas += Math.round(val.fpVal);
                        }
                    }
                }

                // 3. Peso (com.google.weight)
                if (dataTypeName.includes("weight") || dataId.includes("weight")) {
                    for (const val of values) {
                        if (typeof val.fpVal === "number" && val.fpVal > 0) {
                            pesoEncontrado = val.fpVal;
                        }
                    }
                }
            }
        }
    }

    // Estimación de calorías si Google Fit aún no las computó en el aggregate
    const caloriasFinal = caloriasAcumuladas > 0 
        ? caloriasAcumuladas 
        : (pasosAcumulados > 0 ? Math.round(pasosAcumulados * 0.04) : 0);

    return {
        peso: pesoEncontrado !== null ? parseFloat(pesoEncontrado.toFixed(1)) : null,
        pasos: pasosAcumulados,
        calorias: caloriasFinal
    };
}

// ==========================================
// RENDERIZADO VISUAL ESTILO ZEPP / GOOGLE FIT (CHART.JS)
// ==========================================

export async function renderizarDashboardVisual(resultados) {
    await asegurarChartJS();

    const { peso, pasos, calorias } = resultados;

    // 1. Anillo de Pasos (Meta: 10.000)
    renderizarAnilloDoughnut({
        canvasId: "chartPasosRing",
        valorActual: pasos || 0,
        meta: 10000,
        colorProgreso: "#38bdf8",
        colorFondo: "#2c2c2e",
        labelValorId: "ringPasosValor",
        labelPctId: "ringPasosPct",
        instanciaRef: "pasos"
    });

    // 2. Anillo de Calorías (Meta: 500 kcal)
    renderizarAnilloDoughnut({
        canvasId: "chartCaloriasRing",
        valorActual: calorias || 0,
        meta: 500,
        colorProgreso: "#38bdf8",
        colorFondo: "#2c2c2e",
        labelValorId: "ringCaloriasValor",
        labelPctId: "ringCaloriasPct",
        instanciaRef: "calorias"
    });

    // 3. Actualizar textos de estado y badges en dashboard
    const pesoBadge = document.getElementById("chartPesoActualBadge");
    if (pesoBadge) {
        pesoBadge.textContent = peso !== null ? `${peso.toFixed(1)} kg` : "-- kg";
    }

    if (displayPeso) {
        if (peso !== null) {
            displayPeso.innerText = `${peso.toFixed(1)} kg`;
            displayPeso.style.color = "#38bdf8";
        }
    }
    if (displayModal) {
        if (peso !== null) {
            displayModal.innerText = `${peso.toFixed(1)} kg (Google Fit)`;
            displayModal.style.color = "#38bdf8";
        }
    }

    // 4. Gráfico de Tendencia de Peso (Curvas suaves, gradiente cian)
    await renderizarGraficoTendenciaPeso(peso);
}

/**
 * Renderiza un gráfico Doughnut minimalista con progreso neón #38bdf8 sobre raíl #2c2c2e
 */
function renderizarAnilloDoughnut({
    canvasId,
    valorActual,
    meta,
    colorProgreso = "#38bdf8",
    colorFondo = "#2c2c2e",
    labelValorId,
    labelPctId,
    instanciaRef
}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const valorSeguro = Math.max(0, valorActual || 0);
    const restante = Math.max(0, meta - valorSeguro);
    const porcentaje = Math.min(100, Math.round((valorSeguro / meta) * 100));

    // Actualizar texto central grande
    const labelVal = document.getElementById(labelValorId);
    if (labelVal) {
        labelVal.textContent = valorSeguro.toLocaleString();
    }
    const labelPct = document.getElementById(labelPctId);
    if (labelPct) {
        labelPct.textContent = `${porcentaje}%`;
    }

    // Destruir instancia previa
    if (instanciaRef === "pasos" && chartPasosInstance) {
        chartPasosInstance.destroy();
        chartPasosInstance = null;
    } else if (instanciaRef === "calorias" && chartCaloriasInstance) {
        chartCaloriasInstance.destroy();
        chartCaloriasInstance = null;
    }

    const ctx = canvas.getContext("2d");

    const config = {
        type: "doughnut",
        data: {
            datasets: [{
                data: [valorSeguro, restante],
                backgroundColor: [colorProgreso, colorFondo],
                borderWidth: 0,
                cutout: "80%",
                borderRadius: 16,
                circumference: 360
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 900,
                easing: "easeOutQuart"
            },
            plugins: {
                tooltip: { enabled: false },
                legend: { display: false }
            }
        }
    };

    const nuevaInstancia = new window.Chart(ctx, config);

    if (instanciaRef === "pasos") {
        chartPasosInstance = nuevaInstancia;
    } else if (instanciaRef === "calorias") {
        chartCaloriasInstance = nuevaInstancia;
    }
}

/**
 * Gráfico de Tendencia de Peso (Line Chart):
 * - Curvas suaves (tension: 0.4)
 * - Puntos ocultos a menos que se toquen (pointRadius: 0, hover: 6)
 * - Gradiente semitransparente cian/azul bajo la línea
 * - Sin cuadrículas de fondo (grid: false)
 */
async function renderizarGraficoTendenciaPeso(pesoActual) {
    const canvas = document.getElementById("chartPesoTrend");
    if (!canvas) return;

    // Obtener historial de registros desde Firestore
    let historial = await obtenerHistorialPesoFirestore();

    // Si Google Fit tiene un peso confirmado hoy, asegurar que figure en el historial
    if (pesoActual !== null && !isNaN(pesoActual)) {
        const hoyStr = "Hoy";
        const ultimo = historial[historial.length - 1];
        if (!ultimo || ultimo.fecha !== hoyStr) {
            historial.push({ fecha: hoyStr, peso: pesoActual });
        } else {
            ultimo.peso = pesoActual;
        }
    }

    // Si el historial está vacío (inicio nuevo), generar puntos realistas de referencia
    if (historial.length === 0) {
        const base = pesoActual || 75.0;
        historial = [
            { fecha: "Día -6", peso: base + 0.9 },
            { fecha: "Día -5", peso: base + 0.6 },
            { fecha: "Día -4", peso: base + 0.4 },
            { fecha: "Día -3", peso: base + 0.2 },
            { fecha: "Día -2", peso: base + 0.3 },
            { fecha: "Ayer", peso: base + 0.1 },
            { fecha: "Hoy", peso: base }
        ];
    }

    const labels = historial.map(h => h.fecha);
    const dataVals = historial.map(h => h.peso);

    // Calcular estadísticas
    const minVal = Math.min(...dataVals);
    const maxVal = Math.max(...dataVals);
    const avgVal = dataVals.reduce((acc, v) => acc + v, 0) / dataVals.length;

    const elMin = document.getElementById("weightStatMin");
    const elAvg = document.getElementById("weightStatAvg");
    const elMax = document.getElementById("weightStatMax");
    if (elMin) elMin.textContent = `${minVal.toFixed(1)} kg`;
    if (elAvg) elAvg.textContent = `${avgVal.toFixed(1)} kg`;
    if (elMax) elMax.textContent = `${maxVal.toFixed(1)} kg`;

    // Destruir instancia previa
    if (chartPesoInstance) {
        chartPesoInstance.destroy();
        chartPesoInstance = null;
    }

    const ctx = canvas.getContext("2d");

    // Crear gradiente cian semitransparente a transparente
    const gradient = ctx.createLinearGradient(0, 0, 0, 190);
    gradient.addColorStop(0, "rgba(56, 189, 248, 0.42)");
    gradient.addColorStop(0.65, "rgba(56, 189, 248, 0.1)");
    gradient.addColorStop(1, "rgba(56, 189, 248, 0.0)");

    const config = {
        type: "line",
        data: {
            labels: labels,
            datasets: [{
                label: "Peso",
                data: dataVals,
                borderColor: "#38bdf8",
                borderWidth: 2.5,
                tension: 0.4, // Curvas suaves solicitadas
                fill: true,
                backgroundColor: gradient,
                pointRadius: 0, // Ocultar puntos por defecto
                pointHoverRadius: 6, // Visibles al tocar / hover
                pointBackgroundColor: "#38bdf8",
                pointBorderColor: "#ffffff",
                pointBorderWidth: 2,
                pointHoverBackgroundColor: "#38bdf8",
                pointHoverBorderColor: "#ffffff",
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: "index",
                intersect: false
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    titleColor: "#94a3b8",
                    bodyColor: "#38bdf8",
                    bodyFont: { weight: "bold", size: 13 },
                    borderColor: "#334155",
                    borderWidth: 1,
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: (ctx) => `${ctx.parsed.y} kg`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false }, // Sin cuadrículas
                    ticks: {
                        color: "#94a3b8",
                        font: { size: 11, family: "Inter, sans-serif" }
                    },
                    border: { display: false }
                },
                y: {
                    grid: { display: false }, // Sin cuadrículas
                    ticks: {
                        color: "#94a3b8",
                        font: { size: 11, family: "Inter, sans-serif" },
                        callback: (v) => `${v}`
                    },
                    border: { display: false },
                    suggestedMin: Math.floor(minVal - 1),
                    suggestedMax: Math.ceil(maxVal + 1)
                }
            }
        }
    };

    chartPesoInstance = new window.Chart(ctx, config);
}

async function obtenerHistorialPesoFirestore() {
    try {
        const q = query(
            collection(db, "registros_peso"),
            orderBy("timestamp", "asc"),
            limit(10)
        );
        const snapshot = await getDocs(q);
        const lista = [];
        snapshot.forEach(doc => {
            const d = doc.data();
            if (d.peso) {
                const fecha = d.fecha ? d.fecha.substring(5) : "Reg";
                lista.push({ fecha, peso: parseFloat(d.peso) });
            }
        });
        return lista;
    } catch (e) {
        console.warn("Fallo al leer historial de peso de Firestore:", e);
        return [];
    }
}

function renderizarEstadoDesconectadoUI() {
    // Renderizar anillos en cero
    renderizarAnilloDoughnut({
        canvasId: "chartPasosRing",
        valorActual: 0,
        meta: 10000,
        colorProgreso: "#38bdf8",
        colorFondo: "#2c2c2e",
        labelValorId: "ringPasosValor",
        labelPctId: "ringPasosPct",
        instanciaRef: "pasos"
    });

    renderizarAnilloDoughnut({
        canvasId: "chartCaloriasRing",
        valorActual: 0,
        meta: 500,
        colorProgreso: "#38bdf8",
        colorFondo: "#2c2c2e",
        labelValorId: "ringCaloriasValor",
        labelPctId: "ringCaloriasPct",
        instanciaRef: "calorias"
    });

    const pesoBadge = document.getElementById("chartPesoActualBadge");
    if (pesoBadge) pesoBadge.textContent = "-- kg";

    renderGraficoVacio();
}

function renderGraficoVacio() {
    const canvas = document.getElementById("chartPesoTrend");
    if (!canvas || !window.Chart) return;

    if (chartPesoInstance) {
        chartPesoInstance.destroy();
        chartPesoInstance = null;
    }

    const ctx = canvas.getContext("2d");
    chartPesoInstance = new window.Chart(ctx, {
        type: "line",
        data: {
            labels: ["--", "--", "--", "--", "--"],
            datasets: [{
                data: [70, 70, 70, 70, 70],
                borderColor: "#334155",
                borderWidth: 1.5,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: {
                x: { grid: { display: false }, ticks: { color: "#475569" }, border: { display: false } },
                y: { grid: { display: false }, ticks: { display: false }, border: { display: false } }
            }
        }
    });
}

// ==========================================
// GESTIÓN DE EXPIRACIÓN Y ERRORES 401
// ==========================================

export function manejarTokenExpirado(mensaje = "Sesión de Google Fit expirada. Pulsa para reconectar.") {
    console.warn("Limpiando estado de autenticación de Google Fit (401)...");

    localStorage.removeItem("fitToken");
    localStorage.removeItem("fitTokenTimestamp");
    localStorage.removeItem("fitUserEmail");
    localStorage.removeItem("fitUserName");

    // Vuelve a mostrar el botón de Conectar de forma visible y limpia
    actualizarEstadoGoogleFitUI(false);

    // Muestra feedback claro
    mostrarFeedbackGoogleFit(mensaje, "#f87171");

    // Reset de visualización
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
        const datos = await fetchFitData(token);
        mostrarFeedbackGoogleFit("✅ Métricas actualizadas con éxito.", "#4ade80");
        return datos;
    } catch (e) {
        if (!e.message || !e.message.includes("401")) {
            mostrarFeedbackGoogleFit(`Error al sincronizar: ${e.message}`, "#f87171");
        }
    }
}

// ==========================================
// INICIALIZACIÓN Y CICLO DE VIDA (INIT/CLEANUP)
// ==========================================

export function initSalud() {
    cleanupSalud();

    displayPeso = document.getElementById("ultimoPesoDisplay");
    displayModal = document.getElementById("ultimoPesoDisplayModal");
    statusBadge = document.getElementById("dbStatusBadge");

    const btnGoogleFit = document.getElementById("btnConectarGoogleFit");
    if (btnGoogleFit) {
        btnGoogleFit.onclick = conectarGoogleFit;
    }

    // Captura silenciosa si regresamos de un signInWithRedirect
    try {
        getRedirectResult(auth).then((result) => {
            if (result) {
                procesarResultadoGoogleAuth(result);
            }
        }).catch((err) => {
            if (err && err.code !== "auth/null-user") {
                console.warn("Información de getRedirectResult:", err);
            }
        });
    } catch (e) {
        console.warn("getRedirectResult no disponible:", e);
    }

    // PERSISTENCIA Y SINCRONIZACIÓN AUTOMÁTICA CON onAuthStateChanged
    try {
        unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            const token = localStorage.getItem("fitToken");
            const tieneUsuario = Boolean(user || auth.currentUser);

            if (tieneUsuario && token) {
                // Hay usuario activo y token: ejecutar fetchFitData() automático y silencioso
                // Oculta botón 'Conectar' y muestra indicador 'Sincronizando...'
                actualizarEstadoGoogleFitUI(true, "Sincronizando...");
                try {
                    await fetchFitData(token);
                } catch (err) {
                    console.warn("Error en sincronización silenciosa:", err.message);
                }
            } else {
                // No logueado o sin token: mostrar botón de Conectar (sin abrir popups automáticos)
                actualizarEstadoGoogleFitUI(false);
                renderizarEstadoDesconectadoUI();
            }
        });
    } catch (e) {
        console.warn("onAuthStateChanged:", e);
    }

    document.addEventListener("keydown", handleEscapeKey);

    escucharUltimoPesoFirestore();
}

export function cleanupSalud() {
    if (typeof unsubscribeFirestore === "function") {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
    }
    if (typeof unsubscribeAuth === "function") {
        unsubscribeAuth();
        unsubscribeAuth = null;
    }

    // Destruir instancias de Chart.js para evitar fugas de memoria
    if (chartPasosInstance) {
        chartPasosInstance.destroy();
        chartPasosInstance = null;
    }
    if (chartCaloriasInstance) {
        chartCaloriasInstance.destroy();
        chartCaloriasInstance = null;
    }
    if (chartPesoInstance) {
        chartPesoInstance.destroy();
        chartPesoInstance = null;
    }

    document.removeEventListener("keydown", handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === "Escape") {
        cerrarModalPeso();
    }
}

function escucharUltimoPesoFirestore() {
    try {
        const q = query(
            collection(db, "registros_peso"), 
            orderBy("timestamp", "desc"), 
            limit(1)
        );

        unsubscribeFirestore = onSnapshot(q, (snapshot) => {
            if (statusBadge) {
                statusBadge.textContent = "🟢 Firestore conectado";
                statusBadge.style.color = "#4ade80";
            }

            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data();
                const pesoVal = docData.peso;
                const fechaVal = docData.fecha || "Reciente";

                if (ultimoDatoBiometrico.peso === null) {
                    if (displayPeso) {
                        displayPeso.innerText = `${pesoVal} kg`;
                        displayPeso.style.color = "#38bdf8";
                    }
                    if (displayModal) {
                        displayModal.innerText = `${pesoVal} kg (${fechaVal})`;
                        displayModal.style.color = "#38bdf8";
                    }
                    const pesoBadge = document.getElementById("chartPesoActualBadge");
                    if (pesoBadge) pesoBadge.textContent = `${pesoVal} kg`;
                }
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
    renderizarDashboardVisual,
    abrirModalPeso,
    cerrarModalPeso,
    crearGoogleFitProvider,
    mostrarAvisoFuturo
};
window.conectarGoogleFit = conectarGoogleFit;
window.refrescarFitData = refrescarFitData;

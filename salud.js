import { app, db, auth } from "./firebase-config.js";
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    signInWithRedirect, 
    getRedirectResult,
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
let ultimoDatoBiometrico = { peso: null, pasos: 0 };

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
// GOOGLE FIT OAUTH 2.0 (FIREBASE AUTH)
// ==========================================

/**
 * Crea una instancia de GoogleAuthProvider con los scopes obligatorios de Google Fit API
 * - fitness.activity.read (pasos, calorías activas, entrenamientos)
 * - fitness.body.read (peso, altura, composición corporal)
 */
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
 * Inicia el flujo de autenticación OAuth 2.0 con Google
 * Mobile-First: intenta signInWithPopup primero y recurre a signInWithRedirect si el entorno lo requiere
 */
export async function conectarGoogleFit() {
    const btn = document.getElementById("btnConectarGoogleFit");
    const txtBtn = document.getElementById("txtBtnGoogleFit");

    // Si ya está sincronizado, consultar si se desea forzar reautenticación
    if (localStorage.getItem("fitToken") && btn?.classList.contains("synced")) {
        const confirmar = confirm("Google Fit ya está vinculado. ¿Deseas refrescar la conexión o sincronizar otra cuenta?");
        if (!confirmar) {
            refrescarFitData();
            return;
        }
    }

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
                console.warn("Popup no disponible, recurriendo a signInWithRedirect...", popupErr);
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
        restablecerEstadoBotonGoogleFit();
    }
}

/**
 * Procesa el resultado exitoso de OAuth 2.0 y extrae credential.accessToken
 */
async function procesarResultadoGoogleAuth(result) {
    if (!result) return;

    try {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential ? credential.accessToken : null;
        const user = result.user;

        if (accessToken) {
            // Guardar token de acceso de forma segura en localStorage
            localStorage.setItem("fitToken", accessToken);
            localStorage.setItem("fitTokenTimestamp", Date.now().toString());
            if (user?.email) localStorage.setItem("fitUserEmail", user.email);
            if (user?.displayName) localStorage.setItem("fitUserName", user.displayName);

            // Actualizar interfaz visual
            actualizarEstadoGoogleFitUI(true);
            mostrarFeedbackGoogleFit(
                `✅ Google Fit conectado (${user?.displayName || user?.email || 'Cuenta verificada'})`,
                "#4ade80"
            );

            // Iniciar de inmediato la lectura de datos biométricos vía REST API
            try {
                await fetchFitData(accessToken);
            } catch (fetchErr) {
                console.warn("Fallo en la lectura inicial de datos tras login:", fetchErr);
            }
        } else {
            console.warn("No se pudo obtener credential.accessToken del resultado de Google Auth.");
            mostrarFeedbackGoogleFit("⚠️ No se recibió token de acceso OAuth.", "#facc15");
            restablecerEstadoBotonGoogleFit();
        }
    } catch (err) {
        console.error("Error al procesar credencial de Google Fit:", err);
        mostrarFeedbackGoogleFit("Error al procesar credenciales de Google.", "#f87171");
        restablecerEstadoBotonGoogleFit();
    }
}

/**
 * Modifica el estado del botón tras el login:
 * - Cambia el texto a "Google Fit Sincronizado"
 * - Aplica un resplandor fijo (box-shadow: 0 0 8px #38bdf8)
 */
export function actualizarEstadoGoogleFitUI(sincronizado = true) {
    const btn = document.getElementById("btnConectarGoogleFit");
    const txtBtn = document.getElementById("txtBtnGoogleFit");
    const badge = document.getElementById("googleFitStatusBadge");

    if (btn) {
        btn.disabled = false;
        if (sincronizado) {
            btn.classList.add("synced");
            btn.style.boxShadow = "0 0 8px #38bdf8";
        } else {
            btn.classList.remove("synced");
            btn.style.boxShadow = "";
        }
    }

    if (txtBtn) {
        txtBtn.textContent = sincronizado ? "Google Fit Sincronizado" : "Conectar con Google Fit";
    }

    if (badge) {
        if (sincronizado) {
            badge.textContent = "Sincronizado";
            badge.classList.add("connected");
        } else {
            badge.textContent = "Desconectado";
            badge.classList.remove("connected");
        }
    }
}

function restablecerEstadoBotonGoogleFit() {
    const token = localStorage.getItem("fitToken");
    actualizarEstadoGoogleFitUI(Boolean(token));
}

function mostrarFeedbackGoogleFit(mensaje, color) {
    const fb = document.getElementById("googleFitFeedback");
    if (!fb) return;
    fb.textContent = mensaje;
    fb.style.color = color;
    fb.style.display = "block";

    setTimeout(() => {
        if (fb && fb.textContent === mensaje) {
            fb.style.display = "none";
        }
    }, 4500);
}

// ==========================================
// GOOGLE FIT REST API: LECTURA DE PESO Y PASOS
// ==========================================

/**
 * Petición POST al endpoint dataset:aggregate de Google Fit API
 * Filtra las métricas de com.google.weight y com.google.step_count.delta en las últimas 24h
 *
 * @param {string} token - Google OAuth 2.0 Access Token
 * @returns {Promise<{ peso: number|null, pasos: number }>}
 */
export async function fetchFitData(token) {
    if (!token) {
        token = localStorage.getItem("fitToken");
    }

    if (!token) {
        actualizarEstadoGoogleFitUI(false);
        renderizarEstadoDesconectadoUI();
        throw new Error("No hay token de Google Fit disponible.");
    }

    const endTimeMillis = Date.now();
    const startTimeMillis = endTimeMillis - (24 * 60 * 60 * 1000); // Últimas 24 horas

    const payload = {
        aggregateBy: [
            {
                dataTypeName: "com.google.weight"
            },
            {
                dataTypeName: "com.google.step_count.delta"
            }
        ],
        bucketByTime: {
            durationMillis: 86400000 // 1 día (24 horas)
        },
        startTimeMillis: startTimeMillis,
        endTimeMillis: endTimeMillis
    };

    renderizarCargandoBiometricosUI();

    try {
        const response = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json;encoding=utf-8"
            },
            body: JSON.stringify(payload)
        });

        // Gestión de Errores: Token expirado o 401 Unauthorized
        if (response.status === 401) {
            console.warn("Google Fit API: 401 Unauthorized (Token expirado o revocado).");
            manejarTokenExpirado("⚠️ Tu sesión de Google Fit ha expirado (401). Conecta de nuevo.");
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
        renderizarDatosBiometricosUI(resultados);

        return resultados;
    } catch (error) {
        console.error("Error al consultar Google Fit REST API:", error);
        if (error.message && error.message.includes("401")) {
            // Ya limpiado en manejarTokenExpirado
        } else {
            renderizarErrorBiometricoUI(error.message || "Fallo de conexión");
        }
        throw error;
    }
}

/**
 * Parsea el JSON jerárquico de Google Fit dataset:aggregate
 * Extrae com.google.weight (fpVal) y com.google.step_count.delta (intVal)
 */
function parsearFitAggregateData(data) {
    let pesoEncontrado = null;
    let pasosAcumulados = 0;

    if (!data || !Array.isArray(data.bucket)) {
        return { peso: null, pasos: 0 };
    }

    for (const bucket of data.bucket) {
        if (!Array.isArray(bucket.dataset)) continue;

        for (const dataset of bucket.dataset) {
            const dataId = (dataset.dataSourceId || "").toLowerCase();
            const points = dataset.point || [];

            for (const point of points) {
                const dataTypeName = (point.dataTypeName || "").toLowerCase();
                const values = point.value || [];

                // Pasos (com.google.step_count.delta)
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

                // Peso (com.google.weight)
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

    return {
        peso: pesoEncontrado !== null ? parseFloat(pesoEncontrado.toFixed(1)) : null,
        pasos: pasosAcumulados
    };
}

/**
 * Renderiza los datos biométricos leídos en las dos tarjetas de acero mate
 */
export function renderizarDatosBiometricosUI(resultados) {
    const { peso, pasos } = resultados;

    // 1. Renderizar Peso Corporal
    const pesoElems = [
        document.getElementById("fitPesoValor"),
        document.getElementById("fitPesoValorDash")
    ];
    const pesoEstadoElems = [
        document.getElementById("fitPesoEstado"),
        document.getElementById("fitPesoEstadoDash")
    ];

    pesoElems.forEach(el => {
        if (!el) return;
        if (peso !== null && !isNaN(peso)) {
            el.textContent = peso.toFixed(1);
            el.classList.add("loaded");
        } else {
            el.textContent = "--";
            el.classList.remove("loaded");
        }
    });

    pesoEstadoElems.forEach(el => {
        if (!el) return;
        if (peso !== null && !isNaN(peso)) {
            el.textContent = "Google Fit • Últimas 24h";
            el.style.color = "#4ade80";
        } else {
            el.textContent = "Sin registro en las últimas 24h";
            el.style.color = "#94a3b8";
        }
    });

    // Actualizar también los badges existentes en el dashboard y modal
    if (displayPeso) {
        if (peso !== null && !isNaN(peso)) {
            displayPeso.innerText = `${peso.toFixed(1)} kg`;
            displayPeso.style.color = "#38bdf8";
        }
    }
    if (displayModal) {
        if (peso !== null && !isNaN(peso)) {
            displayModal.innerText = `${peso.toFixed(1)} kg (Google Fit 24h)`;
            displayModal.style.color = "#38bdf8";
        }
    }

    // 2. Renderizar Pasos Totales
    const pasosElems = [
        document.getElementById("fitPasosValor"),
        document.getElementById("fitPasosValorDash")
    ];
    const pasosEstadoElems = [
        document.getElementById("fitPasosEstado"),
        document.getElementById("fitPasosEstadoDash")
    ];

    pasosElems.forEach(el => {
        if (!el) return;
        el.textContent = (pasos || 0).toLocaleString();
        el.classList.add("loaded-steps");
    });

    pasosEstadoElems.forEach(el => {
        if (!el) return;
        el.textContent = "Total registrado en 24h";
        el.style.color = "#4ade80";
    });
}

/**
 * Estado visual mientras se leen las métricas de la API
 */
function renderizarCargandoBiometricosUI() {
    const pesoElems = [document.getElementById("fitPesoValor"), document.getElementById("fitPesoValorDash")];
    const pasosElems = [document.getElementById("fitPasosValor"), document.getElementById("fitPasosValorDash")];
    const pesoEstadoElems = [document.getElementById("fitPesoEstado"), document.getElementById("fitPesoEstadoDash")];
    const pasosEstadoElems = [document.getElementById("fitPasosEstado"), document.getElementById("fitPasosEstadoDash")];

    pesoElems.forEach(el => { if (el && el.textContent === "--") el.textContent = "..."; });
    pasosElems.forEach(el => { if (el && el.textContent === "--") el.textContent = "..."; });
    pesoEstadoElems.forEach(el => { if (el) el.textContent = "Consultando Google Fit..."; });
    pasosEstadoElems.forEach(el => { if (el) el.textContent = "Consultando Google Fit..."; });
}

/**
 * Estado visual ante errores de red o temporales
 */
function renderizarErrorBiometricoUI(mensaje) {
    const pesoEstadoElems = [document.getElementById("fitPesoEstado"), document.getElementById("fitPesoEstadoDash")];
    const pasosEstadoElems = [document.getElementById("fitPasosEstado"), document.getElementById("fitPasosEstadoDash")];

    pesoEstadoElems.forEach(el => {
        if (el) {
            el.textContent = `Aviso: ${mensaje}`;
            el.style.color = "#f87171";
        }
    });
    pasosEstadoElems.forEach(el => {
        if (el) {
            el.textContent = `Aviso: ${mensaje}`;
            el.style.color = "#f87171";
        }
    });
}

/**
 * Estado visual cuando no hay conexión con Google Fit
 */
function renderizarEstadoDesconectadoUI() {
    const pesoElems = [document.getElementById("fitPesoValor"), document.getElementById("fitPesoValorDash")];
    const pasosElems = [document.getElementById("fitPasosValor"), document.getElementById("fitPasosValorDash")];
    const pesoEstadoElems = [document.getElementById("fitPesoEstado"), document.getElementById("fitPesoEstadoDash")];
    const pasosEstadoElems = [document.getElementById("fitPasosEstado"), document.getElementById("fitPasosEstadoDash")];

    pesoElems.forEach(el => {
        if (el) {
            el.textContent = "--";
            el.classList.remove("loaded");
        }
    });
    pasosElems.forEach(el => {
        if (el) {
            el.textContent = "--";
            el.classList.remove("loaded-steps");
        }
    });
    pesoEstadoElems.forEach(el => {
        if (el) {
            el.textContent = "Conexión requerida";
            el.style.color = "#94a3b8";
        }
    });
    pasosEstadoElems.forEach(el => {
        if (el) {
            el.textContent = "Conexión requerida";
            el.style.color = "#94a3b8";
        }
    });
}

/**
 * Limpia el estado de conexión cuando el token expira o devuelve error 401:
 * - Limpia localStorage
 * - Vuelve a mostrar el botón activo de "Conectar con Google Fit" para forzar nuevo login
 * - Resetea las tarjetas biométricas a estado desconectado
 */
export function manejarTokenExpirado(mensaje = "Sesión de Google Fit expirada. Vuelve a conectar.") {
    console.warn("Ejecutando limpieza de token por expiración (401)...");

    // 1. Limpiar token y credenciales locales
    localStorage.removeItem("fitToken");
    localStorage.removeItem("fitTokenTimestamp");
    localStorage.removeItem("fitUserEmail");
    localStorage.removeItem("fitUserName");

    // 2. Modificar UI del botón: restablecer a 'Conectar con Google Fit' sin resplandor
    actualizarEstadoGoogleFitUI(false);

    // 3. Resetear tarjetas de visualización a desconectado
    renderizarEstadoDesconectadoUI();

    // 4. Mostrar feedback descriptivo al usuario
    mostrarFeedbackGoogleFit(mensaje, "#f87171");
}

/**
 * Acción de refresco manual activada desde la interfaz (botón 🔄 Sincronizar)
 */
export async function refrescarFitData() {
    const token = localStorage.getItem("fitToken");
    if (!token) {
        mostrarFeedbackGoogleFit("⚠️ No hay cuenta conectada. Pulsa 'Conectar con Google Fit'.", "#facc15");
        actualizarEstadoGoogleFitUI(false);
        return;
    }

    mostrarFeedbackGoogleFit("🔄 Sincronizando con Google Fit...", "#38bdf8");
    try {
        const datos = await fetchFitData(token);
        mostrarFeedbackGoogleFit("✅ Datos biométricos actualizados correctamente.", "#4ade80");
        return datos;
    } catch (e) {
        if (e.message && e.message.includes("401")) {
            // Ya gestionado
        } else {
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

    // Configurar botón y estado de Google Fit
    const btnGoogleFit = document.getElementById("btnConectarGoogleFit");
    if (btnGoogleFit) {
        btnGoogleFit.onclick = conectarGoogleFit;
    }

    const btnRefrescar = document.getElementById("btnRefrescarFit");
    if (btnRefrescar) {
        btnRefrescar.onclick = refrescarFitData;
    }

    const tokenPersistido = localStorage.getItem("fitToken");

    // Verificar token en localStorage y disparar lectura automática si existe
    if (tokenPersistido) {
        actualizarEstadoGoogleFitUI(true);
        fetchFitData(tokenPersistido).catch(err => {
            console.warn("Lectura automática en initSalud:", err.message);
        });
    } else {
        actualizarEstadoGoogleFitUI(false);
        renderizarEstadoDesconectadoUI();
    }

    // Capturar resultado si regresamos de un signInWithRedirect
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

    // Escuchar cambios de estado en Firebase Auth
    try {
        unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            const token = localStorage.getItem("fitToken");
            if (user && token) {
                actualizarEstadoGoogleFitUI(true);
            } else if (!user && !token) {
                actualizarEstadoGoogleFitUI(false);
                renderizarEstadoDesconectadoUI();
            }
        });
    } catch (e) {
        console.warn("onAuthStateChanged:", e);
    }

    // Soporte para tecla Escape en el modal de peso
    document.addEventListener("keydown", handleEscapeKey);

    // Escuchar registros de peso de respaldo en Firestore
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
    document.removeEventListener("keydown", handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === "Escape") {
        cerrarModalPeso();
    }
}

// ==========================================
// FIRESTORE: RESPALDO DE REGISTROS DE PESO
// ==========================================

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

                // Si no hay dato de Google Fit cargado, mostrar último peso de Firestore
                if (ultimoDatoBiometrico.peso === null) {
                    if (displayPeso) {
                        displayPeso.innerText = `${pesoVal} kg`;
                        displayPeso.style.color = "#38bdf8";
                    }
                    if (displayModal) {
                        displayModal.innerText = `${pesoVal} kg (${fechaVal})`;
                        displayModal.style.color = "#38bdf8";
                    }
                }
            } else {
                if (ultimoDatoBiometrico.peso === null) {
                    if (displayPeso) displayPeso.innerText = "Sin registro";
                    if (displayModal) displayModal.innerText = "No hay registros disponibles.";
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
        console.error("Error al configurar listener de Firestore:", e);
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
    manejarTokenExpirado,
    renderizarDatosBiometricosUI,
    abrirModalPeso,
    cerrarModalPeso,
    conectarGoogleFit,
    actualizarEstadoGoogleFitUI,
    crearGoogleFitProvider,
    mostrarAvisoFuturo
};
window.conectarGoogleFit = conectarGoogleFit;
window.refrescarFitData = refrescarFitData;

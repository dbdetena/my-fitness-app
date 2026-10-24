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
let inputPeso = null;
let btnGuardar = null;
let displayPeso = null;
let displayModal = null;
let statusBadge = null;
let unsubscribeFirestore = null;
let unsubscribeAuth = null;

// ==========================================
// MODAL CONTROLLERS (PESO)
// ==========================================
export function abrirModalPeso() {
    const modal = document.getElementById("modal-registro-peso");
    if (modal) {
        modal.classList.add("active");
        document.body.classList.add("modal-open");
        const input = document.getElementById("pesoInput");
        if (input) {
            setTimeout(() => input.focus(), 150);
        }
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

// Vincular funciones a window para soporte inline
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

    // Si ya está sincronizado, consultar si se desea reconectar o cambiar cuenta
    if (localStorage.getItem("fitToken") && btn?.classList.contains("synced")) {
        const confirmar = confirm("Google Fit ya se encuentra sincronizado. ¿Deseas volver a conectar o sincronizar otra cuenta?");
        if (!confirmar) return;
    }

    if (btn) btn.disabled = true;
    if (txtBtn) txtBtn.textContent = "Conectando con Google...";
    mostrarFeedbackGoogleFit("Iniciando autenticación Google...", "#38bdf8");

    const provider = crearGoogleFitProvider();

    try {
        let result = null;
        try {
            // Intentar con Popup (más ágil en navegadores modernos y PWA sin recarga)
            result = await signInWithPopup(auth, provider);
        } catch (popupErr) {
            // Fallback a redirect si el navegador móvil bloquea o no soporta popups
            if (popupErr.code === "auth/popup-blocked" || 
                popupErr.code === "auth/cancelled-popup-request" ||
                popupErr.code === "auth/operation-not-supported-in-this-environment") {
                console.warn("Popup bloqueado o no soportado, ejecutando signInWithRedirect...", popupErr);
                mostrarFeedbackGoogleFit("Redirigiendo a Google...", "#38bdf8");
                await signInWithRedirect(auth, provider);
                return;
            } else {
                throw popupErr;
            }
        }

        if (result) {
            procesarResultadoGoogleAuth(result);
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
function procesarResultadoGoogleAuth(result) {
    if (!result) return;

    try {
        const credential = GoogleAuthProvider.credentialFromResult(result);
        const accessToken = credential ? credential.accessToken : null;
        const user = result.user;

        if (accessToken) {
            // Guardar token de acceso de forma segura en localStorage para futuras peticiones a la API REST de Google Fit
            localStorage.setItem("fitToken", accessToken);
            localStorage.setItem("fitTokenTimestamp", Date.now().toString());
            if (user?.email) {
                localStorage.setItem("fitUserEmail", user.email);
            }
            if (user?.displayName) {
                localStorage.setItem("fitUserName", user.displayName);
            }

            // Actualizar interfaz visual
            actualizarEstadoGoogleFitUI(true);
            mostrarFeedbackGoogleFit(
                `✅ Google Fit conectado (${user?.displayName || user?.email || 'Cuenta verificada'})`,
                "#4ade80"
            );
        } else {
            console.warn("No se pudo obtener el token de acceso OAuth (credential.accessToken).");
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
// INICIALIZACIÓN Y CICLO DE VIDA (INIT/CLEANUP)
// ==========================================

export function initSalud() {
    // Limpiar listeners previos
    cleanupSalud();

    inputPeso = document.getElementById("pesoInput");
    btnGuardar = document.getElementById("btnGuardarPeso");
    displayPeso = document.getElementById("ultimoPesoDisplay");
    displayModal = document.getElementById("ultimoPesoDisplayModal");
    statusBadge = document.getElementById("dbStatusBadge");

    if (btnGuardar) {
        btnGuardar.onclick = guardarPeso;
    }

    if (inputPeso) {
        inputPeso.onkeydown = (e) => {
            if (e.key === "Enter") {
                guardarPeso();
            }
        };
    }

    // Configurar botón y estado de Google Fit
    const btnGoogleFit = document.getElementById("btnConectarGoogleFit");
    if (btnGoogleFit) {
        btnGoogleFit.onclick = conectarGoogleFit;
    }

    // Verificar si ya existe token persistido en localStorage
    if (localStorage.getItem("fitToken")) {
        actualizarEstadoGoogleFitUI(true);
    } else {
        actualizarEstadoGoogleFitUI(false);
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
            if (user && localStorage.getItem("fitToken")) {
                actualizarEstadoGoogleFitUI(true);
            } else if (!user && !localStorage.getItem("fitToken")) {
                actualizarEstadoGoogleFitUI(false);
            }
        });
    } catch (e) {
        console.warn("onAuthStateChanged:", e);
    }

    // Soporte para tecla Escape en el modal de peso
    document.addEventListener("keydown", handleEscapeKey);

    // Escuchar registros de peso en tiempo real
    escucharUltimoPeso();
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
// FIRESTORE: REGISTROS DE PESO
// ==========================================

function escucharUltimoPeso() {
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

                if (displayPeso) {
                    displayPeso.innerText = `${pesoVal} kg`;
                    displayPeso.style.color = "#38bdf8";
                }

                if (displayModal) {
                    displayModal.innerText = `${pesoVal} kg (${fechaVal})`;
                    displayModal.style.color = "#38bdf8";
                }
            } else {
                if (displayPeso) {
                    displayPeso.innerText = "Sin registro";
                    displayPeso.style.color = "#94a3b8";
                }
                if (displayModal) {
                    displayModal.innerText = "No hay registros de peso todavía.";
                    displayModal.style.color = "#94a3b8";
                }
            }
        }, (error) => {
            console.error("Error al escuchar Firestore:", error);
            if (statusBadge) {
                statusBadge.textContent = "🔴 Error al conectar Firestore";
                statusBadge.style.color = "#f87171";
            }
            if (displayPeso) displayPeso.innerText = "Error BD";
            if (displayModal) displayModal.innerText = "Error de conexión con la base de datos.";
        });
    } catch (e) {
        console.error("Error al configurar listener de Firestore:", e);
        if (displayPeso) displayPeso.innerText = "Error BD";
    }
}

export async function guardarPeso() {
    if (!inputPeso) inputPeso = document.getElementById("pesoInput");
    if (!btnGuardar) btnGuardar = document.getElementById("btnGuardarPeso");

    const pesoValor = inputPeso ? inputPeso.value.trim() : "";

    if (!pesoValor || isNaN(pesoValor) || parseFloat(pesoValor) <= 0) {
        mostrarFeedback("⚠️ Por favor, introduce un peso válido.", "#facc15");
        if (inputPeso) inputPeso.focus();
        return;
    }

    const valorNumerico = parseFloat(pesoValor);

    const textoOriginal = btnGuardar ? btnGuardar.innerText : "Guardar";
    if (btnGuardar) {
        btnGuardar.disabled = true;
        btnGuardar.innerText = "Guardando...";
        btnGuardar.style.opacity = "0.7";
        btnGuardar.style.cursor = "not-allowed";
    }

    try {
        await addDoc(collection(db, "registros_peso"), {
            peso: valorNumerico,
            fecha: new Date().toISOString().split('T')[0],
            timestamp: new Date()
        });

        mostrarFeedback(`✅ ¡${valorNumerico} kg guardado correctamente!`, "#4ade80");
        if (inputPeso) {
            inputPeso.value = "";
        }

        setTimeout(() => {
            cerrarModalPeso();
        }, 1200);
    } catch (e) {
        console.error("Error al guardar el peso en Firestore:", e);
        mostrarFeedback(`❌ Error al guardar: ${e.message || "Fallo de conexión"}`, "#f87171");
    } finally {
        if (btnGuardar) {
            btnGuardar.disabled = false;
            btnGuardar.innerText = textoOriginal;
            btnGuardar.style.opacity = "1";
            btnGuardar.style.cursor = "pointer";
        }
    }
}

function mostrarFeedback(mensaje, color) {
    let fb = document.getElementById("pesoFeedback");
    if (!fb) return;
    fb.textContent = mensaje;
    fb.style.color = color;
    fb.style.display = "block";

    setTimeout(() => {
        if (fb) fb.style.display = "none";
    }, 4000);
}

// ==========================================
// EXPOSICIÓN GLOBAL
// ==========================================
window.salud = {
    initSalud,
    cleanupSalud,
    guardarPeso,
    abrirModalPeso,
    cerrarModalPeso,
    conectarGoogleFit,
    actualizarEstadoGoogleFitUI,
    crearGoogleFitProvider,
    mostrarAvisoFuturo
};
window.guardarPeso = guardarPeso;
window.conectarGoogleFit = conectarGoogleFit;

import { db } from "./firebase-config.js";
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Referencias a elementos del DOM en la vista Dashboard
let inputPeso = null;
let btnGuardar = null;
let displayPeso = null;
let statusBadge = null;
let unsubscribeFirestore = null;

// Inicializa el módulo de salud cuando el router inyecta la vista 'dashboard'
export function initSalud() {
    // Limpiar listener previo si existiera
    cleanupSalud();

    inputPeso = document.getElementById("pesoInput");
    btnGuardar = document.getElementById("btnGuardarPeso");
    displayPeso = document.getElementById("ultimoPesoDisplay");
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

    escucharUltimoPeso();
}

// Detiene la escucha en tiempo real al salir del dashboard (ahorro de recursos)
export function cleanupSalud() {
    if (typeof unsubscribeFirestore === "function") {
        unsubscribeFirestore();
        unsubscribeFirestore = null;
    }
}

// Conexión en tiempo real con Firestore
function escucharUltimoPeso() {
    if (!displayPeso) return;

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
                displayPeso.innerText = `${pesoVal} kg (${fechaVal})`;
                displayPeso.style.color = "#38bdf8";
                displayPeso.style.fontWeight = "700";
            } else {
                displayPeso.innerText = "No hay registros de peso todavía.";
                displayPeso.style.color = "#94a3b8";
            }
        }, (error) => {
            console.error("Error al escuchar Firestore:", error);
            if (statusBadge) {
                statusBadge.textContent = "🔴 Error al conectar Firestore";
                statusBadge.style.color = "#f87171";
            }
            if (displayPeso) {
                displayPeso.innerText = "Error de conexión con la base de datos.";
            }
        });
    } catch (e) {
        console.error("Error al configurar listener de Firestore:", e);
        if (displayPeso) {
            displayPeso.innerText = "Error al inicializar Firestore.";
        }
    }
}

// Función para guardar un nuevo registro de peso
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

    // Estado visual del botón durante el guardado
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

// Hacer disponible globalmente
window.guardarPeso = guardarPeso;

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

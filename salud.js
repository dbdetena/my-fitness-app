import { db } from "./firebase-config.js";
import { 
    collection, 
    addDoc, 
    query, 
    orderBy, 
    limit, 
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Referencias del DOM
let inputPeso, btnGuardar, displayPeso, statusBadge, feedbackElement;

function initDOM() {
    inputPeso = document.getElementById("pesoInput");
    btnGuardar = document.getElementById("btnGuardarPeso");
    displayPeso = document.getElementById("ultimoPesoDisplay");
    statusBadge = document.getElementById("dbStatusBadge");
    feedbackElement = document.getElementById("pesoFeedback");

    if (btnGuardar) {
        btnGuardar.addEventListener("click", guardarPeso);
    }

    if (inputPeso) {
        inputPeso.addEventListener("keydown", (e) => {
            if (e.key === "Enter") {
                guardarPeso();
            }
        });
    }

    escucharUltimoPeso();
}

// Escuchar cambios en tiempo real en Firestore
function escucharUltimoPeso() {
    if (!displayPeso) return;

    try {
        const q = query(
            collection(db, "registros_peso"), 
            orderBy("timestamp", "desc"), 
            limit(1)
        );

        onSnapshot(q, (snapshot) => {
            if (statusBadge) {
                statusBadge.textContent = "🟢 Firestore conectado";
                statusBadge.style.color = "#4ade80";
            }

            if (!snapshot.empty) {
                const docData = snapshot.docs[0].data();
                const pesoVal = docData.peso;
                const fechaVal = docData.fecha || "Hoy";
                displayPeso.innerText = `Último registro: ${pesoVal} kg (${fechaVal})`;
                displayPeso.style.color = "#38bdf8";
                displayPeso.style.fontWeight = "600";
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
            displayPeso.innerText = "Error al conectar con Firestore. Revisa permisos.";
        });
    } catch (e) {
        console.error("Error al inicializar query de Firestore:", e);
        displayPeso.innerText = "Error al consultar peso.";
    }
}

// Función para guardar un nuevo registro de peso
export async function guardarPeso() {
    if (!inputPeso) inputPeso = document.getElementById("pesoInput");
    if (!btnGuardar) btnGuardar = document.getElementById("btnGuardarPeso");

    const pesoValor = inputPeso ? inputPeso.value.trim() : "";

    if (!pesoValor || isNaN(pesoValor) || parseFloat(pesoValor) <= 0) {
        mostrarFeedback("⚠️ Por favor, introduce un valor de peso válido.", "#facc15");
        if (inputPeso) inputPeso.focus();
        return;
    }

    const valorNumerico = parseFloat(pesoValor);

    // Estado visual del botón durante el guardado
    const originalText = btnGuardar ? btnGuardar.innerText : "Guardar";
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
            btnGuardar.innerText = originalText;
            btnGuardar.style.opacity = "1";
            btnGuardar.style.cursor = "pointer";
        }
    }
}

// Hacer disponible globalmente para onclick inline
window.guardarPeso = guardarPeso;

function mostrarFeedback(mensaje, color) {
    let fb = document.getElementById("pesoFeedback");
    if (!fb) {
        fb = document.createElement("p");
        fb.id = "pesoFeedback";
        fb.style.fontSize = "0.85rem";
        fb.style.marginTop = "8px";
        if (inputPeso && inputPeso.parentElement) {
            inputPeso.parentElement.parentElement.appendChild(fb);
        }
    }
    fb.textContent = mensaje;
    fb.style.color = color;
    fb.style.display = "block";

    setTimeout(() => {
        if (fb) fb.style.display = "none";
    }, 4500);
}

// Inicializar de inmediato si el DOM ya está listo (evita perder DOMContentLoaded en módulos ES)
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initDOM);
} else {
    initDOM();
}

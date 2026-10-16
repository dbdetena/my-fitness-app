import { db } from "./firebase-config.js";
import { collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Función para guardar un nuevo registro de peso
window.guardarPeso = async function() {
    const inputPeso = document.getElementById("pesoInput");
    const pesoValor = inputPeso.value;

    if (!pesoValor) {
        alert("Por favor, introduce un valor de peso.");
        return;
    }

    try {
        await addDoc(collection(db, "registros_peso"), {
            peso: parseFloat(pesoValor),
            fecha: new Date().toISOString().split('T')[0],
            timestamp: new Date()
        });
        alert("¡Peso guardado correctamente en Firebase!");
        inputPeso.value = "";
        cargarUltimoPeso();
    } catch (e) {
        console.error("Error al guardar el peso: ", e);
        alert("Hubo un error al guardar los datos.");
    }
};

// Función para consultar el último peso registrado
async function cargarUltimoPeso() {
    try {
        const q = query(collection(db, "registros_peso"), orderBy("timestamp", "desc"), limit(1));
        const querySnapshot = await getDocs(q);
        const display = document.getElementById("ultimoPesoDisplay");
        
        if (!querySnapshot.empty) {
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                display.innerText = `Último registro: ${data.peso} kg (${data.fecha})`;
            });
        } else {
            display.innerText = "No hay registros de peso todavía.";
        }
    } catch (e) {
        console.error("Error al cargar el peso: ", e);
    }
}

// Cargar al iniciar si estamos en la vista de salud
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("ultimoPesoDisplay")) {
        cargarUltimoPeso();
    }
});

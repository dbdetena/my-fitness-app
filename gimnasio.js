// Objeto controlador accesible globalmente
window.gimnasio = {
    toggleCollapse,
    openModal,
    closeModal,
    toggleSetComplete
};

// Controlador para la vista de Gimnasio & Entrenamiento
export function initGimnasio() {
    window.gimnasio = {
        toggleCollapse,
        openModal,
        closeModal,
        toggleSetComplete
    };

    // Soporte para cerrar modal con tecla Escape
    document.addEventListener("keydown", handleEscapeKey);
}

export function cleanupGimnasio() {
    document.removeEventListener("keydown", handleEscapeKey);
}

function handleEscapeKey(e) {
    if (e.key === "Escape") {
        const openModal = document.querySelector(".modal-overlay.active");
        if (openModal) {
            openModal.classList.remove("active");
            document.body.classList.remove("modal-open");
        }
    }
}

// Colapsar o expandir tarjeta de ejercicio
export function toggleCollapse(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.toggle("collapsed");
}

// Abrir modal técnico
export function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.add("active");
    document.body.classList.add("modal-open");
}

// Cerrar modal técnico
export function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    modal.classList.remove("active");
    document.body.classList.remove("modal-open");
}

// Marcar serie como completada con animación neón
export function toggleSetComplete(rowId, checkbox) {
    const row = document.getElementById(rowId);
    if (!row) return;

    if (checkbox.checked) {
        row.classList.add("set-completed");
        // Pequeño efecto háptico si el dispositivo lo soporta
        if (navigator.vibrate) {
            navigator.vibrate(25);
        }
    } else {
        row.classList.remove("set-completed");
    }
}

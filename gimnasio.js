// Controlador de la Sección Rutinas & 3 Bibliotecas Especializadas
import { BASE_EJERCICIOS, EQUIPAMIENTO_CONFIG, TIPOS_EJERCICIO } from "./ejercicios-data.js";
import { 
    RUTINAS_ESTANDAR, 
    obtenerRutinasPersonalizadas, 
    guardarRutinaPersonalizada, 
    eliminarRutinaPersonalizada, 
    clonarRutinaEstandar, 
    generarRutinaCoach 
} from "./rutinas-data.js";

// Estado interno del módulo de Rutinas
const state = {
    tabActual: "ejercicios", // 'ejercicios' | 'estandar' | 'personalizadas'
    filtroTipo: "todos",
    filtroEquipo: "todos",
    filtroTexto: "",
    filtroCreadorPersonalizada: "todos",
    ejercicioModalActual: null,
    fasePosturaActual: 1,
    rutinaEnSesion: null
};

export function initGimnasio() {
    // Exponer controlador en el ámbito global para interactividad inline
    window.gimnasio = {
        cambiarTab,
        setFiltroTipo,
        setFiltroEquipo,
        filtrarEjercicios,
        limpiarBusqueda,
        abrirModalDetalle,
        cerrarModalDetalle,
        seleccionarFasePostura,
        prepararAnadirARutina,
        iniciarEntrenamientoRutina,
        salirSesionActiva,
        clonarRutina,
        eliminarRutina,
        filtrarPersonalizadas,
        abrirModalNuevaRutina,
        cerrarModalNuevaRutina,
        guardarNuevaRutinaUsuario,
        abrirModalGenerarCoach,
        cerrarModalGenerarCoach,
        ejecutarGeneracionCoach,
        toggleCollapse,
        toggleSetComplete
    };

    // Renderizado inicial de las 3 bibliotecas
    renderizarCatalogoEjercicios();
    renderizarRutinasEstandar();
    renderizarRutinasPersonalizadas();

    // Event listener para cerrar modales con tecla Escape
    document.addEventListener("keydown", handleKeydown);
}

export function cleanupGimnasio() {
    document.removeEventListener("keydown", handleKeydown);
}

function handleKeydown(e) {
    if (e.key === "Escape") {
        const modalAbierto = document.querySelector(".modal-overlay.active");
        if (modalAbierto) {
            modalAbierto.classList.remove("active");
            document.body.classList.remove("modal-open");
        }
    }
}

// ==========================================
// CONTROL DE PESTAÑAS (LAS 3 BIBLIOTECAS)
// ==========================================
export function cambiarTab(tabId) {
    state.tabActual = tabId;

    // Actualizar botones de pestaña
    document.querySelectorAll(".rutinas-tab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.id === `tab-btn-${tabId}`);
    });

    // Ocultar panel de sesión activa si estuviese abierto
    const sesionPanel = document.getElementById("panel-sesion-activa");
    if (sesionPanel) sesionPanel.style.display = "none";

    // Mostrar el panel seleccionado
    document.querySelectorAll(".rutinas-tab-panel").forEach(panel => {
        if (panel.id === `panel-${tabId}`) {
            panel.classList.add("active");
            panel.style.display = "block";
        } else if (panel.id !== "panel-sesion-activa") {
            panel.classList.remove("active");
            panel.style.display = "none";
        }
    });

    if (tabId === "personalizadas") {
        renderizarRutinasPersonalizadas();
    }
}

// ==========================================
// BIBLIOTECA 1: CATÁLOGO DE EJERCICIOS
// ==========================================
export function setFiltroTipo(tipo) {
    state.filtroTipo = tipo;
    document.querySelectorAll("#chips-tipo .filter-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.tipo === tipo);
    });
    renderizarCatalogoEjercicios();
}

export function setFiltroEquipo(equipo) {
    state.filtroEquipo = equipo;
    document.querySelectorAll("#chips-equipo .filter-chip").forEach(chip => {
        chip.classList.toggle("active", chip.dataset.equipo === equipo);
    });
    renderizarCatalogoEjercicios();
}

export function filtrarEjercicios() {
    const input = document.getElementById("input-buscar-ejercicio");
    state.filtroTexto = input ? input.value.trim().toLowerCase() : "";
    renderizarCatalogoEjercicios();
}

export function limpiarBusqueda() {
    const input = document.getElementById("input-buscar-ejercicio");
    if (input) input.value = "";
    state.filtroTexto = "";
    renderizarCatalogoEjercicios();
}

function renderizarCatalogoEjercicios() {
    const contenedor = document.getElementById("grid-ejercicios");
    const labelConteo = document.getElementById("label-conteo-ejercicios");
    if (!contenedor) return;

    // Filtrado acumulativo: tipo + equipo + texto
    const filtrados = BASE_EJERCICIOS.filter(ej => {
        const coincideTipo = state.filtroTipo === "todos" || ej.tipo === state.filtroTipo;
        const coincideEquipo = state.filtroEquipo === "todos" || ej.equipamiento.includes(state.filtroEquipo);
        
        let coincideTexto = true;
        if (state.filtroTexto) {
            const haystack = `${ej.nombre} ${ej.tipoNombre} ${ej.musculosPrincipales.join(" ")} ${ej.equipamiento.join(" ")}`.toLowerCase();
            coincideTexto = haystack.includes(state.filtroTexto);
        }
        return coincideTipo && coincideEquipo && coincideTexto;
    });

    if (labelConteo) {
        labelConteo.textContent = `Mostrando ${filtrados.length} de ${BASE_EJERCICIOS.length} ejercicios`;
    }

    if (filtrados.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-results-card card-carbon">
                <span class="empty-icon">🔎</span>
                <h4>No se encontraron ejercicios</h4>
                <p>Prueba a cambiar los filtros o a borrar la búsqueda de texto.</p>
                <button class="btn-ghost" onclick="window.gimnasio?.limpiarFiltrosCompletos()">Restablecer Filtros</button>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = filtrados.map(ej => {
        // Badges de equipamiento
        const badgesEquipoHtml = ej.equipamiento.map(eqKey => {
            const cfg = EQUIPAMIENTO_CONFIG[eqKey];
            if (!cfg) return "";
            return `<span class="badge-tag badge-equipment ${cfg.badgeClass}">${cfg.icono} ${cfg.nombre}</span>`;
        }).join(" ");

        return `
        <div class="exercise-item-card card-carbon animate-fade-in" id="catalog-card-${ej.id}">
            <div class="exercise-card-thumb" onclick="window.gimnasio?.abrirModalDetalle('${ej.id}')">
                <img src="${ej.imagen}" alt="${ej.nombre}" loading="lazy" class="exercise-thumb-img">
                <div class="exercise-card-top-overlay">
                    <div class="exercise-type-pill badge-type-${ej.tipo}">
                        <span>${ej.tipoIcono}</span>
                        <span>${ej.tipoNombre}</span>
                    </div>
                    <span class="exercise-difficulty-pill difficulty-${ej.dificultad.toLowerCase()}">${ej.dificultad}</span>
                </div>
                <div class="exercise-thumb-badge-3d">
                    <span>🧬 3D Anatómico</span>
                </div>
            </div>

            <div class="exercise-card-main">
                <h3 class="exercise-name">${ej.nombre}</h3>
                <p class="exercise-brief">${ej.resumen}</p>
                
                <div class="exercise-equipment-tags">
                    ${badgesEquipoHtml}
                </div>

                <div class="exercise-muscles-row">
                    <span class="muscle-label">Músculo Diana:</span>
                    <strong class="muscle-value">${ej.musculosPrincipales[0]}</strong>
                </div>
            </div>

            <div class="exercise-card-footer">
                <button class="btn-neon-guide" onclick="window.gimnasio?.abrirModalDetalle('${ej.id}')">
                    <span>🔬</span> Guía & 3 Posturas Clave
                </button>
            </div>
        </div>
        `;
    }).join("");
}

window.gimnasio = window.gimnasio || {};
window.gimnasio.limpiarFiltrosCompletos = function() {
    state.filtroTipo = "todos";
    state.filtroEquipo = "todos";
    state.filtroTexto = "";
    const input = document.getElementById("input-buscar-ejercicio");
    if (input) input.value = "";
    document.querySelectorAll(".filter-chip").forEach(ch => {
        if (ch.dataset.tipo === "todos" || ch.dataset.equipo === "todos") ch.classList.add("active");
        else ch.classList.remove("active");
    });
    renderizarCatalogoEjercicios();
};

// ==========================================
// MODAL DETALLE: BIOMECÁNICA & 3 POSTURAS
// ==========================================
export function abrirModalDetalle(ejercicioId) {
    const ejercicio = BASE_EJERCICIOS.find(e => e.id === ejercicioId);
    if (!ejercicio) return;

    state.ejercicioModalActual = ejercicio;
    state.fasePosturaActual = 1;

    // Inyectar datos en el modal
    const nombreEl = document.getElementById("modal-ejercicio-nombre");
    const resumenEl = document.getElementById("modal-ejercicio-resumen");
    const badgesEl = document.getElementById("modal-ejercicio-badges");
    const heroImgEl = document.getElementById("modal-ejercicio-hero-img");
    const mPrincipalesEl = document.getElementById("modal-musculos-principales");
    const mSecundariosEl = document.getElementById("modal-musculos-secundarios");
    const tecnicaEl = document.getElementById("modal-tecnica-pasos");
    const riesgosEl = document.getElementById("modal-lista-riesgos");

    if (nombreEl) nombreEl.textContent = ejercicio.nombre;
    if (resumenEl) resumenEl.textContent = ejercicio.resumen;
    if (heroImgEl && ejercicio.imagen) {
        heroImgEl.src = ejercicio.imagen;
        heroImgEl.alt = `${ejercicio.nombre} - Estudio Anatómico 3D`;
    }

    if (badgesEl) {
        const badgesEquipo = ejercicio.equipamiento.map(eq => {
            const cfg = EQUIPAMIENTO_CONFIG[eq];
            return cfg ? `<span class="badge-tag ${cfg.badgeClass}">${cfg.icono} ${cfg.nombre}</span>` : "";
        }).join(" ");

        badgesEl.innerHTML = `
            <span class="badge-tag badge-type-${ejercicio.tipo}">${ejercicio.tipoIcono} ${ejercicio.tipoNombre}</span>
            <span class="badge-tag badge-difficulty">${ejercicio.dificultad}</span>
            ${badgesEquipo}
        `;
    }

    if (mPrincipalesEl) {
        mPrincipalesEl.innerHTML = ejercicio.musculosPrincipales.map(m => `<span class="muscle-pill primary">${m}</span>`).join(" ");
    }

    if (mSecundariosEl) {
        mSecundariosEl.innerHTML = ejercicio.musculosSecundarios.map(m => `<span class="muscle-pill secondary">${m}</span>`).join(" ");
    }

    if (tecnicaEl) {
        tecnicaEl.innerHTML = `
            <div class="technique-step-card">
                <span class="step-num">01</span>
                <div>
                    <strong>Setup & Posicionamiento:</strong>
                    <p>${ejercicio.tecnica.setup}</p>
                </div>
            </div>
            <div class="technique-step-card">
                <span class="step-num">02</span>
                <div>
                    <strong>Fase Concéntrica (Empuje/Tracción):</strong>
                    <p>${ejercicio.tecnica.concentrica}</p>
                </div>
            </div>
            <div class="technique-step-card">
                <span class="step-num">03</span>
                <div>
                    <strong>Fase Excéntrica (Retorno y Tensión):</strong>
                    <p>${ejercicio.tecnica.excentrica}</p>
                </div>
            </div>
            <div class="technique-meta-row">
                <div class="meta-item">
                    <span>🫁 <strong>Respiración:</strong> ${ejercicio.tecnica.respiracion}</span>
                </div>
                <div class="meta-item">
                    <span>⏱️ <strong>Tempo Sugerido:</strong> <code>${ejercicio.tecnica.tempo}</code></span>
                </div>
            </div>
        `;
    }

    if (riesgosEl) {
        riesgosEl.innerHTML = ejercicio.riesgos.map(r => `<li>${r}</li>`).join("");
    }

    // Renderizar la primera postura
    renderizarPosturaFase(1);

    // Abrir modal
    const modal = document.getElementById("modal-detalle-ejercicio");
    if (modal) {
        modal.classList.add("active");
        document.body.classList.add("modal-open");
    }
}

export function cerrarModalDetalle() {
    const modal = document.getElementById("modal-detalle-ejercicio");
    if (modal) {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }
}

export function seleccionarFasePostura(faseNum) {
    state.fasePosturaActual = faseNum;

    // Actualizar botones de fase
    document.querySelectorAll(".phase-btn").forEach(btn => {
        btn.classList.toggle("active", parseInt(btn.dataset.phase, 10) === faseNum);
    });

    renderizarPosturaFase(faseNum);
}

function renderizarPosturaFase(faseNum) {
    const displayCard = document.getElementById("posture-display-card");
    const ejercicio = state.ejercicioModalActual;
    if (!displayCard || !ejercicio) return;

    const postura = ejercicio.posturas.find(p => p.fase === faseNum) || ejercicio.posturas[0];
    if (!postura) return;

    displayCard.innerHTML = `
        <div class="posture-meta-box animate-fade-in">
            <div class="posture-headline">
                <span class="fase-indicator">Fase ${postura.fase} de 3</span>
                <h4>${postura.titulo}</h4>
            </div>
            <div class="muscle-highlight-badge">
                <span class="pulse-spark">🔥</span>
                <strong>Músculos en Máxima Tensión:</strong> ${postura.musculosDestacados}
            </div>
            <div class="posture-desc-box">
                <span class="desc-label">💡 Cues & Puntos Clave de la Fase:</span>
                <p class="posture-desc">${postura.detalles}</p>
            </div>
        </div>
    `;
}

export function prepararAnadirARutina() {
    cerrarModalDetalle();
    cambiarTab("personalizadas");
    abrirModalNuevaRutina();
}

// ==========================================
// BIBLIOTECA 2: RUTINAS ESTÁNDAR
// ==========================================
function renderizarRutinasEstandar() {
    const contenedor = document.getElementById("grid-rutinas-estandar");
    if (!contenedor) return;

    contenedor.innerHTML = RUTINAS_ESTANDAR.map(rutina => {
        const listaEjerciciosHtml = rutina.ejercicios.map((item, idx) => {
            const ej = BASE_EJERCICIOS.find(e => e.id === item.ejercicioId);
            const nombre = ej ? ej.nombre : item.ejercicioId;
            const icono = ej ? ej.tipoIcono : "🏋️";
            return `
            <div class="routine-exercise-row">
                <div class="ex-name-part" onclick="window.gimnasio?.abrirModalDetalle('${item.ejercicioId}')" title="Ver guía biomecánica">
                    <span class="ex-idx">${idx + 1}</span>
                    <span class="ex-icon">${icono}</span>
                    <span class="ex-title link-tech">${nombre} ℹ️</span>
                </div>
                <div class="ex-target-part">
                    <span class="badge-series">${item.series} series × ${item.reps}</span>
                    <span class="badge-rest">⏱️ ${item.descanso}s</span>
                </div>
            </div>
            `;
        }).join("");

        return `
        <div class="routine-card card-carbon animate-fade-in" id="card-estandar-${rutina.id}">
            <div class="routine-header">
                <div>
                    <div class="routine-category-row">
                        <span class="badge-tag badge-type-${rutina.categoria}">${rutina.icono} ${rutina.categoriaBadge}</span>
                        <span class="badge-tag badge-level">${rutina.nivel}</span>
                        <span class="badge-tag badge-time">⏱️ ${rutina.duracion}</span>
                    </div>
                    <h3 class="routine-title">${rutina.nombre}</h3>
                </div>
            </div>

            <p class="routine-description">${rutina.descripcion}</p>

            <div class="routine-exercises-container">
                <span class="exercises-header-label">Ejercicios enlazados (${rutina.ejercicios.length}):</span>
                <div class="routine-exercises-list">
                    ${listaEjerciciosHtml}
                </div>
            </div>

            <div class="routine-card-actions">
                <button class="btn-primary btn-neon-cyan" onclick="window.gimnasio?.iniciarEntrenamientoRutina('estandar', '${rutina.id}')">
                    <span>🏋️‍♂️</span> Iniciar Sesión
                </button>
                <button class="btn-ghost" onclick="window.gimnasio?.clonarRutina('${rutina.id}')" title="Copiar a Mis Rutinas">
                    <span>📋</span> Clonar a Mis Rutinas
                </button>
            </div>
        </div>
        `;
    }).join("");
}

export function clonarRutina(estandarId) {
    const clon = clonarRutinaEstandar(estandarId);
    if (clon) {
        cambiarTab("personalizadas");
        // Notificación visual rápida
        const flash = document.createElement("div");
        flash.className = "toast-notification toast-success";
        flash.textContent = `✓ Rutina '${clon.nombre}' añadida a tu biblioteca personal.`;
        document.body.appendChild(flash);
        setTimeout(() => flash.remove(), 3200);
    }
}

// ==========================================
// BIBLIOTECA 3: RUTINAS PERSONALIZADAS
// ==========================================
export function filtrarPersonalizadas(creador) {
    state.filtroCreadorPersonalizada = creador;
    document.querySelectorAll(".custom-filter-tabs .subtab-btn").forEach(btn => {
        btn.classList.toggle("active", btn.dataset.creador === creador);
    });
    renderizarRutinasPersonalizadas();
}

function renderizarRutinasPersonalizadas() {
    const contenedor = document.getElementById("grid-rutinas-personalizadas");
    if (!contenedor) return;

    let rutinas = obtenerRutinasPersonalizadas();

    if (state.filtroCreadorPersonalizada !== "todos") {
        rutinas = rutinas.filter(r => r.creador === state.filtroCreadorPersonalizada);
    }

    if (rutinas.length === 0) {
        contenedor.innerHTML = `
            <div class="empty-results-card card-carbon">
                <span class="empty-icon">🛠️</span>
                <h4>No hay rutinas en esta categoría</h4>
                <p>Crea tu primera rutina personalizada o solicita una generada por el AI Coach.</p>
                <div style="display: flex; gap: 10px; margin-top: 12px;">
                    <button class="btn-primary" onclick="window.gimnasio?.abrirModalNuevaRutina()">Crear Rutina</button>
                    <button class="btn-primary btn-neon-gold" onclick="window.gimnasio?.abrirModalGenerarCoach()">Pedir al Coach</button>
                </div>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = rutinas.map(rutina => {
        const esCoach = rutina.creador === "coach";
        const badgeCreador = esCoach 
            ? `<span class="badge-tag badge-coach">🤖 AI Performance Coach</span>`
            : `<span class="badge-tag badge-user">👤 Mi Rutina (Usuario)</span>`;

        const ejerciciosHtml = (rutina.ejercicios || []).map((item, idx) => {
            const ej = BASE_EJERCICIOS.find(e => e.id === item.ejercicioId);
            const nombre = ej ? ej.nombre : item.ejercicioId;
            const icono = ej ? ej.tipoIcono : "🏋️";
            return `
            <div class="routine-exercise-row">
                <div class="ex-name-part" onclick="window.gimnasio?.abrirModalDetalle('${item.ejercicioId}')">
                    <span class="ex-idx">${idx + 1}</span>
                    <span class="ex-icon">${icono}</span>
                    <span class="ex-title link-tech">${nombre}</span>
                </div>
                <div class="ex-target-part">
                    <span class="badge-series">${item.series || 3} series × ${item.reps || "8-10"}</span>
                </div>
            </div>
            `;
        }).join("");

        return `
        <div class="routine-card card-carbon ${esCoach ? 'border-coach-glow' : ''} animate-fade-in" id="card-custom-${rutina.id}">
            <div class="routine-header">
                <div>
                    <div class="routine-category-row">
                        ${badgeCreador}
                        <span class="badge-tag badge-time">⏱️ ${rutina.duracion || "45 min"}</span>
                        <span class="badge-tag badge-level">${rutina.nivel || "Intermedio"}</span>
                    </div>
                    <h3 class="routine-title">${rutina.nombre}</h3>
                </div>
                <button class="btn-delete-routine" onclick="window.gimnasio?.eliminarRutina('${rutina.id}')" title="Eliminar rutina">
                    🗑️
                </button>
            </div>

            ${rutina.notaCoach ? `<div class="coach-quote-box"><span class="coach-quote-icon">💡</span><p>${rutina.notaCoach}</p></div>` : ''}

            <div class="routine-exercises-container">
                <span class="exercises-header-label">Ejercicios seleccionados (${(rutina.ejercicios || []).length}):</span>
                <div class="routine-exercises-list">
                    ${ejerciciosHtml}
                </div>
            </div>

            <div class="routine-card-actions">
                <button class="btn-primary btn-neon-cyan" onclick="window.gimnasio?.iniciarEntrenamientoRutina('personalizada', '${rutina.id}')">
                    <span>🏋️‍♂️</span> Iniciar Sesión
                </button>
            </div>
        </div>
        `;
    }).join("");
}

export function eliminarRutina(id) {
    if (confirm("¿Seguro que deseas eliminar esta rutina personalizada?")) {
        eliminarRutinaPersonalizada(id);
        renderizarRutinasPersonalizadas();
    }
}

// ==========================================
// MODAL CREADOR DE RUTINA PERSONALIZADA
// ==========================================
export function abrirModalNuevaRutina() {
    const checklistEl = document.getElementById("checklist-ejercicios-creador");
    if (checklistEl) {
        checklistEl.innerHTML = BASE_EJERCICIOS.map(ej => `
            <label class="exercise-select-item">
                <input type="checkbox" name="ejercicio-check" value="${ej.id}">
                <div class="exercise-select-details">
                    <span class="select-icon">${ej.tipoIcono}</span>
                    <div class="select-text-col">
                        <strong>${ej.nombre}</strong>
                        <span class="select-meta">${ej.tipoNombre} • ${ej.musculosPrincipales[0]}</span>
                    </div>
                </div>
            </label>
        `).join("");
    }

    const inputNombre = document.getElementById("input-nombre-rutina");
    if (inputNombre) inputNombre.value = "";

    const modal = document.getElementById("modal-nueva-rutina");
    if (modal) {
        modal.classList.add("active");
        document.body.classList.add("modal-open");
    }
}

export function cerrarModalNuevaRutina() {
    const modal = document.getElementById("modal-nueva-rutina");
    if (modal) {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }
}

export function guardarNuevaRutinaUsuario() {
    const inputNombre = document.getElementById("input-nombre-rutina");
    const selectNivel = document.getElementById("select-nivel-rutina");
    const inputDuracion = document.getElementById("input-duracion-rutina");

    const nombre = inputNombre ? inputNombre.value.trim() : "";
    if (!nombre) {
        alert("Por favor, introduce un nombre para tu rutina.");
        return;
    }

    // Recoger ejercicios seleccionados
    const seleccionados = Array.from(document.querySelectorAll("#checklist-ejercicios-creador input[type='checkbox']:checked"))
        .map(cb => ({
            ejercicioId: cb.value,
            series: 3,
            reps: "8 - 10",
            descanso: 120,
            rir: "1 - 2"
        }));

    if (seleccionados.length === 0) {
        alert("Selecciona al menos un ejercicio para tu rutina.");
        return;
    }

    const nuevaRutina = {
        id: `custom-user-${Date.now()}`,
        nombre: nombre,
        creador: "usuario",
        creadorNombre: "Mi Rutina (Usuario)",
        icono: "👤",
        fechaCreacion: new Date().toISOString().split("T")[0],
        duracion: `${inputDuracion ? inputDuracion.value : 50} min`,
        nivel: selectNivel ? selectNivel.value : "Intermedio",
        notaCoach: "Rutina configurada y adaptada por el usuario.",
        ejercicios: seleccionados
    };

    guardarRutinaPersonalizada(nuevaRutina);
    cerrarModalNuevaRutina();
    renderizarRutinasPersonalizadas();
}

// ==========================================
// MODAL GENERADOR AI COACH
// ==========================================
export function abrirModalGenerarCoach() {
    const modal = document.getElementById("modal-coach-rutina");
    if (modal) {
        modal.classList.add("active");
        document.body.classList.add("modal-open");
    }
}

export function cerrarModalGenerarCoach() {
    const modal = document.getElementById("modal-coach-rutina");
    if (modal) {
        modal.classList.remove("active");
        document.body.classList.remove("modal-open");
    }
}

export function ejecutarGeneracionCoach() {
    const selectObj = document.getElementById("select-coach-objetivo");
    const selectTiempo = document.getElementById("select-coach-tiempo");

    const objetivo = selectObj ? selectObj.value : "empuje";
    const tiempo = selectTiempo ? parseInt(selectTiempo.value, 10) : 50;

    const nuevaRutina = generarRutinaCoach({ objetivo, tiempo });
    cerrarModalGenerarCoach();
    cambiarTab("personalizadas");
    renderizarRutinasPersonalizadas();

    // Notificación
    const toast = document.createElement("div");
    toast.className = "toast-notification toast-success";
    toast.textContent = `✓ '${nuevaRutina.nombre}' generada con éxito.`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
}

// ==========================================
// MESA DE ENTRENAMIENTO EN VIVO (SESIÓN ACTIVA)
// ==========================================
export function iniciarEntrenamientoRutina(tipo, rutinaId) {
    let rutina = null;
    if (tipo === "estandar") {
        rutina = RUTINAS_ESTANDAR.find(r => r.id === rutinaId);
    } else {
        rutina = obtenerRutinasPersonalizadas().find(r => r.id === rutinaId);
    }

    if (!rutina) return;
    state.rutinaEnSesion = rutina;

    // Ocultar paneles de bibliotecas y mostrar panel de sesión activa
    document.querySelectorAll(".rutinas-tab-panel").forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
    });

    const sesionPanel = document.getElementById("panel-sesion-activa");
    if (sesionPanel) {
        sesionPanel.style.display = "block";
        sesionPanel.classList.add("active");
    }

    const titleEl = document.getElementById("session-routine-title");
    const descEl = document.getElementById("session-routine-desc");
    const contenedor = document.getElementById("contenedor-ejercicios-sesion");

    if (titleEl) titleEl.textContent = rutina.nombre;
    if (descEl) descEl.textContent = `Sesión activa • ${rutina.duracion || '50 min'} • ${rutina.ejercicios.length} ejercicios`;

    if (contenedor) {
        contenedor.innerHTML = rutina.ejercicios.map((item, idx) => {
            const ej = BASE_EJERCICIOS.find(e => e.id === item.ejercicioId);
            const nombre = ej ? ej.nombre : item.ejercicioId;
            const icono = ej ? ej.tipoIcono : "🏋️";
            const numSeries = item.series || 3;

            let filasSeriesHtml = "";
            for (let s = 1; s <= numSeries; s++) {
                const rowId = `row-session-${idx}-${s}`;
                filasSeriesHtml += `
                <tr class="set-row" id="${rowId}">
                    <td class="col-set"><span class="set-badge">${s}</span></td>
                    <td class="col-target">${item.reps || "8-10"}</td>
                    <td class="col-input">
                        <input type="number" step="0.5" class="input-set-data" placeholder="kg">
                    </td>
                    <td class="col-input">
                        <input type="number" step="1" class="input-set-data" placeholder="reps">
                    </td>
                    <td class="col-check">
                        <label class="custom-neon-check">
                            <input type="checkbox" onchange="window.gimnasio?.toggleSetComplete('${rowId}', this)">
                            <span class="checkmark"></span>
                        </label>
                    </td>
                </tr>
                `;
            }

            return `
            <div class="exercise-card card-carbon" id="session-card-${idx}">
                <div class="exercise-header" onclick="window.gimnasio?.toggleCollapse('session-card-${idx}')">
                    <div class="exercise-main-info">
                        <span class="exercise-icon">${icono}</span>
                        <div>
                            <div class="exercise-title-wrap">
                                <h3>${nombre}</h3>
                                <button class="btn-info-neon" title="Guía técnica" onclick="event.stopPropagation(); window.gimnasio?.abrirModalDetalle('${item.ejercicioId}')">
                                    ℹ️
                                </button>
                            </div>
                            <p class="exercise-meta">${numSeries} series planificadas • Descanso: ${item.descanso || 90}s</p>
                        </div>
                    </div>
                    <div class="collapse-indicator">
                        <span class="chevron">▼</span>
                    </div>
                </div>

                <div class="exercise-body">
                    <div class="table-responsive">
                        <table class="sets-table">
                            <thead>
                                <tr>
                                    <th class="col-set">SET</th>
                                    <th class="col-target">OBJETIVO</th>
                                    <th class="col-input">PESO (kg)</th>
                                    <th class="col-input">REPS</th>
                                    <th class="col-check">CHECK</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filasSeriesHtml}
                            </tbody>
                        </table>
                    </div>
                    <div class="exercise-footer-actions">
                        <span class="rest-timer">⏱️ Descanso sugerido: ${item.descanso || 90} seg</span>
                    </div>
                </div>
            </div>
            `;
        }).join("");
    }

    // Scroll suave a la cabecera
    window.scrollTo({ top: 0, behavior: "smooth" });
}

export function salirSesionActiva() {
    const sesionPanel = document.getElementById("panel-sesion-activa");
    if (sesionPanel) sesionPanel.style.display = "none";
    cambiarTab(state.tabActual || "estandar");
}

export function toggleCollapse(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.toggle("collapsed");
}

export function toggleSetComplete(rowId, checkbox) {
    const row = document.getElementById(rowId);
    if (!row) return;

    if (checkbox.checked) {
        row.classList.add("set-completed");
        if (navigator.vibrate) navigator.vibrate(25);
    } else {
        row.classList.remove("set-completed");
    }
}

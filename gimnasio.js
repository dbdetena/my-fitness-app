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
import { guardarEntradaBitacora, formatearFechaTimestamp } from "./diario.js";

// Estado interno del módulo de Rutinas
const state = {
    tabActual: "ejercicios", // 'ejercicios' | 'estandar' | 'personalizadas'
    filtroTipo: "todos",
    filtroEquipo: "todos",
    filtroTexto: "",
    filtroCreadorPersonalizada: "todos",
    ejercicioModalActual: null,
    fasePosturaActual: 1,
    rutinaEnSesion: null,
    cronometro: {
        intervalId: null,
        segundos: 0,
        pausado: false,
        tiempoInicio: null
    },
    metricasSesion: {
        calentamientoInicio: null,
        calentamientoFin: null,
        calentamientoSegundos: null,
        checksCalentamiento: {},
        seriesTotales: 0,
        seriesCompletadas: 0,
        splits: [],
        rpe: 8,
        porVoz: false
    },
    grabandoVozSesion: false,
    reconocimientoVozSesion: null
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
        toggleSetComplete,
        togglePausarCronometro,
        toggleCheckCalentamiento,
        alternarVozSesionDirecta,
        seleccionarRpe,
        guardarSesionCompletaYSalir
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
// MESA DE ENTRENAMIENTO EN VIVO (SESIÓN ACTIVA ULTRA-VISUAL)
// ==========================================
export function iniciarEntrenamientoRutina(arg1, arg2) {
    let tipo = "estandar";
    let rutinaId = null;

    if (arg1 === "estandar" || arg1 === "personalizada") {
        tipo = arg1;
        rutinaId = arg2;
    } else {
        rutinaId = arg1;
        tipo = arg2 || "estandar";
    }

    let rutina = null;
    if (tipo === "estandar") {
        rutina = RUTINAS_ESTANDAR.find(r => r.id === rutinaId);
    } else {
        rutina = obtenerRutinasPersonalizadas().find(r => r.id === rutinaId);
    }

    if (!rutina) return;
    state.rutinaEnSesion = rutina;

    // Reset de métricas y cronómetro
    detenerCronometroSesion();
    state.cronometro = {
        intervalId: null,
        segundos: 0,
        pausado: false,
        tiempoInicio: new Date()
    };

    let seriesTotales = 0;
    (rutina.ejercicios || []).forEach(e => {
        seriesTotales += (e.series || 3);
    });

    state.metricasSesion = {
        calentamientoInicio: new Date(),
        calentamientoFin: null,
        calentamientoSegundos: null,
        checksCalentamiento: {},
        seriesTotales,
        seriesCompletadas: 0,
        splits: [],
        rpe: 8,
        porVoz: false
    };

    // Actualizar badges
    const badgeEl = document.getElementById("session-routine-badge");
    if (badgeEl) badgeEl.textContent = `SESIÓN ACTIVA: ${rutina.nombre.toUpperCase()}`;

    const setsProgEl = document.getElementById("metric-sets-progress");
    if (setsProgEl) setsProgEl.textContent = `0 / ${seriesTotales} (0%)`;

    const warmStatusEl = document.getElementById("metric-warmup-status");
    if (warmStatusEl) {
        warmStatusEl.textContent = "Pendiente";
        warmStatusEl.className = "text-amber";
    }

    const paceEl = document.getElementById("metric-session-pace");
    if (paceEl) {
        paceEl.textContent = "Activo";
        paceEl.className = "text-cyan";
    }

    const pauseBtnIcon = document.getElementById("btn-timer-icon");
    const pauseBtnText = document.getElementById("btn-timer-text");
    const pauseBtn = document.getElementById("btn-timer-toggle-pause");
    if (pauseBtnIcon) pauseBtnIcon.textContent = "⏸️";
    if (pauseBtnText) pauseBtnText.textContent = "PAUSAR ENTRENAMIENTO";
    if (pauseBtn) {
        pauseBtn.className = "btn-timer-huge btn-neon-pause";
    }

    // Iniciar cronómetro visual grande
    iniciarCronometroSesion();

    // Inyectar Ejercicios: 1º Calentamiento con checks + Sucesivos
    const contenedor = document.getElementById("contenedor-ejercicios-sesion");
    if (contenedor) {
        const calentamientoHtml = generarCardCalentamiento(rutina);

        const ejerciciosHtml = (rutina.ejercicios || []).map((item, idx) => {
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
                        <input type="number" step="0.5" class="input-set-data input-kg" placeholder="kg">
                    </td>
                    <td class="col-input">
                        <input type="number" step="1" class="input-set-data input-reps" placeholder="reps">
                    </td>
                    <td class="col-check">
                        <div class="check-with-split">
                            <label class="custom-neon-check touch-large">
                                <input type="checkbox" onchange="window.gimnasio?.toggleSetComplete('${rowId}', this, '${nombre.replace(/'/g, "\\'")}', ${s})">
                                <span class="checkmark"></span>
                            </label>
                            <span id="split-${rowId}" class="set-split-tag"></span>
                        </div>
                    </td>
                </tr>
                `;
            }

            return `
            <div class="exercise-card card-carbon session-exercise-card" id="session-card-${idx}">
                <div class="exercise-header" onclick="window.gimnasio?.toggleCollapse('session-card-${idx}')">
                    <div class="exercise-main-info">
                        <span class="exercise-icon">${icono}</span>
                        <div>
                            <div class="exercise-title-wrap">
                                <h3>${idx + 2}. ${nombre}</h3>
                                <button class="btn-info-neon" title="Guía técnica 3D" onclick="event.stopPropagation(); window.gimnasio?.abrirModalDetalle('${item.ejercicioId}')">
                                    ℹ️ Ficha 3D
                                </button>
                            </div>
                            <p class="exercise-meta">${numSeries} series • Descanso: ${item.descanso || 90}s</p>
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
                                    <th class="col-set">SERIE</th>
                                    <th class="col-target">OBJETIVO</th>
                                    <th class="col-input">PESO (kg)</th>
                                    <th class="col-input">REPS</th>
                                    <th class="col-check">CHECK & TIEMPO</th>
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

        contenedor.innerHTML = calentamientoHtml + ejerciciosHtml;
    }

    // Resetear área de transcripción de voz al final
    const voiceArea = document.getElementById("session-voice-textarea");
    if (voiceArea) voiceArea.value = "";
    seleccionarRpe(8);

    // Ocultar bibliotecas y mostrar pantalla de sesión
    document.querySelectorAll(".rutinas-tab-panel").forEach(p => {
        p.classList.remove("active");
        p.style.display = "none";
    });

    const sesionPanel = document.getElementById("panel-sesion-activa");
    if (sesionPanel) {
        sesionPanel.style.display = "block";
        sesionPanel.classList.add("active");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
}

/**
 * Genera el primer ejercicio: Calentamiento Preventivo Ultra-Visual con Checks táctiles
 */
function generarCardCalentamiento(rutina) {
    if (!rutina || !rutina.ejercicios) return "";

    const tipos = new Set();
    rutina.ejercicios.forEach(it => {
        const ej = BASE_EJERCICIOS.find(e => e.id === it.ejercicioId);
        if (ej && ej.tipo) tipos.add(ej.tipo);
    });

    let cardioSummary = "Salto de comba o skipping en el sitio (2 a 3 min)";
    let movilidadSummary = "Círculos de brazos, rotaciones torácicas y de cadera";
    let aproximacionSummary = "1-2 series livianas con barra vacía o 40% de carga";

    if (tipos.has("empuje") && tipos.has("pull")) {
        movilidadSummary = "Rotaciones manguito rotador, dislocaciones con banda y dead hang";
        cardioSummary = "Comba rítmica o sombra de boxeo (2.5 min • 115-125 ppm)";
    } else if (tipos.has("empuje")) {
        movilidadSummary = "Rotaciones de hombro a 90°, flexiones escapulares y estiramiento pectoral";
        cardioSummary = "Sombra de boxeo suave o comba ligera (2 min • 120 ppm)";
    } else if (tipos.has("pull")) {
        movilidadSummary = "Dead hang activo (3x15s con retracción escapular) y gato-camello espinal";
        cardioSummary = "Salto de comba constante coordinando respiración (2.5 min)";
    } else if (tipos.has("piernas")) {
        movilidadSummary = "Dorsiflexión de tobillo, movilidad de cadera 90/90 y cossack squats";
        cardioSummary = "Skipping suave o jumping jacks (3 min • 120-130 ppm)";
        aproximacionSummary = "10 sentadillas libres + 1 serie con barra vacía lenta (3s bajada)";
    } else if (tipos.has("combate")) {
        movilidadSummary = "Rotaciones dinámicas de tronco, flexión/extensión de muñecas y tobillos";
        cardioSummary = "Salto de comba coordinado con juego de pies (3 min • ritmo activo)";
    }

    return `
    <div class="exercise-card card-carbon warmup-visual-card animate-fade-in" id="session-card-warmup">
        <div class="warmup-visual-header">
            <div class="warmup-tag-row">
                <span class="badge-warmup-pill">🔥 1. CALENTAMIENTO PREVENTIVO</span>
                <span class="badge-target-hr">🎯 Objetivo cardíaco: 110 - 130 ppm</span>
            </div>
            <h3>Preparación Cardiovascular, Articular & SNC</h3>
            <p class="warmup-visual-desc">Marca cada bloque conforme lo ejecutes para registrar las marcas de tiempo y proteger tus articulaciones:</p>
        </div>

        <div class="warmup-checks-list">
            <!-- Check 1: Cardiovascular -->
            <label class="warmup-check-item" id="warmup-item-1">
                <div class="warmup-check-left">
                    <input type="checkbox" class="warmup-large-checkbox" onchange="window.gimnasio?.toggleCheckCalentamiento(1, this)">
                    <div class="warmup-check-text">
                        <strong class="check-title">🏃 1. Rampa Térmica Cardiovascular (2-3 min)</strong>
                        <span class="check-detail">${cardioSummary}</span>
                    </div>
                </div>
                <div class="warmup-split-tag" id="warmup-tag-1">--:--</div>
            </label>

            <!-- Check 2: Movilidad Articular -->
            <label class="warmup-check-item" id="warmup-item-2">
                <div class="warmup-check-left">
                    <input type="checkbox" class="warmup-large-checkbox" onchange="window.gimnasio?.toggleCheckCalentamiento(2, this)">
                    <div class="warmup-check-text">
                        <strong class="check-title">🔄 2. Movilidad Articular Dinámica</strong>
                        <span class="check-detail">${movilidadSummary}</span>
                    </div>
                </div>
                <div class="warmup-split-tag" id="warmup-tag-2">--:--</div>
            </label>

            <!-- Check 3: Activación SNC -->
            <label class="warmup-check-item" id="warmup-item-3">
                <div class="warmup-check-left">
                    <input type="checkbox" class="warmup-large-checkbox" onchange="window.gimnasio?.toggleCheckCalentamiento(3, this)">
                    <div class="warmup-check-text">
                        <strong class="check-title">⚡ 3. Activación Neuromuscular & Series Ligeras</strong>
                        <span class="check-detail">${aproximacionSummary}</span>
                    </div>
                </div>
                <div class="warmup-split-tag" id="warmup-tag-3">--:--</div>
            </label>
        </div>

        <div id="warmup-completion-notice" class="warmup-completion-badge" style="display: none;">
            <span>✨ ¡Calentamiento Completado! Músculos preparados, líquido sinovial activo y articulaciones protegidas.</span>
        </div>
    </div>
    `;
}

/**
 * Manejador de checks del Calentamiento
 */
export function toggleCheckCalentamiento(paso, checkbox) {
    const item = document.getElementById(`warmup-item-${paso}`);
    const tag = document.getElementById(`warmup-tag-${paso}`);
    const tiempoActual = obtenerTiempoActualStr();

    if (checkbox.checked) {
        if (item) item.classList.add("checked");
        if (tag) {
            tag.textContent = `✓ ${tiempoActual}`;
            tag.classList.add("recorded");
        }
        state.metricasSesion.checksCalentamiento[paso] = tiempoActual;
        state.metricasSesion.splits.push({
            tipo: "calentamiento_paso",
            paso,
            tiempo: tiempoActual,
            segundos: state.cronometro.segundos
        });
        if (navigator.vibrate) navigator.vibrate(25);
    } else {
        if (item) item.classList.remove("checked");
        if (tag) {
            tag.textContent = "--:--";
            tag.classList.remove("recorded");
        }
        delete state.metricasSesion.checksCalentamiento[paso];
    }

    const checks = state.metricasSesion.checksCalentamiento;
    const card = document.getElementById("session-card-warmup");
    const notice = document.getElementById("warmup-completion-notice");
    const statusPill = document.getElementById("metric-warmup-status");

    if (checks[1] && checks[2] && checks[3]) {
        state.metricasSesion.calentamientoFin = tiempoActual;
        state.metricasSesion.calentamientoSegundos = state.cronometro.segundos;
        if (card) card.classList.add("warmup-all-ready");
        if (notice) notice.style.display = "flex";
        if (statusPill) {
            statusPill.textContent = `Listo (${tiempoActual})`;
            statusPill.className = "text-green";
        }
        state.metricasSesion.splits.push({
            tipo: "calentamiento_completo",
            tiempo: tiempoActual,
            segundos: state.cronometro.segundos
        });
        mostrarToastLocal(`🔥 Calentamiento completado a los ${tiempoActual}. ¡A por las series efectivas!`);
        if (navigator.vibrate) navigator.vibrate([40, 60, 40]);
    } else {
        if (card) card.classList.remove("warmup-all-ready");
        if (notice) notice.style.display = "none";
        if (statusPill) {
            statusPill.textContent = "En curso...";
            statusPill.className = "text-amber";
        }
    }
}

/**
 * Control del cronómetro de la sesión
 */
export function togglePausarCronometro() {
    const btnIcon = document.getElementById("btn-timer-icon");
    const btnText = document.getElementById("btn-timer-text");
    const btn = document.getElementById("btn-timer-toggle-pause");
    const paceStatus = document.getElementById("metric-session-pace");
    const display = document.getElementById("session-cronometro-display");

    if (state.cronometro.pausado) {
        state.cronometro.pausado = false;
        if (btnIcon) btnIcon.textContent = "⏸️";
        if (btnText) btnText.textContent = "PAUSAR ENTRENAMIENTO";
        if (btn) {
            btn.classList.remove("btn-neon-resume");
            btn.classList.add("btn-neon-pause");
        }
        if (paceStatus) {
            paceStatus.textContent = "Activo";
            paceStatus.className = "text-cyan";
        }
        if (display) display.classList.remove("timer-paused");
        mostrarToastLocal("▶️ Cronómetro reanudado");
    } else {
        state.cronometro.pausado = true;
        if (btnIcon) btnIcon.textContent = "▶️";
        if (btnText) btnText.textContent = "REANUDAR ENTRENAMIENTO";
        if (btn) {
            btn.classList.remove("btn-neon-pause");
            btn.classList.add("btn-neon-resume");
        }
        if (paceStatus) {
            paceStatus.textContent = "Pausado ⏸️";
            paceStatus.className = "text-amber";
        }
        if (display) display.classList.add("timer-paused");
        mostrarToastLocal("⏸️ Entrenamiento en pausa");
    }
}

function iniciarCronometroSesion() {
    if (state.cronometro.intervalId) clearInterval(state.cronometro.intervalId);
    state.cronometro.segundos = 0;
    state.cronometro.pausado = false;

    actualizarDisplayCronometro();

    state.cronometro.intervalId = setInterval(() => {
        if (!state.cronometro.pausado) {
            state.cronometro.segundos++;
            actualizarDisplayCronometro();
        }
    }, 1000);
}

function detenerCronometroSesion() {
    if (state.cronometro.intervalId) {
        clearInterval(state.cronometro.intervalId);
        state.cronometro.intervalId = null;
    }
}

function actualizarDisplayCronometro() {
    const display = document.getElementById("session-cronometro-display");
    if (!display) return;
    display.textContent = formatearSegundos(state.cronometro.segundos);
}

function formatearSegundos(totalSegundos) {
    const h = Math.floor(totalSegundos / 3600);
    const m = Math.floor((totalSegundos % 3600) / 60);
    const s = totalSegundos % 60;

    const ss = String(s).padStart(2, "0");
    const mm = String(m).padStart(2, "0");

    if (h > 0) {
        return `${h}:${mm}:${ss}`;
    }
    return `${mm}:${ss}`;
}

function obtenerTiempoActualStr() {
    return formatearSegundos(state.cronometro.segundos);
}

/**
 * Marca o desmarca una serie de ejercicio registrando el split de tiempo
 */
export function toggleSetComplete(rowId, checkbox, ejNombre, setNum) {
    const row = document.getElementById(rowId);
    if (!row) return;

    const splitTag = document.getElementById(`split-${rowId}`);
    const tiempoActual = obtenerTiempoActualStr();

    if (checkbox.checked) {
        row.classList.add("set-completed");
        const pesoInput = row.querySelector(".input-kg");
        const repsInput = row.querySelector(".input-reps");
        const peso = pesoInput && pesoInput.value ? parseFloat(pesoInput.value) : null;
        const reps = repsInput && repsInput.value ? parseInt(repsInput.value, 10) : null;

        if (splitTag) {
            splitTag.textContent = `⏱️ ${tiempoActual}`;
            splitTag.classList.add("visible");
        }

        state.metricasSesion.seriesCompletadas++;
        state.metricasSesion.splits.push({
            tipo: "serie",
            ejercicio: ejNombre,
            set: setNum,
            peso,
            reps,
            tiempo: tiempoActual,
            segundos: state.cronometro.segundos
        });

        if (navigator.vibrate) navigator.vibrate(25);
    } else {
        row.classList.remove("set-completed");
        if (splitTag) {
            splitTag.textContent = "";
            splitTag.classList.remove("visible");
        }
        state.metricasSesion.seriesCompletadas = Math.max(0, state.metricasSesion.seriesCompletadas - 1);
    }

    // Actualizar barra de progreso de series
    const setsProgEl = document.getElementById("metric-sets-progress");
    if (setsProgEl) {
        const pct = Math.round((state.metricasSesion.seriesCompletadas / (state.metricasSesion.seriesTotales || 1)) * 100);
        setsProgEl.textContent = `${state.metricasSesion.seriesCompletadas} / ${state.metricasSesion.seriesTotales} (${pct}%)`;
    }
}

/**
 * Dictado por voz directo con el botón gigante de la sesión
 */
export function alternarVozSesionDirecta() {
    const btn = document.getElementById("btn-session-huge-mic");
    const titleEl = document.getElementById("huge-mic-title");
    const subtitleEl = document.getElementById("huge-mic-subtitle");
    const textarea = document.getElementById("session-voice-textarea");

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tu navegador no soporta Web Speech API para transcripción por voz. Puedes escribir tus comentarios en el campo de texto.");
        return;
    }

    if (state.grabandoVozSesion) {
        if (state.reconocimientoVozSesion) {
            try { state.reconocimientoVozSesion.stop(); } catch(e) {}
        }
        state.grabandoVozSesion = false;
        state.reconocimientoVozSesion = null;
        if (btn) btn.classList.remove("recording");
        if (titleEl) titleEl.textContent = "DICTAR COMENTARIOS POR VOZ";
        if (subtitleEl) subtitleEl.textContent = "Pulsa para hablar sin tocar el teclado";
        mostrarToastLocal("🛑 Grabación de voz finalizada");
        return;
    }

    try {
        const recognition = new SpeechRecognition();
        recognition.lang = "es-ES";
        recognition.interimResults = true;
        recognition.continuous = true;

        state.grabandoVozSesion = true;
        state.reconocimientoVozSesion = recognition;
        state.metricasSesion.porVoz = true;

        if (btn) btn.classList.add("recording");
        if (titleEl) titleEl.textContent = "🔴 GRABANDO... DICTA TUS SENSACIONES";
        if (subtitleEl) subtitleEl.textContent = "Habla con naturalidad • Pulsa para detener";
        mostrarToastLocal("🎙️ Escuchando... habla sobre tus sensaciones, molestias o marcas.");

        let textoBase = textarea ? textarea.value : "";

        recognition.onresult = (event) => {
            let finalStr = "";
            let interimStr = "";

            for (let i = 0; i < event.results.length; i++) {
                const res = event.results[i];
                if (res.isFinal) {
                    finalStr += res[0].transcript + " ";
                } else {
                    interimStr += res[0].transcript;
                }
            }

            if (textarea) {
                const sep = textoBase && !textoBase.endsWith(" ") ? " " : "";
                textarea.value = (textoBase + sep + finalStr + interimStr).trimStart();
            }
        };

        recognition.onerror = (e) => {
            console.warn("Speech error:", e.error);
            if (btn) btn.classList.remove("recording");
            if (titleEl) titleEl.textContent = "DICTAR COMENTARIOS POR VOZ";
            if (subtitleEl) subtitleEl.textContent = "Pulsa para hablar sin tocar el teclado";
            state.grabandoVozSesion = false;
        };

        recognition.onend = () => {
            if (state.grabandoVozSesion) {
                if (btn) btn.classList.remove("recording");
                if (titleEl) titleEl.textContent = "DICTAR COMENTARIOS POR VOZ";
                if (subtitleEl) subtitleEl.textContent = "Pulsa para hablar sin tocar el teclado";
                state.grabandoVozSesion = false;
            }
        };

        recognition.start();

    } catch (e) {
        console.error("Error al iniciar dictado por voz:", e);
    }
}

/**
 * Selector rápido táctil de RPE
 */
export function seleccionarRpe(val) {
    state.metricasSesion.rpe = val;
    document.querySelectorAll("#session-rpe-chips .rpe-btn-chip").forEach(b => {
        const rpeAttr = parseInt(b.getAttribute("data-rpe"), 10);
        b.classList.toggle("active", rpeAttr === val);
    });
}

/**
 * Guarda la sesión completa con todas sus métricas y la registra en la Bitácora
 */
export function guardarSesionCompletaYSalir() {
    if (state.grabandoVozSesion && state.reconocimientoVozSesion) {
        try { state.reconocimientoVozSesion.stop(); } catch(e) {}
        state.grabandoVozSesion = false;
    }

    const textarea = document.getElementById("session-voice-textarea");
    const textoUsuario = textarea && textarea.value.trim() 
        ? textarea.value.trim() 
        : `Sesión completada (${state.rutinaEnSesion?.nombre || 'Entrenamiento'}). Buen trabajo y calentamiento registrado.`;

    const duracionSegundos = state.cronometro.segundos;
    const duracionFormato = formatearSegundos(duracionSegundos);

    const metricas = {
        duracionSegundos,
        duracionFormato,
        calentamientoFormato: state.metricasSesion.calentamientoFin || null,
        calentamientoSegundos: state.metricasSesion.calentamientoSegundos || null,
        seriesTotales: state.metricasSesion.seriesTotales,
        seriesCompletadas: state.metricasSesion.seriesCompletadas,
        splits: state.metricasSesion.splits,
        splitsCount: state.metricasSesion.splits.length,
        rutinaId: state.rutinaEnSesion?.id || "sesion-libre"
    };

    guardarEntradaBitacora({
        texto: textoUsuario,
        categoria: "post-entreno",
        rutinaRelacionada: state.rutinaEnSesion?.nombre || "Entrenamiento",
        rpe: state.metricasSesion.rpe || 8,
        porVoz: state.metricasSesion.porVoz,
        metricas
    });

    detenerCronometroSesion();

    const sesionPanel = document.getElementById("panel-sesion-activa");
    if (sesionPanel) sesionPanel.style.display = "none";
    cambiarTab(state.tabActual || "estandar");

    mostrarToastLocal(`🎉 ¡Entrenamiento registrado en Bitácora! Tiempo: ${duracionFormato} • ${metricas.seriesCompletadas} series.`);
}

export function salirSesionActiva() {
    if (confirm("¿Deseas salir del entrenamiento? El cronómetro se detendrá.")) {
        detenerCronometroSesion();
        if (state.grabandoVozSesion && state.reconocimientoVozSesion) {
            try { state.reconocimientoVozSesion.stop(); } catch(e) {}
            state.grabandoVozSesion = false;
        }
        const sesionPanel = document.getElementById("panel-sesion-activa");
        if (sesionPanel) sesionPanel.style.display = "none";
        cambiarTab(state.tabActual || "estandar");
    }
}

export function toggleCollapse(cardId) {
    const card = document.getElementById(cardId);
    if (!card) return;
    card.classList.toggle("collapsed");
}

function mostrarToastLocal(mensaje) {
    const toast = document.createElement("div");
    toast.className = "toast-notification toast-success";
    toast.textContent = mensaje;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

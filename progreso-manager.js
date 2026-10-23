// ========================================================
// MÓDULO: GESTOR DE PROGRESIÓN Y DESGLOSE DE TIEMPOS
// Calcula el tiempo invertido en cada actividad (calentamiento,
// ejercicios, series e intervalos) y genera comparativas de sobrecarga
// progresiva y densidad temporal entre sesiones.
// ========================================================
import { obtenerEntradasBitacora } from "./diario.js";
import { formatearSegundos } from "./session-manager.js";

/**
 * Analiza una sesión y desglosa el tiempo que se ha tardado en cada actividad:
 * - Calentamiento (paso a paso y total)
 * - Cada ejercicio (tiempo total dedicado, ritmo medio por serie e intervalos)
 */
export function analizarTiemposActividades(metricas) {
    if (!metricas) return null;

    const splits = [...(metricas.splits || [])].sort((a, b) => (a.segundos || 0) - (b.segundos || 0));
    const duracionTotalSegundos = metricas.duracionSegundos || (splits.length ? splits[splits.length - 1].segundos : 0);
    const calentamientoSegundos = metricas.calentamientoSegundos || (splits.find(s => s.tipo === "calentamiento_completo")?.segundos) || 0;

    // 1. Desglose del calentamiento
    const pasosCalentamiento = [];
    const warmupSplits = splits.filter(s => s.tipo === "calentamiento_paso");
    let ultimoWarmupSeg = 0;

    warmupSplits.forEach(ws => {
        const segPaso = Math.max(0, (ws.segundos || 0) - ultimoWarmupSeg);
        const titulos = {
            1: "Rampa Térmica Cardiovascular",
            2: "Movilidad Articular Dinámica",
            3: "Activación SNC & Series Ligeras"
        };
        pasosCalentamiento.push({
            paso: ws.paso,
            titulo: titulos[ws.paso] || `Paso ${ws.paso}`,
            tiempoMarca: ws.tiempo || formatearSegundos(ws.segundos),
            duracionSegundos: segPaso,
            duracionFormato: formatearSegundos(segPaso)
        });
        ultimoWarmupSeg = ws.segundos || 0;
    });

    const tiempoTotalWarmup = calentamientoSegundos || ultimoWarmupSeg;
    const calentamientoData = {
        tiempoTotalSegundos: tiempoTotalWarmup,
        tiempoTotalFormato: formatearSegundos(tiempoTotalWarmup),
        pasos: pasosCalentamiento
    };

    // 2. Desglose de ejercicios
    const seriesSplits = splits.filter(s => s.tipo === "serie");
    const ejerciciosMap = new Map();

    let tiempoAnteriorSerieSeg = tiempoTotalWarmup;

    seriesSplits.forEach(ss => {
        const ejNombre = ss.ejercicio || "Ejercicio";
        if (!ejerciciosMap.has(ejNombre)) {
            ejerciciosMap.set(ejNombre, {
                nombre: ejNombre,
                primerSetSegundos: ss.segundos || 0,
                ultimoSetSegundos: ss.segundos || 0,
                series: []
            });
        }

        const ejObj = ejerciciosMap.get(ejNombre);
        ejObj.ultimoSetSegundos = ss.segundos || 0;

        const intervaloSeg = Math.max(0, (ss.segundos || 0) - tiempoAnteriorSerieSeg);
        ejObj.series.push({
            set: ss.set || ejObj.series.length + 1,
            peso: ss.peso !== null && ss.peso !== undefined && ss.peso !== "" ? parseFloat(ss.peso) : null,
            reps: ss.reps !== null && ss.reps !== undefined && ss.reps !== "" ? parseInt(ss.reps, 10) : null,
            tiempoMarca: ss.tiempo || formatearSegundos(ss.segundos),
            duracionIntervaloSegundos: intervaloSeg,
            duracionIntervaloFormato: formatearSegundos(intervaloSeg)
        });

        tiempoAnteriorSerieSeg = ss.segundos || 0;
    });

    const ejercicios = [];
    let finEjercicioPrevioSeg = tiempoTotalWarmup;

    ejerciciosMap.forEach(ej => {
        const tiempoTotalEjSeg = Math.max(0, ej.ultimoSetSegundos - finEjercicioPrevioSeg);
        finEjercicioPrevioSeg = ej.ultimoSetSegundos;

        const pesosValidos = ej.series.filter(s => s.peso !== null).map(s => s.peso);
        const pesoMaximo = pesosValidos.length ? Math.max(...pesosValidos) : null;
        const repsTotales = ej.series.reduce((acc, s) => acc + (s.reps || 0), 0);
        const volumenKg = ej.series.reduce((acc, s) => acc + ((s.peso || 0) * (s.reps || 0)), 0);
        const ritmoMedioSeg = ej.series.length ? Math.round(tiempoTotalEjSeg / ej.series.length) : 0;

        ejercicios.push({
            nombre: ej.nombre,
            tiempoTotalSegundos: tiempoTotalEjSeg,
            tiempoTotalFormato: formatearSegundos(tiempoTotalEjSeg),
            ritmoMedioSeg,
            ritmoMedioFormato: formatearSegundos(ritmoMedioSeg),
            pesoMaximo,
            repsTotales,
            volumenKg,
            series: ej.series
        });
    });

    return {
        duracionTotalSegundos,
        duracionTotalFormato: formatearSegundos(duracionTotalSegundos),
        calentamiento: calentamientoData,
        ejercicios
    };
}

/**
 * Compara dos análisis de sesión para detectar progresión en cargas, reps y tiempos
 */
export function compararProgreso(analisisActual, analisisPrevio) {
    if (!analisisActual || !analisisPrevio) {
        return { esPrimeraSesion: true };
    }

    const difDuracionSeg = (analisisActual.duracionTotalSegundos || 0) - (analisisPrevio.duracionTotalSegundos || 0);
    const difCalentamientoSeg = (analisisActual.calentamiento?.tiempoTotalSegundos || 0) - (analisisPrevio.calentamiento?.tiempoTotalSegundos || 0);

    const ejerciciosComparados = (analisisActual.ejercicios || []).map(actEj => {
        const prevEj = (analisisPrevio.ejercicios || []).find(pe => pe.nombre.toLowerCase().trim() === actEj.nombre.toLowerCase().trim());
        if (!prevEj) {
            return {
                ...actEj,
                esNuevo: true
            };
        }

        const difPeso = actEj.pesoMaximo !== null && prevEj.pesoMaximo !== null 
            ? +(actEj.pesoMaximo - prevEj.pesoMaximo).toFixed(1) 
            : null;
        const difReps = (actEj.repsTotales || 0) - (prevEj.repsTotales || 0);
        const difTiempoSeg = (actEj.tiempoTotalSegundos || 0) - (prevEj.tiempoTotalSegundos || 0);
        const difVolumen = (actEj.volumenKg || 0) - (prevEj.volumenKg || 0);

        return {
            ...actEj,
            prev: prevEj,
            difPeso,
            difReps,
            difTiempoSeg,
            difVolumen,
            mejoraSobrecarga: (difPeso && difPeso > 0) || difReps > 0,
            mejoraRitmo: difTiempoSeg < 0
        };
    });

    return {
        esPrimeraSesion: false,
        difDuracionSeg,
        difDuracionFormato: formatearDiferenciaTiempo(difDuracionSeg),
        difCalentamientoSeg,
        difCalentamientoFormato: formatearDiferenciaTiempo(difCalentamientoSeg),
        ejercicios: ejerciciosComparados
    };
}

function formatearDiferenciaTiempo(difSegundos) {
    const signo = difSegundos > 0 ? "+" : "-";
    const abs = Math.abs(difSegundos);
    return `${signo}${formatearSegundos(abs)}`;
}

/**
 * Obtiene todas las sesiones completadas de una rutina ordenadas de más reciente a más antigua
 */
export function obtenerSesionesDeRutina(rutinaIdONombre) {
    const entradas = obtenerEntradasBitacora();
    const query = (rutinaIdONombre || "").toLowerCase().trim();

    return entradas.filter(e => {
        if (e.categoria !== "post-entreno") return false;
        const nombreRut = (e.rutinaRelacionada || "").toLowerCase().trim();
        const idRut = (e.metricas?.rutinaId || "").toLowerCase().trim();
        return nombreRut === query || idRut === query || nombreRut.includes(query) || query.includes(nombreRut);
    }).sort((a, b) => new Date(b.fechaIso).getTime() - new Date(a.fechaIso).getTime());
}

/**
 * Genera el HTML enriquecido para el desglose de actividades y comparativa en el Diario de Notas
 */
export function generarHtmlDesgloseEntrada(entradaId) {
    const entradas = obtenerEntradasBitacora();
    const entradaIndex = entradas.findIndex(e => e.id === entradaId);
    if (entradaIndex === -1) return "<p class='text-muted'>Sesión no encontrada.</p>";

    const entrada = entradas[entradaIndex];
    if (!entrada.metricas) {
        return `<div class="empty-splits-card"><p>Esta sesión no incluye marcas de tiempo detalladas.</p></div>`;
    }

    const analisisActual = analizarTiemposActividades(entrada.metricas);
    if (!analisisActual) {
        return `<div class="empty-splits-card"><p>No hay marcas de actividades registradas para esta sesión.</p></div>`;
    }

    // Buscar sesión previa de la misma rutina (ocurrida antes en el tiempo)
    const rutinaQuery = (entrada.rutinaRelacionada || "").toLowerCase().trim();
    const entradaPrevia = entradas.slice(entradaIndex + 1).find(e => {
        if (e.categoria !== "post-entreno") return false;
        const nom = (e.rutinaRelacionada || "").toLowerCase().trim();
        return nom === rutinaQuery || nom.includes(rutinaQuery) || rutinaQuery.includes(nom);
    });

    const analisisPrevio = entradaPrevia && entradaPrevia.metricas ? analizarTiemposActividades(entradaPrevia.metricas) : null;
    const comparacion = compararProgreso(analisisActual, analisisPrevio);

    // Renderizar resumen comparativo
    let comparativaHeaderHtml = "";
    if (comparacion.esPrimeraSesion) {
        comparativaHeaderHtml = `
        <div class="progress-summary-card card-carbon-subtle">
            <span class="prog-badge prog-badge-gold">✨ Sesión Base / Referencia</span>
            <p class="prog-summary-text">Esta es la primera sesión registrada para esta rutina. Los tiempos y marcas servirán de línea base para medir tu sobrecarga progresiva en las siguientes sesiones.</p>
        </div>
        `;
    } else {
        const badgeTiempo = comparacion.difDuracionSeg < 0
            ? `<span class="prog-pill pill-faster">🟢 ${comparacion.difDuracionFormato} más rápida (Mayor densidad)</span>`
            : `<span class="prog-pill pill-slower">⏳ ${comparacion.difDuracionFormato} más de tiempo total</span>`;

        const badgeWarmup = comparacion.difCalentamientoSeg < 0
            ? `<span class="prog-pill pill-warmup-faster">🔥 Calentamiento: ${comparacion.difCalentamientoFormato} más ágil</span>`
            : `<span class="prog-pill pill-warmup-slower">🔥 Calentamiento: ${comparacion.difCalentamientoFormato}</span>`;

        comparativaHeaderHtml = `
        <div class="progress-summary-card card-carbon-subtle">
            <div class="prog-header-title">
                <span class="prog-icon">📈</span>
                <div>
                    <strong>Progreso vs Sesión Anterior (${entradaPrevia.fechaFormato || 'Previa'})</strong>
                    <div class="prog-pills-row">
                        ${badgeTiempo}
                        ${badgeWarmup}
                    </div>
                </div>
            </div>
        </div>
        `;
    }

    // Renderizar bloque de Calentamiento con estructura de tabla idéntica a los ejercicios
    const cal = analisisActual.calentamiento;
    const pasosLista = (cal.pasos && cal.pasos.length > 0)
        ? cal.pasos
        : [
            {
                paso: 1,
                titulo: "Calentamiento Preventivo General",
                duracionFormato: cal.tiempoTotalFormato || "00:00",
                tiempoMarca: cal.tiempoTotalFormato || "00:00"
            }
        ];

    const warmupRowsHtml = pasosLista.map(p => `
        <tr>
            <td class="col-fase">
                <span class="set-badge-mini badge-warmup-fase">F${p.paso}</span>
                <strong class="fase-title">${p.titulo}</strong>
            </td>
            <td class="col-interval"><span class="interval-pill">⏱️ ${p.duracionFormato}</span></td>
            <td class="col-split">${p.tiempoMarca}</td>
        </tr>
    `).join("");

    const calentamientoBloqueHtml = `
    <div class="activity-card-breakdown card-carbon">
        <div class="activity-card-header">
            <div class="act-title-col">
                <span class="act-badge-warmup">🔥 ACTIVIDAD 1: CALENTAMIENTO</span>
                <h4>Preparación Articular, Rampa & SNC</h4>
            </div>
            <div class="act-time-badge">
                <span class="time-caption">Tiempo tardado:</span>
                <strong class="time-value">${cal.tiempoTotalFormato}</strong>
            </div>
        </div>

        <div class="table-responsive">
            <table class="activity-sets-table warmup-sets-table">
                <thead>
                    <tr>
                        <th>FASE</th>
                        <th>TIEMPO TARDADO</th>
                        <th>TIEMPO ACUMULADO</th>
                    </tr>
                </thead>
                <tbody>
                    ${warmupRowsHtml}
                </tbody>
            </table>
        </div>
    </div>
    `;

    // Renderizar cada Ejercicio con sus series y comparativa
    const ejerciciosBloquesHtml = (analisisActual.ejercicios || []).map((ej, idx) => {
        // Buscar comparativa de este ejercicio
        const compEj = comparacion.ejercicios?.find(ce => ce.nombre.toLowerCase().trim() === ej.nombre.toLowerCase().trim());
        
        let badgesProgresoEj = "";
        if (compEj && !compEj.esNuevo) {
            if (compEj.difPeso !== null && compEj.difPeso > 0) {
                badgesProgresoEj += `<span class="prog-tag tag-weight-up">🔥 +${compEj.difPeso} kg de carga</span>`;
            } else if (compEj.difPeso !== null && compEj.difPeso < 0) {
                badgesProgresoEj += `<span class="prog-tag tag-weight-down">${compEj.difPeso} kg</span>`;
            }

            if (compEj.difReps > 0) {
                badgesProgresoEj += `<span class="prog-tag tag-reps-up">💪 +${compEj.difReps} reps totales</span>`;
            } else if (compEj.difReps < 0) {
                badgesProgresoEj += `<span class="prog-tag tag-reps-down">${compEj.difReps} reps</span>`;
            }

            if (compEj.difTiempoSeg < 0) {
                badgesProgresoEj += `<span class="prog-tag tag-time-faster">⚡ ${formatearDiferenciaTiempo(compEj.difTiempoSeg)}</span>`;
            }
        } else if (compEj?.esNuevo) {
            badgesProgresoEj = `<span class="prog-tag tag-new">Nuevo ejercicio</span>`;
        }

        const seriesRowsHtml = ej.series.map(s => `
            <tr>
                <td class="col-set"><span class="set-badge-mini">S${s.set}</span></td>
                <td class="col-load"><strong>${s.peso !== null ? `${s.peso} kg` : '-'}</strong></td>
                <td class="col-reps">${s.reps !== null ? `${s.reps} reps` : '-'}</td>
                <td class="col-split">${s.tiempoMarca}</td>
                <td class="col-interval"><span class="interval-pill">⏱️ ${s.duracionIntervaloFormato}</span></td>
            </tr>
        `).join("");

        return `
        <div class="activity-card-breakdown card-carbon">
            <div class="activity-card-header">
                <div class="act-title-col">
                    <span class="act-badge-exercise">🏋️ ACTIVIDAD ${idx + 2}: EJERCICIO</span>
                    <h4>${ej.nombre}</h4>
                    <div class="act-prog-tags-row">
                        ${badgesProgresoEj}
                    </div>
                </div>
                <div class="act-time-badge">
                    <span class="time-caption">Tiempo tardado:</span>
                    <strong class="time-value">${ej.tiempoTotalFormato}</strong>
                    <span class="time-pace">Ritmo: ~${ej.ritmoMedioFormato}/serie</span>
                </div>
            </div>

            <div class="table-responsive">
                <table class="activity-sets-table">
                    <thead>
                        <tr>
                            <th>SERIE</th>
                            <th>CARGA</th>
                            <th>REPS</th>
                            <th>MARCA RELOJ</th>
                            <th>TIEMPO TARDADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${seriesRowsHtml}
                    </tbody>
                </table>
            </div>
        </div>
        `;
    }).join("");

    return `
    <div class="desglose-inner-wrapper animate-fade-in">
        ${comparativaHeaderHtml}
        <div class="activities-timeline-stream">
            ${calentamientoBloqueHtml}
            ${ejerciciosBloquesHtml}
        </div>
    </div>
    `;
}

/**
 * Genera el HTML del modal de Historial y Comparativa de Progreso de una rutina
 */
export function generarHtmlModalHistorial(rutinaId, rutinaNombre) {
    const sesiones = obtenerSesionesDeRutina(rutinaId || rutinaNombre);

    if (!sesiones.length) {
        return `
        <div class="modal-empty-state card-carbon">
            <span class="empty-icon">📊</span>
            <h4>Sin sesiones registradas de esta rutina</h4>
            <p>Aún no has completado entrenamientos de <strong>"${rutinaNombre}"</strong>. Inicia tu primera sesión para comenzar a registrar tiempos de cada actividad y comparativas de progreso.</p>
            <button class="btn-primary btn-neon-cyan" style="margin-top: 14px;" onclick="window.gimnasio?.cerrarModalHistorialRutina(); window.gimnasio?.iniciarEntrenamientoRutina('${rutinaId}')">
                <span>🏋️‍♂️</span> Iniciar Primera Sesión
            </button>
        </div>
        `;
    }

    // Estadísticas agregadas de la rutina
    const totalSesiones = sesiones.length;
    const duraciones = sesiones.map(s => s.metricas?.duracionSegundos || 0).filter(d => d > 0);
    const duracionMediaSeg = duraciones.length ? Math.round(duraciones.reduce((a, b) => a + b, 0) / duraciones.length) : 0;
    const mejorTiempoSeg = duraciones.length ? Math.min(...duraciones) : 0;

    const statsHeaderHtml = `
    <div class="routine-history-stats-grid">
        <div class="stat-pill card-carbon">
            <span class="stat-num">${totalSesiones}</span>
            <span class="stat-desc">Sesiones Realizadas</span>
        </div>
        <div class="stat-pill card-carbon">
            <span class="stat-num stat-cyan">${formatearSegundos(duracionMediaSeg)}</span>
            <span class="stat-desc">Duración Media</span>
        </div>
        <div class="stat-pill card-carbon">
            <span class="stat-num stat-gold">${formatearSegundos(mejorTiempoSeg)}</span>
            <span class="stat-desc">Mejor Tiempo ⚡</span>
        </div>
    </div>
    `;

    // Lista de sesiones cronológicas con desglose
    const sesionesListHtml = sesiones.map((s, idx) => {
        const desgloseHtml = generarHtmlDesgloseEntrada(s.id);
        const esUltima = idx === 0;

        return `
        <div class="session-history-item card-carbon ${esUltima ? 'latest-session' : ''}">
            <div class="session-item-header" onclick="window.gimnasio?.toggleAccordionHistorial('historial-det-${s.id}')">
                <div class="session-header-left">
                    <span class="session-date-badge">📅 ${s.fechaFormato}</span>
                    ${esUltima ? '<span class="badge-tag badge-tag-newest">ÚLTIMA SESIÓN</span>' : ''}
                    <h4 class="session-item-title">${s.texto ? (s.texto.length > 70 ? s.texto.substring(0, 70) + '...' : s.texto) : 'Sesión completada'}</h4>
                </div>
                <div class="session-header-right">
                    <span class="metric-pill pill-duration">⏱️ ${s.metricas?.duracionFormato || '00:00'}</span>
                    <span class="accordion-arrow" id="arrow-historial-det-${s.id}">▼</span>
                </div>
            </div>
            <div class="session-item-body" id="historial-det-${s.id}" style="${esUltima ? 'display: block;' : 'display: none;'}">
                ${desgloseHtml}
            </div>
        </div>
        `;
    }).join("");

    return `
    <div class="routine-history-wrapper">
        ${statsHeaderHtml}
        <div class="routine-history-sessions-list">
            <h4 class="history-section-title">Evolución de Entrenamientos & Progresión</h4>
            ${sesionesListHtml}
        </div>
    </div>
    `;
}

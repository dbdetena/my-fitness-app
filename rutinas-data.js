// Base de datos de Rutinas Estándar y Gestor de Rutinas Personalizadas (Usuario & AI Coach)
import { BASE_EJERCICIOS } from "./ejercicios-data.js";

// ==========================================
// BIBLIOTECA 2: RUTINAS ESTÁNDAR PREDEFINIDAS
// ==========================================
export const RUTINAS_ESTANDAR = [
    {
        id: "estandar-push",
        nombre: "Empuje / Push (Pecho, Hombro y Tríceps)",
        categoria: "empuje",
        categoriaBadge: "Push / Empuje",
        icono: "🛡️",
        duracion: "55 min",
        nivel: "Intermedio",
        enfoque: "Hipertrofia & Fuerza Horizontal/Vertical",
        descripcion: "Secuencia completa de empuje priorizando tensión mecánica en pectoral medio/superior, deltoides anterior/lateral y cabeza lateral del tríceps.",
        ejercicios: [
            {
                ejercicioId: "press-banca",
                series: 4,
                reps: "6 - 8",
                descanso: 150, // segundos
                rir: "1 - 2",
                nota: "Serie 1 y 2 pesadas; series 3 y 4 al límite técnico."
            },
            {
                ejercicioId: "press-militar",
                series: 3,
                reps: "8 - 10",
                descanso: 120,
                rir: "1 - 2",
                nota: "Control excéntrico de 3 segundos en cada repetición."
            },
            {
                ejercicioId: "fondos-paralelas",
                series: 3,
                reps: "10 - 12",
                descanso: 90,
                rir: "0 - 1",
                nota: "Torso inclinado 30° al frente para máximo estímulo esternal."
            }
        ]
    },
    {
        id: "estandar-pull",
        nombre: "Tirón / Pull (Espalda, Bíceps y Posterior)",
        categoria: "pull",
        categoriaBadge: "Pull / Tirón",
        icono: "🏹",
        duracion: "55 min",
        nivel: "Intermedio",
        enfoque: "Amplitud dorsal, grosor escapular y flexores de codo",
        descripcion: "Combinación de tracción vertical pesada, tracción horizontal de densidad y aislamiento braquial con supinación.",
        ejercicios: [
            {
                ejercicioId: "dominadas",
                series: 4,
                reps: "6 - 10",
                descanso: 150,
                rir: "1",
                nota: "Inicia desde suspensión activa con parada de 1 segundo arriba."
            },
            {
                ejercicioId: "remo-barra",
                series: 4,
                reps: "8 - 10",
                descanso: 120,
                rir: "1 - 2",
                nota: "Mantén el torso a 45° sin impulsos con la espalda baja."
            },
            {
                ejercicioId: "curl-biceps",
                series: 3,
                reps: "10 - 12",
                descanso: 90,
                rir: "0 - 1",
                nota: "Supinación marcada apretando el meñique hacia afuera."
            }
        ]
    },
    {
        id: "estandar-piernas",
        nombre: "Piernas & Cadena Posterior (Fuerza & Masa)",
        categoria: "piernas",
        categoriaBadge: "Piernas",
        icono: "🦵",
        duracion: "65 min",
        nivel: "Avanzado",
        enfoque: "Cuádriceps, glúteos e isquiosurales",
        descripcion: "El entrenamiento definitivo de tren inferior combinando dominancia de rodilla y dominancia de cadera unilateral y bilateral.",
        ejercicios: [
            {
                ejercicioId: "sentadilla",
                series: 4,
                reps: "6 - 8",
                descanso: 180,
                rir: "2",
                nota: "Profundidad rompiendo la paralela. Presión intra-abdominal 360°."
            },
            {
                ejercicioId: "peso-muerto-rumano",
                series: 3,
                reps: "8 - 10",
                descanso: 150,
                rir: "1 - 2",
                nota: "Bisagra pura de cadera; estiramiento máximo en isquiosurales."
            },
            {
                ejercicioId: "zancadas-mancuerna",
                series: 3,
                reps: "12 pasos por pierna",
                descanso: 90,
                rir: "1",
                nota: "Paso amplio con rodilla casi rozando la alfombra de protección."
            }
        ]
    },
    {
        id: "estandar-brazos",
        nombre: "Brazos & Torso (Especialización Hipertrofia)",
        categoria: "empuje",
        categoriaBadge: "Brazos & Torso",
        icono: "💪",
        duracion: "50 min",
        nivel: "Intermedio",
        enfoque: "Bíceps, tríceps y hombro 3D",
        descripcion: "Volumen concentrado en la musculatura periférica del torso superior para un desarrollo atlético denso y definido.",
        ejercicios: [
            {
                ejercicioId: "press-militar",
                series: 4,
                reps: "8 - 10",
                descanso: 120,
                rir: "1 - 2",
                nota: "Empuje vertical estricto con mancuernas."
            },
            {
                ejercicioId: "fondos-paralelas",
                series: 3,
                reps: "10 - 12",
                descanso: 90,
                rir: "1",
                nota: "Torso vertical para focalizar la cabeza larga y medial del tríceps."
            },
            {
                ejercicioId: "curl-biceps",
                series: 4,
                reps: "10 - 12",
                descanso: 90,
                rir: "0 - 1",
                nota: "Tempo 3-0-1-1; bajada lenta de 3 segundos."
            }
        ]
    },
    {
        id: "estandar-mixto",
        nombre: "Full Body Mixto (Funcional & Metabólico)",
        categoria: "mixto",
        categoriaBadge: "Full Body / Mixto",
        icono: "⚡",
        duracion: "50 min",
        nivel: "Principiante / Intermedio",
        enfoque: "Cuerpo completo con alta eficiencia temporal",
        descripcion: "Ideal para sesiones de 3 días a la semana, estimulando todos los grandes grupos musculares en una sola sesión equilibrada.",
        ejercicios: [
            {
                ejercicioId: "sentadilla",
                series: 3,
                reps: "8 - 10",
                descanso: 150,
                rir: "2",
                nota: "Patrón rey de tren inferior."
            },
            {
                ejercicioId: "press-banca",
                series: 3,
                reps: "8 - 10",
                descanso: 120,
                rir: "2",
                nota: "Empuje horizontal para torso."
            },
            {
                ejercicioId: "dominadas",
                series: 3,
                reps: "6 - 8",
                descanso: 120,
                rir: "1 - 2",
                nota: "Tracción vertical completa."
            },
            {
                ejercicioId: "plancha-alfombra",
                series: 3,
                reps: "45 seg",
                descanso: 60,
                rir: "Fallo técnico",
                nota: "Isometría de antiextensión en alfombra."
            }
        ]
    },
    {
        id: "estandar-combate",
        nombre: "Combate, Saco & Core Nuclear",
        categoria: "combate",
        categoriaBadge: "Combate & Core",
        icono: "🥊",
        duracion: "45 min",
        nivel: "Todos los niveles",
        enfoque: "Potencia balística, cardio anaeróbico y armadura abdominal",
        descripcion: "Entrenamiento de combate de alta demanda metabólica: rondas explosivas en saco de boxeo, comba y rigidez nuclear de core.",
        ejercicios: [
            {
                ejercicioId: "salto-comba",
                series: 3,
                reps: "3 min por round",
                descanso: 60,
                rir: "Ritmo constante",
                nota: "Calentamiento elástico sobre alfombra amortiguada."
            },
            {
                ejercicioId: "saco-boxeo",
                series: 5,
                reps: "3 min por round",
                descanso: 60,
                rir: "Intensidad 85-90%",
                nota: "Combinaciones Jab-Cross-Gancho con rotación de cadera."
            },
            {
                ejercicioId: "rueda-abdominal",
                series: 3,
                reps: "10 - 12",
                descanso: 75,
                rir: "1",
                nota: "Rodillas en alfombra y extensión progresiva controlada."
            },
            {
                ejercicioId: "plancha-alfombra",
                series: 3,
                reps: "45 - 60 seg",
                descanso: 60,
                rir: "Fallo técnico",
                nota: "Bloqueo pélvico final."
            }
        ]
    }
];

// ==========================================
// BIBLIOTECA 3: RUTINAS PERSONALIZADAS (USUARIO & AI COACH)
// ==========================================
const STORAGE_KEY_PERSONALIZADAS = "fitness_rutinas_personalizadas_v2";

const RUTINAS_PERSONALIZADAS_DEFAULT = [
    {
        id: "custom-coach-1",
        nombre: "AI Coach: Especialización en Pectoral & Deltoides",
        creador: "coach",
        creadorNombre: "AI Performance Coach",
        icono: "🤖",
        fechaCreacion: "2026-10-21",
        duracion: "50 min",
        nivel: "Intermedio",
        notaCoach: "Optimizado para romper estancamientos en el press mediante sobrecarga en ángulos complementarios y descarga articular.",
        ejercicios: [
            { ejercicioId: "press-banca", series: 4, reps: "6 - 8", descanso: 150, rir: "1-2" },
            { ejercicioId: "press-militar", series: 3, reps: "8 - 10", descanso: 120, rir: "1" },
            { ejercicioId: "fondos-paralelas", series: 3, reps: "10 - 12", descanso: 90, rir: "1" }
        ]
    },
    {
        id: "custom-coach-2",
        nombre: "AI Coach: Rutina Express en Alfombra y Mancuernas",
        creador: "coach",
        creadorNombre: "AI Performance Coach",
        icono: "🤖",
        fechaCreacion: "2026-10-21",
        duracion: "35 min",
        nivel: "Principiante / Intermedio",
        notaCoach: "Diseñada para entrenar en casa o espacio reducido sin máquinas: solo necesitas tus mancuernas y la esterilla.",
        ejercicios: [
            { ejercicioId: "peso-muerto-rumano", series: 3, reps: "10 - 12", descanso: 90, rir: "2" },
            { ejercicioId: "zancadas-mancuerna", series: 3, reps: "10 por pierna", descanso: 75, rir: "1" },
            { ejercicioId: "press-militar", series: 3, reps: "10 - 12", descanso: 90, rir: "1" },
            { ejercicioId: "plancha-alfombra", series: 3, reps: "45 seg", descanso: 60, rir: "Fallo" }
        ]
    },
    {
        id: "custom-user-1",
        nombre: "Mi Rutina de Fuerza: Torso Pesado",
        creador: "usuario",
        creadorNombre: "Mi Rutina (Usuario)",
        icono: "👤",
        fechaCreacion: "2026-10-20",
        duracion: "60 min",
        nivel: "Avanzado",
        notaCoach: "Rutina configurada por el usuario con foco en cargas submáximas.",
        ejercicios: [
            { ejercicioId: "press-banca", series: 5, reps: "5", descanso: 180, rir: "2" },
            { ejercicioId: "remo-barra", series: 4, reps: "6 - 8", descanso: 150, rir: "1" },
            { ejercicioId: "curl-biceps", series: 3, reps: "8 - 10", descanso: 90, rir: "1" }
        ]
    }
];

export function obtenerRutinasPersonalizadas() {
    try {
        const guardadas = localStorage.getItem(STORAGE_KEY_PERSONALIZADAS);
        if (guardadas) {
            return JSON.parse(guardadas);
        }
    } catch (e) {
        console.warn("Aviso al leer rutinas personalizadas de localStorage:", e);
    }
    // Guardar las iniciales si es la primera vez
    guardarEnStorage(RUTINAS_PERSONALIZADAS_DEFAULT);
    return RUTINAS_PERSONALIZADAS_DEFAULT;
}

function guardarEnStorage(rutinas) {
    try {
        localStorage.setItem(STORAGE_KEY_PERSONALIZADAS, JSON.stringify(rutinas));
    } catch (e) {
        console.warn("Aviso al guardar en localStorage:", e);
    }
}

export function guardarRutinaPersonalizada(nuevaRutina) {
    const actuales = obtenerRutinasPersonalizadas();
    const indice = actuales.findIndex(r => r.id === nuevaRutina.id);
    
    if (indice >= 0) {
        actuales[indice] = nuevaRutina;
    } else {
        actuales.unshift(nuevaRutina);
    }
    
    guardarEnStorage(actuales);
    return actuales;
}

export function eliminarRutinaPersonalizada(id) {
    let actuales = obtenerRutinasPersonalizadas();
    actuales = actuales.filter(r => r.id !== id);
    guardarEnStorage(actuales);
    return actuales;
}

export function clonarRutinaEstandar(estandarId, nuevoNombre) {
    const estandar = RUTINAS_ESTANDAR.find(r => r.id === estandarId);
    if (!estandar) return null;

    const nuevaRutina = {
        id: `custom-user-${Date.now()}`,
        nombre: nuevoNombre || `Copia de ${estandar.nombre}`,
        creador: "usuario",
        creadorNombre: "Mi Rutina (Usuario)",
        icono: "👤",
        fechaCreacion: new Date().toISOString().split("T")[0],
        duracion: estandar.duracion,
        nivel: estandar.nivel,
        notaCoach: `Clonada de la rutina estándar '${estandar.nombre}' para personalización directa.`,
        ejercicios: JSON.parse(JSON.stringify(estandar.ejercicios))
    };

    guardarRutinaPersonalizada(nuevaRutina);
    return nuevaRutina;
}

export function generarRutinaCoach({ objetivo = "hipertrofia", tiempo = 45, equipo = "todos" } = {}) {
    const timestamp = Date.now();
    let ejerciciosSeleccionados = [];
    let titulo = "";
    let nota = "";

    if (objetivo === "combate") {
        titulo = "AI Coach: Acondicionamiento de Combate & Golpeo";
        nota = "Enfoque dinámico en saco de boxeo, agilidad y resistencia muscular de core en alfombra.";
        ejerciciosSeleccionados = [
            { ejercicioId: "salto-comba", series: 3, reps: "3 min", descanso: 60, rir: "Aeróbico" },
            { ejercicioId: "saco-boxeo", series: 4, reps: "3 min", descanso: 60, rir: "85%" },
            { ejercicioId: "rueda-abdominal", series: 3, reps: "10 - 12", descanso: 75, rir: "1" }
        ];
    } else if (objetivo === "piernas") {
        titulo = "AI Coach: Sobrecarga Progresiva de Piernas";
        nota = "Prioridad en reclutamiento de cuádriceps, glúteos e isquiosurales con bisagras mecánicas estrictas.";
        ejerciciosSeleccionados = [
            { ejercicioId: "sentadilla", series: 4, reps: "6 - 8", descanso: 180, rir: "2" },
            { ejercicioId: "peso-muerto-rumano", series: 3, reps: "8 - 10", descanso: 150, rir: "1" },
            { ejercicioId: "zancadas-mancuerna", series: 3, reps: "12 pasos", descanso: 90, rir: "1" }
        ];
    } else {
        titulo = "AI Coach: Potencia Superior & Empuje Denso";
        nota = "Maximización del volumen efectivo con tempo excéntrico de 3 segundos para estimulación miofibrilar.";
        ejerciciosSeleccionados = [
            { ejercicioId: "press-banca", series: 4, reps: "6 - 8", descanso: 150, rir: "1" },
            { ejercicioId: "remo-barra", series: 4, reps: "8 - 10", descanso: 120, rir: "1" },
            { ejercicioId: "press-militar", series: 3, reps: "8 - 10", descanso: 90, rir: "1" }
        ];
    }

    const nuevaRutina = {
        id: `custom-coach-${timestamp}`,
        nombre: titulo,
        creador: "coach",
        creadorNombre: "AI Performance Coach",
        icono: "🤖",
        fechaCreacion: new Date().toISOString().split("T")[0],
        duracion: `${tiempo} min`,
        nivel: "Adaptativo",
        notaCoach: nota,
        ejercicios: ejerciciosSeleccionados
    };

    guardarRutinaPersonalizada(nuevaRutina);
    return nuevaRutina;
}

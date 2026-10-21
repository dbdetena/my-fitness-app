// Colección curada de frases motivadoras sobre disciplina, fuerza y superación
export const FRASES_MOTIVADORAS = [
    "La disciplina es el puente definitivo entre tus metas y tus logros.",
    "El dolor que sientes hoy es la fuerza que sentirás mañana.",
    "No tienes que ser extremo, solo implacablemente constante.",
    "Cada repetición cuenta cuando la mente duda y el cuerpo sigue.",
    "La excelencia no es un acto aislado, sino un hábito diario inquebrantable.",
    "Tu único rival de verdad es la persona que viste ayer en el espejo.",
    "La fuerza no viene de la capacidad física, sino de una voluntad indomable.",
    "Siembra esfuerzo en cada serie, cosecha poder en cada día.",
    "Los resultados no son fruto del azar, son hijos de la constancia.",
    "Haz hoy lo que otros postergan para lograr mañana lo que otros sueñan.",
    "No cuentes los días: haz que cada jornada cuente.",
    "La sobrecarga progresiva más importante empieza en tu propia mentalidad.",
    "El sudor y el rigor de hoy son el orgullo de tu futuro.",
    "Construye a diario la versión más fuerte y disciplinada de ti mismo.",
    "Los días en que menos te apetece son los que más forjan tu carácter.",
    "El éxito se esculpe con pequeñas victorias repetidas cada día.",
    "No busques motivación pasajera: construye hábitos a prueba de balas.",
    "Cada entrenamiento es un voto de confianza por quien deseas llegar a ser.",
    "El hierro nunca miente: refleja exactamente lo que estás dispuesto a dar.",
    "El progreso lento sigue siendo progreso. No te detengas jamás.",
    "Cuida tu cuerpo con respeto: es el único templo que tienes para vivir.",
    "La fatiga es pasajera; la satisfacción de superarte dura para siempre.",
    "Vence a tus excusas antes de que te roben tus aspiraciones.",
    "Nutre tu ambición, entrena tu temple y redefine tus propios límites.",
    "El hierro premia sin reservas a los pacientes y determinados.",
    "La victoria se construye en tres frentes: el plato, el descanso y la barra.",
    "Si fuera fácil, cualquiera lo haría. Conviértelo en algo extraordinario.",
    "Un entrenamiento imperfecto completado supera al perfecto jamás iniciado.",
    "Despierta con determinación férrea, descansa con satisfacción plena.",
    "La verdadera fuerza consiste en no negociar jamás con la pereza.",
    "Domina tu disciplina diaria o la complacencia te dominará a ti."
];

/**
 * Obtiene la frase del día calculada de forma determinista según la fecha actual.
 * De esta forma, la frase es idéntica durante todo el día y cambia automáticamente cada medianoche.
 */
export function obtenerFraseDelDia() {
    const hoy = new Date();
    // Cálculo del día del año (1 a 366)
    const inicioAno = new Date(hoy.getFullYear(), 0, 0);
    const diferenciaMs = hoy - inicioAno;
    const diaDelAno = Math.floor(diferenciaMs / (1000 * 60 * 60 * 24));
    
    const indice = diaDelAno % FRASES_MOTIVADORAS.length;
    return FRASES_MOTIVADORAS[indice];
}

/**
 * Inyecta la frase del día en el elemento correspondiente del encabezado
 */
export function initFraseDelDia() {
    const quoteEl = document.getElementById("quote-text");
    if (quoteEl) {
        quoteEl.textContent = obtenerFraseDelDia();
    }
}

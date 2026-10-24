// Base de datos exhaustiva de Ejercicios Habituales
// Clasificación por Tipo (Piernas, Empuje, Pull, Core, Combate) y Equipamiento necesario

export const EQUIPAMIENTO_CONFIG = {
    // Taxonomía estandarizada oficial (12 categorías)
    barra: { id: "barra", nombre: "Barra", icono: "🏋️", badgeClass: "badge-equipment-barbell" },
    cables: { id: "cables", nombre: "Cables", icono: "🔄", badgeClass: "badge-equipment-cable" },
    mancuernas: { id: "mancuernas", nombre: "Mancuernas", icono: "⚖️", badgeClass: "badge-equipment-dumbbell" },
    maquinas: { id: "maquinas", nombre: "Máquinas", icono: "⚙️", badgeClass: "badge-equipment-machine" },
    kettlebell: { id: "kettlebell", nombre: "Kettlebell", icono: "🔔", badgeClass: "badge-equipment-kettlebell" },
    pelota_medica: { id: "pelota_medica", nombre: "Pelota médica", icono: "🏐", badgeClass: "badge-equipment-ball" },
    sin_herramientas: { id: "sin_herramientas", nombre: "Sin herramientas", icono: "🧱", badgeClass: "badge-equipment-body" },
    cintas_suspension: { id: "cintas_suspension", nombre: "Cintas de suspensión", icono: "🎗️", badgeClass: "badge-equipment-straps" },
    pelota: { id: "pelota", nombre: "Pelota", icono: "⚽", badgeClass: "badge-equipment-swissball" },
    pelota_bosu: { id: "pelota_bosu", nombre: "Pelota Bosu", icono: "🔵", badgeClass: "badge-equipment-bosu" },
    elasticos: { id: "elasticos", nombre: "Elásticos", icono: "〰️", badgeClass: "badge-equipment-band" },
    foam_roller: { id: "foam_roller", nombre: "Foam roller", icono: "🪵", badgeClass: "badge-equipment-roller" },

    // Claves de retrocompatibilidad
    mancuerna: { id: "mancuernas", nombre: "Mancuernas", icono: "⚖️", badgeClass: "badge-equipment-dumbbell" },
    banco: { id: "banco", nombre: "Banco", icono: "🛋️", badgeClass: "badge-equipment-bench" },
    alfombra: { id: "sin_herramientas", nombre: "Sin herramientas / Alfombra", icono: "🧘", badgeClass: "badge-equipment-mat" },
    saco: { id: "sin_herramientas", nombre: "Saco de Boxeo", icono: "🥊", badgeClass: "badge-equipment-bag" },
    corporal: { id: "sin_herramientas", nombre: "Sin herramientas", icono: "🧱", badgeClass: "badge-equipment-body" },
    polea: { id: "cables", nombre: "Cables", icono: "🔄", badgeClass: "badge-equipment-cable" },
    comba: { id: "sin_herramientas", nombre: "Comba de Saltar", icono: "🪢", badgeClass: "badge-equipment-rope" },
    rueda: { id: "foam_roller", nombre: "Rueda / Roller", icono: "⚙️", badgeClass: "badge-equipment-wheel" }
};

export const GRUPOS_MUSCULARES = [
    { id: "Bíceps", nombre: "Bíceps", icono: "💪" },
    { id: "Tríceps", nombre: "Tríceps", icono: "⚡" },
    { id: "Antebrazos", nombre: "Antebrazos", icono: "✊" },
    { id: "Pecho", nombre: "Pecho", icono: "🛡️" },
    { id: "Hombros", nombre: "Hombros", icono: "🎯" },
    { id: "Abdominales", nombre: "Abdominales", icono: "🧱" },
    { id: "Oblicuos", nombre: "Oblicuos", icono: "🌀" },
    { id: "Gran dorsal", nombre: "Gran dorsal", icono: "🏹" },
    { id: "Trapecio Alto y Cuello", nombre: "Trapecio Alto y Cuello", icono: "🦅" },
    { id: "Espalda baja", nombre: "Espalda baja", icono: "📐" },
    { id: "Cuádriceps", nombre: "Cuádriceps", icono: "🦵" },
    { id: "Glúteos y Flexores", nombre: "Glúteos y Flexores", icono: "🍑" },
    { id: "Bíceps femorales", nombre: "Bíceps femorales", icono: "🦿" },
    { id: "Pantorrillas", nombre: "Pantorrillas", icono: "🦶" },
    { id: "Cardio", nombre: "Cardio", icono: "❤️‍🔥" }
];

export const TIPOS_EJERCICIO = {
    empuje: { id: "empuje", nombre: "Empuje (Push)", icono: "🛡️", color: "#38bdf8" },
    pull: { id: "pull", nombre: "Tirón (Pull)", icono: "🏹", color: "#818cf8" },
    piernas: { id: "piernas", nombre: "Piernas", icono: "🦵", color: "#f59e0b" },
    core: { id: "core", nombre: "Core & Abdomen", icono: "🧱", color: "#10b981" },
    combate: { id: "combate", nombre: "Combate & Cardio", icono: "🥊", color: "#ef4444" }
};

export const BASE_EJERCICIOS = [
    {
        id: "press-banca",
        nombre: "Press de Banca Plano",
        imagen: "./assets/exercises/press-banca.jpg",
        tipo: "empuje",
        tipoNombre: "Empuje (Push)",
        tipoIcono: "🛡️",
        equipamiento: ["barra", "banco"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Pectoral Mayor (esternal y clavicular)"],
        musculosSecundarios: ["Tríceps braquial", "Deltoides anterior", "Serrato anterior"],
        resumen: "El ejercicio rey de empuje horizontal para desarrollo masivo del torso superior.",
        tecnica: {
            setup: "Túmbate en el banco con los ojos alineados verticalmente bajo la barra. Retrae y deprime escápulas, bloqueándolas firmemente contra el tapizado. Planta los pies enteros en el suelo con tensión en cuádriceps y genera un arco lumbar fisiológico natural.",
            concentrica: "Desciende de forma controlada llevando la barra hacia el esternón medio con los codos en un ángulo de 45° a 60° respecto al torso. Al tocar ligeramente el pecho, empuja explosivamente extendiendo los codos sin perder la retracción escapular ni despegar los glúteos.",
            excentrica: "Baja la barra en una trayectoria en 'J invertida' durante 2 a 3 segundos, resistiendo activamente la carga sin permitir que la barra rebote sobre las costillas.",
            respiracion: "Inhala profundamente en la parte superior (maniobra de Valsalva para compactar el torso), mantén el aire durante el descenso y exhala superando el punto de estancamiento (sticking point).",
            tempo: "3-0-1-0 (3s bajada, 0s pausa, 1s subida explosiva)"
        },
        riesgos: [
            "🚨 Codos abiertos a 90° (Posición en T): Genera pinzamiento del manguito rotador y estrés severo sobre el labrum glenohumeral.",
            "🚨 Rebotar la barra en el esternón: Anula la tensión mecánica excéntrica y arriesga microfracturas en el cartílago costal.",
            "🚨 Pérdida de arco y despegue de glúteos: Compresión nociva de las carillas articulares de las vértebras lumbares.",
            "🚨 Agarre de suicida (pulgar no envolvente): Riesgo mortal de deslizamiento de la barra hacia el cuello o rostro."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Posición Inicial & Setup Escapular",
                musculosDestacados: "Trapecio medio/inferior y romboides (bloqueo escapular firme)",
                detalles: "Arco lumbar compacto, glúteos en contacto con el banco, pies anclados al suelo y agarre 1.5 veces el ancho biacromial.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Punto de Máxima Carga (Esternón Medio)",
                musculosDestacados: "Pectoral Mayor en máximo estiramiento bajo tensión, Deltoides Anterior y Tríceps",
                detalles: "Barra sobre el esternón medio, antebrazos perpendiculares al suelo y codos a 45°-60° protegiendo la cápsula articular anterior.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Bloqueo Concéntrico & Retorno Seguro",
                musculosDestacados: "Pico de contracción del Pectoral y bloqueo terminal por el Tríceps",
                detalles: "Barra sobre la vertical de los hombros, escápulas aún ancladas atrás sin proyectar los hombros hacia adelante.",
            }
        ]
    },
    {
        id: "sentadilla",
        nombre: "Sentadilla Trasera con Barra (Squat)",
        imagen: "./assets/exercises/sentadilla.jpg",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        equipamiento: ["barra"],
        dificultad: "Intermedio / Avanzado",
        musculosPrincipales: ["Cuádriceps (vasto externo, interno, recto femoral)", "Glúteo Mayor"],
        musculosSecundarios: ["Aductores", "Isquiosurales", "Erectores espinales", "Core abdominal"],
        resumen: "El pilar fundamental de la fuerza de tren inferior y producción de potencia sistémica.",
        tecnica: {
            setup: "Barra apoyada sobre el trapecio medio o deltoides posterior (barra baja). Pies separados a la anchura de los hombros con las puntas rotadas 15°-30° hacia afuera. Retracción torácica y codos hacia abajo.",
            concentrica: "Inicia el movimiento flexionando caderas y rodillas simultáneamente como sentándote entre tus piernas. Desciende hasta que el pliegue de la cadera quede por debajo de la parte superior de la rodilla (paralela profunda). Empuja el suelo con todo el pie para ascender.",
            excentrica: "Controla la bajada en 3 segundos manteniendo las rodillas alineadas en la misma dirección que las puntas de los pies.",
            respiracion: "Inhalación diafragmática máxima antes de iniciar la bajada. Retén el aire creando un cinturón de presión intra-abdominal (360°) y suelta el aire tras superar el punto más duro de la subida.",
            tempo: "3-1-1-0 (3s bajada, 1s pausa abajo, 1s subida)"
        },
        riesgos: [
            "🚨 Valgo de rodilla (rodillas colapsando hacia adentro): Tensión crítica sobre el ligamento cruzado anterior (LCA) y menisco.",
            "🚨 Guiño de glúteo (Butt Wink pronunciado): Flexión lumbar bajo carga compresiva alta, riesgo de protrusión discal.",
            "🚨 Despegar los talones del suelo: Sobrecarga el tendón rotuliano y traslada el centro de masas peligrosamente hacia adelante."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Setup & Presión Intra-abdominal",
                musculosDestacados: "Erectores espinales, Core y Trapecios",
                detalles: "Espalda neutra, barra calzada y fijada firmemente, pies clavados con efecto trípode (talón, dedo gordo y quinto meta).",
            },
            {
                fase: 2,
                titulo: "Fase 2: Profundidad Máxima (Rompiendo Paralela)",
                musculosDestacados: "Cuádriceps y Glúteo Mayor en máxima tensión de estiramiento",
                detalles: "Cadera debajo de rodillas, plomada de la barra sobre el medio pie y rodillas alineadas con los dedos.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Ascenso Explosivo & Extensión de Cadera",
                musculosDestacados: "Contracción terminal de Glúteo y Cuádriceps",
                detalles: "Torso y caderas ascienden al mismo ritmo sin que la pelvis suba antes que el pecho (evitar sentadilla tipo 'buenos días').",
            }
        ]
    },
    {
        id: "dominadas",
        nombre: "Dominadas Pronas (Pull-ups)",
        imagen: "./assets/exercises/dominadas.png",
        tipo: "pull",
        tipoNombre: "Tirón (Pull)",
        tipoIcono: "🏹",
        equipamiento: ["corporal"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Dorsal Ancho", "Redondo Mayor"],
        musculosSecundarios: ["Bíceps braquial", "Braquiorradial", "Trapecio medio e inferior", "Romboides"],
        resumen: "El mejor indicador de fuerza relativa de tracción vertical para amplitud de espalda.",
        tecnica: {
            setup: "Agarre prono ligeramente más ancho que los hombros. Empieza desde un 'Dead Hang activo': brazos extendidos pero escápulas retraídas y deprimidas (hombros lejos de las orejas).",
            concentrica: "Tracciona pensando en llevar los codos hacia las costillas y hacia el suelo, no simplemente en tirar con las manos. Lleva el pecho hacia la barra hasta que tu barbilla la supere holgadamente.",
            excentrica: "Baja de manera controlada y suave durante 3 segundos hasta la extensión completa de los codos manteniendo la tensión escapular activa.",
            respiracion: "Inhala abajo, retén al iniciar la tracción y exhala en la parte alta con el pecho abierto.",
            tempo: "3-0-1-1 (1 segundo de pausa con barbilla arriba)"
        },
        riesgos: [
            "🚨 Kipping o balanceo descontrolado: Arriesga desgarros en el labrum glenoideo y tendón de la porción larga del bíceps.",
            "🚨 Dejar caer el peso bruscamente al fondo: Impacto lesivo en los tejidos conectivos del hombro y ligamentos acromioclaviculares.",
            "🚨 Encoger los hombros hacia las orejas: Inhibe el dorsal ancho y sobrecarga el trapecio superior y cuello."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Suspensión Activa (Active Hang)",
                musculosDestacados: "Dorsal Ancho activado y depresión escapular",
                detalles: "Brazos extendidos, escápulas hacia abajo y atrás, abdomen compacto para evitar hiperextensión lumbar.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Tracción Pico (Barbilla sobre barra)",
                musculosDestacados: "Dorsal Ancho 100%, Bíceps braquial y Redondo Mayor",
                detalles: "Codos pegados a la línea lateral del torso, pecho proyectado al techo y retracción escapular máxima.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Descenso Excéntrico Controlado",
                musculosDestacados: "Tensión excéntrica del Dorsal Ancho y flexores del codo",
                detalles: "Descenso uniforme en 3 segundos sin tirones ni rebotes.",
            }
        ]
    },
    {
        id: "saco-boxeo",
        nombre: "Trabajo Combinado en Saco de Boxeo",
        imagen: "./assets/exercises/saco-boxeo.jpg",
        tipo: "combate",
        tipoNombre: "Combate & Cardio",
        tipoIcono: "🥊",
        equipamiento: ["saco"],
        dificultad: "Todos los niveles",
        musculosPrincipales: ["Deltoides", "Oblicuos y Core", "Dorsales"],
        musculosSecundarios: ["Pectorales", "Gemelos", "Cuádriceps", "Antebrazos"],
        resumen: "Entrenamiento de impacto metabólico de alta intensidad, potencia rotacional y cardio anaeróbico.",
        tecnica: {
            setup: "Adopta la guardia de combate: pies al ancho de hombros en diagonal, rodillas semiflexionadas, talón posterior levantado. Guantes y vendas bien ajustados. Mentón protegido y codos cerrados.",
            concentrica: "Lanza golpes (Jab, Cross, Ganchos) transfiriendo la energía desde el pivote del pie, rotando la cadera y el torso antes de que el puño contacte el saco. Impacta con los dos primeros nudillos alineando muñeca y antebrazo.",
            excentrica: "Retrae la mano de vuelta a la guardia inmediatamente tras el impacto siguiendo la misma línea sin bajar el puño.",
            respiracion: "Exhala de forma cortante y sonora con cada impacto ('Tss') para contraer el core reflexivamente.",
            tempo: "Ráfagas de 3 minutos x 1 minuto de descanso activo"
        },
        riesgos: [
            "🚨 Golpear sin vendaje de protección: Riesgo de esguince de muñeca y microfractura de los huesos metacarpianos.",
            "🚨 Doblar la muñeca en el impacto: La muñeca debe ser una extensión rígida e inamovible del antebrazo.",
            "🚨 Empujar el saco en vez de golpear: Pérdida de velocidad balística y choque articular en el hombro."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Postura de Guardia & Balance",
                musculosDestacados: "Gemelos, Cuádriceps y Deltoides Anterior",
                detalles: "Centro de gravedad bajo, codos cubriendo costillas flotantes y puños protegiendo pómulos.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Impacto con Rotación de Cadera",
                musculosDestacados: "Oblicuos, Dorsal, Pectoral y Tríceps",
                detalles: "Pivoteo del pie posterior, cadera disparada hacia adelante y transferencia rotacional cinética completa.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Repliegue Veloz a la Guardia",
                musculosDestacados: "Dorsal y Deltoides Posterior en recuperación",
                detalles: "El puño regresa a la cara antes de que el saco termine de oscilar, listos para defender o esquivar.",
            }
        ]
    },
    {
        id: "plancha-alfombra",
        nombre: "Plancha Abdominal en Alfombra (Front Plank)",
        imagen: "./assets/exercises/plancha-alfombra.jpg",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        equipamiento: ["alfombra", "corporal"],
        dificultad: "Principiante / Intermedio",
        musculosPrincipales: ["Transverso del Abdomen", "Recto Anterior del Abdomen"],
        musculosSecundarios: ["Oblicuos", "Glúteo Mayor", "Serrato anterior", "Cuádriceps"],
        resumen: "Ejercicio isométrico de antiextensión por excelencia para blindar la zona media y columna lumbar.",
        tecnica: {
            setup: "Sobre una esterilla o alfombra, apoya los antebrazos con los codos alineados directamente bajo los hombros. Extiende las piernas y apóyate sobre las almohadillas de los dedos de los pies.",
            concentrica: "Activa una contracción isométrica intensa: aprieta glúteos y lleva la pelvis a una ligera retroversión (hacia adentro), hundiendo el ombligo como si esperaras un golpe en el estómago.",
            excentrica: "Mantén la rigidez de bloque sin permitir que la pelvis caiga hacia el suelo ni que se eleve formando una pirámide.",
            respiracion: "Respiraciones diafragmáticas cortas pero profundas manteniendo la pared abdominal compacta y dura como una roca.",
            tempo: "Series de 30 a 60 segundos de tensión máxima de calidad"
        },
        riesgos: [
            "🚨 Hundir la zona lumbar (Hiperlordosis): Transfiere el peso directamente a los discos vertebrales lumbares L4-L5 y L5-S1.",
            "🚨 Elevar demasiado las caderas: Desactiva el recto abdominal y convierte el ejercicio en un apoyo pasivo de hombros.",
            "🚨 Contener la respiración (Apnea): Eleva innecesariamente la presión arterial sistólica."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Alineación Inicial sobre Alfombra",
                musculosDestacados: "Serrato anterior y Deltoides",
                detalles: "Codos bajo hombros en ángulo recto de 90° sobre la alfombra, cuello neutro mirando hacia las manos.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Tensión Máxima & Bloqueo Pélvico",
                musculosDestacados: "Transverso abdominal, Recto del abdomen y Glúteos 100%",
                detalles: "Línea recta perfecta hombro-cadera-tobillo. Máxima co-contracción de glúteos y core.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Mantenimiento y Respiración Diafragmática",
                musculosDestacados: "Musculatura estabilizadora profunda espinal",
                detalles: "Control de fatiga manteniendo la posición sin temblores descompensados.",
            }
        ]
    },
    {
        id: "press-militar",
        nombre: "Press Militar con Mancuernas",
        imagen: "./assets/exercises/press-militar.jpg",
        tipo: "empuje",
        tipoNombre: "Empuje (Push)",
        tipoIcono: "🛡️",
        equipamiento: ["mancuerna", "banco"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Deltoides Anterior y Lateral"],
        musculosSecundarios: ["Tríceps braquial", "Trapecio superior", "Pectoral superior"],
        resumen: "Construcción tridimensional de hombros con gran libertad articular para las muñecas.",
        tecnica: {
            setup: "Sentado en un banco a 75°-85° o de pie. Mancuernas a la altura de los oídos con agarre semi-prono (codos a 30° en el plano escapular).",
            concentrica: "Empuja las mancuernas hacia arriba en una trayectoria suavemente convergente sin llegar a chocarlas en la cúspide.",
            excentrica: "Desciende en 3 segundos controlando la carga hasta que las mancuernas rocen la altura de las clavículas.",
            respiracion: "Inhala antes de empujar, exhala arriba.",
            tempo: "3-0-1-0"
        },
        riesgos: [
            "🚨 Hiperextensión lumbar exagerada para empujar como press inclinado.",
            "🚨 Codos completamente abiertos a 180° rozando el pinzamiento acromial."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Posición de Salida (Nivel Clavículas)",
                musculosDestacados: "Deltoides anterior y Core",
                detalles: "Mancuernas en vertical de los codos, pecho inflado y escápulas estables.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Bloqueo Arriba",
                musculosDestacados: "Deltoides Lateral y Tríceps",
                detalles: "Mancuernas alineadas sobre la corona de la cabeza sin golpearlas.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Retorno Lento",
                musculosDestacados: "Tensión excéntrica del hombro",
                detalles: "Baja resistiendo la gravedad manteniendo antebrazos verticales.",
            }
        ]
    },
    {
        id: "peso-muerto-rumano",
        nombre: "Peso Muerto Rumano con Mancuernas (RDL)",
        imagen: "./assets/exercises/peso-muerto-rumano.jpg",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        equipamiento: ["mancuerna"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Isquiosurales (bíceps femoral, semitendinoso)", "Glúteo Mayor"],
        musculosSecundarios: ["Erectores espinales", "Trapecio", "Antebrazos"],
        resumen: "El rey del patrón de bisagra de cadera para hipertrofia de la cadena posterior.",
        tecnica: {
            setup: "De pie, sosteniendo una mancuerna pesada en cada mano contra los muslos. Pies separados al ancho de caderas. Rodillas desbloqueadas (15° de flexión constante).",
            concentrica: "Empuja las caderas hacia atrás como si quisieras tocar una pared detrás de ti. Baja las mancuernas pegadas a las piernas hasta notar máximo estiramiento en isquios (mitad de espinilla). Luego contrae glúteos para volver.",
            excentrica: "Controla la bisagra de cadera en 3 segundos manteniendo la columna recta como una tabla.",
            respiracion: "Inhala antes de iniciar la bisagra, exhala al extender cadera arriba.",
            tempo: "3-1-1-0"
        },
        riesgos: [
            "🚨 Flexionar la columna lumbar (chepa): Causa hernia discal inmediata bajo carga.",
            "🚨 Flexionar excesivamente las rodillas: Convierte el ejercicio en una sentadilla y quita tensión a los isquios."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Bloqueo Erguido & Retracción",
                musculosDestacados: "Dorsales fijando mancuernas y Glúteos",
                detalles: "Mirada al frente, espalda recta y mancuernas rozando los cuádriceps.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Bisagra de Cadera Profunda",
                musculosDestacados: "Isquiosurales y Glúteos en máximo estiramiento",
                detalles: "Caderas desplazadas atrás, mancuernas rozando la tibia y columna 100% neutra.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Extensión Pélvica Potente",
                musculosDestacados: "Apretón de Glúteos en la cumbre",
                detalles: "Vuelve a la vertical sin arquear la espalda hacia atrás.",
            }
        ]
    },
    {
        id: "zancadas-mancuerna",
        nombre: "Zancadas Caminando con Mancuernas",
        imagen: "./assets/exercises/zancadas-mancuerna.jpg",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        equipamiento: ["mancuerna", "alfombra"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Cuádriceps", "Glúteo Mayor y Medio"],
        musculosSecundarios: ["Isquiosurales", "Gemelos", "Core estabilizador"],
        resumen: "Ejercicio unilateral supremo para equilibrio, simetría muscular y reclutamiento glúteo.",
        tecnica: {
            setup: "De pie con una mancuerna en cada mano a los costados. Torso erguido.",
            concentrica: "Da un paso amplio hacia adelante, descendiendo la rodilla trasera hasta que casi roce el suelo (o alfombra). La espinilla delantera debe quedar casi vertical. Empuja con el talón delantero para incorporarte y dar el siguiente paso.",
            excentrica: "Baja con suavidad sin golpear la rótula contra el suelo.",
            respiracion: "Inhala al descender, exhala al impulsarte hacia arriba.",
            tempo: "2-0-1-0"
        },
        riesgos: [
            "🚨 Impactar la rodilla trasera contra el suelo de forma descontrolada.",
            "🚨 Colapso interno del tobillo y rodilla delantera."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Paso al Frente & Alineación",
                musculosDestacados: "Cuádriceps y Glúteo Medio estabilizador",
                detalles: "Torso ligeramente inclinado 10° al frente para enfocar más el glúteo.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Punto de Máxima Profundidad (90°/90°)",
                musculosDestacados: "Glúteo y Cuádriceps pierna delantera",
                detalles: "Ambas rodillas en ángulos cercanos a 90°. Rodilla trasera a 2 cm del suelo.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Impulso y Transición al Siguiente Paso",
                musculosDestacados: "Empuje de talón y extensión de rodilla",
                detalles: "Impulso firme sin tambaleos laterales.",
            }
        ]
    },
    {
        id: "remo-barra",
        nombre: "Remo con Barra Inclinado (Pendlay/Bentuver)",
        imagen: "./assets/exercises/remo-barra.jpg",
        tipo: "pull",
        tipoNombre: "Tirón (Pull)",
        tipoIcono: "🏹",
        equipamiento: ["barra"],
        dificultad: "Intermedio / Avanzado",
        musculosPrincipales: ["Dorsal Ancho", "Trapecio Medio", "Romboides"],
        musculosSecundarios: ["Bíceps", "Deltoides posterior", "Erectores espinales"],
        resumen: "Grosor y densidad de espalda con trabajo isométrico de estabilizadores lumbares.",
        tecnica: {
            setup: "Torso flexionado hacia adelante a 45° o paralelo al suelo, espalda recta, barra sostenida con agarre prono al ancho de hombros.",
            concentrica: "Tracciona la barra hacia el ombligo guiando con los codos hacia atrás y apretando las escápulas al final.",
            excentrica: "Baja la barra lentamente estirando los dorsales por completo sin perder la neutralidad espinal.",
            respiracion: "Inhala abajo, exhala al tocar el abdomen con la barra.",
            tempo: "3-0-1-1"
        },
        riesgos: [
            "🚨 Tirar con impulso del torso ('hacer trampa'): Lesiona los discos lumbares.",
            "🚨 Dejar caer la barra sin control excéntrico."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Bloqueo de Bisagra de Torso",
                musculosDestacados: "Erectores espinales e Isquiosurales",
                detalles: "Espalda completamente plana y barra colgando de los hombros.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Contracción Escapular (Barra al Ombligo)",
                musculosDestacados: "Dorsal Ancho, Romboides y Bíceps",
                detalles: "Codos superando la línea de la espalda y escápulas completamente juntas.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Estiramiento Fascial Excéntrico",
                musculosDestacados: "Tensión excéntrica del Dorsal Ancho",
                detalles: "Descenso gradual sin perder la horizontalidad del torso.",
            }
        ]
    },
    {
        id: "curl-biceps",
        nombre: "Curl de Bíceps con Mancuernas",
        imagen: "./assets/exercises/curl-biceps.jpg",
        tipo: "pull",
        tipoNombre: "Tirón (Pull)",
        tipoIcono: "🏹",
        equipamiento: ["mancuerna"],
        dificultad: "Principiante",
        musculosPrincipales: ["Bíceps braquial", "Braquial anterior"],
        musculosSecundarios: ["Braquiorradial", "Flexores de muñeca"],
        resumen: "Aislamiento clásico para hipertrofia y pico de bíceps con supinación.",
        tecnica: {
            setup: "De pie o sentado, mancuernas en manos en agarre neutro a los costados del cuerpo.",
            concentrica: "Flexiona los codos manteniendo la parte superior del brazo inmóvil pegada a las costillas. Rota la muñeca hacia afuera (supinación) a mitad del recorrido apretando el bíceps arriba.",
            excentrica: "Baja en 3 segundos rotando de vuelta a la posición neutra.",
            respiracion: "Inhala abajo, exhala al subir la mancuerna.",
            tempo: "3-0-1-1"
        },
        riesgos: [
            "🚨 Balancear la espalda para iniciar la subida (momentum lesivo en lumbares).",
            "🚨 Adelantar los codos hacia el frente (involucra el hombro anterior y quita trabajo al bíceps)."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Agarre Neutro Inicial",
                musculosDestacados: "Braquial y Bíceps en reposo",
                detalles: "Brazos estirados al costado del cuerpo sin balanceos.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Supinación & Pico de Contracción",
                musculosDestacados: "Bíceps braquial en máxima tensión de acortamiento",
                detalles: "Muñeca girada hacia afuera con el meñique más alto que el pulgar.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Descenso Excéntrico Estirado",
                musculosDestacados: "Fase excéntrica del bíceps",
                detalles: "Control de 3 segundos hasta estirar completamente el codo.",
            }
        ]
    },
    {
        id: "fondos-paralelas",
        nombre: "Fondos en Barras Paralelas (Dips)",
        imagen: "./assets/exercises/fondos-paralelas.jpg",
        tipo: "empuje",
        tipoNombre: "Empuje (Push)",
        tipoIcono: "🛡️",
        equipamiento: ["corporal"],
        dificultad: "Intermedio / Avanzado",
        musculosPrincipales: ["Pectoral Inferior", "Tríceps braquial"],
        musculosSecundarios: ["Deltoides anterior"],
        resumen: "La sentadilla del tren superior: masa brutal para pecho y tríceps.",
        tecnica: {
            setup: "Sujétate en las barras paralelas con brazos extendidos. Inclina el torso ligeramente hacia adelante (20°-30°) para enfatizar el pectoral.",
            concentrica: "Flexiona los codos descendiendo hasta que el hombro quede ligeramente por debajo del codo (90° de flexión). Empuja con fuerza para volver a la posición inicial sin bloquear bruscamente los codos.",
            excentrica: "Baja en 3 segundos sin rebotar al fondo.",
            respiracion: "Inhala al bajar, exhala con fuerza al subir.",
            tempo: "3-0-1-0"
        },
        riesgos: [
            "🚨 Descender en exceso con falta de movilidad de hombro (desgarro cápsula anterior).",
            "🚨 Mantener el torso demasiado vertical si se busca trabajo de pecho (se va todo al tríceps)."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Bloqueo Superior & Inclinación",
                musculosDestacados: "Tríceps y Pectoral",
                detalles: "Codos casi extendidos, escápulas deprimidas y torso inclinado.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Fondo a 90° de Flexión",
                musculosDestacados: "Pectoral Menor y Mayor en máximo estiramiento",
                detalles: "Codos en 90°, antebrazo perpendicular y hombro estable.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Empuje y Cierre Concéntrico",
                musculosDestacados: "Tríceps y Pectoral inferior",
                detalles: "Empuje potente hasta la cima.",
            }
        ]
    },
    {
        id: "rueda-abdominal",
        nombre: "Rueda Abdominal en Alfombra (Ab Wheel)",
        imagen: "./assets/exercises/rueda-abdominal.jpg",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        equipamiento: ["rueda", "alfombra"],
        dificultad: "Avanzado",
        musculosPrincipales: ["Recto Abdominal", "Transverso del Abdomen"],
        musculosSecundarios: ["Dorsal Ancho", "Flexores de cadera", "Pectoral"],
        resumen: "El estímulo más brutal de antiextensión lumbar y fuerza nuclear del core.",
        tecnica: {
            setup: "De rodillas sobre la alfombra, sujetando la rueda con ambas manos justo bajo el pecho.",
            concentrica: "Rueda hacia adelante extendiendo el cuerpo en una línea recta sin dejar que la zona lumbar se hunda. Llega tan lejos como puedas manteniendo el control y tira desde los abdominales y dorsales para regresar.",
            excentrica: "Extensión gradual y milimétrica en 3 a 4 segundos.",
            respiracion: "Inhala al extenderte hacia el suelo, exhala fuerte al replegarte.",
            tempo: "3-1-1-0"
        },
        riesgos: [
            "🚨 Arquear la espalda baja: Puede provocar pellizcos en nervios espinales lumbares.",
            "🚨 Tirar con las caderas en vez del abdomen al volver."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: De Rodillas sobre Alfombra",
                musculosDestacados: "Core activado y pelvis neutra",
                detalles: "Rodillas protegidas por la esterilla, brazos firmes.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Extensión Máxima en Vuelo",
                musculosDestacados: "Recto abdominal y Transverso al 100%",
                detalles: "Cuerpo casi rozando el suelo con arco lumbar plano y firme.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Repliegue con Tracción Abdominal",
                musculosDestacados: "Dorsales y abdominales cerrando la bisagra",
                detalles: "Regreso sin mover las caderas hacia atrás primero.",
            }
        ]
    },
    {
        id: "salto-comba",
        nombre: "Salto a la Comba (Jump Rope)",
        imagen: "./assets/exercises/salto-comba.jpg",
        tipo: "combate",
        tipoNombre: "Combate & Cardio",
        tipoIcono: "🥊",
        equipamiento: ["comba", "alfombra"],
        dificultad: "Todos los niveles",
        musculosPrincipales: ["Gemelos (Gastrocnemio y Sóleo)", "Cardiovascular"],
        musculosSecundarios: ["Antebrazos", "Deltoides", "Core"],
        resumen: "Coordinación rítmica, reactividad elástica en tobillos y potencia cardiopulmonar.",
        tecnica: {
            setup: "Comba en manos, codos pegados a los costados, rotación originada exclusivamente en las muñecas, sobre alfombra o suelo amortiguado.",
            concentrica: "Salta apenas 2 a 3 cm sobre las puntas de los pies, amortiguando con rodillas suaves.",
            excentrica: "Rebote elástico sin apoyar los talones.",
            respiracion: "Ritmo nasal constante y fluido.",
            tempo: "Rounds de 3 minutos continuos"
        },
        riesgos: [
            "🚨 Saltar sobre superficies excesivamente duras sin alfombra (fascitis plantar).",
            "🚨 Mover los brazos enteros en lugar de girar las muñecas."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Muñecas Pegadas & Postura Erguida",
                musculosDestacados: "Core y Deltoides estabilizando",
                detalles: "Hombros relajados, mirada fija al frente.",
            },
            {
                fase: 2,
                titulo: "Fase 2: Elevación en Suspensión Elástica",
                musculosDestacados: "Gemelos y Tendón de Aquiles",
                detalles: "Paso de la cuerda con mínimo despegue del suelo.",
            },
            {
                fase: 3,
                titulo: "Fase 3: Aterrizaje Amortiguado en Metatarsos",
                musculosDestacados: "Musculatura del pie y Sóleo",
                detalles: "Rebote suave y continuo sin apoyar los talones.",
            }
        ]
    },
    // ========================================================
    // NUEVO LOTE DE EJERCICIOS (16 EJERCICIOS ADICIONALES)
    // ========================================================
    {
        id: "abduccion-cadera-maquina-pie",
        nombre: "Abducción de Cadera en Máquina de Pie (Standing Machine Hip Abduction)",
        imagen: "./assets/exercises/image_10.png",
        imagen_url: "./assets/exercises/image_10.png",
        animacion_gif: "",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        grupoMuscular: "Glúteos y Flexores",
        equipamiento: ["maquinas"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Glúteo Medio", "Glúteo Menor", "Tensor de la fascia lata"],
        musculosSecundarios: ["Glúteo Mayor (fibras superiores)", "Core estabilizador"],
        musculos_implicados: ["Glúteo Medio", "Glúteo Menor", "Tensor de la fascia lata", "Glúteo Mayor", "Core"],
        resumen: "Aislamiento biomecánico en bipedestación para el desarrollo del glúteo medio y estabilidad de la pelvis.",
        descripcion: "Aislamiento biomecánico en bipedestación para el desarrollo del glúteo medio y estabilidad de la pelvis.",
        pasos_ejecucion: [
            "Ajusta la palanca de la máquina y apoya la cara externa de la pierna activa contra el cojín acolchado.",
            "Mantén el torso erguido y eleva la pierna lateralmente contrayendo el glúteo medio sin inclinar la columna.",
            "Desciende en 3 segundos frenando la carga sin que las placas choquen."
        ],
        tecnica: {
            setup: "Colócate de pie en la máquina con la pelvis neutra y alineada. Apoya la cara lateral de la pierna sobre el rodillo acolchado y sujétate firmemente de los agarres de apoyo.",
            concentrica: "Separa la pierna lateralmente hacia afuera mediante contracción pura del glúteo medio, manteniendo la rodilla con un leve desbloqueo y sin rotar la cadera hacia atrás.",
            excentrica: "Controla el descenso en 3 segundos resistiendo el retorno del contrapeso sin dejar que las placas golpeen.",
            respiracion: "Inhala antes de separar la pierna, exhala durante la abducción máxima.",
            tempo: "3-1-1-1 (1s de contracción isométrica en la apertura)"
        },
        riesgos: [
            "🚨 Inclinar el torso lateralmente para compensar la falta de fuerza del glúteo medio.",
            "🚨 Rotar la punta del pie hacia afuera convirtiendo el movimiento en una extensión de cadera con glúteo mayor."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Setup & Estabilización Pélvica",
                musculosDestacados: "Glúteo de la pierna de apoyo y Core",
                detalles: "Pelvis horizontal, columna recta y abdomen activo."
            },
            {
                fase: 2,
                titulo: "Fase 2: Máxima Abducción Lateral",
                musculosDestacados: "Glúteo Medio y Menor al 100%",
                detalles: "Apertura controlada a 35°-45° sin torsión espinal."
            },
            {
                fase: 3,
                titulo: "Fase 3: Retorno Excéntrico Controlado",
                musculosDestacados: "Tensión excéntrica del Glúteo Medio",
                detalles: "Frenado suave en 3 segundos manteniendo la tensión muscular."
            }
        ]
    },
    {
        id: "abduccion-pierna-suelo",
        nombre: "Abducción de una Pierna al Suelo (Lying Leg Abduction)",
        imagen: "./assets/exercises/fire-hydrant.jpg",
        imagen_url: "./assets/exercises/fire-hydrant.jpg",
        animacion_gif: "",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        grupoMuscular: "Glúteos y Flexores",
        equipamiento: ["sin_herramientas"],
        dificultad: "Principiante",
        musculosPrincipales: ["Glúteo Medio", "Glúteo Menor"],
        musculosSecundarios: ["Oblicuo externo", "Tensor de la fascia lata", "Transverso abdominal"],
        musculos_implicados: ["Glúteo Medio", "Glúteo Menor", "Oblicuo externo", "Tensor de la fascia lata"],
        resumen: "Trabajo de suelo en decúbito lateral para activación neuromuscular del glúteo medio sin sobrecarga articular.",
        descripcion: "Trabajo de suelo en decúbito lateral para activación neuromuscular del glúteo medio sin sobrecarga articular.",
        pasos_ejecucion: [
            "Túmbate de lado con las piernas estiradas y el cuello alineado con la columna.",
            "Eleva la pierna superior a unos 45° manteniendo la punta del pie orientada al frente o ligeramente hacia abajo.",
            "Baja con control en 3 segundos sin llegar a apoyar totalmente la pierna para no perder la tensión."
        ],
        tecnica: {
            setup: "Túmbate sobre un lateral del cuerpo con la columna y cuello rectos, apoyando la cabeza sobre el brazo inferior. Pierna inferior ligeramente flexionada para estabilidad.",
            concentrica: "Eleva la pierna superior en el plano lateral a unos 45 grados contrayendo la cara lateral de la cadera. Mantén la pelvis perpendicular al suelo sin rodar hacia atrás.",
            excentrica: "Desciende en 3 segundos frenando la gravedad hasta rozar la pierna inferior.",
            respiracion: "Inhala abajo, exhala al elevar la pierna.",
            tempo: "3-0-1-1"
        },
        riesgos: [
            "🚨 Rodar la pelvis hacia atrás, lo que traslada el esfuerzo al flexor de cadera (psoas).",
            "🚨 Elevar la pierna por encima de 45° forzando flexión lateral lumbar."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Alineación en Decúbito Lateral",
                musculosDestacados: "Core y Glúteo Medio en pretensión",
                detalles: "Línea neutra hombro-cadera-tobillo con pelvis estable."
            },
            {
                fase: 2,
                titulo: "Fase 2: Pico de Elevación Lateral",
                musculosDestacados: "Glúteo Medio en máxima contracción",
                detalles: "Talón guiando la subida para enfocar el haz posterior del glúteo medio."
            },
            {
                fase: 3,
                titulo: "Fase 3: Descenso Controlado en Tensión",
                musculosDestacados: "Fase excéntrica del Glúteo Medio",
                detalles: "Baja lenta sin descansar el pie en el suelo entre repeticiones."
            }
        ]
    },
    {
        id: "aduccion-cadera-maquina-sentado",
        nombre: "Aducción de Cadera en Máquina Sentado (Seated Machine Hip Adduction)",
        imagen: "./assets/exercises/aduccion-cadera-maquina-sentado.jpg",
        imagen_url: "./assets/exercises/aduccion-cadera-maquina-sentado.jpg",
        animacion_gif: "",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        grupoMuscular: "Glúteos y Flexores",
        equipamiento: ["maquinas"],
        dificultad: "Principiante / Intermedio",
        musculosPrincipales: ["Aductor Mayor", "Aductor Largo", "Grácil"],
        musculosSecundarios: ["Pectíneo", "Sartorio", "Flexores profundos de cadera"],
        musculos_implicados: ["Aductor Mayor", "Aductor Largo", "Grácil", "Pectíneo", "Sartorio"],
        resumen: "Aislamiento específico de los aductores en sedestación para estabilidad pélvica y fuerza interna del muslo.",
        descripcion: "Aislamiento específico de los aductores en sedestación para estabilidad pélvica y fuerza interna del muslo.",
        pasos_ejecucion: [
            "Ajusta la apertura de las almohadillas para obtener un estiramiento confortable sin hiperextensión inguinal.",
            "Junta las piernas contrayendo con fuerza los aductores hasta tocar las almohadillas al centro.",
            "Abre controlando la resistencia en 3 segundos sin dejar caer el peso."
        ],
        tecnica: {
            setup: "Siéntate con la espalda bien pegada al respaldo, rodillas flexionadas y almohadillas en la cara interna de los muslos o rodillas.",
            concentrica: "Cierra las piernas hacia el centro venciendo la resistencia con una contracción focalizada de la cara interna del muslo.",
            excentrica: "Abre de forma controlada en 3 a 4 segundos permitiendo un estiramiento seguro sin rebote.",
            respiracion: "Inhala al abrir las piernas, exhala con fuerza al juntarlas en el centro.",
            tempo: "3-1-1-1"
        },
        riesgos: [
            "🚨 Cargar peso excesivo que fuerce la inserción púbica del aductor largo (riesgo de pubalgia).",
            "🚨 Separar la zona lumbar del respaldo empujando con impulso del torso."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Apertura & Preestiramiento Seguro",
                musculosDestacados: "Aductor Mayor y Grácil bajo tensión",
                detalles: "Pelvis fija en el respaldo y pies apoyados en los estribos."
            },
            {
                fase: 2,
                titulo: "Fase 2: Cierre y Contacto Central",
                musculosDestacados: "Contracción máxima de toda la cadena aductora",
                detalles: "Rodillas al centro con 1 segundo de parada isométrica."
            },
            {
                fase: 3,
                titulo: "Fase 3: Apertura Excéntrica Lenta",
                musculosDestacados: "Fase excéntrica de Aductores",
                detalles: "Freno progresivo de la carga manteniendo el torso erguido."
            }
        ]
    },
    {
        id: "air-squats",
        nombre: "Air Squats (Bodyweight Squats)",
        imagen: "./assets/exercises/air-squats.jpg",
        imagen_url: "./assets/exercises/air-squats.jpg",
        animacion_gif: "",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        grupoMuscular: "Cuádriceps",
        equipamiento: ["sin_herramientas"],
        dificultad: "Principiante",
        musculosPrincipales: ["Cuádriceps", "Glúteo Mayor"],
        musculosSecundarios: ["Isquiosurales", "Aductores", "Core"],
        musculos_implicados: ["Cuádriceps", "Glúteo Mayor", "Isquiosurales", "Aductores", "Core"],
        resumen: "Sentadilla con peso corporal para movilidad, acondicionamiento metabólico y patrón biomecánico base de tren inferior.",
        descripcion: "Sentadilla con peso corporal para movilidad, acondicionamiento metabólico y patrón biomecánico base de tren inferior.",
        pasos_ejecucion: [
            "Pies separados al ancho de hombros con las puntas ligeramente hacia afuera.",
            "Desciende flexionando cadera y rodillas hasta romper la paralela manteniendo el pecho erguido.",
            "Empuja el suelo con toda la planta del pie para regresar a la bipedestación."
        ],
        tecnica: {
            setup: "Pies al ancho de hombros, puntas abiertas entre 15° y 30°, brazos extendidos al frente para contrapeso.",
            concentrica: "Desciende llevando caderas atrás y abajo manteniendo el torso erguido hasta que el pliegue de la cadera quede bajo la rodilla. Empuja con fuerza para subir.",
            excentrica: "Controla la bajada en 2 segundos manteniendo rodillas alineadas con el segundo dedo del pie.",
            respiracion: "Inhala al descender, exhala al extender cadera arriba.",
            tempo: "2-0-1-0"
        },
        riesgos: [
            "🚨 Despegar los talones del suelo sobrecargando la rótula.",
            "🚨 Colapso en valgo de las rodillas hacia la línea media."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Bipedestación & Anclaje Tripodal",
                musculosDestacados: "Cuádriceps y Core preparados",
                detalles: "Talón, primer y quinto metatarso firmemente clavados."
            },
            {
                fase: 2,
                titulo: "Fase 2: Sentadilla Profunda (Rompiendo Paralela)",
                musculosDestacados: "Cuádriceps y Glúteo Mayor en estiramiento",
                detalles: "Cadera bajo nivel de rodillas, pecho abierto y columna neutra."
            },
            {
                fase: 3,
                titulo: "Fase 3: Extensión Triple y Bloqueo Suave",
                musculosDestacados: "Glúteos y Cuádriceps",
                detalles: "Regreso a la vertical sin hiperextender rodillas bruscamente."
            }
        ]
    },
    {
        id: "alternating-reach-kickback",
        nombre: "Alternating Reach & Kickback (Bird Dog)",
        imagen: "./assets/exercises/alternating-reach-kickback.jpg",
        imagen_url: "./assets/exercises/alternating-reach-kickback.jpg",
        animacion_gif: "",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        grupoMuscular: "Espalda baja",
        equipamiento: ["sin_herramientas"],
        dificultad: "Principiante / Intermedio",
        musculosPrincipales: ["Erectores espinales", "Multífidos", "Glúteo Mayor"],
        musculosSecundarios: ["Deltoides posterior", "Transverso del abdomen", "Trapecio medio"],
        musculos_implicados: ["Erectores espinales", "Multífidos", "Glúteo Mayor", "Deltoides", "Core"],
        resumen: "Ejercicio del 'Big 3 de McGill' para estabilidad lumbar, salud discal y control cruzado contralateral.",
        descripcion: "Ejercicio del 'Big 3 de McGill' para estabilidad lumbar, salud discal y control cruzado contralateral.",
        pasos_ejecucion: [
            "Posición de cuadrupedia con manos bajo los hombros y rodillas bajo las caderas.",
            "Extiende simultáneamente el brazo derecho al frente y la pierna izquierda atrás hasta formar una línea horizontal.",
            "Mantén 2 segundos la posición isométrica y regresa con lentitud para alternar de lado."
        ],
        tecnica: {
            setup: "Cuadrupedia sobre alfombra o colchoneta: muñecas alineadas bajo hombros y rodillas bajo caderas. Columna en posición neutra.",
            concentrica: "Extiende al mismo tiempo un brazo hacia adelante y la pierna contraria hacia atrás hasta que queden paralelos al suelo, sin rotar la pelvis ni arquear la zona lumbar.",
            excentrica: "Regresa al suelo de manera controlada y sin balanceos.",
            respiracion: "Inhala en el centro, exhala al extender brazo y pierna contraria.",
            tempo: "2-2-2-0 (2s de pausa isométrica en extensión)"
        },
        riesgos: [
            "🚨 Hiperextender la zona lumbar subiendo la pierna por encima de la horizontal.",
            "🚨 Rotar la pelvis hacia el lado de la pierna levantada perdiendo la neutralidad sacrolumbar."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Cuadrupedia Estable (Mesa Neutra)",
                musculosDestacados: "Transverso abdominal y Serrato",
                detalles: "Espalda plana como una mesa, cuello alineado con la mirada al suelo."
            },
            {
                fase: 2,
                titulo: "Fase 2: Extensión Contralateral (Línea Horizontal)",
                musculosDestacados: "Multífidos, Erectores y Glúteo Mayor",
                detalles: "Brazo y pierna opuesta extendidos formando una línea horizontal perfecta."
            },
            {
                fase: 3,
                titulo: "Fase 3: Retorno Lento y Transición",
                musculosDestacados: "Core estabilizador antirotación",
                detalles: "Control milimétrico sin dejar caer la cadera antes de alternar de lado."
            }
        ]
    },
    {
        id: "apertura-pecho-bandas-inclinada",
        nombre: "Apertura de Pecho con Bandas Elásticas Inclinada (Incline Band Chest Fly)",
        imagen: "./assets/exercises/aperturas-pecho.jpg",
        imagen_url: "./assets/exercises/aperturas-pecho.jpg",
        animacion_gif: "",
        tipo: "empuje",
        tipoNombre: "Empuje (Push)",
        tipoIcono: "🛡️",
        grupoMuscular: "Pecho",
        equipamiento: ["elasticos"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Pectoral Mayor (haz clavicular / superior)"],
        musculosSecundarios: ["Deltoides anterior", "Bíceps (cabeza corta)", "Serrato anterior"],
        musculos_implicados: ["Pectoral Mayor superior", "Deltoides anterior", "Bíceps", "Serrato"],
        resumen: "Aducción horizontal inclinada con curva de resistencia progresiva para estímulo del pectoral superior.",
        descripcion: "Aducción horizontal inclinada con curva de resistencia progresiva para estímulo del pectoral superior.",
        pasos_ejecucion: [
            "Fija la banda elástica en un punto bajo por detrás de ti y sujeta los extremos con ambas manos.",
            "Lleva las manos hacia arriba y al centro en trayectoria diagonal como abrazando un árbol.",
            "Regresa abriendo los brazos en 3 segundos manteniendo los codos ligeramente flexionados."
        ],
        tecnica: {
            setup: "Banda fijada en posición baja. Da un paso adelante para generar tensión inicial. Torso erguido con ligera inclinación al frente y codos con 15° de flexión fija.",
            concentrica: "Junta las manos hacia arriba y hacia la línea media del pecho (altura clavicular) apretando el pectoral superior en la contracción terminal.",
            excentrica: "Abre los brazos lentamente resistiendo el tirón de la banda durante 3 segundos.",
            respiracion: "Inhala al abrir el pecho, exhala al juntar las manos arriba.",
            tempo: "3-0-1-1"
        },
        riesgos: [
            "🚨 Hiperextender los hombros hacia atrás perdiendo el control de la tensión de la banda.",
            "🚨 Flexionar y estirar los codos convirtiendo la apertura en un press."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Tensión Inicial & Pecho Abierto",
                musculosDestacados: "Pectoral Mayor estirado y Deltoides",
                detalles: "Brazos abiertos en diagonal baja con leve flexión de codos."
            },
            {
                fase: 2,
                titulo: "Fase 2: Cierre Ascendente al Centro",
                musculosDestacados: "Pico de contracción del Pectoral Clavicular",
                detalles: "Manos convergen a la altura del esternón superior con máxima tensión elástica."
            },
            {
                fase: 3,
                titulo: "Fase 3: Apertura Excéntrica Progresiva",
                musculosDestacados: "Tensión excéntrica del Pectoral",
                detalles: "Control continuo sin permitir que la banda tire bruscamente de los hombros."
            }
        ]
    },
    {
        id: "aperturas-declinado-mancuernas",
        nombre: "Aperturas Declinado con Mancuernas (Decline Dumbbell Fly)",
        imagen: "./assets/exercises/aperturas-pecho.jpg",
        imagen_url: "./assets/exercises/aperturas-pecho.jpg",
        animacion_gif: "",
        tipo: "empuje",
        tipoNombre: "Empuje (Push)",
        tipoIcono: "🛡️",
        grupoMuscular: "Pecho",
        equipamiento: ["mancuernas"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Pectoral Mayor (haz esternal e inferior)"],
        musculosSecundarios: ["Deltoides anterior", "Bíceps braquial"],
        musculos_implicados: ["Pectoral Mayor inferior", "Deltoides anterior", "Bíceps braquial"],
        resumen: "Aislamiento con gran estiramiento excéntrico enfocado en el corte y borde inferior del pectoral.",
        descripcion: "Aislamiento con gran estiramiento excéntrico enfocado en el corte y borde inferior del pectoral.",
        pasos_ejecucion: [
            "Túmbate en un banco declinado a 15°-30° asegurando los tobillos en los rodillos.",
            "Inicia con las mancuernas sobre el pecho inferior y ábrelas en un arco amplio con los codos semiflexionados.",
            "Cierra de nuevo en arco contrayendo el pectoral inferior."
        ],
        tecnica: {
            setup: "Túmbate en banco declinado con las piernas ancladas. Mancuernas sobre el pecho con agarre neutro y codos ligeramente flexionados.",
            concentrica: "Cierra las mancuernas en trayectoria de arco amplio hasta que queden sobre la parte baja del esternón, apretando el pectoral inferior.",
            excentrica: "Baja las mancuernas en 3 segundos abriendo los brazos hasta sentir un estiramiento marcado pero seguro a nivel del pecho.",
            respiracion: "Inhala al abrir los brazos, exhala al juntar las mancuernas.",
            tempo: "3-1-1-0"
        },
        riesgos: [
            "🚨 Bajar las mancuernas más allá del plano del torso sobrecargando el tendón del bíceps y labrum.",
            "🚨 Chocar fuertemente las mancuernas en la parte alta anulando la tensión continua."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Punto Alto sobre Esternón Inferior",
                musculosDestacados: "Pectoral Inferior y Deltoides Anterior",
                detalles: "Mancuernas en vertical con palmas enfrentadas y escápulas ancladas."
            },
            {
                fase: 2,
                titulo: "Fase 2: Apertura Máxima en Arco",
                musculosDestacados: "Pectoral Mayor en máximo estiramiento bajo carga",
                detalles: "Codos en 20° de flexión constante, deteniendo el descenso a la altura del banco."
            },
            {
                fase: 3,
                titulo: "Fase 3: Cierre Concéntrico Enfocado",
                musculosDestacados: "Contracción de fibras esternocostales",
                detalles: "Abrazo ascendente manteniendo el ángulo de los codos invariable."
            }
        ]
    },
    {
        id: "aperturas-invertidas-maquina",
        nombre: "Aperturas Invertidas con Agarre Horizontal (Reverse Machine Fly)",
        imagen: "./assets/exercises/aperturas-invertidas-maquina.jpg",
        imagen_url: "./assets/exercises/aperturas-invertidas-maquina.jpg",
        animacion_gif: "",
        tipo: "pull",
        tipoNombre: "Tirón (Pull)",
        tipoIcono: "🏹",
        grupoMuscular: "Hombros",
        equipamiento: ["maquinas"],
        dificultad: "Principiante / Intermedio",
        musculosPrincipales: ["Deltoides Posterior"],
        musculosSecundarios: ["Romboides", "Trapecio Medio", "Infraespinoso"],
        musculos_implicados: ["Deltoides Posterior", "Romboides", "Trapecio Medio", "Infraespinoso"],
        resumen: "Abducción horizontal controlada en máquina para hipertrofia del deltoides posterior y salud escapulohumeral.",
        descripcion: "Abducción horizontal controlada en máquina para hipertrofia del deltoides posterior y salud escapulohumeral.",
        pasos_ejecucion: [
            "Siéntate mirando hacia la máquina peck-deck con el pecho pegado a la almohadilla.",
            "Sujeta los manerales horizontales con agarre prono y los brazos casi extendidos a la altura de los hombros.",
            "Abre los brazos hacia atrás en un arco horizontal contrayendo la parte posterior del hombro."
        ],
        tecnica: {
            setup: "Ajusta la altura del asiento para que los agarres horizontales queden a la altura exacta de los hombros. Pecho apoyado en el cojín y columna neutra.",
            concentrica: "Lleva los brazos hacia atrás en el plano horizontal empujando con el deltoides posterior, manteniendo una ligera flexión de codos inmutable.",
            excentrica: "Retorna en 3 segundos frenando el contrapeso antes de que las placas toquen fondo.",
            respiracion: "Inhala al frente, exhala al traccionar hacia atrás.",
            tempo: "3-0-1-1"
        },
        riesgos: [
            "🚨 Encoger los hombros hacia arriba activando el trapecio superior en lugar del deltoides posterior.",
            "🚨 Impulsar el torso despegándolo del cojín de apoyo."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Agarre Horizontal Inicial",
                musculosDestacados: "Deltoides posterior pretensado",
                detalles: "Brazos paralelos al suelo y escápulas neutras apoyadas en el respaldo frontal."
            },
            {
                fase: 2,
                titulo: "Fase 2: Apertura Posterior Plena",
                musculosDestacados: "Deltoides Posterior y Romboides",
                detalles: "Manos superan la línea del torso con 1 segundo de pausa isométrica."
            },
            {
                fase: 3,
                titulo: "Fase 3: Cierre Excéntrico Controlado",
                musculosDestacados: "Tensión excéntrica del hombro posterior",
                detalles: "Freno lento en 3 segundos sin choque de placas."
            }
        ]
    },
    {
        id: "abdominales-crunches",
        nombre: "Abdominales (Crunches)",
        imagen: "./assets/exercises/abdominales-crunches.jpg",
        imagen_url: "./assets/exercises/abdominales-crunches.jpg",
        animacion_gif: "",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        grupoMuscular: "Abdominales",
        equipamiento: ["sin_herramientas"],
        dificultad: "Principiante",
        musculosPrincipales: ["Recto Abdominal (porción superior)"],
        musculosSecundarios: ["Oblicuos externos e internos", "Transverso"],
        musculos_implicados: ["Recto Abdominal", "Oblicuos", "Transverso"],
        resumen: "Flexión torácica controlada de columna para acortamiento pico del recto abdominal sin involucrar psoas.",
        descripcion: "Flexión torácica controlada de columna para acortamiento pico del recto abdominal sin involucrar psoas.",
        pasos_ejecucion: [
            "Túmbate bocarriba con las rodillas flexionadas y los pies apoyados en el suelo.",
            "Coloca las manos en el pecho o detrás de las orejas sin tirar del cuello.",
            "Eleva las escápulas del suelo enrollando el torso hacia la pelvis y baja con control."
        ],
        tecnica: {
            setup: "Decúbito supino sobre esterilla, rodillas a 90°, pies en suelo, manos rozando sienes (sin entrelazar dedos tras la nuca) y zona lumbar en contacto con el suelo.",
            concentrica: "Flexiona la columna dorsal acercando las costillas hacia la pelvis despegando las escápulas del suelo 5 a 10 cm, sintiendo el ardor en el recto abdominal.",
            excentrica: "Baja en 2 segundos desenrollando la columna vértebra a vértebra sin relajar la tensión.",
            respiracion: "Inhala abajo, exhala completamente arriba vaciando el aire para mayor acortamiento.",
            tempo: "2-1-1-1"
        },
        riesgos: [
            "🚨 Tirar del cuello con las manos provocando tensión lesiva cervical.",
            "🚨 Elevar toda la espalda convirtiendo el ejercicio en un sit-up con sobrecarga del psoas."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Posición Supina & Lumbar Anclada",
                musculosDestacados: "Transverso abdominal estabilizando",
                detalles: "Espalda baja firmemente presionada contra la esterilla."
            },
            {
                fase: 2,
                titulo: "Fase 2: Enrollamiento Torácico (Escápulas en el Aire)",
                musculosDestacados: "Recto Abdominal en máxima contracción",
                detalles: "Flexión de columna torácica sin despegar la región lumbar."
            },
            {
                fase: 3,
                titulo: "Fase 3: Descenso Vertebral Lento",
                musculosDestacados: "Tensión excéntrica del Recto Abdominal",
                detalles: "Retorno vértebra por vértebra sin relajarse al final."
            }
        ]
    },
    {
        id: "abdominales-inversos-pelota-suiza",
        nombre: "Abdominales Inversos con Pelota Suiza (Swiss Ball Reverse Crunch)",
        imagen: "./assets/exercises/abdominales-crunches.jpg",
        imagen_url: "./assets/exercises/abdominales-crunches.jpg",
        animacion_gif: "",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        grupoMuscular: "Abdominales",
        equipamiento: ["pelota"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Recto Abdominal (porción inferior)", "Transverso del Abdomen"],
        musculosSecundarios: ["Oblicuos", "Flexores de cadera", "Aductores"],
        musculos_implicados: ["Recto Abdominal inferior", "Transverso", "Oblicuos", "Flexores de cadera"],
        resumen: "Tracción pélvica hacia el torso con rodadura de pelota suiza para activar la porción infraumbilical del abdomen.",
        descripcion: "Tracción pélvica hacia el torso con rodadura de pelota suiza para activar la porción infraumbilical del abdomen.",
        pasos_ejecucion: [
            "Túmbate en el suelo sujetando la pelota suiza firmemente entre los gemelos y los isquios.",
            "Brazos apoyados a los lados para estabilizar el torso.",
            "Eleva las rodillas hacia el pecho despegando la pelvis del suelo y baja en 3 segundos."
        ],
        tecnica: {
            setup: "Túmbate bocarriba en el suelo y aprieta la pelota suiza entre los talones y la parte trasera de los muslos. Brazos en el suelo con palmas hacia abajo.",
            concentrica: "Contrae el abdomen inferior enrollando la pelvis hacia el ombligo, despegando el sacro del suelo mientras llevas la pelota hacia el pecho.",
            excentrica: "Desciende en 3 segundos hasta que el sacro vuelva a apoyar suavemente sin arquear la zona lumbar.",
            respiracion: "Inhala abajo, exhala fuerte al elevar la pelvis.",
            tempo: "3-1-1-1"
        },
        riesgos: [
            "🚨 Usar impulso balanceando las piernas en lugar de contraer el abdomen.",
            "🚨 Arquear la columna lumbar al descender perdiendo el contacto pélvico con la esterilla."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Sujeción Activa de Pelota Suiza",
                musculosDestacados: "Isquiosurales y Aductores fijando el balón",
                detalles: "Pelota asegurada entre piernas y espalda lumbar plana."
            },
            {
                fase: 2,
                titulo: "Fase 2: Retroversión Pélvica & Elevación Sacra",
                musculosDestacados: "Recto Abdominal inferior y Transverso",
                detalles: "Pelvis despegada del suelo 5-10 cm rodando hacia el pecho."
            },
            {
                fase: 3,
                titulo: "Fase 3: Apoyo Excéntrico Controlado",
                musculosDestacados: "Control excéntrico del Core",
                detalles: "Freno lento en 3 segundos manteniendo la pelota fijada."
            }
        ]
    },
    {
        id: "abdominales-pelota-suiza",
        nombre: "Abdominales con Pelota Suiza (Swiss Ball Crunch)",
        imagen: "./assets/exercises/abdominales-crunches.jpg",
        imagen_url: "./assets/exercises/abdominales-crunches.jpg",
        animacion_gif: "",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        grupoMuscular: "Abdominales",
        equipamiento: ["pelota"],
        dificultad: "Principiante / Intermedio",
        musculosPrincipales: ["Recto Abdominal (rango completo)"],
        musculosSecundarios: ["Oblicuos", "Transverso abdominal"],
        musculos_implicados: ["Recto Abdominal", "Oblicuos", "Transverso"],
        resumen: "Crunch sobre superficie curva que permite hiperextensión fisiológica y mayor ROM de contracción abdominal.",
        descripcion: "Crunch sobre superficie curva que permite hiperextensión fisiológica y mayor ROM de contracción abdominal.",
        pasos_ejecucion: [
            "Apoya la zona lumbar y media de la espalda sobre la pelota suiza con los pies bien plantados en el suelo.",
            "Deja que la columna se extienda ligeramente siguiendo la curva de la pelota.",
            "Enrolla el torso hacia arriba apretando los abdominales y desciende suavemente."
        ],
        tecnica: {
            setup: "Apoya la curva lumbar y dorsal media sobre la pelota suiza. Pies bien separados y anclados al suelo para máxima estabilidad. Manos a las sienes.",
            concentrica: "Flexiona el torso enrollando el esternón hacia la pelvis. La pelota suiza permite mayor recorrido de flexión que el suelo.",
            excentrica: "Extiende la columna hacia atrás sobre la pelota en 3 segundos sintiendo el estiramiento completo del recto abdominal.",
            respiracion: "Inhala al extenderte atrás, exhala al subir.",
            tempo: "3-1-1-1"
        },
        riesgos: [
            "🚨 Colocar la pelota demasiado arriba en la espalda eliminando el soporte lumbar.",
            "🚨 Tirar del cuello hacia adelante."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Preestiramiento sobre Curvatura",
                musculosDestacados: "Recto Abdominal en estiramiento pasivo",
                detalles: "Espalda apoyada en la pelota con cadera estable."
            },
            {
                fase: 2,
                titulo: "Fase 2: Pico Concéntrico en Flexión",
                musculosDestacados: "Recto Abdominal en máxima tensión",
                detalles: "Costillas acercadas a la pelvis con vaciado pulmonar."
            },
            {
                fase: 3,
                titulo: "Fase 3: Descenso Amortiguado en Pelota",
                musculosDestacados: "Control excéntrico del Core",
                detalles: "Baja lenta adaptando la columna a la pelota."
            }
        ]
    },
    {
        id: "abdominales-roller",
        nombre: "Abdominales con Roller (Ab Wheel Rollout)",
        imagen: "./assets/exercises/rueda-abdominal.jpg",
        imagen_url: "./assets/exercises/rueda-abdominal.jpg",
        animacion_gif: "",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        grupoMuscular: "Abdominales",
        equipamiento: ["foam_roller"],
        dificultad: "Avanzado",
        musculosPrincipales: ["Recto Abdominal", "Transverso del Abdomen"],
        musculosSecundarios: ["Dorsal Ancho", "Serrato anterior", "Flexores de cadera"],
        musculos_implicados: ["Recto Abdominal", "Transverso", "Dorsal Ancho", "Serrato"],
        resumen: "Antiextensión lumbar dinámica de máxima demanda neuromuscular para firmeza absoluta del core.",
        descripcion: "Antiextensión lumbar dinámica de máxima demanda neuromuscular para firmeza absoluta del core.",
        pasos_ejecucion: [
            "De rodillas sobre colchoneta, coloca las manos sobre el roller o rueda abdominal.",
            "Rueda hacia el frente manteniendo la pelvis en retroversión y la espalda neutra.",
            "Tira desde el abdomen y dorsales para regresar a la posición inicial."
        ],
        tecnica: {
            setup: "De rodillas sobre superficie acolchada, apoyando ambas manos sobre el roller colocado justo debajo del pecho. Pelvis en ligera retroversión.",
            concentrica: "Rueda hacia adelante extendiendo el torso en línea recta hasta donde puedas sostener la columna sin que la zona lumbar colapse. Regresa traccionando con abdomen.",
            excentrica: "Extensión gradual y constante en 3 a 4 segundos.",
            respiracion: "Inhala al estirarte hacia adelante, exhala al replegarte.",
            tempo: "3-1-1-0"
        },
        riesgos: [
            "🚨 Dejar caer la zona lumbar en hiperlordosis pellizcando los discos.",
            "🚨 Regresar tirando de las caderas hacia atrás en lugar de activar el abdomen."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Posición de Partida en Cuadrupedia Compacta",
                musculosDestacados: "Core y Dorsales activados",
                detalles: "Roller bajo hombros y pelvis en retroversión protectora."
            },
            {
                fase: 2,
                titulo: "Fase 2: Extensión Máxima en Antiextensión",
                musculosDestacados: "Transverso y Recto Abdominal al 100%",
                detalles: "Cuerpo horizontal a escasos centímetros del suelo con columna recta."
            },
            {
                fase: 3,
                titulo: "Fase 3: Tracción Abdominal de Retorno",
                musculosDestacados: "Dorsales y Abdomen cerrando la bisagra",
                detalles: "Retorno sin quebrar la cadera hacia los talones."
            }
        ]
    },
    {
        id: "abdominales-banco-declinado",
        nombre: "Abdominales en Banco Declinado (Decline Crunch)",
        imagen: "./assets/exercises/abdominales-crunches.jpg",
        imagen_url: "./assets/exercises/abdominales-crunches.jpg",
        animacion_gif: "",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        grupoMuscular: "Abdominales",
        equipamiento: ["maquinas"],
        dificultad: "Intermedio",
        musculosPrincipales: ["Recto Abdominal"],
        musculosSecundarios: ["Oblicuos", "Psoas ilíaco", "Recto femoral"],
        musculos_implicados: ["Recto Abdominal", "Oblicuos", "Psoas ilíaco"],
        resumen: "Flexión de tronco en ángulo declinado aumentando el brazo de palanca y la resistencia por gravedad.",
        descripcion: "Flexión de tronco en ángulo declinado aumentando el brazo de palanca y la resistencia por gravedad.",
        pasos_ejecucion: [
            "Fija las piernas firmemente en los rodillos del banco declinado.",
            "Cruza los brazos sobre el pecho e inclina el torso hacia atrás.",
            "Contrae el abdomen enrollando el torso hacia adelante hasta unos 45° y desciende con control."
        ],
        tecnica: {
            setup: "Ajusta la declinación del banco a 20°-35°. Engancha los tobillos en los soportes acolchados y apoya la espalda.",
            concentrica: "Enrolla la columna dorsal levantando los hombros y la espalda alta hacia las rodillas, concentrando la tensión en el abdomen.",
            excentrica: "Baja en 3 segundos desenrollando la columna sin llegar a apoyar los omóplatos para mantener tensión continua.",
            respiracion: "Inhala al descender, exhala arriba al contraer.",
            tempo: "3-0-1-1"
        },
        riesgos: [
            "🚨 Subir en bloque recto activando los flexores de cadera en lugar del abdomen.",
            "🚨 Dejarse caer bruscamente hacia atrás golpeando la cabeza."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Fijación en Rodillos & Posición Inclinada",
                musculosDestacados: "Core en tensión isométrica",
                detalles: "Torso en el plano del banco con escápulas despegadas."
            },
            {
                fase: 2,
                titulo: "Fase 2: Enrollamiento Torácico Superior",
                musculosDestacados: "Recto Abdominal en máxima congestión",
                detalles: "Subida concentrada sin despegar la zona lumbar del banco."
            },
            {
                fase: 3,
                titulo: "Fase 3: Descenso Excéntrico sin Reposo",
                musculosDestacados: "Tensión excéntrica del Recto Abdominal",
                detalles: "Descenso gradual frenando el ángulo de gravedad."
            }
        ]
    },
    {
        id: "abdominales-invertidos-banco",
        nombre: "Abdominales invertidos en banco (Decline Reverse Crunch)",
        imagen: "./assets/exercises/abdominales-crunches.jpg",
        imagen_url: "./assets/exercises/abdominales-crunches.jpg",
        animacion_gif: "",
        tipo: "core",
        tipoNombre: "Core & Abdomen",
        tipoIcono: "🧱",
        grupoMuscular: "Abdominales",
        equipamiento: ["sin_herramientas"],
        dificultad: "Intermedio / Avanzado",
        musculosPrincipales: ["Recto Abdominal (porción inferior)"],
        musculosSecundarios: ["Oblicuos internos y externos", "Transverso"],
        musculos_implicados: ["Recto Abdominal inferior", "Oblicuos", "Transverso"],
        resumen: "Elevación y retroversión de cadera en banco para máxima sobrecarga de la región abdominal inferior.",
        descripcion: "Elevación y retroversión de cadera en banco para máxima sobrecarga de la región abdominal inferior.",
        pasos_ejecucion: [
            "Túmbate en el banco con la cabeza en la parte superior y sujétate fuertemente del borde o maneral.",
            "Flexiona las rodillas y eleva la cadera despegando la pelvis del banco hacia el techo.",
            "Baja la pelvis de vuelta al banco en 3 segundos resistiendo la gravedad."
        ],
        tecnica: {
            setup: "Túmbate en el banco declinado con la cabeza en el extremo alto, sujetando el maneral o los bordes tras la cabeza. Rodillas semiflexionadas a 90°.",
            concentrica: "Eleva las rodillas hacia el pecho y continúa despegando la pelvis y la zona lumbar del banco hacia la vertical con pura contracción del abdomen inferior.",
            excentrica: "Baja la pelvis vértebra a vértebra en 3 segundos sin balancear las piernas.",
            respiracion: "Inhala abajo, exhala al proyectar la cadera hacia arriba.",
            tempo: "3-1-1-1"
        },
        riesgos: [
            "🚨 Usar el impulso de las piernas tipo 'patada' en lugar de tracción del core.",
            "🚨 Desprender la cabeza del banco creando tensión cervical."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Agarre en Cabecera & Rodillas en 90°",
                musculosDestacados: "Dorsales fijando el cuerpo y Core activo",
                detalles: "Manos ancladas y pelvis en contacto firme con el banco."
            },
            {
                fase: 2,
                titulo: "Fase 2: Elevación Sacro-Lumbar Vertical",
                musculosDestacados: "Recto Abdominal inferior en máxima tensión",
                detalles: "Pelvis propulsada hacia el techo con rodillas flexionadas."
            },
            {
                fase: 3,
                titulo: "Fase 3: Apoyo Excéntrico Vértebra a Vértebra",
                musculosDestacados: "Freno excéntrico del Abdomen inferior",
                detalles: "Baja lenta resistiendo la gravedad sin soltar la pelvis de golpe."
            }
        ]
    },
    {
        id: "abducciones-con-elastico",
        nombre: "Abducciones con Elástico (Band Hip Abduction)",
        imagen: "./assets/exercises/image_10.png",
        imagen_url: "./assets/exercises/image_10.png",
        animacion_gif: "",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        grupoMuscular: "Glúteos y Flexores",
        equipamiento: ["elasticos"],
        dificultad: "Principiante",
        musculosPrincipales: ["Glúteo Medio", "Glúteo Menor"],
        musculosSecundarios: ["Tensor de la fascia lata", "Piriforme"],
        musculos_implicados: ["Glúteo Medio", "Glúteo Menor", "Tensor de la fascia lata", "Piriforme"],
        resumen: "Apertura de cadera con mini-band para activación pre-entrenamiento o congestión final de glúteo medio.",
        descripcion: "Apertura de cadera con mini-band para activación pre-entrenamiento o congestión final de glúteo medio.",
        pasos_ejecucion: [
            "Coloca una banda elástica circular alrededor de los muslos (justo por encima de las rodillas).",
            "En posición sentada o de pie con ligera flexión de cadera, separa las rodillas hacia afuera venciendo la resistencia.",
            "Mantén 1 segundo la máxima apertura y regresa con control."
        ],
        tecnica: {
            setup: "Coloca la mini-band 2-3 cm por encima de las rodillas. Sentado al borde de un banco con los pies apoyados al ancho de hombros o de pie en posición atlética.",
            concentrica: "Separa las rodillas lateralmente empujando contra la resistencia elástica hasta notar máxima congestión en el lateral de los glúteos.",
            excentrica: "Controla el cierre de las rodillas en 2 a 3 segundos sin que la banda pierda tensión.",
            respiracion: "Inhala al centro, exhala al separar las rodillas.",
            tempo: "2-1-1-1"
        },
        riesgos: [
            "🚨 Dejar que la banda elástica junte las rodillas de golpe sin control excéntrico.",
            "🚨 Despegar la parte interna de los pies del suelo."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Pretensión de la Mini-Band",
                musculosDestacados: "Glúteo Medio en activación previa",
                detalles: "Rodillas al ancho de hombros con banda ya tensa."
            },
            {
                fase: 2,
                titulo: "Fase 2: Abducción Máxima con Parada",
                musculosDestacados: "Glúteo Medio y Menor al 100%",
                detalles: "Apertura lateral amplia con 1 segundo de contracción isométrica."
            },
            {
                fase: 3,
                titulo: "Fase 3: Cierre Lento sin Pérdida de Tensión",
                musculosDestacados: "Fase excéntrica de abductores",
                detalles: "Retorno controlado manteniendo la banda elástica bajo tensión."
            }
        ]
    },
    {
        id: "abduccion-pierna-flexionada-cuadrupedia",
        nombre: "Abducción con Pierna Flexionada en Cuadrupedia (Fire Hydrant)",
        imagen: "./assets/exercises/fire-hydrant.jpg",
        imagen_url: "./assets/exercises/fire-hydrant.jpg",
        animacion_gif: "",
        tipo: "piernas",
        tipoNombre: "Piernas",
        tipoIcono: "🦵",
        grupoMuscular: "Glúteos y Flexores",
        equipamiento: ["sin_herramientas"],
        dificultad: "Principiante",
        musculosPrincipales: ["Glúteo Medio", "Glúteo Menor", "Rotadores externos de cadera"],
        musculosSecundarios: ["Core abdominal", "Glúteo mayor"],
        musculos_implicados: ["Glúteo Medio", "Glúteo Menor", "Rotadores externos", "Core"],
        resumen: "Trabajo funcional en cuatro apoyos para activar el glúteo medio sin estrés axial en la columna vertebral.",
        descripcion: "Trabajo funcional en cuatro apoyos para activar el glúteo medio sin estrés axial en la columna vertebral.",
        pasos_ejecucion: [
            "Colócate en cuadrupedia sobre una colchoneta con la espalda neutra y abdomen apretado.",
            "Manteniendo la rodilla flexionada a 90°, eleva la pierna lateralmente hacia afuera como una bisagra.",
            "Pausa un segundo en la cúspide y desciende con suavidad sin tocar el suelo."
        ],
        tecnica: {
            setup: "Posición de cuadrupedia sobre alfombra: manos bajo hombros y rodillas bajo caderas. Core activado para fijar la columna lumbar.",
            concentrica: "Sin modificar el ángulo de 90° de la rodilla, eleva la pierna hacia un lado abriendo la cadera hasta donde la movilidad lo permita sin rotar el torso.",
            excentrica: "Desciende en 2 segundos hasta casi rozar el suelo.",
            respiracion: "Inhala en reposo, exhala al elevar la rodilla lateralmente.",
            tempo: "2-1-1-1"
        },
        riesgos: [
            "🚨 Inclinar todo el peso hacia el lado opuesto desalineando los hombros.",
            "🚨 Arquear la espalda baja durante la apertura."
        ],
        posturas: [
            {
                fase: 1,
                titulo: "Fase 1: Cuadrupedia Compacta & Escápulas Fijas",
                musculosDestacados: "Core y Glúteo de la pierna de apoyo",
                detalles: "Espalda horizontal con distribución equitativa del peso."
            },
            {
                fase: 2,
                titulo: "Fase 2: Elevación Lateral a 90° de Rodilla",
                musculosDestacados: "Glúteo Medio y Rotadores externos",
                detalles: "Rodilla levantada hacia el lateral en el plano de la cadera sin girar la espalda."
            },
            {
                fase: 3,
                titulo: "Fase 3: Retorno Excéntrico al Suelo",
                musculosDestacados: "Control excéntrico del Glúteo Medio",
                detalles: "Baja suave sin apoyar la rodilla para encadenar la siguiente repetición."
            }
        ]
    }
];

// Base de datos exhaustiva de Ejercicios Habituales
// Clasificación por Tipo (Piernas, Empuje, Pull, Core, Combate) y Equipamiento necesario

export const EQUIPAMIENTO_CONFIG = {
    mancuerna: { id: "mancuerna", nombre: "Mancuerna", icono: "⚖️", badgeClass: "badge-equipment-dumbbell" },
    barra: { id: "barra", nombre: "Barra Olímpica", icono: "🏋️‍♂️", badgeClass: "badge-equipment-barbell" },
    banco: { id: "banco", nombre: "Banco", icono: "🛋️", badgeClass: "badge-equipment-bench" },
    alfombra: { id: "alfombra", nombre: "Alfombra / Esterilla", icono: "🧘", badgeClass: "badge-equipment-mat" },
    saco: { id: "saco", nombre: "Saco de Boxeo", icono: "🥊", badgeClass: "badge-equipment-bag" },
    corporal: { id: "corporal", nombre: "Peso Corporal", icono: "🧱", badgeClass: "badge-equipment-body" },
    polea: { id: "polea", nombre: "Polea / Cable", icono: "🔄", badgeClass: "badge-equipment-cable" },
    comba: { id: "comba", nombre: "Comba de Saltar", icono: "🪢", badgeClass: "badge-equipment-rope" },
    rueda: { id: "rueda", nombre: "Rueda Abdominal", icono: "⚙️", badgeClass: "badge-equipment-wheel" }
};

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
    }
];

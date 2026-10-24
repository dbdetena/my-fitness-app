# 🚀 PROYECTO: Mi Panel Fitness (PWA Premium)
**Directrices maestras de Arquitectura, Diseño y UX/UI.**

## 1. STACK TECNOLÓGICO Y ENTORNO
- **Arquitectura:** SPA (Single Page Application) modular. Un único `index.html` como carcasa, con inyección dinámica de vistas (`.html` independientes) mediante `router.js`.
- **Backend:** Firebase Firestore (Proyecto: `FitnessPersonalDBdT`). Conexión vía SDK modular web (v10.8.0).
- **Despliegue:** GitHub Pages + PWA instalable (`sw.js`, `manifest.json`).
- **Dispositivo Objetivo:** Móvil Android corporativo (Mobile-First estricto).

## 2. IDENTIDAD VISUAL Y REGLAS DE UI (ESTÉTICA INDUSTRIAL / NEÓN)
La app debe transmitir la sensación de maquinaria de alta precisión (estilo fibra de carbono, acero pulido y luces de neón).
- **Fondo Base:** `#141d33` (Oscuro profundo refinado).
- **Tarjetas / Contenedores (Acero Mate Elevado):** `#223249` con `border-top: 1px solid rgba(255, 255, 255, 0.05)` y sombras profundas para contraste nítido y fluidez al hacer scroll.
- **Acento (Neón Cian):** `#38bdf8` para elementos activos, iluminaciones y el botón `ℹ️`.
- **Estados Activos:** Uso intensivo de sombras (box-shadow) en color cian para simular retroiluminación cuando un botón se pulsa o un checkbox se marca.
- **Botones:** Redondeados (`border-radius: 8px`), sin bordes nativos, grandes y táctiles (mínimo 44x44px).
- **Selector RPE Cilíndrico 3D:** Rueda horizontal táctil de esfuerzo (RPE 0 a 10 con subtítulo `(0=Nulo, 10=Fallo)`), sombras interiores oscuras a los lados simulando cilindro metálico hundido, `scroll-snap-type: x mandatory` y resaltado neón cian `#38bdf8` dinámico en el centro.
- **Diario de Notas (Estética Acero y Neón Unificada):**
  - Dropdown Custom (`<div>`, `<ul>`, `<li>` en `#1e293b` con bordes sutiles y neón cian `#38bdf8`) para las 5 categorías oficiales, sustituyendo selects nativos y emojis por iconos SVG minimalistas en color sólido.
  - Botonera superior de filtros tipo píldora (`Todas` + las 5 categorías) en contenedor horizontal deslizable sin scrollbar visible, con badges numéricos en tiempo real y filtrado instantáneo del timeline.
  - Zona de captura integrada (bloque monolítico industrial oscuro agrupando textarea y barra inferior con botón de micrófono y estado de Web Speech API).
- **Cabecera de Sesión Activa:**
  - Título destacado: tamaño `1.15rem` - `1.2rem`, `font-weight: bold`, color neón cian (`#38bdf8`) con resplandor (`text-shadow`), ocupando el ancho completo centrado.
  - Cero distracciones: se prohíben botones de navegación o exploración durante el entrenamiento en curso.
  - Botón `✕ Abandonar` centrado inmediatamente debajo del título con separación vertical adecuada (`gap: 12px`).
- **Scroll Horizontal en Pestañas Móviles:** Las barras de pestañas y selectores de rutinas usan `overflow-x: auto` con barra de scroll oculta para garantizar que no se apilen ni deformen en pantallas estrechas.
- **Bloqueo Estricto en Pausa:** Con el cronómetro pausado, todos los checkboxes e inputs de series se deshabilitan visual y funcionalmente (`not-allowed`, menor opacidad) con banner de aviso para evitar registros accidentales.
- **Directiva de UI Permanente para el Catálogo de Ejercicios (Anatomía 3D Premium Innegociable):**
  A partir de ahora y para cualquier futura inyección de datos, el formato de las imágenes de los ejercicios es innegociable. Todas las nuevas imágenes deben seguir estrictamente el patrón "Anatomía 3D Premium":
  - **Modelos del cuerpo:** Modelos anatómicos tridimensionales realistas en escala de grises y plata de alto contraste, mostrando musculatura superficial con volumen, relieve y sombras.
  - **Fondo:** Fondo oscuro liso (estilo `#1c1c1e`), sin cuadrículas, círculos, rayas ni gráficos auxiliares.
  - **Activación muscular:** Musculatura diana resaltada exclusivamente en colores rojo/naranja intensos y brillantes con estriaciones de fibra visibles.
  - **Prohibición estricta:** Queda terminantemente prohibido el uso de esquemas vectoriales, esqueletos de líneas, puntos de articulación o diseños en neón azul para la representación muscular.
  - **Criterio de Fallback:** Si un ejercicio no tiene la imagen con este estándar exacto, se usará un placeholder oscuro hasta que se proporcione el recurso 3D correcto.

## 3. USABILIDAD PREMIUM (UX) Y ESTADOS PERSISTENTES
- **Cero bloqueos visuales:** Transiciones suaves entre vistas, sin recargas de página.
- **Modal de Ayuda `ℹ️`:** Ventanas superpuestas translúcidas oscuras (`rgba(15, 23, 42, 0.9)`) con bordes neón, estructuradas en Biomecánica, Red Flags y Alternativas.
- **Gestión de Sesiones (Temporizador Inteligente en Segundo Plano):**
  - Al iniciar un entrenamiento, se muestra un cronómetro principal de gran tamaño en la parte superior.
  - **Ejecución en 2º plano:** El temporizador NO depende de un `setInterval` en memoria. Al iniciar, se guarda el `timestamp` de inicio en `localStorage` (`session-manager.js`). El reloj calcula matemáticamente la diferencia en cada momento. Si el usuario sale a otra app, atiende una llamada o navega a otra sección (Nutrición, Diario, etc.), el tiempo se mantiene exacto.
  - **Recuperación Universal:** El usuario puede reanudar la sesión activa desde el Botón Flotante Universal (FAB pulsante abajo a la derecha) o simplemente volviendo a la sección de Rutinas ("Gimnasio").
  - **Navegación Nativa Mobile (Botón Físico de Retroceso de Android con History API):**
  - Implementación en `router.js` basada en `history.pushState` y el evento `popstate`.
  - Al abrir cualquier módulo secundario (Salud, Gimnasio, Nutrición, Diario, Coach) desde el "Panel Central" (`dashboard`), se registra el estado en el historial.
  - Al pulsar el botón físico de retroceso del teléfono, el evento se intercepta limpiamente devolviendo la vista al "Panel Central" sin recargas. Un segundo toque en la pantalla de inicio permite cerrar o minimizar la PWA de forma completamente nativa.

## 4. ESTRUCTURA MODULAR (5 PESTAÑAS)
1. **Hoy (`dashboard.html` / `salud.html` / `salud.js`):** Resumen ejecutivo y analítica de salud:
   - **Panel Central Limpio (`dashboard.html`):** Interfaz despejada y minimalista que muestra estrictamente la cuadrícula de los 6 accesos principales (Salud, Gimnasio, Nutrición, Diario, AI Coach, + Nuevo), habiendo eliminado del panel central el bloque inferior de sincronización y las tarjetas redundantes de lectura.
   - **Migración a Ajustes ("Integraciones y Datos"):** El control de conexión, estado y sincronización (botón para forzar o revocar la vinculación con Google Fit) reside en el modal de Configuración (accesible desde el icono de la rueda dentada `⚙️` en la cabecera superior), dentro del apartado estilizado "Integraciones y Datos".
   - **Persistencia Silenciosa (`onAuthStateChanged`):** Al cargar la vista, comprueba silenciosamente la existencia de usuario activo en Firebase y token en `localStorage` (`fitToken`). Si existen, ejecuta `fetchFitData()` de forma automática en segundo plano, ocultando el botón "Conectar" y mostrando el indicador sutil "Sincronizando...". Se elimina cualquier popup repetitivo en recargas.
   - **Disparo Manual Estricto:** Solo se solicita inicio de sesión (`signInWithPopup` / `signInWithRedirect`) de forma manual por acción directa del usuario o si la API devuelve error 401 Unauthorized (token caducado).
   - **Anillos de Actividad (Pasos y Calorías):** Dos tarjetas superiores en acero mate con gráficos `doughnut` de Chart.js. Progreso en neón cian `#38bdf8` sobre raíl `#2c2c2e`, valor numérico grande en el centro, y metas fijas (10.000 pasos y 2.000 kcal totales; `calories.expended` incluye metabolismo basal) para el porcentaje de llenado. Los anillos consultan desde las 00:00:00 locales del día en curso (`startTimeMillis` = medianoche local).
   - **Gráfica de Peso y Tendencia Premium (Estilo Zepp):**
     - Eje Y dinámico auto-ajustado: calcula automáticamente el mínimo y máximo de los datos visualizados añadiendo un margen de $\pm 1$ kg (`ejeY.min = Math.floor(min - 1)`, `ejeY.max = Math.ceil(max + 1)`), con `spanGaps: true` y `tension: 0.4` para puentear días sin pesaje con una curva continua y fluida.
     - Interfaz limpia sin icono de expandir pantalla a la derecha de los filtros temporales (1S, 1M, 3M, 1A).
     - **Bloque "Cambios recientes":** Situado inmediatamente debajo de la gráfica, calcula y muestra la variación respecto al registro anterior con código de color (verde en descenso `#4ade80`, rojo en ascenso `#f87171`), valor numérico en kg y fecha de la lectura comparada.
     - **Sección Desplegable "Datos históricos":** Acordeón vertical con fondo oscuro `#1c1c1e` que renderiza todas las lecturas de peso registradas por la API ordenadas de más reciente a más antigua. Cada fila destaca el peso en negrita, insignia con la fuente ("Google Fit") y fecha/hora formateada.
   - **Frecuencia Cardíaca (Hoy) e Intradía:** Tarjeta visual industrial dedicada entre los anillos superiores y el panel histórico. Renderiza gráfica intradía de Chart.js (`line`, `tension: 0.4`, rojo neón `#ef4444`, gradiente semitransparente) que muestra la cronología del día en curso agrupada en intervalos de 15 minutos (`com.google.heart_rate.bpm`), con badge de lectura actual e indicadores de mínimo, promedio y máximo.
   - **Panel Histórico con Pulsaciones:** Selector de métrica ampliado con la pestaña "Pulsaciones" junto a Peso, Sueño y Pasos. Proyecta la media diaria agregada en el histórico respetando filtros temporales (1S, 1M, 3M, 1A) y zoom/pan.
   - **Filtrado Estricto de Ceros en BPM:** Se descartan de forma absoluta los ceros, nulos y valores fisiológicamente erróneos (< 30 o > 240 BPM), empleando `spanGaps: true` para mantener la continuidad suave de las líneas sin caídas artificiales a cero en tramos sin registro.
   - **Gestión de Errores y Expiración (401):** Captura automática de errores 401, limpiando `localStorage` (`fitToken`), restaurando el botón a "Conectar con Google Fit" y reseteando las métricas para forzar un nuevo login limpio.
   - **Módulo 100% de solo lectura:** Sin formularios, botones ni inputs manuales de peso o pasos; todos los datos proceden de Google Fit.
   - **Sueño y Cardio:** Extracción de `com.google.sleep.segment` (requiere scope `fitness.sleep.read`; si falta, se avisa sin romper el resto) y `com.google.activity.segment` (lista de las últimas sesiones de cardio en tarjetas compactas de acero mate).
   - **Saneamiento de Peso:** Se ignoran pesos < 40 kg y saltos > 5 kg entre días consecutivos; las lecturas se agrupan y promedian por día natural antes de graficar.
   - **Gráfica Premium:** `chartjs-plugin-zoom` + Hammer.js (pan y pellizco en eje X), selector temporal 1S/1M/3M/1A y segmented control Peso/Sueño/Pasos/Pulsaciones con `tension: 0.4` y `spanGaps: true`.
   - **Contexto para el AI Coach:** Resumen del día guardado en `localStorage` bajo `health_context_ai` (`pasosHoy`, `suenoHoras`, `bpmAvgHoy`, `bpmUltimoHoy`, `fatigaEstimada`, `tendenciaPeso`, etc.) para que `coach.js` lo consuma.
2. **Gimnasio (`gimnasio.html` / `gimnasio.js`):** Tres bibliotecas especializadas:
   - **Catálogo Biomecánico de Ejercicios (29 ejercicios):** Ilustraciones anatómicas 3D realistas en escala de grises y plata de alto contraste con volumen y sombras sobre fondo liso oscuro `#1c1c1e` (idéntico al patrón de "Salto a la Comba"), con activación de músculos diana en rojo/naranja intensos y etiqueta `🧬 3D Anatómico` en la esquina inferior derecha. Queda totalmente prohibido el uso de esquemas de vectores, neones, líneas o articulaciones de puntos ("esqueletos"). Modelo de datos estandarizado con clonación estricta de schema (posturas en 3 fases, cues técnicos y nomenclatura bilingüe `Nombre en Español (Nombre Habitual/Inglés)`).
   - **Filtros Avanzados en Píldora con Scroll Horizontal:** Taxonomía estandarizada en contenedor horizontal fluido (`.filter-chips-scroll`):
     - **15 Grupos Musculares:** Bíceps, Tríceps, Antebrazos, Pecho, Hombros, Abdominales, Oblicuos, Gran dorsal, Trapecio Alto y Cuello, Espalda baja, Cuádriceps, Glúteos y Flexores, Bíceps femorales, Pantorrillas, Cardio.
     - **12 Tipos de Equipamiento:** Barra, Cables, Mancuernas, Máquinas, Kettlebell, Pelota médica, Sin herramientas, Cintas de suspensión, Pelota, Pelota Bosu, Elásticos, Foam roller (con mapeo semántico retrocompatible y badges con acentos de color personalizados).
   - **Rutinas Estándar y Mis Rutinas / Coach:** Plantillas prediseñadas y personalizadas enlazadas al catálogo.
   - **Mesa de Entrenamiento en Vivo:** Calentamiento preventivo con checks, registro táctil de series y cronómetro sincronizado con segundo plano.
3. **Nutrición (`nutricion.html` / `nutricion.js`):** Base de datos de platos frecuentes, registro rápido y suplementación.
4. **Diario de Notas (`diario.html` / `diario.js`):** Diario oficial de registros:
   - **Formulario Desplegable (Acordeón):** Tarjeta "Añadir Nota al Diario" posicionada estratégicamente justo debajo del título principal y estrictamente por encima de la línea de filtros tipo píldora (`Todas`, `Nota Libre`, `Energía/Sueño`, etc.).
   - **Comportamiento Colapsable y Header Visible:** Por defecto el cuerpo del formulario (textarea, selector cilíndrico de RPE, botón de dictado por voz y botones de acción) permanece oculto (`display: none`), manteniendo visible la cabecera (botón de lápiz toggle, título y dropdown custom de selección de categoría).
   - **Interacción y Toggle:** El botón del lápiz actúa como toggle para abrir o contraer el formulario. Al guardar con éxito (persistencia en Firebase Firestore colección `diario_notas` y `localStorage`), el formulario se limpia y se contrae automáticamente.
   - **Lógica Condicional de Escala RPE:** Listener en el selector de categoría que oculta dinámicamente la escala cilíndrica de RPE para categorías como "Energía/Sueño" (`recuperacion`) y "Nutrición" (`nutricion`), mostrándola exclusivamente para entrenamiento (`post-entreno`) o notas libres (`general`).
   - **Gestión Integral del Historial (Edición y Borrado Nativo):**
     - **Borrado con Confirmación:** Icono 'x' en cada tarjeta de nota con diálogo de confirmación nativo del navegador (`confirm()`). Elimina el documento permanentemente tanto en Firestore como en `localStorage`.
     - **Edición In-situ:** Botón de edición `✎` en cada tarjeta que recupera el contenido, categoría y RPE de la nota, los traslada al formulario superior en modo edición y permite actualizar el mismo documento (preservando el ID original) tanto en Firestore como en memoria local.
   - **Componentes Visuales:** Dropdown custom de acero mate y neón cian para categorías, botonera de filtros con contadores dinámicos en tiempo real, bloque integrado de captura con dictado por voz Web Speech API en modo Toggle, selector de RPE mediante cilindro horizontal táctil 3D (0 a 10), registro de alertas/incidencias, iconografía SVG unificada y desglose de tiempos/calentamiento estructurado en tabla de 3 columnas.
5. **Coach (`coach.html` / `coach.js`):** Asistente virtual experto en biomecánica y programación del entrenamiento impulsado por la API de Google Gemini (v1beta / gemini-3.8-flash):
   - **Streaming en Tiempo Real (`streamGenerateContent?alt=sse`):** Sustitución de llamadas síncronas bloqueantes por streaming vía Server-Sent Events (SSE). Lectura asíncrona mediante `response.body.getReader()` con decodificación de chunks y renderizado progresivo en la interfaz (efecto máquina de escribir con cursor neón cian y scroll automático), eliminando cualquier congelamiento de la UI.
   - **Compilador de Contexto Biométrico (`buildCoachContext()`):** Función de compilación de payload en tiempo real ejecutada justo antes de cada mensaje. Extrae de `localStorage` y del estado global un JSON minificado con: peso actual (`peso_actual_kg`), horas de sueño de anoche (`sueno_anoche_h`), últimos RPE del Diario (`ultimos_rpe`), promedio de RPE (`rpe_medio`), última rutina registrada (`ultima_rutina` con series, duración y sensaciones) y sesión activa en vivo. Este JSON comprimido se inyecta como `system_instruction`, dotando a la IA de visión absoluta y actualizada de la base de datos sin sobrecargar tokens.
   - **Memoria de Conversación Multi-turno:** Ventana rodante en `state.historialConversacion` que retiene estrictamente los últimos 6 mensajes (3 pares ordenados de `user`/`model`), inyectados en el array `contents` de la petición a la API para preservar la coherencia y continuidad de la charla.
   - **Control de Errores Resiliente:** Bloque `try/catch` integral que captura caídas de red, cuotas o fallos de API, mostrando un mensaje amigable con estilo industrial en el chat sin congelar ni corromper la interfaz.
   - **Memoria Persistente (`coach_memory`):** Documento maestro en Firebase Firestore (`configuracion/coach_memory`) con fallback local resiliente. Almacena objetivos, lesiones/molestias y notas a largo plazo; se consulta antes de cada respuesta y se actualiza automáticamente con nuevos hitos.
   - **Interacción por Voz:** Modo Alternancia Toggle (clic para iniciar / clic para detener, evento `click` único sin mousedown/touchstart, resplandor neón cian `box-shadow: 0 0 12px #38bdf8`, `interimResults = false` para frase final limpia, extracción directa del último índice `event.results[length-1]`, blindaje contra reprocesamiento de índices pasados, vaciado de sesión en `start()` y restablecimiento automático en `onend`) y lectura automática en voz alta (`speechSynthesis`) con selector de activación/silencio.
   - **Visualización de Gráficas Biomecánicas (Chart.js):** Contenedor interactivo para proyectar evolución de RPE, progresión de cargas y volumen semanal invocado a demanda del usuario o por la IA.
   - **Bóveda Local Cifrada para API Key:** La API Key de Gemini nunca se incluye en el código fuente ni se expone en GitHub. Se configura desde el modal "Configurar IA" (`#btn-config-key`) con input tipo contraseña (`<input type="password">`), botón de alternar visibilidad (`👁️`), botón de prueba de conexión directa y cifrado criptográfico con derivación PBKDF2 + AES-GCM (256-bit) en `localStorage` (`fitness_gemini_vault`), migrando de forma transparente cualquier versión anterior.

## 5. MODELO DE DATOS Y DECISIONES DE BASE DE DATOS (LOCAL-FIRST & FIRESTORE)
- **Estrategia Local-First:** `localStorage` actúa como almacén de alta disponibilidad para la sesión viva (`fitness_active_session`) y bitácora local (`fitness_bitacora_entries`), sincronizado con Firebase Firestore (`FitnessPersonalDBdT`).
- **Esquema de Eventos Temporales (`splits` en `progreso-manager.js`):**
  - Cada sesión finalizada archiva un registro atómico con marcas de tiempo relativas:
    - `calentamiento_paso` / `calentamiento_completo`: duración exacta de cada fase preventiva.
    - `serie`: ejercicio, set, carga (`peso`), repeticiones (`reps`), marca temporal (`tiempo`) y segundo acumulado (`segundos`).
- **Analítica de Sobrecarga Progresiva y Densidad:**
  - Comparativa cruzada automática contra el entrenamiento anterior de la misma rutina (identificando mejoras de carga `+kg` o volumen `+reps`).
  - Cálculo de intervalos reales de descanso entre series a partir de los `splits`.
- **Trazabilidad de Cierres e Incidencias:**
  - Sesiones interrumpidas o cerradas por inactividad (+60 min) persisten como documento con categoría `alerta`, asegurando que no se pierdan datos ni métricas de series previas.

## 6. REGLAS PARA EL ASISTENTE IA (ANTIGRAVITY)
1. Antes de empezar cualquier tarea, repasa este archivo.
2. Tras completar una función de forma exitosa en el entorno local, ejecuta automáticamente: `git add .`, `git commit -m "[Descripción]"` y `git push origin main`.
3. Todo código JS debe estar modularizado. No inyectar lógica compleja en el HTML.

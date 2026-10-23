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

## 3. USABILIDAD PREMIUM (UX) Y ESTADOS PERSISTENTES
- **Cero bloqueos visuales:** Transiciones suaves entre vistas, sin recargas de página.
- **Modal de Ayuda `ℹ️`:** Ventanas superpuestas translúcidas oscuras (`rgba(15, 23, 42, 0.9)`) con bordes neón, estructuradas en Biomecánica, Red Flags y Alternativas.
- **Gestión de Sesiones (Temporizador Inteligente en Segundo Plano):**
  - Al iniciar un entrenamiento, se muestra un cronómetro principal de gran tamaño en la parte superior.
  - **Ejecución en 2º plano:** El temporizador NO depende de un `setInterval` en memoria. Al iniciar, se guarda el `timestamp` de inicio en `localStorage` (`session-manager.js`). El reloj calcula matemáticamente la diferencia en cada momento. Si el usuario sale a otra app, atiende una llamada o navega a otra sección (Nutrición, Diario, etc.), el tiempo se mantiene exacto.
  - **Recuperación Universal:** El usuario puede reanudar la sesión activa desde el Botón Flotante Universal (FAB pulsante abajo a la derecha) o simplemente volviendo a la sección de Rutinas ("Gimnasio").
  - **Cierre por Inactividad (60 min):** Si no hay actividad (inputs, series marcadas, pausas) durante 1 hora (60 minutos), la sesión se cierra automáticamente y genera una incidencia de tipo alerta en el Diario de Notas con el resumen de métricas y series completadas.

## 4. ESTRUCTURA MODULAR (5 PESTAÑAS)
1. **Hoy (`dashboard.html` / `salud.js`):** Resumen ejecutivo. Balance calórico dinámico, recuperación, peso (con entrada rápida y origen del dato), y acceso rápido al entreno del día.
2. **Gimnasio (`gimnasio.html` / `gimnasio.js`):** Tres bibliotecas especializadas (Ejercicios con posturas 3D, Rutinas Estándar y Mis Rutinas / Coach). Mesa de entrenamiento en vivo con calentamiento preventivo, registro táctil de series y cronómetro sincronizado con segundo plano.
3. **Nutrición (`nutricion.html` / `nutricion.js`):** Base de datos de platos frecuentes, registro rápido y suplementación.
4. **Diario de Notas (`diario.html` / `diario.js`):** Diario oficial de registros. Dropdown custom de acero mate y neón cian, botonera de filtros con contadores dinámicos, bloque integrado de captura con dictado por voz en modo Toggle (clic iniciar / clic detener, resplandor neón cian, `interimResults = false`, extracción controlada de `event.results[length-1]` sin auto-concatenación descontrolada ni bucles sobre resultados pasados, limpieza estricta de variables en cada sesión y restablecimiento automático por `onend`), selector de RPE mediante cilindro horizontal táctil 3D (0 a 10), registro de alertas/incidencias, iconografía SVG unificada y desglose de tiempos/calentamiento estructurado en tabla de 3 columnas.
5. **Coach (`coach.html` / `coach.js`):** Asistente virtual experto en biomecánica y programación del entrenamiento impulsado por la API de Google Gemini (v1beta / gemini-3.8-flash).
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

# 🚀 PROYECTO: Mi Panel Fitness (PWA Premium)
**Directrices maestras de Arquitectura, Diseño y UX/UI.**

## 1. STACK TECNOLÓGICO Y ENTORNO
- **Arquitectura:** SPA (Single Page Application) modular. Un único `index.html` como carcasa, con inyección dinámica de vistas (`.html` independientes) mediante `router.js`.
- **Backend:** Firebase Firestore (Proyecto: `FitnessPersonalDBdT`). Conexión vía SDK modular web (v10.8.0).
- **Despliegue:** GitHub Pages + PWA instalable (`sw.js`, `manifest.json`).
- **Dispositivo Objetivo:** Móvil Android corporativo (Mobile-First estricto).

## 2. IDENTIDAD VISUAL (ESTÉTICA INDUSTRIAL / NEÓN)
La app debe transmitir la sensación de maquinaria de alta precisión (estilo fibra de carbono, acero pulido y luces de neón).
- **Fondo Base:** `#0f172a` (Oscuro profundo).
- **Tarjetas / Contenedores (Acero Mate):** `#1e293b`.
- **Acento (Neón Cian):** `#38bdf8` para elementos activos, iluminaciones y el botón `ℹ️`.
- **Estados Activos:** Uso intensivo de sombras (box-shadow) en color cian para simular retroiluminación cuando un botón se pulsa o un checkbox se marca.
- **Botones:** Redondeados (`border-radius: 8px`), sin bordes nativos, grandes y táctiles (mínimo 44x44px).

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
4. **Diario de Notas (`diario.html` / `diario.js`):** Diario oficial de registros, dictado por voz directo (Web Speech API) y registro de alertas/incidencias. Título limpio sin descripción inferior y filtros escalados (`Todas`, `🏋️ Entrenos`, `🚨 Alertas`) en una sola línea fija.
5. **Coach (`coach.html` / `coach.js`):** Integración con Gemini IA para cruzar todos los datos y dar sugerencias contextuales.

## 5. REGLAS PARA EL ASISTENTE IA (ANTIGRAVITY)
1. Antes de empezar cualquier tarea, repasa este archivo.
2. Tras completar una función de forma exitosa en el entorno local, ejecuta automáticamente: `git add .`, `git commit -m "[Descripción]"` y `git push origin main`.
3. Todo código JS debe estar modularizado. No inyectar lógica compleja en el HTML.

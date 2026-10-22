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
- **Gestión de Sesiones (El Temporizador Inteligente):**
  - Al iniciar un entrenamiento, se debe mostrar un cronómetro principal que ocupe aprox. el 20% de la zona superior de la pantalla.
  - **Ejecución en 2º plano:** Dado que las PWA pueden congelarse en móviles (ej. al recibir una llamada), el temporizador NO dependerá de un `setInterval` básico. Al iniciar, se guardará el `timestamp` de inicio en `localStorage`. El reloj calculará la diferencia visualmente. Si el usuario sale y vuelve, el tiempo seguirá siendo matemáticamente exacto.
  - **Botón Flotante Universal (FAB):** Si hay una sesión activa y el usuario navega a otra pestaña (ej. Nutrición), debe aparecer un botón flotante abajo a la derecha de color Neón Cian pulsante que diga "⏱️ Sesión Activa" para devolverlo instantáneamente al entrenamiento.

## 4. ESTRUCTURA MODULAR (5 PESTAÑAS)
1. **Hoy (`dashboard.html` / `salud.js`):** Resumen ejecutivo. Balance calórico dinámico, recuperación, peso (con entrada rápida y origen del dato), y acceso rápido al entreno del día.
2. **Gimnasio (`gimnasio.html` / `gimnasio.js`):** Catálogo de rutinas, temporizador principal, tarjetas colapsables por ejercicio con inputs de series y botón de técnica `ℹ️`. Autocompletado inteligente de la sesión anterior.
3. **Nutrición (`nutricion.html` / `nutricion.js`):** Base de datos de platos frecuentes, registro rápido y suplementación.
4. **Diario (`diario.html` / `diario.js`):** Mapa de molestias corporales (bio-feedback), nivel de dolor, fatiga y estrés (crucial para adaptar entrenamientos).
5. **Coach (`coach.html` / `coach.js`):** Integración con Gemini IA para cruzar todos los datos y dar sugerencias contextuales.

## 5. REGLAS PARA EL ASISTENTE IA (ANTIGRAVITY)
1. Antes de empezar cualquier tarea, repasa este archivo.
2. Tras completar una función de forma exitosa en el entorno local, ejecuta automáticamente: `git add .`, `git commit -m "[Descripción]"` y `git push origin main`.
3. Todo código JS debe estar modularizado. No inyectar lógica compleja en el HTML.

# 🧊 VectorCalc 3D: Visualizador Interactivo de Superficies Paramétricas

Visualizador y animador interactivo 3D para Cálculo Vectorial. Grafica superficies paramétricas $\vec{r}(u,v)$, calcula derivadas parciales simbólicas ($\vec{r}_u, \vec{r}_v$), el plano tangente y el vector normal $\vec{n} = \vec{r}_u \times \vec{r}_v$ en tiempo real.

Una aplicación web interactiva diseñada para visualizar, analizar y animar conceptos fundamentales de **Cálculo Vectorial y Geometría Diferencial** en un entorno 3D en tiempo real.

Permite ingresar cualquier función vectorial $\vec{r}(u, v) = [x(u,v), y(u,v), z(u,v)]$, calcular automáticamente sus derivadas parciales simbólicas y observar cómo evolucionan los vectores tangentes, el plano tangente y el vector normal sobre la superficie.

---

## ✨ Características Principales

* **Renderizado 3D Interactivo (Three.js):** Malla paramétrica con mapa de calor según altura ($Z$), cuadrícula de referencia y controles de cámara orbitales (rotación manual, zoom y vistas ortogonales `XY`, `XZ`, `YZ` e `Isométrica`).
* **Motor Simbólico Automático (Math.js):** Calcula y muestra paso a paso el desarrollo analítico de:
  * Vectores tangentes parciales: $\vec{r}_u = \frac{\partial \vec{r}}{\partial u}$ y $\vec{r}_v = \frac{\partial \vec{r}}{\partial v}$
  * Determinante del producto cruz y vector normal: $\vec{n} = \vec{r}_u \times \vec{r}_v$
* **Modo Estático y Animación Continua:** Inicia en un punto fijo $(u_0, v_0)$ para inspección detallada o permite reproducir trayectorias animadas (circular, barrido en $u$, barrido en $v$, recorrido 2D) partiendo exactamente desde el punto actual.
* **Etiquetas Numéricas Flotantes en 3D:** Visualización en vivo de las coordenadas exactas $[x, y, z]$ de $\vec{r}$, $\vec{r}_u$, $\vec{r}_v$ y $\vec{n}$ directamente sobre los vectores en el espacio.
* **Exportación Multiplataforma:** Generador automático de comandos listos para copiar y pegar en **GeoGebra 3D** y scripts en **Python (Matplotlib 3D)**.
* **Modo Reel / Presentación:** Botón para ocultar la barra lateral y grabar demostraciones limpias en pantalla completa.

---

## 🛠️ Tecnologías Utilizadas

* **HTML5 & Tailwind CSS:** Interfaz oscura moderna y responsiva (*Glassmorphism*).
* **Three.js (r128):** Motor de gráficos WebGL y controles `OrbitControls`.
* **Math.js (v11.8):** Análisis sintáctico de expresiones matemáticas y derivación simbólica.
* **Font Awesome & Google Fonts:** Iconografía y tipografía monoespaciada (`JetBrains Mono`).

---

## 🚀 Cómo Ejecutar el Proyecto

No requiere instalación de dependencias ni servidores complejos (sitio estático: `index.html`, `css/styles.css` y `js/app.js`):

1. Clona este repositorio:
   ```bash
   git clone https://github.com/dxnidot/parametric-surface-3d-visualizer.git
   cd parametric-surface-3d-visualizer
   ```
2. Abre `index.html` directamente en el navegador o súbelo a Vercel (sitio estático, sin build).

---

## 📐 Fundamento Matemático

Dada una superficie parametrizada por:
$$\vec{r}(u, v) = \langle x(u,v), \, y(u,v), \, z(u,v) \rangle$$

En cualquier punto regular $P(u_0, v_0)$ sobre la superficie:
1. **Curvas Coordenadas:** Se obtienen fijando $v = v_0$ (curva en $u$) y $u = u_0$ (curva en $v$).
2. **Vectores Tangentes:** $\vec{r}_u(u_0, v_0)$ y $\vec{r}_v(u_0, v_0)$ generan el **plano tangente** a la superficie en $P$.
3. **Vector Normal:** El producto vectorial $\vec{n} = \vec{r}_u \times \vec{r}_v$ define un vector ortogonal tanto a $\vec{r}_u$ como a $\vec{r}_v$, determinando la orientación de la superficie.

---

## 📄 Licencia

Licencia MIT, ver [LICENSE](LICENSE).

---

## 🎨 Recompilar Tailwind

`css/tailwind.css` está precompilado. Si añades clases nuevas en `index.html` o `js/app.js`, regéneralo con un `tailwind.config.js` temporal (`darkMode: "class"`, `content: ["./index.html","./js/app.js"]`):

```bash
npx tailwindcss@3.4.17 -c tailwind.config.js -i entrada.css -o css/tailwind.css --minify
```

donde `entrada.css` contiene `@tailwind base; @tailwind components; @tailwind utilities;`.

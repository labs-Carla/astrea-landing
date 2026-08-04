/**
 * libro-muestra.js
 * -----------------
 * Componente aislado: un solo libro 3D interactivo (Three.js) que muestra
 * un "avance" del reporte de Astrea Charts en la landing. NO reemplaza la
 * entrega real (que sigue siendo PDF) — es solo una vitrina visual.
 *
 *  - Un solo volumen, sin estante ni navegación entre libros.
 *  - Portada y páginas son plantillas HTML/CSS rasterizadas con
 *    html2canvas (ver libro-muestra.html) y usadas como texturas — así se
 *    diseñan con el mismo lenguaje visual del resto del sitio en vez de
 *    depender de un archivo de imagen aparte.
 *  - Interacción: hover = pequeño "crack open", click = abre la tapa.
 *  - Con la tapa abierta, cada página es una malla 3D real (no una
 *    superposición HTML) que se puede AGARRAR Y ARRASTRAR para pasar,
 *    con una curva de hoja mientras se pasa (inspirado en la mecánica de
 *    página de github.com/mengto/complete-shelf, simplificada: acá no
 *    hace falta su sistema de reciclado de hojas porque tenemos un
 *    número fijo y chico de páginas de contenido).
 *
 * Uso desde libro-muestra.html:
 *   <div id="libro-muestra" style="width:100%; height:520px;"></div>
 *   <div id="paginas-nav">
 *     <button class="pagina-boton">‹</button>
 *     <div class="paginas-puntos"></div>
 *     <button class="pagina-boton">›</button>
 *   </div>
 *   <script type="module">
 *     import { initLibroMuestra } from './libro-muestra.js';
 *     initLibroMuestra('libro-muestra', {
 *       navId: 'paginas-nav',
 *       // Canvas ya rasterizado (con html2canvas) de la plantilla de
 *       // portada (#portada-cover). Si se omite, se usa un color sólido
 *       // de respaldo para que el prototipo no se rompa.
 *       portadaCanvas,
 *       // Canvases ya rasterizados (ej. con html2canvas) del contenido
 *       // HTML/CSS de cada página, en orden. Cada uno se convierte en la
 *       // textura de una página 3D independiente.
 *       paginasCanvas: [canvas0, canvas1, canvas2, canvas3],
 *     });
 *   </script>
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

// Paleta de marca (tema oscuro/dorado, consistente con home.html/reporte.js)
const COLOR_FONDO = 0x0e0e12;
const COLOR_TAPA_FALLBACK = 0x1a1a22;
const COLOR_DORADO = 0xc9a15f;
const COLOR_LOMO = 0x141419;

export function initLibroMuestra(containerId, options = {}) {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`[libro-muestra] No se encontró el contenedor #${containerId}`);
    return;
  }

  const state = {
    abierto: false,
    animando: false,
  };

  const prefiereMovimientoReducido = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches;

  // --- Escena base ---------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = null; // transparente, hereda el fondo de la sección

  // El encuadre cerrado (FOV angosto, cámara cerca) queda ajustado a la
  // tapa sola. Una vez abierto, tanto la tapa (camino a -180°, ver más
  // abajo) como cada página pasada (hasta ANGULO_PAGINA_ABIERTA) ocupan
  // mucho más ancho de escena del que ese encuadre cerrado alcanza a
  // mostrar — se recortaban contra el borde de cámara. Por eso la cámara
  // se abre (más FOV, más lejos) junto con el libro, con el mismo damping
  // que el resto de la animación, y vuelve a cerrarse al cerrar el libro.
  const FOV_CERRADO = 35;
  const FOV_ABIERTO = 44;
  const CAMARA_Z_CERRADO = 4.2;
  const CAMARA_Z_ABIERTO = 5.0;

  const camera = new THREE.PerspectiveCamera(
    FOV_CERRADO,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.15, CAMARA_Z_CERRADO);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // --- Luces -----------------------------------------------------------
  const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.55);
  scene.add(luzAmbiente);

  const luzPrincipal = new THREE.DirectionalLight(0xfff2d9, 1.1);
  luzPrincipal.position.set(2.5, 3, 3);
  scene.add(luzPrincipal);

  const luzRelleno = new THREE.DirectionalLight(COLOR_DORADO, 0.35);
  luzRelleno.position.set(-2, -1, 2);
  scene.add(luzRelleno);

  // --- Grupo del libro ---------------------------------------------------
  // El libro completo pivotea levemente al hacer hover; la tapa (front cover)
  // tiene su propio grupo con pivote en el lomo para poder "abrirla" rotando
  // sobre el eje Y, igual que una bisagra real.
  const grupoLibro = new THREE.Group();
  scene.add(grupoLibro);

  const ANCHO = 1.4;
  const ALTO = 2.0;
  const GROSOR_BLOQUE = 0.22; // bloque de páginas
  const GROSOR_TAPA = 0.035;
  // La tapa gira mucho más que las páginas (ver ANGULO_PAGINA_ABIERTA más
  // abajo) porque, a diferencia de ellas, no necesita seguir viéndose una
  // vez abierta — así que gira del todo hasta salir de encuadre, como una
  // tapa real que deja de ser protagonista una vez que se está leyendo.
  const ANGULO_TAPA_ABIERTA = -180;

  // Bloque de páginas (cuerpo del libro) — queda oculto detrás de las
  // páginas 3D reales una vez abierto; visualmente solo se ve su canto.
  const bloquePaginas = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO - 0.04, ALTO - 0.04, GROSOR_BLOQUE),
    new THREE.MeshStandardMaterial({ color: 0xf3ead9, roughness: 0.9 })
  );
  bloquePaginas.position.z = 0;
  grupoLibro.add(bloquePaginas);

  // Lomo (spine) — barra delgada en el borde izquierdo
  const lomo = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, ALTO, GROSOR_BLOQUE + GROSOR_TAPA * 2),
    new THREE.MeshStandardMaterial({ color: COLOR_LOMO, roughness: 0.6, metalness: 0.05 })
  );
  lomo.position.x = -ANCHO / 2;
  grupoLibro.add(lomo);

  // Contratapa (back cover) — fija, no se anima
  const contratapa = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO, ALTO, GROSOR_TAPA),
    new THREE.MeshStandardMaterial({ color: COLOR_TAPA_FALLBACK, roughness: 0.55 })
  );
  contratapa.position.z = -GROSOR_BLOQUE / 2 - GROSOR_TAPA / 2;
  grupoLibro.add(contratapa);

  // --- Tapa frontal (con textura de portada) -----------------------------
  // Pivote desplazado al borde del lomo para que la rotación simule
  // una bisagra real en vez de girar sobre el centro del libro.
  const pivoteTapa = new THREE.Group();
  pivoteTapa.position.x = -ANCHO / 2;
  grupoLibro.add(pivoteTapa);

  const materialTapaFallback = new THREE.MeshStandardMaterial({
    color: COLOR_TAPA_FALLBACK,
    roughness: 0.5,
    metalness: 0.08,
  });

  const tapaFrontal = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO, ALTO, GROSOR_TAPA),
    materialTapaFallback
  );
  tapaFrontal.position.x = ANCHO / 2; // recentrar respecto al pivote del lomo
  tapaFrontal.position.z = GROSOR_BLOQUE / 2 + GROSOR_TAPA / 2;
  pivoteTapa.add(tapaFrontal);

  // (Antes había acá un "filete" — una placa dorada casi del mismo tamaño
  // que la tapa, apenas 0.08 más chica, puesta 0.002 delante de tapaFrontal.
  // Cuando la tapa era un color sólido pasaba desapercibido, pero al agregar
  // la textura de portada esa placa quedaba tapándola casi por completo —
  // era literalmente lo único que se veía. El borde dorado ahora es parte
  // del propio diseño de #portada-cover en libro-muestra.html.)

  // Textura de portada: igual que las páginas, viene de un <canvas> ya
  // rasterizado con html2canvas a partir de una plantilla HTML/CSS (ver
  // #portada-cover en libro-muestra.html) — no de un archivo de imagen.
  // Si no se recibe, se queda el color sólido de respaldo del material.
  if (options.portadaCanvas) {
    const texturaPortada = new THREE.CanvasTexture(options.portadaCanvas);
    texturaPortada.colorSpace = THREE.SRGBColorSpace;
    materialTapaFallback.map = texturaPortada;
    materialTapaFallback.color.set(0xffffff);
    materialTapaFallback.needsUpdate = true;
  } else {
    console.warn('[libro-muestra] No se recibió options.portadaCanvas, se usa el color de respaldo.');
  }

  // --- Páginas 3D reales (arrastrables) ------------------------------------
  // Cada página es un THREE.Group con pivote en el lomo (misma bisagra que
  // la tapa) que contiene dos mallas compartiendo UNA sola geometría
  // segmentada: una de frente (con la textura de contenido, FrontSide) y
  // una de dorso (color crema liso, BackSide). Al compartir geometría, el
  // "curl" que se aplica a los vértices se ve igual en ambas caras porque
  // son la misma hoja física.
  const paginasCanvas = options.paginasCanvas || [];
  const SEGMENTOS_PAGINA = 12;
  const ANCHO_PAGINA = 1.3;
  const ASPECTO_PAGINA = paginasCanvas[0]
    ? paginasCanvas[0].width / paginasCanvas[0].height
    : 320 / 430;
  const ALTO_PAGINA = ANCHO_PAGINA / ASPECTO_PAGINA;
  const CURL_MAXIMO = 0.16; // profundidad del arco de la hoja al pasar por la mitad
  // A diferencia de la tapa, una página pasada tiene que seguir viéndose
  // (queda apilada del lado izquierdo) — no puede irse del todo del
  // encuadre, así que gira bastante menos que la tapa.
  const ANGULO_PAGINA_ABIERTA = -115;

  const paginas3D = paginasCanvas.map((canvas, indice) => {
    const geometria = new THREE.PlaneGeometry(ANCHO_PAGINA, ALTO_PAGINA, SEGMENTOS_PAGINA, 1);

    const textura = new THREE.CanvasTexture(canvas);
    textura.colorSpace = THREE.SRGBColorSpace;

    const materialFrente = new THREE.MeshStandardMaterial({
      map: textura,
      roughness: 0.85,
      side: THREE.FrontSide,
    });
    const materialDorso = new THREE.MeshStandardMaterial({
      color: 0xf3ead9,
      roughness: 0.92,
      side: THREE.BackSide,
    });

    const mallaFrente = new THREE.Mesh(geometria, materialFrente);
    const mallaDorso = new THREE.Mesh(geometria, materialDorso);

    const pivote = new THREE.Group();
    pivote.position.x = -ANCHO / 2;
    grupoLibro.add(pivote);

    // Apiladas con un offset ínfimo en Z para evitar z-fighting; las de
    // índice menor quedan más "arriba" del bloque sin leer (más cerca del
    // lector) igual que en un libro real.
    const zPagina = GROSOR_BLOQUE / 2 + (paginasCanvas.length - indice) * 0.0016;
    [mallaFrente, mallaDorso].forEach((malla) => {
      malla.position.x = ANCHO_PAGINA / 2;
      malla.position.z = zPagina;
      malla.userData.indicePagina = indice;
      pivote.add(malla);
    });

    return { pivote, geometria, mallaFrente, mallaDorso, progreso: 0, progresoObjetivo: 0 };
  });

  function aplicarCurl(pagina) {
    const curl = Math.sin(Math.PI * pagina.progreso) * CURL_MAXIMO;
    const posiciones = pagina.geometria.attributes.position;
    for (let i = 0; i < posiciones.count; i += 1) {
      const uLocal = posiciones.getX(i) / ANCHO_PAGINA + 0.5; // 0 en el lomo, 1 en el borde exterior
      posiciones.setZ(i, curl * Math.sin(Math.PI * uLocal));
    }
    posiciones.needsUpdate = true;
    pagina.geometria.computeVertexNormals();
  }

  // --- Navegación entre páginas (botones + puntos ya existentes en el DOM) --
  const nav = options.navId ? document.getElementById(options.navId) : null;
  const btnAnterior = nav ? nav.querySelector('.pagina-boton:first-of-type') : null;
  const btnSiguiente = nav ? nav.querySelector('.pagina-boton:last-of-type') : null;
  const puntosContenedor = nav ? nav.querySelector('.paginas-puntos') : null;

  let indiceActual = 0;
  let navVisible = false;
  const puntos = [];

  if (puntosContenedor) {
    paginas3D.forEach(() => {
      const punto = document.createElement('span');
      punto.className = 'punto';
      puntosContenedor.appendChild(punto);
      puntos.push(punto);
    });
  }

  // Mueve el estado "objetivo" de cada página según a qué página se quiere
  // llegar: las anteriores a `indice` quedan del lado ya pasado (progreso 1),
  // el resto sin pasar (progreso 0). Un solo camino de código para los
  // botones prev/siguiente, el cierre del libro y el "commit" del arrastre.
  function irAPagina(indice) {
    if (!paginas3D.length) return;
    indiceActual = Math.max(0, Math.min(indice, paginas3D.length - 1));
    paginas3D.forEach((pagina, i) => {
      pagina.progresoObjetivo = i < indiceActual ? 1 : 0;
    });
    puntos.forEach((punto, i) => punto.classList.toggle('activo', i === indiceActual));
    if (btnAnterior) btnAnterior.disabled = indiceActual === 0;
    if (btnSiguiente) btnSiguiente.disabled = indiceActual === paginas3D.length - 1;
  }
  irAPagina(0);

  if (btnAnterior) btnAnterior.addEventListener('click', () => irAPagina(indiceActual - 1));
  if (btnSiguiente) btnSiguiente.addEventListener('click', () => irAPagina(indiceActual + 1));

  const UMBRAL_APERTURA_CONTENIDO = 90; // grados: recién se revela pasada la mitad de la apertura

  function sincronizarNav(anguloAbs) {
    if (!nav) return;
    const debeMostrarse = state.abierto && anguloAbs > UMBRAL_APERTURA_CONTENIDO;
    if (debeMostrarse !== navVisible) {
      navVisible = debeMostrarse;
      nav.classList.toggle('visible', navVisible);
    }
  }

  // --- Interacción: hover + click para abrir, arrastre para pasar página ---
  let hoverObjetivo = 0; // grados leves de "crack open" en hover
  let aperturaObjetivo = 0; // grados de apertura completa al hacer click

  function anguloActual() {
    return hoverObjetivo + aperturaObjetivo;
  }

  container.style.cursor = 'pointer';

  container.addEventListener('mouseenter', () => {
    if (!state.abierto) hoverObjetivo = -8; // grados
  });
  container.addEventListener('mouseleave', () => {
    hoverObjetivo = 0;
  });

  // Arrastre de páginas: solo la página "de arriba" de cada pila es
  // agarrable — la actual (para pasar hacia adelante) y, si existe, la
  // anterior (para volver). El raycaster decide cuál se tocó.
  const raycaster = new THREE.Raycaster();
  const punteroNDC = new THREE.Vector2();
  const UMBRAL_COMPROMISO = 0.4;

  const arrastre = { activo: false, indice: -1, xInicial: 0, progresoInicial: 0 };
  let gestoFueArrastrePagina = false;

  function actualizarPunteroNDC(evento) {
    const rect = container.getBoundingClientRect();
    punteroNDC.x = ((evento.clientX - rect.left) / rect.width) * 2 - 1;
    punteroNDC.y = -((evento.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function paginaAgarrableEnPuntero(evento) {
    // Se prueban ambas caras de cada página candidata: la que se ve
    // realmente depende de su ángulo actual (una página pasada muestra su
    // dorso hacia la cámara, no su frente), así que alcanza con cualquiera
    // de las dos para identificar qué página se tocó.
    const candidatas = [];
    if (paginas3D[indiceActual]) {
      candidatas.push(paginas3D[indiceActual].mallaFrente, paginas3D[indiceActual].mallaDorso);
    }
    if (indiceActual > 0) {
      candidatas.push(paginas3D[indiceActual - 1].mallaFrente, paginas3D[indiceActual - 1].mallaDorso);
    }
    if (!candidatas.length) return null;

    actualizarPunteroNDC(evento);
    raycaster.setFromCamera(punteroNDC, camera);
    const hits = raycaster.intersectObjects(candidatas, false);
    if (!hits.length) return null;
    return hits[0].object.userData.indicePagina;
  }

  container.addEventListener('pointerdown', (evento) => {
    gestoFueArrastrePagina = false;
    if (!state.abierto) return;

    const indice = paginaAgarrableEnPuntero(evento);
    if (indice === null || indice === undefined) return;

    gestoFueArrastrePagina = true;
    arrastre.activo = true;
    arrastre.indice = indice;
    arrastre.xInicial = evento.clientX;
    arrastre.progresoInicial = paginas3D[indice].progreso;
    container.setPointerCapture(evento.pointerId);
  });

  container.addEventListener('pointermove', (evento) => {
    if (!arrastre.activo) return;
    const pagina = paginas3D[arrastre.indice];
    const rect = container.getBoundingClientRect();
    const deltaX = evento.clientX - arrastre.xInicial;
    // Arrastrar hacia la izquierda avanza la página (progreso sube);
    // hacia la derecha la devuelve — igual que pasar una hoja real.
    const deltaProgreso = -deltaX / (rect.width * 0.6);
    pagina.progreso = Math.min(1, Math.max(0, arrastre.progresoInicial + deltaProgreso));
    pagina.progresoObjetivo = pagina.progreso;
  });

  function soltarArrastre() {
    if (!arrastre.activo) return;
    const pagina = paginas3D[arrastre.indice];
    const veniaDeSinPasar = arrastre.progresoInicial < 0.5;
    const comprometido = veniaDeSinPasar
      ? pagina.progreso >= UMBRAL_COMPROMISO
      : pagina.progreso <= 1 - UMBRAL_COMPROMISO;

    if (comprometido) {
      irAPagina(veniaDeSinPasar ? arrastre.indice + 1 : arrastre.indice);
    } else {
      // No llegó al umbral: vuelve a su lugar de origen (mismo damping que
      // el resto de la animación, no es un caso especial).
      pagina.progresoObjetivo = veniaDeSinPasar ? 0 : 1;
    }

    arrastre.activo = false;
    arrastre.indice = -1;
  }

  container.addEventListener('pointerup', soltarArrastre);
  container.addEventListener('pointercancel', soltarArrastre);

  container.addEventListener('click', () => {
    if (gestoFueArrastrePagina) {
      gestoFueArrastrePagina = false;
      return;
    }
    state.abierto = !state.abierto;
    aperturaObjetivo = state.abierto ? ANGULO_TAPA_ABIERTA : 0;
    hoverObjetivo = 0;
    if (!state.abierto) irAPagina(0);
  });

  // --- Loop de animación ---------------------------------------------------
  // Interpolación con "damp" (suavizado exponencial atado a tiempo real, no a
  // frames) — así la apertura se ve igual de natural en pantallas de 60Hz o
  // 144Hz y nunca "salta" al cambiar el framerate. Mismo enfoque que usa
  // Three.js/THREE.MathUtils.damp en experiencias de libros 3D de referencia
  // (p. ej. github.com/mengto/complete-shelf).
  const VELOCIDAD_TAPA = prefiereMovimientoReducido ? 1000 : 7;
  const VELOCIDAD_PAGINA = prefiereMovimientoReducido ? 1000 : 9;
  const VELOCIDAD_IDLE_CERRADO = 0.24; // rad/s
  const VELOCIDAD_IDLE_ABIERTO = 0.09; // rad/s

  let anguloRenderizado = 0;
  let rotacionLibro = 0;
  let ultimoTiempo = performance.now();

  function animar(tiempoActual) {
    requestAnimationFrame(animar);

    const delta = Math.min((tiempoActual - ultimoTiempo) / 1000, 0.05);
    ultimoTiempo = tiempoActual;

    // Suavizado del ángulo de apertura de la tapa, independiente del framerate
    const objetivo = anguloActual();
    anguloRenderizado = THREE.MathUtils.damp(anguloRenderizado, objetivo, VELOCIDAD_TAPA, delta);
    pivoteTapa.rotation.y = THREE.MathUtils.degToRad(anguloRenderizado);

    // La cámara se abre (más FOV, más lejos) junto con el libro para que
    // la tapa saliendo de encuadre y las páginas pasadas queden dentro de
    // cámara — ver comentario junto a FOV_CERRADO/FOV_ABIERTO más arriba.
    const fovObjetivo = state.abierto ? FOV_ABIERTO : FOV_CERRADO;
    const zObjetivo = state.abierto ? CAMARA_Z_ABIERTO : CAMARA_Z_CERRADO;
    const fovNuevo = THREE.MathUtils.damp(camera.fov, fovObjetivo, VELOCIDAD_TAPA, delta);
    camera.position.z = THREE.MathUtils.damp(camera.position.z, zObjetivo, VELOCIDAD_TAPA, delta);
    if (fovNuevo !== camera.fov) {
      camera.fov = fovNuevo;
      camera.updateProjectionMatrix();
    }

    sincronizarNav(Math.abs(anguloRenderizado));

    // Páginas: cada una se amortigua hacia su progreso objetivo, salvo la
    // que se está arrastrando en este momento (esa sigue 1:1 al puntero).
    paginas3D.forEach((pagina, i) => {
      if (!(arrastre.activo && arrastre.indice === i)) {
        pagina.progreso = THREE.MathUtils.damp(
          pagina.progreso, pagina.progresoObjetivo, VELOCIDAD_PAGINA, delta
        );
      }
      pagina.pivote.rotation.y = THREE.MathUtils.degToRad(ANGULO_PAGINA_ABIERTA * pagina.progreso);
      aplicarCurl(pagina);
    });

    // Rotación suave y constante del libro completo (idle), más lenta si está abierto
    rotacionLibro += (state.abierto ? VELOCIDAD_IDLE_ABIERTO : VELOCIDAD_IDLE_CERRADO) * delta;
    grupoLibro.rotation.y = Math.sin(rotacionLibro) * 0.25;

    renderer.render(scene, camera);
  }
  requestAnimationFrame(animar);

  // --- Responsive ---------------------------------------------------------
  function onResize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // API pública mínima por si home.html necesita controlarlo externamente
  return {
    abrir: () => {
      state.abierto = true;
      aperturaObjetivo = ANGULO_TAPA_ABIERTA;
    },
    cerrar: () => {
      state.abierto = false;
      aperturaObjetivo = 0;
      irAPagina(0);
    },
    destruir: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}

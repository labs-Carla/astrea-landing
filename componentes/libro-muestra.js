/**
 * libro-muestra.js
 * -----------------
 * Componente aislado: un solo libro 3D interactivo (Three.js) que muestra
 * un "avance" del reporte de Astrea Charts en la landing. NO reemplaza la
 * entrega real (que sigue siendo PDF) — es solo una vitrina visual.
 *
 * Prototipo mínimo (paso 1 de la nueva experiencia de lectura):
 *  - Un solo volumen, sin estante ni navegación entre libros.
 *  - Portada con textura de imagen (placeholder por ahora).
 *  - Interacción: hover = pequeño "crack open", click = abre la tapa.
 *  - Sin paso de páginas todavía (se agrega en el siguiente paso).
 *
 * Uso desde home.html:
 *   <div id="libro-muestra" style="width:100%; height:520px;"></div>
 *   <script type="module">
 *     import { initLibroMuestra } from './libro-muestra.js';
 *     initLibroMuestra('libro-muestra');
 *   </script>
 *
 * IMPORTANTE — placeholder de imagen:
 *   Reemplazar PORTADA_PLACEHOLDER_PATH por la ruta real del mockup,
 *   ej. 'assets/libro-muestra/portada-mockup.jpg' (recomendado 1024x1536
 *   aprox., proporción de tapa de libro vertical).
 *   Mientras no exista el archivo, se usa un color sólido de respaldo
 *   (tema oscuro/dorado de la marca) para que el prototipo no se rompa.
 */

import * as THREE from 'https://unpkg.com/three@0.160.0/build/three.module.js';

const PORTADA_PLACEHOLDER_PATH = 'assets/libro-muestra/portada-mockup.jpg';

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

  // --- Escena base ---------------------------------------------------
  const scene = new THREE.Scene();
  scene.background = null; // transparente, hereda el fondo de la sección

  const camera = new THREE.PerspectiveCamera(
    35,
    container.clientWidth / container.clientHeight,
    0.1,
    100
  );
  camera.position.set(0, 0.15, 4.2);

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

  // Bloque de páginas (cuerpo del libro)
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

  // Filete dorado sutil en el borde de la tapa (detalle editorial)
  const filete = new THREE.Mesh(
    new THREE.BoxGeometry(ANCHO - 0.08, ALTO - 0.08, 0.002),
    new THREE.MeshStandardMaterial({ color: COLOR_DORADO, roughness: 0.3, metalness: 0.6 })
  );
  filete.position.set(ANCHO / 2, 0, GROSOR_BLOQUE / 2 + GROSOR_TAPA + 0.002);
  pivoteTapa.add(filete);

  // Carga de textura de portada (placeholder si el archivo aún no existe)
  const loader = new THREE.TextureLoader();
  loader.load(
    options.portadaSrc || PORTADA_PLACEHOLDER_PATH,
    (textura) => {
      textura.colorSpace = THREE.SRGBColorSpace;
      materialTapaFallback.map = textura;
      materialTapaFallback.color.set(0xffffff);
      materialTapaFallback.needsUpdate = true;
    },
    undefined,
    () => {
      // Si falla la carga (placeholder inexistente), se queda el color
      // sólido de respaldo — no rompe el prototipo.
      console.warn(
        '[libro-muestra] No se encontró la imagen de portada, usando color de respaldo. ' +
          `Ruta esperada: ${options.portadaSrc || PORTADA_PLACEHOLDER_PATH}`
      );
    }
  );

  // --- Interacción: hover + click para abrir -----------------------------
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
  container.addEventListener('click', () => {
    state.abierto = !state.abierto;
    aperturaObjetivo = state.abierto ? -150 : 0;
    hoverObjetivo = 0;
  });

  // --- Loop de animación ---------------------------------------------------
  let anguloRenderizado = 0;
  let rotacionLibro = 0;

  function animar() {
    requestAnimationFrame(animar);

    // Suavizado (ease) del ángulo de apertura de la tapa
    const objetivo = anguloActual();
    anguloRenderizado += (objetivo - anguloRenderizado) * 0.12;
    pivoteTapa.rotation.y = THREE.MathUtils.degToRad(anguloRenderizado);

    // Rotación suave y constante del libro completo (idle), más lenta si está abierto
    rotacionLibro += state.abierto ? 0.0015 : 0.004;
    grupoLibro.rotation.y = Math.sin(rotacionLibro) * 0.25;

    renderer.render(scene, camera);
  }
  animar();

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
      aperturaObjetivo = -150;
    },
    cerrar: () => {
      state.abierto = false;
      aperturaObjetivo = 0;
    },
    destruir: () => {
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      container.removeChild(renderer.domElement);
    },
  };
}
// Comportamiento del menú de la variante visual; el generador conserva su lógica.
const menu = document.querySelector('.universo-menu')
if (menu) {
  menu.addEventListener('click', (event) => {
    if (event.target.closest('a')) menu.open = false
  })
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.open) {
      menu.open = false
      menu.querySelector('summary').focus()
    }
  })
  document.addEventListener('click', (event) => {
    if (menu.open && !menu.contains(event.target)) menu.open = false
  })
}

// Reajusta el enlace directo después de cargar fuentes e imágenes del hero.
// Sus medidas pueden cambiar desde la posición calculada inicialmente por el navegador.
if (window.location.hash === '#generador') {
  const paginaLista = document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve) => window.addEventListener('load', resolve, { once: true }))
  Promise.all([paginaLista, document.fonts?.ready]).then(() => {
    if (window.location.hash === '#generador') {
      document.getElementById('generador')?.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
  })
}

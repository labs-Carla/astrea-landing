const menu = document.querySelector('.astrea-publica .menu-movil');
if (menu) {
  const cerrar = () => { menu.open = false; };
  document.addEventListener('click', (evento) => {
    if (!menu.contains(evento.target) || evento.target.closest('a')) cerrar();
  });
  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && menu.open) {
      cerrar();
      menu.querySelector('summary').focus();
    }
  });
}

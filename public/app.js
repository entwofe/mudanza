let idCajaEditando = null;
let cajasData = [];

const modal = document.getElementById('modalNuevaCaja');
const btnAbrirModal = document.getElementById('btnAbrirModal');
const btnCerrarModal = document.getElementById('cerrarModal');
const inputFoto = document.getElementById('foto');
const contenedorVistaPrevia = document.getElementById('vistaPreviaFoto');
const contador = document.getElementById('contadorCajas');

// Cargar cajas desde la API
async function cargarCajas() {
  try {
    const respuesta = await fetch('/api/cajas');
    cajasData = await respuesta.json();
    aplicarFiltros();
  } catch (error) {
    console.error('Error cargando cajas:', error);
  }
}

// Aplicar filtros y pintar cajas
function aplicarFiltros() {
  const texto = document.getElementById('filtroTexto').value.toLowerCase();
  const ubicacion = document.getElementById('filtroUbicacion').value;
  const prioridad = document.getElementById('filtroPrioridad').value;
  const categoria = document.getElementById('filtroCategoria').value;
  const filtroFragilActivo = document.getElementById('filtrofragil').checked;
  const filtroPesadoActivo = document.getElementById('filtropesado').checked;

  const contenedor = document.getElementById('contenedorCajas');
  contenedor.innerHTML = '';

  const cajasFiltradas = cajasData.filter(caja => {
    const coincideTexto = caja.nombre.toLowerCase().includes(texto) ||
                          caja.categoria.toLowerCase().includes(texto) ||
                          caja.contenido.toLowerCase().includes(texto);
    const coincideUbicacion = ubicacion === '' || caja.ubicacion === ubicacion;
    const coincidePrioridad = prioridad === '' || caja.prioridad === prioridad;
    const coincideCategoria = categoria === '' || caja.categoria === categoria;
    const coincideFragil = !filtroFragilActivo || caja.fragil == 1;
    const coincidePesado = !filtroPesadoActivo || caja.pesado == 1;

    return coincideTexto && coincideUbicacion && coincidePrioridad && coincideCategoria && coincideFragil && coincidePesado;
  });

  // 👉 Actualizar contador correctamente
  contador.textContent = `Total: ${cajasFiltradas.length} caja${cajasFiltradas.length !== 1 ? 's' : ''}`;

  if (cajasFiltradas.length === 0) {
    contenedor.innerHTML = '<p style="text-align:center; margin-top:20px;">No se encontraron cajas.</p>';
    return;
  }

  cajasFiltradas.forEach(caja => crearCajaElemento(caja, contenedor));
}

// Crear el HTML de cada caja
function crearCajaElemento(caja, contenedor) {
  const divCaja = document.createElement('div');
  divCaja.classList.add('caja', `categoria-${caja.categoria.toLowerCase()}`);

  divCaja.innerHTML = `
    <div class="caja-header">
      <span>#${caja.numero_caja}</span>
      <span>${caja.nombre}</span>
    </div>
    <div class="caja-detalle">
      <div class="detalle-info">
        <p><strong>Contenido:</strong> ${caja.contenido}</p>
        <p><strong>Categoría:</strong> ${caja.categoria}</p>
        <p><strong>Ubicación:</strong> ${caja.ubicacion}</p>
        <p><strong>Frágil:</strong> ${caja.fragil == 1 ? 'Sí' : 'No'}</p>
        <p><strong>Pesado:</strong> ${caja.pesado == 1 ? 'Sí' : 'No'}</p>
        <p><strong>Prioridad:</strong> ${caja.prioridad}</p>
      </div>
      <div class="detalle-foto">
        ${caja.foto ? `<img src="${caja.foto}" alt="Foto de la caja">` : `<div class="empty">Foto no disponible</div>`}
      </div>
      <div class="acciones">
        <button class="btn-editar">Editar</button>
        <button class="btn-eliminar">Eliminar</button>
      </div>
    </div>
  `;

  const header = divCaja.querySelector('.caja-header');
  const detalle = divCaja.querySelector('.caja-detalle');
  header.addEventListener('click', () => {
    detalle.classList.toggle('activo');
  });

  const btnEditar = divCaja.querySelector('.btn-editar');
  btnEditar.addEventListener('click', (e) => {
    e.stopPropagation();
    abrirModalEditar(caja);
  });

  const btnEliminar = divCaja.querySelector('.btn-eliminar');
  btnEliminar.addEventListener('click', (e) => {
    e.stopPropagation();
    eliminarCaja(caja);
  });

  contenedor.appendChild(divCaja);
}

// Modal de editar
function abrirModalEditar(caja) {
  document.getElementById('numero_caja').value = caja.numero_caja;
  document.getElementById('nombre').value = caja.nombre;
  document.getElementById('categoria').value = caja.categoria;
  document.getElementById('ubicacion').value = caja.ubicacion;
  document.getElementById('contenido').value = caja.contenido;
  document.getElementById('prioridad').value = caja.prioridad;
  document.getElementById('fragil').checked = caja.fragil == 1;
  document.getElementById('pesado').checked = caja.pesado == 1;
  document.getElementById('foto').value = '';
  contenedorVistaPrevia.innerHTML = '';

  idCajaEditando = caja.id;
  modalTitulo.textContent = 'Editar Caja';
  modal.style.display = 'block';
}

// Toasts bonitos
function mostrarToast(mensaje, tipo = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${tipo}`;
  toast.textContent = mensaje;

  container.appendChild(toast);
  document.body.classList.add('blur-activo');

  setTimeout(() => {
    toast.remove();
    if (container.children.length === 0) {
      document.body.classList.remove('blur-activo');
    }
  }, 2000);
}

// Eliminar caja
async function eliminarCaja(caja) {
  const confirmar = confirm(`¿Estás seguro de eliminar la caja "${caja.nombre}"?`);
  if (!confirmar) return;

  try {
    const respuesta = await fetch(`/api/cajas/${caja.id}`, { method: 'DELETE' });
    if (respuesta.ok) {
      mostrarToast('Caja eliminada correctamente', 'error');
      cargarCajas();
    } else {
      mostrarToast('Error al eliminar la caja ❌', 'error');
    }
  } catch (error) {
    console.error('Error eliminando la caja:', error);
    mostrarToast('Error al eliminar la caja ❌', 'error');
  }
}

// Guardar nueva caja o editar existente
document.getElementById('formNuevaCaja').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = new FormData();
  formData.append('numero_caja', document.getElementById('numero_caja').value);
  formData.append('nombre', document.getElementById('nombre').value);
  formData.append('categoria', document.getElementById('categoria').value);
  formData.append('ubicacion', document.getElementById('ubicacion').value);
  formData.append('contenido', document.getElementById('contenido').value);
  formData.append('prioridad', document.getElementById('prioridad').value);
  formData.append('fragil', document.getElementById('fragil').checked ? '1' : '0');
  formData.append('pesado', document.getElementById('pesado').checked ? '1' : '0');

  const fotoInput = document.getElementById('foto');
  if (fotoInput.files.length > 0) {
    formData.append('foto', fotoInput.files[0]);
  }

  try {
    let respuesta;
    if (idCajaEditando) {
      respuesta = await fetch(`/api/cajas/${idCajaEditando}`, { method: 'PUT', body: formData });
    } else {
      respuesta = await fetch('/api/cajas', { method: 'POST', body: formData });
    }

    const datos = await respuesta.json();
    console.log('Respuesta:', datos);

    mostrarToast(idCajaEditando ? 'Caja actualizada correctamente ✏️' : 'Caja creada correctamente 📦', 'success');

    document.getElementById('formNuevaCaja').reset();
    contenedorVistaPrevia.innerHTML = '';
    modal.style.display = 'none';
    idCajaEditando = null;
    cargarCajas();
  } catch (error) {
    console.error('Error guardando la caja:', error);
    mostrarToast('Error guardando la caja ❌', 'error');
  }
});

// Vista previa foto
inputFoto.addEventListener('change', () => {
  const archivo = inputFoto.files[0];
  if (archivo) {
    const reader = new FileReader();
    reader.onload = e => {
      contenedorVistaPrevia.innerHTML = `<img src="${e.target.result}" alt="Vista previa" class="img-previa">`;
    };
    reader.readAsDataURL(archivo);
  } else {
    contenedorVistaPrevia.innerHTML = '';
  }
});

// Botones abrir/cerrar modal
btnAbrirModal.addEventListener('click', () => {
  document.getElementById('formNuevaCaja').reset();
  contenedorVistaPrevia.innerHTML = '';
  idCajaEditando = null;
  modalTitulo.textContent = 'Nueva Caja';
  modal.style.display = 'block';
});

btnCerrarModal.addEventListener('click', () => {
  modal.style.display = 'none';
});

// Listeners de filtros
document.getElementById('filtroTexto').addEventListener('input', aplicarFiltros);
document.getElementById('filtroUbicacion').addEventListener('change', aplicarFiltros);
document.getElementById('filtroPrioridad').addEventListener('change', aplicarFiltros);
document.getElementById('filtroCategoria').addEventListener('change', aplicarFiltros);
document.getElementById('filtrofragil').addEventListener('change', aplicarFiltros);
document.getElementById('filtropesado').addEventListener('change', aplicarFiltros);
document.getElementById('btnSubirFoto').addEventListener('click', () => {
  document.getElementById('foto').click();
});

// Cargar al inicio
window.addEventListener('DOMContentLoaded', cargarCajas);
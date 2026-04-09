import { supabase } from './supabase.js'
import { cargarModalCliente, abrirModalCliente } from './modalCliente.js'

let clientes = []

const table = document.getElementById('clientesTable')
const searchInput = document.getElementById('searchInput')
const openModalBtn = document.getElementById('openModal')

// =============================
// ABRIR MODAL (REUTILIZABLE)
// =============================
openModalBtn.onclick = () => {
  abrirModalCliente(() => {
    cargarClientes()
  })
}

// =============================
// CARGAR CLIENTES
// =============================
async function cargarClientes() {
  const { data } = await supabase.from('clientes').select('*')
  clientes = data || []
  renderClientes(clientes)
}

// =============================
// RENDER
// =============================
function renderClientes(lista) {

  const tablaContainer = document.getElementById('tablaContainer')
  const cardsContainer = document.getElementById('cardsContainer')

  const esMobile = window.innerWidth < 768

  table.innerHTML = ''
  cardsContainer.innerHTML = ''

  // =============================
  //  MOBILE → CARDS
  // =============================
  if (esMobile) {

    tablaContainer.classList.add('hidden')
    cardsContainer.classList.remove('hidden')

    lista.forEach(c => {
      cardsContainer.innerHTML += `
        <div class="bg-white rounded-xl shadow p-4 space-y-3">

          <!-- NOMBRE -->
          <div>
            <p class="text-xs text-gray-400">Cliente</p>
            <p class="font-bold text-lg text-gray-800">${c.nombre}</p>
          </div>

          <!-- INFO -->
          <div class="grid grid-cols-2 gap-2 text-sm">

            <div>
              <p class="text-gray-400">Teléfono</p>
              <p class="font-medium">${c.telefono || '-'}</p>
            </div>

            <div>
              <p class="text-gray-400">Departamento</p>
              <p class="font-medium">${c.departamento || '-'}</p>
            </div>

            <div class="col-span-2">
              <p class="text-gray-400">Dirección</p>
              <p class="font-medium">${c.direccion || '-'}</p>
            </div>

          </div>

          <!-- BOTONES -->
          <div class="flex gap-2 pt-2">

            <button onclick="verEstadoCuenta('${c.id}')"
              class="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 text-sm">
              <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
              Estado
            </button>

            <button onclick="editar('${c.id}')"
              class="px-3 py-2 rounded-lg bg-blue-100 text-blue-600">
              <i data-lucide="pencil" class="w-4 h-4"></i>
            </button>

            <button onclick="eliminar('${c.id}')"
              class="px-3 py-2 rounded-lg bg-red-100 text-red-600">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>

          </div>

        </div>
      `
    })

  }

  // =============================
  // DESKTOP → TABLA
  // =============================
  else {

    tablaContainer.classList.remove('hidden')
    cardsContainer.classList.add('hidden')

    lista.forEach(c => {
      table.innerHTML += `
        <tr class="border-t hover:bg-gray-50 transition">

          <td class="p-3 font-semibold text-gray-800">
            ${c.nombre}
          </td>

          <td class="p-3 text-gray-600">
            ${c.telefono || '-'}
          </td>

          <td class="p-3 text-gray-600">
            ${c.direccion || '-'}
          </td>

          <td class="p-3 text-gray-600">
            ${c.departamento || '-'}
          </td>

          <td class="p-3">
            <button onclick="verEstadoCuenta('${c.id}')"
              class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition font-medium">

              <i data-lucide="bar-chart-3" class="w-4 h-4"></i>
              Estado
            </button>
          </td>

          <td class="p-3">
            <div class="flex justify-center gap-3">

              <button onclick="editar('${c.id}')"
                class="text-blue-500 hover:text-blue-600 hover:scale-110 transition">
                <i data-lucide="pencil"></i>
              </button>

              <button onclick="eliminar('${c.id}')"
                class="text-red-500 hover:text-red-600 hover:scale-110 transition">
                <i data-lucide="trash-2"></i>
              </button>

            </div>
          </td>

        </tr>
      `
    })

  }

  lucide.createIcons()
}

// =============================
// EDITAR (usa mismo modal)
// =============================
window.editar = (id) => {
  const c = clientes.find(x => x.id === id)

  abrirModalCliente(async () => {
    cargarClientes()
  })

  // esperar a que el modal cargue
  setTimeout(() => {
    document.getElementById('nombreCliente').value = c.nombre
    document.getElementById('telefonoCliente').value = c.telefono || ''
    document.getElementById('direccionCliente').value = c.direccion || ''
    document.getElementById('departamentoCliente').value = c.departamento || ''
  }, 100)
}

// =============================
// ELIMINAR
// =============================
window.eliminar = async (id) => {
  if (!confirm("¿Eliminar cliente?")) return

  await supabase.from('clientes').delete().eq('id', id)
  cargarClientes()
}

// =============================
// IR A ESTADO DE CUENTA
// =============================
window.verEstadoCuenta = (id) => {
  window.location.href = `estado_cuenta.html?id=${id}`
}

window.addEventListener('resize', () => {
  renderClientes(clientes)
})

// =============================
// BUSCAR
// =============================
searchInput.addEventListener('input', () => {
  const texto = searchInput.value.toLowerCase()

  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(texto)
  )

  renderClientes(filtrados)
})

// =============================
// INIT
// =============================
async function init() {
  await cargarModalCliente()
  await cargarClientes()
}

init()
import { supabase } from './supabase.js'
import { cargarModalCliente, abrirModalCliente } from './modalCliente.js'

const clienteSelect = document.getElementById('clienteSelect')
const productosTable = document.getElementById('productosTable')
const totalSpan = document.getElementById('total')
const addBtn = document.getElementById('addProducto')
const guardarBtn = document.getElementById('guardarFactura')

// MODAL
const modalSuccess = document.getElementById('modalSuccess')
const descargarDesdeModal = document.getElementById('descargarDesdeModal')
const cerrarModalSuccess = document.getElementById('cerrarModalSuccess')

let categorias = []
let subcategorias = []
let total = 0

// =============================
// CLIENTES
// =============================
async function cargarClientes() {
  const { data } = await supabase.from('clientes').select('*')

  clienteSelect.innerHTML = '<option value="">Seleccione cliente</option>'

  data.forEach(c => {
    clienteSelect.innerHTML += `
      <option value="${c.id}">${c.nombre}</option>
    `
  })

  clienteSelect.innerHTML += `
    <option value="nuevo">+ Nuevo cliente</option>
  `
}

// =============================
// MODAL CLIENTE
// =============================
clienteSelect.addEventListener('change', () => {
  if (clienteSelect.value === 'nuevo') {
    abrirModalCliente(async (nuevoCliente) => {
      await cargarClientes()
      clienteSelect.value = nuevoCliente.id
    })
  }
})

// =============================
// CARGAR DATA
// =============================
async function cargarData() {
  const { data: cat } = await supabase.from('categorias').select('*')
  const { data: sub } = await supabase.from('subcategorias').select('*')

  categorias = cat || []
  subcategorias = sub || []
}

// =============================
// OPTIONS
// =============================
function getCategoriasOptions() {
  return categorias.map(c => `
    <option value="${c.id}">${c.nombre}</option>
  `).join('')
}

function getSubcategoriasOptions(categoria_id) {
  return subcategorias
    .filter(s => s.categoria_id === categoria_id)
    .map(s => `
      <option value="${s.id}">${s.nombre}</option>
    `).join('')
}

// =============================
// AGREGAR PRODUCTO
// =============================
addBtn.onclick = () => {

  const row = document.createElement('tr')

  row.innerHTML = `
    <td>
      <select class="categoria p-1 border w-full">
        <option value="">Seleccione</option>
        ${getCategoriasOptions()}
      </select>
    </td>

    <td>
      <select class="subcategoria p-1 border w-full">
        <option value="">Seleccione</option>
      </select>
    </td>

    <td>
      <input class="descripcion p-1 border w-full" placeholder="Descripción">
    </td>

    <td>
      <input type="number" class="cantidad p-1 border w-full" value="1" min="1">
    </td>

    <td>
      <input type="number" class="precio p-1 border w-full" value="0" min="0">
    </td>

    <td class="subtotal">0.00</td>

    <td>
      <button class="delete text-red-500">
        <i data-lucide="trash-2"></i>
      </button>
    </td>
  `

  productosTable.appendChild(row)

  const categoriaSelect = row.querySelector('.categoria')
  const subcategoriaSelect = row.querySelector('.subcategoria')

  // CAMBIO DINÁMICO
  categoriaSelect.onchange = () => {
    subcategoriaSelect.innerHTML = `
      <option value="">Seleccione</option>
      ${getSubcategoriasOptions(categoriaSelect.value)}
    `
  }

  const cantidad = row.querySelector('.cantidad')
  const precio = row.querySelector('.precio')
  const subtotal = row.querySelector('.subtotal')

  function calcular() {
    const sub = cantidad.value * precio.value
    subtotal.textContent = Number(sub).toFixed(2)
    calcularTotal()
  }

  cantidad.oninput = calcular
  precio.oninput = calcular

  row.querySelector('.delete').onclick = () => {
    row.remove()
    calcularTotal()
  }

  lucide.createIcons()
}

// =============================
// TOTAL
// =============================
function calcularTotal() {
  total = 0

  document.querySelectorAll('.subtotal').forEach(td => {
    total += Number(td.textContent)
  })

  totalSpan.textContent = total.toFixed(2)
}

// =============================
// GUARDAR
// =============================
guardarBtn.onclick = async () => {

  if (!clienteSelect.value || clienteSelect.value === "nuevo") {
    alert("Debe seleccionar un cliente")
    return
  }

  if (productosTable.children.length === 0) {
    alert("Agrega productos")
    return
  }

  const cliente_id = clienteSelect.value
  const tipo = document.getElementById('tipo').value
  const estado = tipo === 'contado' ? 'pagado' : 'pendiente'

  const { data: factura, error } = await supabase
    .from('facturas')
    .insert([{
      cliente_id,
      tipo,
      estado,
      fecha: new Date(),
      total
    }])
    .select()
    .single()

  if (error) {
    alert("Error al guardar factura")
    return
  }

  const detalles = []

  document.querySelectorAll('#productosTable tr').forEach(row => {
    detalles.push({
      factura_id: factura.id,
      subcategoria_id: row.querySelector('.subcategoria').value,
      descripcion: row.querySelector('.descripcion').value,
      cantidad: row.querySelector('.cantidad').value,
      precio: row.querySelector('.precio').value
    })
  })

  await supabase.from('productos_factura').insert(detalles)

  modalSuccess.classList.remove('hidden')
  modalSuccess.classList.add('flex')
}

// =============================
// PDF
// =============================
function generarPDF() {
  const element = document.getElementById('facturaPDF')

  html2pdf()
    .from(element)
    .set({
      margin: 0.5,
      filename: 'factura.pdf',
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    })
    .save()
}

descargarDesdeModal.onclick = () => {
  generarPDF()
  modalSuccess.classList.add('hidden')
}

cerrarModalSuccess.onclick = () => {
  modalSuccess.classList.add('hidden')
}

// =============================
// INIT
// =============================
async function init() {
  await cargarModalCliente()
  await cargarClientes()
  await cargarData() //  IMPORTANTE
}

init()
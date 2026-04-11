import { supabase } from './supabase.js'
import { cargarModalCliente, abrirModalCliente } from './modalCliente.js'

// =============================
// ELEMENTOS
// =============================
const clienteBtn = document.getElementById('clienteBtn')
const clienteList = document.getElementById('clienteList')
const clienteText = document.getElementById('clienteText')
const clienteSelect = document.getElementById('clienteSelect')

const tipoBtn = document.getElementById('tipoBtn')
const tipoList = document.getElementById('tipoList')
const tipoText = document.getElementById('tipoText')
const tipoInput = document.getElementById('tipo')

const productosTable = document.getElementById('productosTable')
const addBtn = document.getElementById('addProducto')
const totalSpan = document.getElementById('total')
const guardarBtn = document.getElementById('guardarFactura')

const modalSuccess = document.getElementById('modalSuccess')
const descargarDesdeModal = document.getElementById('descargarDesdeModal')
const cerrarModalSuccess = document.getElementById('cerrarModalSuccess')
const tablaProductosContainer = document.getElementById('tablaProductosContainer')
const cardsProductosContainer = document.getElementById('cardsProductosContainer')

function esMobile() {
  return window.innerWidth < 768
}

// =============================
// STATE
// =============================
let categorias = []
let subcategorias = []
let total = 0
let facturaGuardada = null

// =============================
// DROPDOWNS GENERALES (CLIENTE + TIPO)
// =============================
function setupDropdown(btn, list, textEl, inputEl = null) {

  btn.onclick = () => list.classList.toggle('hidden')

  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !list.contains(e.target)) {
      list.classList.add('hidden')
    }
  })

  list.querySelectorAll('div[data-value]').forEach(item => {
    item.onclick = () => {
      if (inputEl) inputEl.value = item.dataset.value

      textEl.textContent = item.textContent
      textEl.classList.remove('text-gray-500')

      list.classList.add('hidden')
    }
  })
}

// =============================
// CLIENTE
// =============================
clienteBtn.onclick = () => clienteList.classList.toggle('hidden')

document.addEventListener('click', (e) => {
  if (!clienteBtn.contains(e.target) && !clienteList.contains(e.target)) {
    clienteList.classList.add('hidden')
  }
})

async function cargarClientes() {
  const { data } = await supabase.from('clientes').select('*')

  clienteList.innerHTML = ''

  // ==============================
  // CLIENTES
  // ==============================
  data.forEach(c => {
    const div = document.createElement('div')
    div.className = "p-3 hover:bg-gray-100 cursor-pointer"
    div.textContent = c.nombre

    div.onclick = () => {
      clienteSelect.value = c.id
      clienteText.textContent = c.nombre
      clienteText.classList.remove('text-gray-500')
      clienteList.classList.add('hidden')
    }

    clienteList.appendChild(div)
  })

  // ==============================
  // SEPARADOR VISUAL
  // ==============================
  const sep = document.createElement('div')
  sep.className = "border-t my-1"
  clienteList.appendChild(sep)

  // ==============================
  // NUEVO CLIENTE
  // ==============================
  const nuevo = document.createElement('div')
  nuevo.className = "p-3 text-primary font-medium hover:bg-gray-100 cursor-pointer flex items-center gap-2"
  nuevo.innerHTML = `
    <i data-lucide="user-plus"></i>
    Nuevo cliente
  `

  nuevo.onclick = () => {
    abrirModalCliente(async (nuevoCliente) => {
      await cargarClientes(nuevoCliente.id)
    })
  }

  clienteList.appendChild(nuevo)

  lucide.createIcons()
}

// =============================
// DATA
// =============================
async function cargarData() {
  const { data: cat } = await supabase.from('categorias').select('*')
  const { data: sub } = await supabase.from('subcategorias').select('*')

  categorias = cat || []
  subcategorias = sub || []
}

// =============================
// PRODUCTOS DROPDOWN
// =============================
function getProductoDropdown() {
  return categorias.map(cat => {

    const subs = subcategorias
      .filter(s => s.categoria_id == cat.id)
      .map(s => `
        <div class="p-2 hover:bg-gray-100 cursor-pointer sub-item"
          data-id="${s.id}"
          data-name="${s.nombre}">
          ${s.nombre}
        </div>
      `).join('')

    return `
      <div class="border-b">
        <div class="bg-gray-100 px-2 py-1 text-xs font-bold">
          ${cat.nombre}
        </div>
        ${subs}
      </div>
    `
  }).join('')
}

// =============================
// PRODUCTOS
// =============================
addBtn.onclick = () => {

  // =============================
  // MOBILE → CARD
  // =============================
  if (esMobile()) {
    
    tablaProductosContainer.classList.add('hidden')
    cardsProductosContainer.classList.remove('hidden')

    const card = document.createElement('div')

    card.className = "bg-white border rounded-xl p-4 space-y-3 shadow"

    card.innerHTML = `
      <!-- PRODUCTO -->
      <div class="relative">
        <label class="text-sm text-gray-500">Producto</label>

        <button class="productoBtn w-full flex justify-between items-center p-3 border rounded-lg bg-white text-gray-500">
          <span>Selecciona producto</span>
          <i data-lucide="chevron-down"></i>
        </button>

        <div class="productoList hidden absolute z-[9999] top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          ${getProductoDropdown()}
        </div>

        <input type="hidden" class="subcategoria">
      </div>

      <!-- DESCRIPCIÓN -->
      <div>
        <label class="text-sm text-gray-500">Descripción</label>
        <input placeholder="Descripción"
          class="descripcion border p-2 w-full rounded-lg">
      </div>

      <!-- CANTIDAD Y PRECIO -->
      <div class="grid grid-cols-2 gap-2">
        <div>
          <label class="text-sm text-gray-500">Cantidad</label>
          <input type="number" class="cantidad border p-2 rounded-lg w-full" value="1">
        </div>

        <div>
          <label class="text-sm text-gray-500">Precio</label>
          <input type="number" class="precio border p-2 rounded-lg w-full" value="0">
        </div>
      </div>

      <!-- TOTAL -->
      <div class="flex justify-between items-center">
        <span class="text-gray-500 text-sm">Subtotal</span>
        <span class="subtotal font-bold text-lg">0.00</span>
      </div>

      <!-- ELIMINAR -->
      <button class="delete w-full py-2 rounded-lg bg-red-100 text-red-600 text-sm">
        Eliminar
      </button>
    `

    cardsProductosContainer.appendChild(card)

    setupProductoLogic(card)

  }

  // =============================
  // DESKTOP → TABLA
  // =============================
  else {

    tablaProductosContainer.classList.remove('hidden')
    cardsProductosContainer.classList.add('hidden')

    const row = document.createElement('tr')

    row.innerHTML = `
      <td class="p-2 relative">

        <button class="productoBtn w-full flex justify-between items-center p-3 border rounded-lg bg-white shadow-sm text-gray-500">
          <span>Selecciona producto</span>
          <i data-lucide="chevron-down"></i>
        </button>

        <div class="productoList hidden absolute z-[999] mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
          
        ${getProductoDropdown()}
        </div>

        <input type="hidden" class="subcategoria">
      </td>

      <td class="p-2">
        <input class="descripcion border p-1 w-full">
      </td>

      <td class="p-2">
        <input type="number" class="cantidad border p-1 w-full" value="1">
      </td>

      <td class="p-2">
        <input type="number" class="precio border p-1 w-full" value="0">
      </td>

      <td class="subtotal p-2">0.00</td>

      <td class="p-2">
        <button class="delete text-red-500">
          <i data-lucide="trash-2"></i>
        </button>
      </td>
    `

    productosTable.appendChild(row)

    setupProductoLogic(row)
  }

  lucide.createIcons()
}

document.addEventListener('click', () => {
  document.querySelectorAll('.productoList').forEach(list => {
    list.classList.add('hidden')
  })
})

function setupProductoLogic(container) {

  const btn = container.querySelector('.productoBtn')
  const list = container.querySelector('.productoList')
  const hidden = container.querySelector('.subcategoria')
  const desc = container.querySelector('.descripcion')
  const cant = container.querySelector('.cantidad')
  const precio = container.querySelector('.precio')
  const subtotal = container.querySelector('.subtotal')

  btn.onclick = (e) => {
  e.stopPropagation()
  list.classList.toggle('hidden')
}

    list.querySelectorAll('.sub-item').forEach(item => {
    item.onclick = () => {
      hidden.value = item.dataset.id
      btn.querySelector('span').textContent = item.dataset.name
      btn.classList.remove('text-gray-500')
      list.classList.add('hidden')

      desc.value = item.dataset.name
    }
  })

  function calc() {
    subtotal.textContent = (cant.value * precio.value).toFixed(2)
    calcularTotal()
  }

  cant.oninput = calc
  precio.oninput = calc

  container.querySelector('.delete').onclick = () => {
    container.remove()
    calcularTotal()
  }
}
// =============================
// TOTAL
// =============================
function calcularTotal() {
  total = 0

  document.querySelectorAll('.subtotal').forEach(el => {
    total += Number(el.textContent)
  })

  totalSpan.textContent = total.toFixed(2)
}

// =============================
// GUARDAR
// =============================
guardarBtn.onclick = async () => {

  if (!clienteSelect.value) return alert("Selecciona cliente")

  const tipo = tipoInput.value
  const estado = tipo === 'contado' ? 'pagado' : 'pendiente'

  const { data: factura } = await supabase
    .from('facturas')
    .insert([{
      cliente_id: clienteSelect.value,
      tipo,
      estado,
      fecha: new Date(),
      total
    }])
    .select()
    .single()
  
  facturaGuardada = factura

  const detalles = []


  // =============================
  // DESKTOP (TABLA)
  // =============================
  document.querySelectorAll('#productosTable tr').forEach(row => {
    detalles.push({
      factura_id: factura.id,
      subcategoria_id: row.querySelector('.subcategoria')?.value,
      descripcion: row.querySelector('.descripcion')?.value,
      cantidad: row.querySelector('.cantidad')?.value,
      precio: row.querySelector('.precio')?.value
    })
  })

  // =============================
  // MOBILE (CARDS)
  // =============================
  document.querySelectorAll('#cardsProductosContainer > div').forEach(card => {
    detalles.push({
      factura_id: factura.id,
      subcategoria_id: card.querySelector('.subcategoria')?.value,
      descripcion: card.querySelector('.descripcion')?.value,
      cantidad: card.querySelector('.cantidad')?.value,
      precio: card.querySelector('.precio')?.value
    })
  })

  await supabase.from('productos_factura').insert(detalles)

  modalSuccess.classList.remove('hidden')
  modalSuccess.classList.add('flex')

  lucide.createIcons()
}

// =============================
// PDF
// =============================
async function generarFacturaPDF() {

  if (!facturaGuardada) {
    alert("No hay factura")
    return
  }

  //  1. TRAER CLIENTE DESDE BD
  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', facturaGuardada.cliente_id)
    .single()

  //  2. TRAER PRODUCTOS
  const { data: detalles } = await supabase
  .from('productos_factura')
  .select(`
    *,
    subcategorias(nombre)
  `)
  .eq('factura_id', facturaGuardada.id)

  //  3. CREAR HTML
  const temp = document.createElement('div')

    temp.innerHTML = `
<div style="
  width: 100%;
  max-width: 680px;
  margin: auto;
  padding: 25px;
  font-family: Arial, sans-serif;
  background: white;
  color: #333;
">

  <!-- HEADER -->
  <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
    
    <img src="imagenes/logo.png" style="height:95px; object-fit: contain;" />

    <div style="text-align:right;">
      <h2 style="margin:0; font-size:16px;">
        Factura #${facturaGuardada.numero || facturaGuardada.id}
      </h2>

      <p style="margin:0; font-size:11px;">
        ${new Date(facturaGuardada.fecha).toLocaleDateString()}
      </p>

      <p style="margin:0; font-size:11px;">
        ${facturaGuardada.tipo.toUpperCase()}
      </p>
    </div>
  </div>

  <!-- CLIENTE -->
  <div style="margin-bottom:10px; font-size:12px; line-height:1.4;">
    <p><b>Cliente:</b> ${cliente.nombre}</p>
    <p><b>Dirección:</b> ${cliente.direccion || '-'}</p>
    <p><b>Tel:</b> ${cliente.telefono || '-'}</p>
  </div>

  <hr style="margin:10px 0;">

  <!-- TABLA -->
  <table style="width:100%; border-collapse: collapse; font-size:11px;">
    <thead>
      <tr style="background:#f5f5f5;">
        <th style="padding:6px; border-bottom:1px solid #ddd;">Producto</th>
        <th style="padding:6px; border-bottom:1px solid #ddd;">Cantidad</th>
        <th style="padding:6px; border-bottom:1px solid #ddd;">Precio</th>
        <th style="padding:6px; border-bottom:1px solid #ddd;">Total</th>
      </tr>
    </thead>

    <tbody>
      ${
        detalles.map(d => `
          <tr>
            <td style="padding:5px; border-bottom:1px solid #eee;">
              ${d.descripcion || ''}
            </td>

            <td style="padding:5px; text-align:center; border-bottom:1px solid #eee;">
              ${d.cantidad}
            </td>

            <td style="padding:5px; text-align:right; border-bottom:1px solid #eee;">
              C$ ${Number(d.precio).toFixed(2)}
            </td>

            <td style="padding:5px; text-align:right; border-bottom:1px solid #eee;">
              C$ ${(d.cantidad * d.precio).toFixed(2)}
            </td>
          </tr>
        `).join('')
      }
    </tbody>
  </table>

  <!-- TOTAL BOX -->
  <div style="display:flex; justify-content:flex-end; margin-top:15px;">
    <div style="
      border:1px solid #ddd;
      padding:10px 15px;
      border-radius:8px;
      font-size:13px;
    ">
      <b>Total: C$ ${Number(facturaGuardada.total).toFixed(2)}</b>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="margin-top:25px; text-align:center; font-size:10px; color:#888;">
    Gracias por su compra
  </div>

</div>
`

document.body.appendChild(temp)

// esperar render
await new Promise(resolve => setTimeout(resolve, 500))

//  esperar imagen
const img = temp.querySelector('img')
if (img) {
  await new Promise(resolve => {
    if (img.complete) return resolve()
    img.onload = resolve
    img.onerror = resolve
  })
}

await html2pdf()
  .from(temp.firstElementChild)
  .set({
    margin: 0.3,
    filename: `factura_${facturaGuardada.id}.pdf`,
    html2canvas: {
      scale: 1.5,
      useCORS: true,
      scrollY: 0
    },
    jsPDF: { unit: 'in', format: 'letter' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  })
  .save()

document.body.removeChild(temp)

}

// MODAL
descargarDesdeModal.onclick = async () => {
  await generarFacturaPDF()
  modalSuccess.classList.add('hidden')

  window.location.href = "index.html"
}

cerrarModalSuccess.onclick = () => {
  modalSuccess.classList.add('hidden')

  window.location.href = "index.html"
}

// INIT
async function init() {
  setupDropdown(tipoBtn, tipoList, tipoText, tipoInput)

  await cargarModalCliente()
  await cargarClientes()
  await cargarData()

  //  SI ES MOBILE
  if (esMobile()) {

    // mostrar título
    document.getElementById('tituloProductosMobile')
      .classList.remove('hidden')

    // activar vista cards
    tablaProductosContainer.classList.add('hidden')
    cardsProductosContainer.classList.remove('hidden')

    // crear primera card automáticamente
    addBtn.click()
  }
}

init()
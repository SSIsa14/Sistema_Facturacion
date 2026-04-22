import { supabase } from './supabase.js'

// =============================
// ELEMENTOS
// =============================
const lista = document.getElementById('listaFacturas')
const buscarNumero = document.getElementById('buscarNumero')
const buscarCliente = document.getElementById('buscarCliente')

const filtroTodos = document.getElementById('filtroTodos')
const filtroPendiente = document.getElementById('filtroPendiente')
const filtroPagado = document.getElementById('filtroPagado')
const filtroAbonado = document.getElementById('filtroAbonado')
const filtroFecha = document.getElementById('filtroFecha')

const modal = document.getElementById('modalDetalle')
const detalleContenido = document.getElementById('detalleContenido')
const cerrarDetalle = document.getElementById('cerrarDetalle')

// PDF
const pdfContainer = document.getElementById('pdfContainer')
const pdfNumero = document.getElementById('pdfNumero')
const pdfCliente = document.getElementById('pdfCliente')
const pdfTipo = document.getElementById('pdfTipo')
const pdfEstado = document.getElementById('pdfEstado')
const pdfDetalle = document.getElementById('pdfDetalle')
const pdfTotal = document.getElementById('pdfTotal')

let facturas = []
let filtroEstado = 'todos'

// =============================
// CARGAR FACTURAS
// =============================
async function cargarFacturas() {
  const { data } = await supabase
    .from('facturas')
    .select(`*, clientes ( nombre )`)
    .order('numero', { ascending: false })

  facturas = data || []
  renderFacturas(facturas)
}

// =============================
// BADGE
// =============================
function badgeEstado(estado) {
  const config = {
    pendiente: {
      label: 'Pendiente',
      class: 'bg-yellow-100 text-yellow-700'
    },
    abonado: {
      label: 'Abonada',
      class: 'bg-blue-100 text-blue-700'
    },
    pagado: {
      label: 'Pagada',
      class: 'bg-green-100 text-green-700'
    }
  }

  const e = config[estado] || {
    label: estado,
    class: 'bg-gray-100 text-gray-700'
  }

  return `<span class="px-2 py-1 rounded text-xs ${e.class}">${e.label}</span>`
}

// =============================
// RENDER MEJORADO PRO
// =============================
function renderFacturas(listaData) {
  lista.innerHTML = ''

  listaData.forEach(f => {

    const fecha = f.fecha
      ? new Date(f.fecha).toLocaleDateString('es-GT', {
          day: '2-digit',
          month: 'short',
          year: 'numeric'
        })
      : ''

    lista.innerHTML += `
      <div class="bg-white rounded-2xl shadow hover:shadow-lg transition p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-gray-100">

        <!-- INFO IZQUIERDA -->
        <div class="flex flex-col">
          
          <p class="text-sm text-gray-400">Factura</p>
          <p class="text-xl font-bold text-gray-800">#${f.numero}</p>

          <p class="text-lg font-semibold text-gray-800 mt-2 flex items-center gap-2">
            <i data-lucide="user" class="w-4 h-4 text-secondary"></i>
            ${f.clientes?.nombre || 'Sin cliente'}
          </p>

          <!--  FECHA DESTACADA -->
          <p class="text-base font-semibold text-gray-700 mt-2 flex items-center gap-2">
            <i data-lucide="calendar" class="w-4 h-4 text-primary"></i>
            ${fecha}
          </p>
        </div>

        <!-- INFO CENTRO -->
        <div class="text-sm text-gray-700 space-y-1">
          <p>
            <span class="font-semibold">Tipo:</span> ${f.tipo}
          </p>

          <p class="text-lg font-bold text-gray-900">
            C$ ${Number(f.total).toFixed(2)}
          </p>
        </div>

        <!-- ESTADO -->
        <div>
          ${badgeEstado(f.estado)}
        </div>

        <!-- ACCIONES -->
        <div class="flex gap-2">
          
          <button 
            onclick="verDetalle('${f.id}')"
            class="p-2 rounded-lg hover:bg-gray-100 text-primary transition"
            title="Ver detalle"
          >
            <i data-lucide="eye"></i>
          </button>

          <button 
            onclick="descargarPDFHistorial('${f.id}')"
            class="p-2 rounded-lg hover:bg-gray-100 text-blue-600 transition"
            title="Descargar PDF"
          >
            <i data-lucide="download"></i>
          </button>

        </div>

      </div>
    `
  })

  lucide.createIcons()
}

function formatearFechaGuate(fecha) {
  if (!fecha) return ''

  return new Date(fecha).toLocaleDateString('sv-SE', {
    timeZone: 'America/Guatemala'
  }) // YYYY-MM-DD
}

// =============================
// FILTRAR
// =============================
function filtrar() {
  const num = buscarNumero.value.toLowerCase()
  const cli = buscarCliente.value.toLowerCase()
  const fecha = filtroFecha.value

  let filtrados = facturas.filter(f => {

    const matchNumero = f.numero.toString().includes(num)
    const matchCliente = f.clientes?.nombre?.toLowerCase().includes(cli)

    let matchFecha = true

    if (fecha) {
      matchFecha = formatearFechaGuate(f.fecha) === fecha
    }

    return matchNumero && matchCliente && matchFecha
  })

  if (filtroEstado !== 'todos') {
    filtrados = filtrados.filter(f => f.estado === filtroEstado)
  }

  renderFacturas(filtrados)
}

// EVENTOS
buscarNumero.addEventListener('input', filtrar)
buscarCliente.addEventListener('input', filtrar)
filtroFecha.addEventListener('change', filtrar)

filtroTodos.onclick = () => { filtroEstado = 'todos'; filtrar() }
filtroPendiente.onclick = () => { filtroEstado = 'pendiente'; filtrar() }
filtroPagado.onclick = () => { filtroEstado = 'pagado'; filtrar() }
filtroAbonado.onclick = () => { filtroEstado = 'abonado'; filtrar() }

// =============================
// VER DETALLE
// =============================
window.verDetalle = async (id) => {

  const { data } = await supabase
    .from('productos_factura')
    .select(`
      *,
      subcategorias (
        nombre,
        categorias ( nombre )
      )
    `)
    .eq('factura_id', id)

  const totalItems = data.length
  const totalGeneral = data.reduce((acc, p) => acc + (p.cantidad * p.precio), 0)

  let html = `
    <div class="space-y-4">

      <!-- HEADER BONITO -->
      <div class="bg-gradient-to-r from-pink-50 to-green-50 p-4 rounded-xl">
        <p class="text-xs text-gray-500">Detalle de factura</p>
        <p class="text-xl font-bold text-gray-800">
          ${totalItems} productos
        </p>
        <p class="text-sm text-gray-600 mt-1">
          Total: <span class="font-bold text-gray-900">C$ ${totalGeneral.toFixed(2)}</span>
        </p>
      </div>
  `

  data.forEach(p => {

    const subtotal = p.cantidad * p.precio

    html += `
      <div class="bg-white border rounded-xl p-4 shadow-sm hover:shadow-md transition space-y-2">

        <!-- CATEGORIA -->
        <div class="flex justify-between items-start">

          <div>
            <p class="text-xs text-gray-400">Categoría</p>
            <p class="font-semibold text-gray-700">
              ${p.subcategorias?.categorias?.nombre || '—'}
            </p>
          </div>

          <span class="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
            x${p.cantidad}
          </span>

        </div>

        <!-- PRODUCTO -->
        <div>
          <p class="text-xs text-gray-400">Subcategoría</p>
          <p class="font-bold text-gray-700">
            ${p.subcategorias?.nombre || ''}
          </p>
        </div>

        <!-- DESCRIPCION -->
        <p class="text-sm text-gray-400">Descripción</p>
          <p class="font-bold text-gray-700">  
          ${p.descripcion || ''}
        </p>

        <!-- FOOTER -->
        <div class="flex justify-between items-center pt-2 border-t">

          <p class="text-sm text-gray-500">
            C$ ${Number(p.precio).toFixed(2)} c/u
          </p>

          <p class="text-lg font-bold text-green-600">
            C$ ${subtotal.toFixed(2)}
          </p>

        </div>

      </div>
    `
  })

  html += `</div>`

  detalleContenido.innerHTML = html

  modal.classList.remove('hidden')
  modal.classList.add('flex')

  lucide.createIcons()
}

// =============================
// PDF (MISMO DISEÑO)
// =============================
window.descargarPDFHistorial = async (id) => {

  // 1. FACTURA
  const { data: factura } = await supabase
    .from('facturas')
    .select(`*, clientes (*)`)
    .eq('id', id)
    .single()

  // 2. DETALLES
  const { data: detalles } = await supabase
    .from('productos_factura')
    .select(`
      *,
      subcategorias (
        nombre,
        categorias ( nombre )
      )
    `)
    .eq('factura_id', id)

  // 3. ABONOS
  const { data: abonos } = await supabase
    .from('abonos')
    .select('*')
    .eq('factura_id', id)

  const listaAbonos = abonos || []
  listaAbonos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  const totalAbonado = listaAbonos.reduce(
    (sum, a) => sum + Number(a.monto), 0
  )

  const restante = Number(factura.total) - totalAbonado

  const temp = document.createElement('div')

    temp.style.position = 'fixed'
    temp.style.top = '-10000px'
    temp.style.left = '-10000px'

    const totalCalculado = detalles.reduce(
      (acc, d) => acc + (d.cantidad * d.precio), 0
    )

    let htmlAbonos = ''
  
    const colorRestante = restante > 0 ? 'text-red-600' : 'text-green-600'

if (listaAbonos.length) {
  htmlAbonos = `
    <div style="margin-top:10px;">
      <h3 style="font-size:13px; margin-bottom:4px;">
        Historial de Abonos
      </h3>

      <table style="width:100%; border-collapse: collapse; font-size:12px;">
        <thead>
          <tr style="background:#f5f5f5;">
            <th style="padding:4px; border-bottom:1px solid #ddd;">No.</th>
            <th style="padding:4px; border-bottom:1px solid #ddd;">Fecha</th>
            <th style="padding:4px; border-bottom:1px solid #ddd;">Monto</th>
          </tr>
        </thead>

        <tbody>
          ${
            listaAbonos.map((a, index) => `
              <tr>
                <td style="padding:4px; border-bottom:1px solid #eee;">
                  ${factura.numero}.${index + 1}
                </td>

                <td style="padding:4px; border-bottom:1px solid #eee;">
                  ${new Date(a.fecha).toLocaleDateString()}
                </td>

                <td style="padding:4px; text-align:right; border-bottom:1px solid #eee;">
                  C$ ${Number(a.monto).toFixed(2)}
                </td>
              </tr>
            `).join('')
          }
        </tbody>
      </table>

      <div style="margin-top:6px; font-size:12px;">
        <p style="margin:2px 0;"><b>Total abonado:</b> C$ ${totalAbonado.toFixed(2)}</p>
        <p style="margin:2px 0;"><b>Restante:</b> C$ ${restante.toFixed(2)}</p>
      </div>
    </div>
  `
}else{
  htmlAbonos = `
    <div style="margin-top:10px; font-size:12px; color:#666;">
      <p><b>Sin abonos registrados</b></p>
    </div>
  `
}

    temp.innerHTML = `
    <div style="
      max-width: 370px;
      margin: auto;
      padding: 10px;
      font-family: Arial, sans-serif;
      background: white;
      color: #333;
      font-size: 12px;
    ">

    <!-- HEADER -->
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">

      <img src="imagenes/logo.png" style="height:100px;" />

      <div style="text-align:right;">
        <h2 style="margin:0; font-size:14px;">
          Factura #${factura.numero || factura.id}
        </h2>

        <p style="margin:0; font-size:11px;">
          ${new Date(factura.fecha).toLocaleDateString()}
        </p>

        <p style="margin:0; font-size:11px;">
          ${factura.tipo.toUpperCase()}
        </p>
      </div>
    </div>

    <!-- CLIENTE -->
    <div style="margin-bottom:6px; font-size:12px; line-height:1.3;">
      <p style="margin:2px 0;"><b>Cliente:</b> ${factura.clientes?.nombre || ''}</p>
      <p style="margin:2px 0;"><b>Dirección:</b> ${factura.clientes?.direccion || '-'}</p>
      <p style="margin:2px 0;"><b>Tel:</b> ${factura.clientes?.telefono || '-'}</p>
    </div>

    <hr style="margin:6px 0;">

    <!-- TABLA -->
    <table style="width:100%; border-collapse: collapse; font-size:12px;">
      <thead>
        <tr style="background:#f5f5f5;">
          <th style="padding:4px; border-bottom:1px solid #ddd;">Producto</th>
          <th style="padding:4px; border-bottom:1px solid #ddd;">Cant.</th>
          <th style="padding:4px; border-bottom:1px solid #ddd;">Precio</th>
          <th style="padding:4px; border-bottom:1px solid #ddd;">Total</th>
        </tr>
      </thead>

      <tbody>
        ${
          detalles.map(d => `
            <tr>
              <td style="padding:4px; border-bottom:1px solid #eee;">
                ${d.descripcion || ''}
              </td>

              <td style="padding:4px; text-align:center; border-bottom:1px solid #eee;">
                ${d.cantidad}
              </td>

              <td style="padding:4px; text-align:right; border-bottom:1px solid #eee;">
                C$ ${Number(d.precio).toFixed(2)}
              </td>

              <td style="padding:4px; text-align:right; border-bottom:1px solid #eee;">
                C$ ${(d.cantidad * d.precio).toFixed(2)}
              </td>
            </tr>
          `).join('')
        }
      </tbody>
    </table>

    <!-- TOTAL -->
    <div style="display:flex; justify-content:flex-end; margin-top:8px;">
      <div style="
        border:1px solid #ddd;
        padding:6px 10px;
        border-radius:6px;
        font-size:12px;
        min-width: 160px;
      ">
        ${Number(factura.saldo_anterior) > 0 ? `
          <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
            <span>Subtotal:</span>
            <span>C$ ${totalCalculado.toFixed(2)}</span>
          </div>
          <div style="display:flex; justify-content:space-between; margin-bottom:3px;">
            <span>Saldo anterior:</span>
            <span>C$ ${Number(factura.saldo_anterior).toFixed(2)}</span>
          </div>
        ` : ''}
        <div style="display:flex; justify-content:space-between; font-size:13px; border-top:1px solid #ddd; padding-top:3px;">
          <b>Total:</b>
          <b>C$ ${Number(factura.total).toFixed(2)}</b>
        </div>
      </div>
    </div>

    ${htmlAbonos}

    <!-- FOOTER -->
    <div style="margin-top:12px; text-align:center; font-size:10px; color:#888;">
      Gracias por su preferencia, será un gusto atenderle nuevamente
    </div>

  </div>
  `

  document.body.appendChild(temp)

// ESPERAR QUE EL DOM PINTE BIEN
await new Promise(requestAnimationFrame)
await new Promise(resolve => setTimeout(resolve, 1000))

// ESPERAR IMÁGENES (LOGO)
const imgs = temp.querySelectorAll('img')
await Promise.all([...imgs].map(img => {
  return new Promise(res => {
    if (img.complete) return res()
    img.onload = res
    img.onerror = res
  })
}))

// EXTRA PARA MÓVIL (IMPORTANTÍSIMO)
if (window.innerWidth < 768) {
  await new Promise(resolve => setTimeout(resolve, 1000))
}

//  GENERAR PDF
await html2pdf()
  .from(temp.firstElementChild)
  .set({
    margin: 0.2,
    filename: `factura_${factura.numero}.pdf`,
    html2canvas: {
      scale: window.innerWidth < 768 ? 2 : 2.5,
      useCORS: true,
      scrollY: 0
    },
    jsPDF: {
      unit: 'in',
      format: [4.25, 5.5],
      orientation: 'portrait'
    },
    pagebreak: {
      mode: ['css', 'legacy'],
      avoid: 'tr'
    }
  })
  .save()

  document.body.removeChild(temp)
}

// =============================
cerrarDetalle.onclick = () => {
  modal.classList.add('hidden')
}

// =============================
cargarFacturas()
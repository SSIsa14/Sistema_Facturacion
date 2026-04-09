import { supabase } from './supabase.js'

// =============================
// ELEMENTOS
// =============================
const nombreCliente = document.getElementById('nombreCliente')
const totalFacturadoEl = document.getElementById('totalFacturado')
const totalPagadoEl = document.getElementById('totalPagado')
const totalDebeEl = document.getElementById('totalDebe')
const lista = document.getElementById('listaFacturas')
const buscarNumero = document.getElementById('buscarNumero')
const filtroFecha = document.getElementById('filtroFecha')

// MODAL ABONO
const modalAbono = document.getElementById('modalAbono')
const modalPendiente = document.getElementById('modalPendiente')
const modalRestante = document.getElementById('modalRestante')
const inputAbono = document.getElementById('inputAbono')
const cancelarAbono = document.getElementById('cancelarAbono')
const confirmarAbono = document.getElementById('confirmarAbono')

// MODAL SUCCESS
const modalSuccess = document.getElementById('modalSuccess')
const descargarAbonoPDF = document.getElementById('descargarAbonoPDF')
const cerrarSuccess = document.getElementById('cerrarSuccess')

// =============================
const params = new URLSearchParams(window.location.search)
const clienteId = params.get('id')

let facturas = []
let abonos = []
let facturaActual = null
let pendienteActual = 0
let ultimoAbono = null
let estadoFiltro = 'todos'

function formatearFechaGuate(fecha) {
  if (!fecha) return ''

  return new Date(fecha).toLocaleDateString('sv-SE', {
    timeZone: 'America/Guatemala'
  })
}

function filtrarFacturas() {

  const num = buscarNumero.value.toLowerCase()
  const fecha = filtroFecha.value
  const estado = estadoFiltro

  let filtradas = facturas.filter(f => {

    const matchNumero = f.numero.toString().includes(num)

    let matchFecha = true
    if (fecha) {
      matchFecha = formatearFechaGuate(f.fecha) === fecha
    }

    let matchEstado = true
    if (estado !== 'todos') {
      matchEstado = f.estado === estado
    }

    return matchNumero && matchFecha && matchEstado
  })

  renderFacturas(filtradas)
}

buscarNumero.addEventListener('input', filtrarFacturas)
filtroFecha.addEventListener('change', filtrarFacturas)

const btnTodos = document.getElementById('filtroTodos')
const btnPendiente = document.getElementById('filtroPendiente')
const btnAbonado = document.getElementById('filtroAbonado')
const btnPagado = document.getElementById('filtroPagado')

// función para activar estilo bonito
function activarBoton(btnActivo) {
  document.querySelectorAll('.filtro-btn').forEach(b => {
    b.classList.remove('ring-2', 'ring-primary', 'bg-primary', 'text-white')
  })

  btnActivo.classList.add('ring-2', 'ring-blue-200')
}

// eventos
btnTodos.onclick = () => {
  estadoFiltro = 'todos'
  activarBoton(btnTodos)
  filtrarFacturas()
}

btnPendiente.onclick = () => {
  estadoFiltro = 'pendiente'
  activarBoton(btnPendiente)
  filtrarFacturas()
}

btnAbonado.onclick = () => {
  estadoFiltro = 'abonado'
  activarBoton(btnAbonado)
  filtrarFacturas()
}

btnPagado.onclick = () => {
  estadoFiltro = 'pagado'
  activarBoton(btnPagado)
  filtrarFacturas()
}

// =============================
// CARGAR DATA
// =============================
async function cargarEstado() {

  const { data: cliente } = await supabase
    .from('clientes')
    .select('*')
    .eq('id', clienteId)
    .single()

  nombreCliente.textContent = `Cliente: ${cliente.nombre}`

  const { data: factData } = await supabase
    .from('facturas')
    .select('*')
    .eq('cliente_id', clienteId)

  facturas = factData || []

  const { data: abonosData } = await supabase
    .from('abonos')
    .select('*')

  abonos = abonosData || []

  calcularResumen()
  renderFacturas(facturas)
}

// =============================
// RESUMEN
// =============================
function calcularResumen() {

  let totalFacturado = 0
  let totalPagado = 0

  facturas.forEach(f => {

    totalFacturado += Number(f.total)

    let pagadoFactura = 0

    if (f.estado === 'pagado') {
      pagadoFactura = f.total
    } else {
      pagadoFactura = abonos
        .filter(a => a.factura_id === f.id)
        .reduce((sum, a) => sum + Number(a.monto), 0)
    }

    totalPagado += pagadoFactura
  })

  const debe = totalFacturado - totalPagado

  totalFacturadoEl.textContent = `C$  ${totalFacturado.toFixed(2)}`
  totalPagadoEl.textContent = `C$  ${totalPagado.toFixed(2)}`
  totalDebeEl.textContent = `C$  ${debe.toFixed(2)}`
}


// =============================
// RENDER
// =============================
function renderFacturas(listaData = facturas) {

  lista.innerHTML = ''

  listaData.forEach(f => {

    const abonosFactura = abonos.filter(a => a.factura_id === f.id)

    let abonadoReal = f.estado === 'pagado'
      ? f.total
      : abonosFactura.reduce((sum, a) => sum + Number(a.monto), 0)

    const pendiente = f.total - abonadoReal
    const porcentaje = Math.min((abonadoReal / f.total) * 100, 100)

    const colorBarra =
      f.estado === 'pagado'
        ? 'bg-green-500'
        : f.estado === 'abonado'
          ? 'bg-blue-500'
          : 'bg-yellow-400'

    const badge = `
      <span class="px-3 py-1 rounded text-xs ${
        f.estado === 'pagado'
          ? 'bg-green-100 text-green-700'
          : f.estado === 'abonado'
            ? 'bg-blue-100 text-blue-700'
            : 'bg-yellow-100 text-yellow-700'
      }">
        ${f.estado}
      </span>
    `

    let htmlAbonos = ''

    abonosFactura.forEach((a, index) => {
      htmlAbonos += `
        <div class="text-xs text-gray-600 flex justify-between border-t pt-1">
          <span>Abono #${f.numero}.${index + 1}</span>
          <span>C$  ${Number(a.monto).toFixed(2)}</span>
        </div>
      `
    })

    const fecha = f.fecha
      ? new Date(f.fecha).toLocaleDateString()
      : ''

    lista.innerHTML += `
      <div class="bg-white p-4 rounded-xl shadow space-y-3">

      <!-- HEADER -->
      <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">

        <div>
          <p class="text-xs text-gray-400">Factura</p>
          <p class="text-2xl font-bold text-gray-900">
            #${f.numero}
          </p>
        </div>

        <!-- ESTADO (UN POCO MÁS A LA DERECHA) -->
        <div class="flex justify-center items-center md:ml-12">
          ${badge}
        </div>

        <!-- FECHA MÁS GRANDE -->
        <div class="text-base font-semibold text-gray-600 flex items-center gap-2 md:justify-end">
          <i data-lucide="calendar" class="w-5 h-5 text-primary"></i>
          ${fecha}
        </div>

      </div>

        <!-- RESUMEN IMPORTES -->
        <div class="grid grid-cols-3 gap-3 text-center mt-3">

          <div>
            <p class="text-xs text-gray-500">Total</p>
            <p class="text-xl font-bold text-gray-800">C$  ${f.total}</p>
          </div>

          <div>
            <p class="text-xs text-gray-500">Pagado</p>
            <p class="text-xl font-bold text-green-600">
              C$  ${abonadoReal.toFixed(2)}
            </p>
          </div>

          <div>
            <p class="text-xs text-gray-500">Pendiente</p>
            <p class="text-xl font-bold text-red-500">
              C$  ${pendiente.toFixed(2)}
            </p>
          </div>

        </div>

        <!-- BARRA -->
        <div class="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-3">
          <div 
            class="${colorBarra} h-3 transition-all duration-500"
            style="width: ${porcentaje}%">
          </div>
        </div>

        <!-- PORCENTAJE -->
        <p class="text-xs text-gray-500 text-right">
          ${porcentaje.toFixed(0)}% pagado
        </p>

      <!-- BOTÓN ABONAR (CENTRADO Y BONITO) -->
      <div class="flex justify-center">

        ${f.estado !== 'pagado' ? `
          <button onclick="abrirModalAbono('${f.id}', ${pendiente})"
            class="group flex items-center gap-2 px-6 py-2 rounded-full
                  bg-green-50 text-green-700 border border-green-200
                  hover:bg-green-100 hover:shadow-md
                  transition-all duration-200">

            <i data-lucide="plus-circle"
              class="w-4 h-4 text-green-600 group-hover:scale-110 transition"></i>

            <span class="font-semibold text-sm">
              Abonar
            </span>

          </button>
        ` : ''}

      </div>

      <!-- DROPDOWN ABONOS -->
      <div class="mt-2">

        <details class="group bg-gray-50 rounded-lg p-2">

          <summary class="cursor-pointer text-sm font-semibold text-gray-600 flex justify-between items-center">
            Ver abonos (${abonosFactura.length})
            <span class="text-xs text-gray-400 group-open:rotate-180 transition">⌄</span>
          </summary>

          <div class="mt-2 space-y-2">

            ${
              abonosFactura.length
  ? abonosFactura.map((a, index) => `
  <div class="bg-white border rounded-xl p-3 shadow-sm space-y-2">

    <!-- HEADER -->
    <div class="flex justify-between items-start">

      <div class="flex flex-col">

        <span class="text-gray-700 font-semibold text-sm">
          Abono #${f.numero}.${index + 1}
        </span>

        <!-- FECHA CORRECTA -->
        <div class="text-sm font-semibold text-gray-600 flex items-center gap-2 mt-1">

          <i data-lucide="calendar" class="w-4 h-4 text-primary"></i>

          ${a.fecha ? new Date(a.fecha).toLocaleDateString() : ''}

        </div>

      </div>

      <span class="font-bold text-green-600 text-sm">
        C$  ${Number(a.monto).toFixed(2)}
      </span>

    </div>

    <!-- BOTONES -->
    <div class="flex justify-end gap-4 pt-1">

      <button
        onclick='abrirModalAbonoDetalle(${JSON.stringify(a)})'
        class="flex items-center gap-1 text-pink-500 hover:text-pink-600">

        <i data-lucide="eye" class="w-4 h-4"></i>
        <span class="text-xs">Ver</span>

      </button>

      <button
        onclick='descargarAbonoIndividual(${JSON.stringify(a)}, ${JSON.stringify(f)}, "${nombreCliente.textContent.replace("Cliente: ", "")}")'
        class="flex items-center gap-1 text-green-600 hover:text-green-700">

        <i data-lucide="download" class="w-4 h-4"></i>
        <span class="text-xs">PDF</span>

      </button>

    </div>

  </div>
`).join('')
  : '<p class="text-xs text-gray-400">Sin abonos</p>'
            }

          </div>

        </details>

      </div>

      </div>
    `
  })

  lucide.createIcons()
}

// =============================
// ABRIR MODAL
// =============================
window.abrirModalAbono = (facturaId, pendiente) => {

  facturaActual = facturas.find(f => f.id === facturaId)
  pendienteActual = pendiente

  modalPendiente.textContent = `C$  ${pendiente.toFixed(2)}`
  modalRestante.textContent = `C$  ${pendiente.toFixed(2)}`
  inputAbono.value = ''

  modalAbono.classList.remove('hidden')
  modalAbono.classList.add('flex')
}

// =============================
// CALCULAR RESTANTE
// =============================
inputAbono.addEventListener('input', () => {
  const val = Number(inputAbono.value) || 0
  const restante = pendienteActual - val
  modalRestante.textContent = `C$  ${Math.max(restante, 0).toFixed(2)}`
})

// =============================
// CANCELAR
// =============================
cancelarAbono.onclick = () => {
  modalAbono.classList.add('hidden')
}

// =============================
// CONFIRMAR ABONO
// =============================
confirmarAbono.onclick = async () => {

  const monto = Number(inputAbono.value)

  if (monto <= 0 || monto > pendienteActual) {
    alert("Monto inválido")
    return
  }

  // GUARDAR
  const { data } = await supabase.from('abonos').insert([{
    factura_id: facturaActual.id,
    monto,
    fecha: new Date().toISOString()
  }]).select().single()

  ultimoAbono = data

  // ACTUALIZAR ESTADO
  const totalAbonado = abonos
    .filter(a => a.factura_id === facturaActual.id)
    .reduce((s, a) => s + Number(a.monto), 0) + monto

  if (totalAbonado >= facturaActual.total) {
    await supabase.from('facturas')
      .update({ estado: 'pagado' })
      .eq('id', facturaActual.id)
  } else {
    await supabase.from('facturas')
      .update({ estado: 'abonado' })
      .eq('id', facturaActual.id)
  }

  modalAbono.classList.add('hidden')

  // MOSTRAR SUCCESS
  modalSuccess.classList.remove('hidden')
  modalSuccess.classList.add('flex')

  cargarEstado()
}


async function generarAbonoPDF({ factura, clienteNombre, ultimoAbono }) {
  if (!ultimoAbono || !factura) {
    console.error("Faltan datos para el PDF");
    return;
  }

  try {

    const { data: abonosFactura } = await supabase
      .from('abonos')
      .select('*')
      .eq('factura_id', factura.id);

    const listaAbonos = abonosFactura || [];

    const totalAbonado = listaAbonos
      .reduce((sum, a) => sum + Number(a.monto), 0);

    const restante = Number(factura.total) - totalAbonado;

    // calcular número bonito tipo 19.1, 19.2 etc
    const index = listaAbonos.findIndex(a => a.id === ultimoAbono.id);
    const numeroAbono = `${factura.numero}.${index + 1}`;

    // 1. CREAR HTML TEMPORAL
    const temp = document.createElement('div');

    
    temp.innerHTML = `
  <div style="
    width: 650px;
    padding: 25px;
    font-family: Arial, sans-serif;
    background: white;
    color: #333;
  ">

  <!-- HEADER -->
  <div style="
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 20px;
  ">

    <!-- LOGO -->
    <img src="imagenes/logo.png" style="height: 50px;" />

    <!-- TITULO CENTRADO REAL -->
    <div style="
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    ">
      <h2 style="margin: 0; font-size: 18px;">
        Comprobante de Abono
      </h2>
      <p style="margin: 0; font-size: 12px; color: #666;">
        No. ${numeroAbono}
      </p>
    </div>

  </div>

    <!-- INFO -->
    <div style="margin-bottom: 15px; font-size: 12px;">
      <p><b>Fecha:</b> ${new Date(ultimoAbono.fecha).toLocaleDateString()}</p>
      <p><b>Cliente:</b> ${clienteNombre}</p>
      <p><b>Factura:</b> #${factura.numero}</p>
    </div>

    <hr style="margin: 15px 0;">

    <!-- RESUMEN -->
    <div style="
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      text-align: center;
      margin-top: 10px;
    ">

      <div style="border: 1px solid #eee; padding: 10px; border-radius: 8px;">
        <p style="font-size: 11px; color: #777;">Total Factura</p>
        <p style="font-size: 14px; font-weight: bold;">
          C$ ${Number(factura.total).toFixed(2)}
        </p>
      </div>

      <div style="border: 1px solid #eee; padding: 10px; border-radius: 8px;">
        <p style="font-size: 11px; color: #777;">Abono</p>
        <p style="font-size: 14px; font-weight: bold; color: green;">
          C$ ${Number(ultimoAbono.monto).toFixed(2)}
        </p>
      </div>

      <div style="border: 1px solid #eee; padding: 10px; border-radius: 8px;">
        <p style="font-size: 11px; color: #777;">Restante</p>
        <p style="font-size: 14px; font-weight: bold; color: red;">
          C$ ${restante.toFixed(2)}
        </p>
      </div>

    </div>

    <!-- TOTAL ABONADO -->
    <div style="margin-top: 20px; font-size: 12px;">
      <p><b>Total abonado:</b> C$ ${totalAbonado.toFixed(2)}</p>
    </div>

    <!-- FOOTER -->
    <div style="margin-top: 30px; text-align: center; font-size: 10px; color: #999;">
      <p>Gracias por su preferencia</p>
    </div>

  </div>
`;
    document.body.appendChild(temp);

    await new Promise(r => setTimeout(r, 200));

    const opt = {
      margin: 0.5,
      filename: `abono_${numeroAbono}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        scrollY: 0
      },
      jsPDF: {
        unit: 'in',
        format: 'a4',
        orientation: 'portrait'
      }
    };

    await html2pdf().set(opt).from(temp.firstElementChild).save();

    document.body.removeChild(temp);

  } catch (error) {
    console.error("Error generando PDF:", error);
  }
}

// =============================
// PDF
// =============================
descargarAbonoPDF.onclick = async () => {
  await generarAbonoPDF({
    factura: facturaActual,
    clienteNombre: nombreCliente.textContent.replace('Cliente: ', ''),
    ultimoAbono
  });

  modalSuccess.classList.add('hidden');
};


window.descargarAbonoIndividual = async (abono, factura, clienteNombre) => {

  await generarAbonoPDF({
    factura,
    clienteNombre,
    ultimoAbono: abono
  })
}



function obtenerNumeroAbono(a) {
  const factura = facturas.find(f =>
    abonos.some(x => x.factura_id === f.id && x.id === a.id)
  )

  if (!factura) return '#-'

  const lista = abonos
    .filter(x => x.factura_id === factura.id)
    .sort((x, y) => new Date(x.fecha) - new Date(y.fecha))

  const index = lista.findIndex(x => x.id === a.id)

  return `#${factura.numero}.${index + 1}`
}

const modalDetalle = document.getElementById('modalAbonoDetalle')
const contenidoDetalle = document.getElementById('contenidoAbonoDetalle')

window.abrirModalAbonoDetalle = (a) => {

  const numeroAbono = obtenerNumeroAbono(a)

  contenidoDetalle.innerHTML = `
    <div class="space-y-4">

      <!-- HEADER -->
      <div class="bg-gradient-to-r from-pink-50 to-green-50 p-4 rounded-xl">
        <p class="text-xs text-gray-500">Comprobante</p>
        <p class="text-xl font-bold text-gray-800">
          Abono ${numeroAbono}
        </p>
      </div>

      <!-- INFO -->
      <div class="bg-white border rounded-xl p-4 space-y-3">

        <div class="flex justify-between items-center">
          <span class="text-sm text-gray-500">Monto</span>
          <span class="text-lg font-bold text-green-600">
            C$  ${Number(a.monto).toFixed(2)}
          </span>
        </div>

        <div class="flex items-center gap-2 text-sm text-gray-600">
          <i data-lucide="calendar" class="w-4 h-4 text-primary"></i>
          ${a.fecha ? new Date(a.fecha).toLocaleDateString() : ''}
        </div>


      </div>

    </div>
  `

  modalDetalle.classList.remove('hidden')
  modalDetalle.classList.add('flex')

  lucide.createIcons()
}


window.cerrarModalAbonoDetalle = () => {
  modalDetalle.classList.add('hidden')
}

cerrarSuccess.onclick = () => {
  modalSuccess.classList.add('hidden')
}

// =============================
document.addEventListener('DOMContentLoaded', () => {
  cargarEstado()
})
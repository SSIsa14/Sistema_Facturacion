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
const inputFechaAbono = document.getElementById('inputFechaAbono')
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

// Muestra una fecha correctamente en Guatemala.
// Las cadenas solo-fecha (YYYY-MM-DD) se parsean como UTC por JS,
// lo que retrocede un día en zonas UTC-. Agregar T12:00:00 fuerza
// el parsing como hora local y no cruza el límite de medianoche.
function fmtFecha(fecha) {
  if (!fecha) return ''
  const str = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    ? `${fecha}T12:00:00`
    : fecha
  return new Date(str).toLocaleDateString()
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
    .order('numero', { ascending: false })

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
      ? fmtFecha(f.fecha)
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

        <!-- BOTONES EDITAR / ELIMINAR FACTURA -->
        <div class="flex justify-end gap-2">
          <button onclick="abrirModalEditar('${f.id}')"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600
                   hover:bg-primary/10 hover:text-primary border border-gray-200
                   transition-all duration-200 text-xs font-semibold">
            <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
            Editar
          </button>
          <button onclick="abrirConfirmarBorrarDirecto('${f.id}')"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-50 text-red-500
                   hover:bg-red-100 border border-red-200
                   transition-all duration-200 text-xs font-semibold">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            Eliminar
          </button>
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
      <div class="flex justify-center gap-3">

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

          <!-- NUEVO BOTÓN PDF COMPLETO -->
          <button onclick="descargarFacturaCompleta('${f.id}')"
            class="group flex items-center gap-2 px-6 py-2 rounded-full
                  bg-blue-50 text-blue-700 border border-blue-200
                  hover:bg-blue-100 hover:shadow-md transition">

            <i data-lucide="download" class="w-4 h-4"></i>
            <span class="text-sm font-semibold">Factura PDF</span>
          </button>

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

          ${a.fecha ? fmtFecha(a.fecha) : ''}

        </div>

      </div>

      <span class="font-bold text-green-600 text-sm">
        C$  ${Number(a.monto).toFixed(2)}
      </span>

    </div>

    <!-- BOTONES -->
    <div class="flex justify-end gap-3 pt-1 flex-wrap">

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

      <button
        onclick='abrirModalEditarAbono(${JSON.stringify(a)}, ${JSON.stringify(f)})'
        class="flex items-center gap-1 text-blue-500 hover:text-blue-700">
        <i data-lucide="pencil" class="w-4 h-4"></i>
        <span class="text-xs">Editar</span>
      </button>

      <button
        onclick='abrirConfirmarBorrarAbono(${JSON.stringify(a)}, ${JSON.stringify(f)})'
        class="flex items-center gap-1 text-red-500 hover:text-red-700">
        <i data-lucide="trash-2" class="w-4 h-4"></i>
        <span class="text-xs">Eliminar</span>
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

  // Pre-llenar con la fecha de hoy (formato YYYY-MM-DD local)
  const hoy = new Date()
  const yyyy = hoy.getFullYear()
  const mm = String(hoy.getMonth() + 1).padStart(2, '0')
  const dd = String(hoy.getDate()).padStart(2, '0')
  inputFechaAbono.value = `${yyyy}-${mm}-${dd}`

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
  // Usar la fecha elegida por el usuario (medianoche hora local → ISO)
  const fechaSeleccionada = inputFechaAbono.value
    ? new Date(`${inputFechaAbono.value}T12:00:00`).toISOString()
    : new Date().toISOString()

  const { data } = await supabase.from('abonos').insert([{
    factura_id: facturaActual.id,
    monto,
    fecha: fechaSeleccionada
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
    width: 100%;
    max-width: 370px;
    margin: auto;
    padding: 10px;
    font-family: Arial, sans-serif;
    background: white;
    color: #333;
    font-size: 12px;
  ">

  <!-- HEADER -->
  <div style="
    position: relative;
    display: flex;
    align-items: center;
    margin-bottom: 10px;
  ">

    <!-- LOGO -->
    <img src="imagenes/logo.png" style="height: 100px;" />

    <!-- TITULO CENTRADO REAL -->
    <div style="
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      text-align: center;
    ">
      <h2 style="margin: 0; font-size: 14px;">
        Comprobante de Abono
      </h2>
      <p style="margin: 0; font-size: 11px; color: #666;">
        No. ${numeroAbono}
      </p>
    </div>

  </div>

    <!-- INFO -->
    <div style="margin-bottom: 8px; font-size: 12px; line-height:1.3;">
      <p style="margin:2px 0;"><b>Fecha:</b> ${fmtFecha(ultimoAbono.fecha)}</p>
      <p style="margin:2px 0;"><b>Cliente:</b> ${clienteNombre}</p>
      <p style="margin:2px 0;"><b>Factura:</b> #${factura.numero}</p>
    </div>

    <hr style="margin: 8px 0;">

    <!-- RESUMEN -->
    <div style="
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 6px;
      text-align: center;
      margin-top: 6px;
    ">

      <div style="border: 1px solid #eee; padding: 6px; border-radius: 6px;">
        <p style="font-size: 10px; color: #777; margin:0;">Total</p>
        <p style="font-size: 12px; font-weight: bold; margin:2px 0 0;">
          C$ ${Number(factura.total).toFixed(2)}
        </p>
      </div>

      <div style="border: 1px solid #eee; padding: 6px; border-radius: 6px;">
        <p style="font-size: 10px; color: #777; margin:0;">Abono</p>
        <p style="font-size: 12px; font-weight: bold; color: green; margin:2px 0 0;">
          C$ ${Number(ultimoAbono.monto).toFixed(2)}
        </p>
      </div>

      <div style="border: 1px solid #eee; padding: 6px; border-radius: 6px;">
        <p style="font-size: 10px; color: #777; margin:0;">Restante</p>
        <p style="font-size: 12px; font-weight: bold; color: red; margin:2px 0 0;">
          C$ ${restante.toFixed(2)}
        </p>
      </div>

    </div>

    <!-- TOTAL ABONADO -->
    <div style="margin-top: 10px; font-size: 12px;">
      <p style="margin:2px 0;"><b>Total abonado:</b> C$ ${totalAbonado.toFixed(2)}</p>
    </div>

    <!-- FOOTER -->
    <div style="margin-top: 14px; text-align: center; font-size: 10px; color: #999;">
      <p>Gracias por su preferencia, será un gusto atenderle nuevamente</p>
    </div>

  </div>
`;

    document.body.appendChild(temp)

    const opt = {
    margin: 0.2,
    filename: `abono_${numeroAbono}.pdf`,
    image: { type: 'jpeg', quality: 1 },
    html2canvas: {
      scale: 3,
      useCORS: true,
      scrollY: 0,
      windowWidth: 400
    },
    jsPDF: {
      unit: 'in',
      format: [4.25, 5.5],
      orientation: 'portrait'
    },
    pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' }
  }

    await new Promise(requestAnimationFrame)
    await new Promise(resolve => setTimeout(resolve, 400)) // más tiempo para móvil

    const imgs = temp.querySelectorAll('img')
    await Promise.all(
      [...imgs].map(img => {
        if (img.complete) return Promise.resolve()
        return new Promise(res => {
          img.onload = res
          img.onerror = res
        })
      })
    )

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
          ${a.fecha ? fmtFecha(a.fecha) : ''}
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


window.descargarFacturaCompleta = async (facturaId) => {

  const factura = facturas.find(f => f.id === facturaId)

  // DETALLES
  const { data: detalles } = await supabase
    .from('productos_factura')
    .select(`
      *,
      subcategorias (
        nombre,
        categorias ( nombre )
      )
    `)
    .eq('factura_id', facturaId)

  // ABONOS
  const { data: abonosFactura } = await supabase
    .from('abonos')
    .select('*')
    .eq('factura_id', facturaId)

  const listaAbonos = abonosFactura || []

  // ordenar (IMPORTANTE)
  listaAbonos.sort((a, b) => new Date(a.fecha) - new Date(b.fecha))

  const totalAbonado = listaAbonos.reduce(
    (sum, a) => sum + Number(a.monto), 0
  )

  const restante = Number(factura.total) - totalAbonado

  const totalCalculado = detalles.reduce(
    (acc, d) => acc + (d.cantidad * d.precio), 0
  )

  const temp = document.createElement('div')

  //  CLAVE ANTI BUG
  temp.style.position = 'fixed'
  temp.style.top = '-10000px'
  temp.style.left = '-10000px'

  // ===== HISTORIAL =====
  let htmlAbonos = ''

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
                    ${fmtFecha(a.fecha)}
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
  } else {
    htmlAbonos = `
      <div style="margin-top:10px; font-size:12px; color:#666;">
        <p><b>Sin abonos registrados</b></p>
      </div>
    `
  }

  // ===== HTML =====
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
          Factura #${factura.numero}
        </h2>

        <p style="margin:0; font-size:11px;">
          ${fmtFecha(factura.fecha)}
        </p>

        <p style="margin:0; font-size:11px;">
          ${factura.tipo.toUpperCase()}
        </p>
      </div>
    </div>

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

  // =============================
  // FIX PRO (CLAVE)
  // =============================
  await new Promise(requestAnimationFrame)
  await new Promise(resolve => setTimeout(resolve, 800))

  const imgs = temp.querySelectorAll('img')
  await Promise.all([...imgs].map(img => {
    return new Promise(res => {
      if (img.complete) return res()
      img.onload = res
      img.onerror = res
    })
  }))

  if (window.innerWidth < 768) {
    await new Promise(resolve => setTimeout(resolve, 800))
  }

  // =============================
  // GENERAR PDF
  // =============================
  await html2pdf()
    .from(temp.firstElementChild)
    .set({
      margin: 0.2,
      filename: `factura_${factura.numero}.pdf`,
      image: { type: 'jpeg', quality: 1 },
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
document.addEventListener('DOMContentLoaded', () => {
  cargarEstado()
})


// ============================================================
// EDITAR FACTURA
// ============================================================
let facturaEditando = null
let categoriasEdit = []
let subcategoriasEdit = []

const modalEditarFactura    = document.getElementById('modalEditarFactura')
const modalConfirmarBorrar  = document.getElementById('modalConfirmarBorrar')
const editFechaFactura      = document.getElementById('editFechaFactura')
const editTipoFactura       = document.getElementById('editTipoFactura')
const editSaldoAnterior     = document.getElementById('editSaldoAnterior')
const editProductosLista    = document.getElementById('editProductosLista')
const editSubtotalEl        = document.getElementById('editSubtotal')
const editSaldoDisplayEl    = document.getElementById('editSaldoDisplay')
const editTotalEl           = document.getElementById('editTotal')
const editFacturaTitulo     = document.getElementById('editFacturaTitulo')
const textoBorradoAdv       = document.getElementById('textoBorradoAdvertencia')

// Cargar cats/subcats una sola vez
async function cargarCatalogoEdicion() {
  if (categoriasEdit.length) return
  const { data: cats }  = await supabase.from('categorias').select('*')
  const { data: subs }  = await supabase.from('subcategorias').select('*')
  categoriasEdit    = cats || []
  subcategoriasEdit = subs || []
}

// Abre el modal pre-cargado con los datos de la factura
window.abrirModalEditar = async (facturaId) => {
  await cargarCatalogoEdicion()

  facturaEditando = facturas.find(f => f.id === facturaId)
  if (!facturaEditando) return

  editFacturaTitulo.textContent = `Factura #${facturaEditando.numero}`

  // Fecha
  if (facturaEditando.fecha) {
    const d = new Date(facturaEditando.fecha)
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    editFechaFactura.value = `${yyyy}-${mm}-${dd}`
  }

  // Tipo
  editTipoFactura.value = facturaEditando.tipo || 'credito'

  // Saldo anterior
  editSaldoAnterior.value = facturaEditando.saldo_anterior || 0

  // Cargar productos de BD
  const { data: prods } = await supabase
    .from('productos_factura')
    .select('*')
    .eq('factura_id', facturaId)

  editProductosLista.innerHTML = ''
  ;(prods || []).forEach(p => editAgregarFilaProducto(p))

  editRecalcularTotal()

  // Mostrar modal
  modalEditarFactura.classList.remove('hidden')
  modalEditarFactura.classList.add('flex')
  lucide.createIcons()
}

// Cierra el modal
window.cerrarModalEditar = () => {
  modalEditarFactura.classList.add('hidden')
  modalEditarFactura.classList.remove('flex')
}

// Agrega una fila de producto al modal (nueva o con datos existentes)
window.editAgregarProducto = () => editAgregarFilaProducto(null)

function editAgregarFilaProducto(prod = null) {

  const fila = document.createElement('div')
  fila.className = 'bg-gray-50 border rounded-xl p-3 space-y-2 relative'

  // Guardar el id del producto si existe (para actualizar en BD)
  fila.dataset.prodId = prod?.id || ''

  fila.innerHTML = `
    <div class="grid grid-cols-2 gap-2">

      <!-- PRODUCTO (subcategoría) -->
      <div class="col-span-2 relative">
        <label class="text-xs text-gray-500">Producto</label>
        <div class="relative">
          <button type="button" class="editProdBtn w-full flex justify-between items-center p-2 border rounded-lg bg-white text-sm text-gray-700 mt-1">
            <span class="editProdSpan">${prod?.descripcion || 'Seleccionar...'}</span>
            <i data-lucide="chevron-down" class="w-4 h-4 text-gray-400 flex-shrink-0"></i>
          </button>
          <div class="editProdList hidden absolute z-[200] mt-1 w-full bg-white border rounded-xl shadow-lg max-h-48 overflow-auto">
            <div class="p-2 border-b sticky top-0 bg-white">
              <input type="text" class="editBuscarSub w-full p-1.5 border rounded text-xs" placeholder="Buscar...">
            </div>
            <div class="editSubItems">
              ${buildSubcatOptions()}
            </div>
          </div>
          <input type="hidden" class="editSubcatId" value="${prod?.subcategoria_id || ''}">
        </div>
      </div>

      <!-- DESCRIPCIÓN -->
      <div class="col-span-2">
        <label class="text-xs text-gray-500">Descripción</label>
        <input type="text" class="editDesc w-full p-2 border rounded-lg text-sm mt-1"
          value="${prod?.descripcion || ''}" placeholder="Descripción">
      </div>

      <!-- CANTIDAD -->
      <div>
        <label class="text-xs text-gray-500">Cantidad</label>
        <input type="number" class="editCant w-full p-2 border rounded-lg text-sm mt-1"
          value="${prod?.cantidad || 1}" min="0">
      </div>

      <!-- PRECIO -->
      <div>
        <label class="text-xs text-gray-500">Precio (C$)</label>
        <input type="number" class="editPrecio w-full p-2 border rounded-lg text-sm mt-1"
          value="${prod?.precio || 0}" min="0" step="0.01">
      </div>

    </div>

    <!-- SUBTOTAL + ELIMINAR -->
    <div class="flex justify-between items-center pt-1">
      <span class="text-xs text-gray-500">Subtotal: C$ <span class="editSubtotalFila font-semibold">
        ${prod ? (prod.cantidad * prod.precio).toFixed(2) : '0.00'}
      </span></span>
      <button type="button" class="editEliminarFila text-red-500 hover:text-red-700 text-xs flex items-center gap-1">
        <i data-lucide="trash-2" class="w-3.5 h-3.5"></i> Eliminar
      </button>
    </div>
  `

  editProductosLista.appendChild(fila)

  // Dropdown subcategorías
  const btn    = fila.querySelector('.editProdBtn')
  const list   = fila.querySelector('.editProdList')
  const span   = fila.querySelector('.editProdSpan')
  const hidden = fila.querySelector('.editSubcatId')
  const buscar = fila.querySelector('.editBuscarSub')

  btn.onclick = (e) => { e.stopPropagation(); list.classList.toggle('hidden') }

  document.addEventListener('click', (e) => {
    if (!fila.contains(e.target)) list.classList.add('hidden')
  }, { once: false })

  fila.querySelectorAll('.editSubItem').forEach(item => {
    item.onclick = () => {
      hidden.value     = item.dataset.id
      span.textContent = item.dataset.name
      list.classList.add('hidden')
      // Pre-llenar descripción con nombre del producto si está vacía
      const descInput = fila.querySelector('.editDesc')
      if (!descInput.value) descInput.value = item.dataset.name
      editRecalcularTotal()
    }
  })

  buscar.addEventListener('click', e => e.stopPropagation())
  buscar.addEventListener('input', () => {
    const val = buscar.value.toLowerCase()
    fila.querySelectorAll('.editSubItem').forEach(item => {
      item.style.display = item.dataset.name.toLowerCase().includes(val) ? 'block' : 'none'
    })
  })

  // Cálculo en tiempo real
  const cant   = fila.querySelector('.editCant')
  const precio = fila.querySelector('.editPrecio')
  const subEl  = fila.querySelector('.editSubtotalFila')

  const recalcFila = () => {
    subEl.textContent = (Number(cant.value) * Number(precio.value)).toFixed(2)
    editRecalcularTotal()
  }

  cant.oninput   = recalcFila
  precio.oninput = recalcFila

  // Eliminar fila
  fila.querySelector('.editEliminarFila').onclick = () => {
    fila.remove()
    editRecalcularTotal()
  }

  lucide.createIcons()
}

// Genera las opciones de subcategorías agrupadas por categoría
function buildSubcatOptions() {
  return categoriasEdit.map(cat => {
    const subs = subcategoriasEdit.filter(s => s.categoria_id === cat.id)
    if (!subs.length) return ''
    return `
      <div class="text-xs font-bold text-gray-400 px-2 pt-2">${cat.nombre}</div>
      ${subs.map(s => `
        <div class="editSubItem p-2 hover:bg-primary/10 cursor-pointer text-sm"
          data-id="${s.id}" data-name="${s.nombre}">
          ${s.nombre}
        </div>
      `).join('')}
    `
  }).join('')
}

// Recalcula totales del modal de edición
function editRecalcularTotal() {
  let subtotal = 0
  editProductosLista.querySelectorAll('.editSubtotalFila').forEach(el => {
    subtotal += Number(el.textContent) || 0
  })
  const saldo = Number(editSaldoAnterior.value) || 0
  const total = subtotal + saldo

  editSubtotalEl.textContent    = subtotal.toFixed(2)
  editSaldoDisplayEl.textContent = saldo.toFixed(2)
  editTotalEl.textContent        = total.toFixed(2)
}

editSaldoAnterior.addEventListener('input', editRecalcularTotal)

// GUARDAR CAMBIOS
window.guardarEdicionFactura = async () => {
  if (!facturaEditando) return

  const fecha = editFechaFactura.value
    ? new Date(`${editFechaFactura.value}T12:00:00`).toISOString()
    : facturaEditando.fecha

  const tipo        = editTipoFactura.value
  const saldoAnterior = Number(editSaldoAnterior.value) || 0

  // Calcular subtotal y total
  let subtotal = 0
  editProductosLista.querySelectorAll('.editSubtotalFila').forEach(el => {
    subtotal += Number(el.textContent) || 0
  })
  const nuevoTotal = subtotal + saldoAnterior

  // Determinar estado según tipo y abonos
  const abonosDeEstaFactura = abonos.filter(a => a.factura_id === facturaEditando.id)
  const totalAbonado = abonosDeEstaFactura.reduce((s, a) => s + Number(a.monto), 0)
  let nuevoEstado
  if (tipo === 'contado') {
    nuevoEstado = 'pagado'
  } else if (totalAbonado >= nuevoTotal) {
    nuevoEstado = 'pagado'
  } else if (totalAbonado > 0) {
    nuevoEstado = 'abonado'
  } else {
    nuevoEstado = 'pendiente'
  }

  // 1. Actualizar factura
  await supabase.from('facturas').update({
    fecha,
    tipo,
    estado: nuevoEstado,
    total: nuevoTotal,
    saldo_anterior: saldoAnterior
  }).eq('id', facturaEditando.id)

  // 2. Reemplazar productos: eliminar los viejos e insertar los nuevos
  await supabase.from('productos_factura').delete().eq('factura_id', facturaEditando.id)

  const filas = editProductosLista.querySelectorAll('[data-prod-id]')
  const nuevosProductos = []

  filas.forEach(fila => {
    const subcatId = fila.querySelector('.editSubcatId').value
    const desc     = fila.querySelector('.editDesc').value
    const cant     = Number(fila.querySelector('.editCant').value)
    const precio   = Number(fila.querySelector('.editPrecio').value)

    if (desc || subcatId) {
      nuevosProductos.push({
        factura_id:      facturaEditando.id,
        subcategoria_id: subcatId || null,
        descripcion:     desc,
        cantidad:        cant,
        precio
      })
    }
  })

  if (nuevosProductos.length) {
    await supabase.from('productos_factura').insert(nuevosProductos)
  }

  cerrarModalEditar()
  await cargarEstado()
}


// ============================================================
// ELIMINAR FACTURA
// ============================================================
window.abrirConfirmarBorrar = () => {
  if (!facturaEditando) return

  const abonosCount = abonos.filter(a => a.factura_id === facturaEditando.id).length

  let advertencia = `Se eliminará la factura <strong>#${facturaEditando.numero}</strong> de forma permanente.`
  advertencia += `<br><br>También se eliminarán:`
  advertencia += `<br>• Todos los productos de la factura`
  if (abonosCount > 0) {
    advertencia += `<br>• <strong>${abonosCount} abono(s)</strong> registrado(s)`
  }
  advertencia += `<br><br><span class="text-red-600 font-semibold">Esta acción no se puede deshacer.</span>`

  textoBorradoAdv.innerHTML = advertencia

  modalConfirmarBorrar.classList.remove('hidden')
  modalConfirmarBorrar.classList.add('flex')
  lucide.createIcons()
}

window.cerrarConfirmarBorrar = () => {
  modalConfirmarBorrar.classList.add('hidden')
  modalConfirmarBorrar.classList.remove('flex')
}

window.confirmarEliminarFactura = async () => {
  if (!facturaEditando) return

  // Eliminar en orden correcto (FK constraints)
  await supabase.from('abonos').delete().eq('factura_id', facturaEditando.id)
  await supabase.from('productos_factura').delete().eq('factura_id', facturaEditando.id)
  await supabase.from('facturas').delete().eq('id', facturaEditando.id)

  cerrarConfirmarBorrar()
  cerrarModalEditar()
  facturaEditando = null
  await cargarEstado()
}

// Eliminar factura DIRECTAMENTE desde la tarjeta (sin abrir el modal de edición)
window.abrirConfirmarBorrarDirecto = async (facturaId) => {
  await cargarCatalogoEdicion()
  facturaEditando = facturas.find(f => f.id === facturaId)
  if (!facturaEditando) return
  abrirConfirmarBorrar()
}


// ============================================================
// EDITAR ABONO
// ============================================================
let abonoEditando     = null
let facturaDelAbono   = null

const modalEditarAbono        = document.getElementById('modalEditarAbono')
const modalConfirmarBorrarAb  = document.getElementById('modalConfirmarBorrarAbono')
const editAbonoMontoEl        = document.getElementById('editAbonoMonto')
const editAbonoFechaEl        = document.getElementById('editAbonoFecha')
const textoBorradoAbonoEl     = document.getElementById('textoBorradoAbono')

window.abrirModalEditarAbono = (abono, factura) => {
  abonoEditando   = abono
  facturaDelAbono = factura

  editAbonoMontoEl.value = Number(abono.monto).toFixed(2)

  if (abono.fecha) {
    const d    = new Date(abono.fecha)
    const yyyy = d.getFullYear()
    const mm   = String(d.getMonth() + 1).padStart(2, '0')
    const dd   = String(d.getDate()).padStart(2, '0')
    editAbonoFechaEl.value = `${yyyy}-${mm}-${dd}`
  }

  modalEditarAbono.classList.remove('hidden')
  modalEditarAbono.classList.add('flex')
}

window.cerrarModalEditarAbono = () => {
  modalEditarAbono.classList.add('hidden')
  modalEditarAbono.classList.remove('flex')
}

window.guardarEdicionAbono = async () => {
  if (!abonoEditando) return

  const nuevoMonto = Number(editAbonoMontoEl.value)
  if (nuevoMonto <= 0) { alert('Monto inválido'); return }

  const nuevaFecha = editAbonoFechaEl.value
    ? new Date(`${editAbonoFechaEl.value}T12:00:00`).toISOString()
    : abonoEditando.fecha

  // Actualizar abono
  await supabase.from('abonos')
    .update({ monto: nuevoMonto, fecha: nuevaFecha })
    .eq('id', abonoEditando.id)

  // Recalcular estado de la factura
  await recalcularEstadoFactura(facturaDelAbono.id)

  cerrarModalEditarAbono()
  await cargarEstado()
}


// ============================================================
// ELIMINAR ABONO
// ============================================================
window.abrirConfirmarBorrarAbono = (abono, factura) => {
  abonoEditando   = abono
  facturaDelAbono = factura

  textoBorradoAbonoEl.innerHTML = `
    Se eliminará el abono de <strong>C$ ${Number(abono.monto).toFixed(2)}</strong>
    de la factura <strong>#${factura.numero}</strong>.<br><br>
    <span class="text-red-600 font-semibold">Esta acción no se puede deshacer.</span>
  `

  modalConfirmarBorrarAb.classList.remove('hidden')
  modalConfirmarBorrarAb.classList.add('flex')
  lucide.createIcons()
}

window.cerrarConfirmarBorrarAbono = () => {
  modalConfirmarBorrarAb.classList.add('hidden')
  modalConfirmarBorrarAb.classList.remove('flex')
}

window.confirmarEliminarAbono = async () => {
  if (!abonoEditando) return

  await supabase.from('abonos').delete().eq('id', abonoEditando.id)

  // Recalcular estado de la factura
  await recalcularEstadoFactura(facturaDelAbono.id)

  cerrarConfirmarBorrarAbono()
  abonoEditando   = null
  facturaDelAbono = null
  await cargarEstado()
}


// Recalcula y actualiza el estado de una factura según sus abonos actuales
async function recalcularEstadoFactura(facturaId) {
  const factura = facturas.find(f => f.id === facturaId)
  if (!factura) return

  const { data: abonosActuales } = await supabase
    .from('abonos').select('monto').eq('factura_id', facturaId)

  const totalAbonado = (abonosActuales || [])
    .reduce((s, a) => s + Number(a.monto), 0)

  let nuevoEstado
  if (factura.tipo === 'contado') {
    nuevoEstado = 'pagado'
  } else if (totalAbonado >= Number(factura.total)) {
    nuevoEstado = 'pagado'
  } else if (totalAbonado > 0) {
    nuevoEstado = 'abonado'
  } else {
    nuevoEstado = 'pendiente'
  }

  await supabase.from('facturas')
    .update({ estado: nuevoEstado })
    .eq('id', facturaId)
}
import { supabase } from './supabase.js'

let clienteCallback = null // función que se ejecuta al crear cliente
let clienteEditandoId = null // si tiene valor, el modal actualiza en vez de crear

// Cargar modal dinámicamente
export async function cargarModalCliente() {
  const res = await fetch('components/modalCliente.html')
  const html = await res.text()

  document.body.insertAdjacentHTML('beforeend', html)

  const modal = document.getElementById('modalCliente')
  const form = document.getElementById('formCliente')
  const closeBtn = document.getElementById('closeModalCliente')
  const telefonoInput = document.getElementById('telefonoCliente')

  // VALIDACIÓN TELÉFONO (8 dígitos)
telefonoInput.addEventListener('input', () => {
let value = telefonoInput.value.replace(/\D/g, '').slice(0, 8)

if (value.length > 4) {
    value = value.slice(0, 4) + '-' + value.slice(4)
}

telefonoInput.value = value
})

  // CERRAR  
closeBtn.onclick = () => {
modal.classList.add('hidden')
form.reset()
}

  // GUARDAR
  form.addEventListener('submit', async (e) => {
    e.preventDefault()

    // evita doble toque (creaba el cliente dos veces)
    const submitBtn = form.querySelector('button[type="submit"], button:not([type])')
    if (submitBtn?.disabled) return
    if (submitBtn) submitBtn.disabled = true

    const datos = {
      nombre: document.getElementById('nombreCliente').value.trim(),
      telefono: telefonoInput.value,
      direccion: document.getElementById('direccionCliente').value,
      departamento: document.getElementById('departamentoCliente').value
    }

    // al crear: avisar si ya hay un cliente con nombre parecido
    if (!clienteEditandoId) {
      const parecido = await buscarClienteParecido(datos.nombre)
      if (parecido && !confirm(`Ya existe un cliente parecido: "${parecido.nombre.trim()}".\n\n¿Seguro que quieres crear otro?`)) {
        if (submitBtn) submitBtn.disabled = false
        return
      }
    }

    // antes editar también hacía insert → creaba un cliente nuevo cada vez
    const query = clienteEditandoId
      ? supabase.from('clientes').update(datos).eq('id', clienteEditandoId)
      : supabase.from('clientes').insert([datos])

    const { data, error } = await query.select().single()

    if (submitBtn) submitBtn.disabled = false
    if (error) return alert('Error al guardar el cliente, revisa tu conexión')

    modal.classList.add('hidden')
    form.reset()

    // callback (para factura o clientes)
    if (clienteCallback) clienteCallback(data)
  })
}

// sin mayúsculas, tildes ni espacios extra: "Luisa García " == "luisa garcia"
function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// parecido = igual, o uno contiene al otro ("Luisa García" vs "Doña Luisa García")
async function buscarClienteParecido(nombre) {
  const nuevo = normalizar(nombre)
  if (!nuevo) return null

  const { data } = await supabase.from('clientes').select('nombre')
  return (data || []).find(c => {
    const existente = normalizar(c.nombre || '')
    return existente && (existente.includes(nuevo) || nuevo.includes(existente))
  }) || null
}

// ABRIR MODAL
export function abrirModalCliente(callback = null, cliente = null) {
  clienteCallback = callback
  clienteEditandoId = cliente?.id || null

  const modal = document.getElementById('modalCliente')
  const form = document.getElementById('formCliente')

  form.reset()

  if (cliente) {
    document.getElementById('nombreCliente').value = cliente.nombre
    document.getElementById('telefonoCliente').value = cliente.telefono || ''
    document.getElementById('direccionCliente').value = cliente.direccion || ''
    document.getElementById('departamentoCliente').value = cliente.departamento || ''
  }

  modal.classList.remove('hidden')
  modal.classList.add('flex')
}
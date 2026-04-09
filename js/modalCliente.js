import { supabase } from './supabase.js'

let clienteCallback = null // función que se ejecuta al crear cliente

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

    const { data } = await supabase
      .from('clientes')
      .insert([{
        nombre: document.getElementById('nombreCliente').value,
        telefono: telefonoInput.value,
        direccion: document.getElementById('direccionCliente').value,
        departamento: document.getElementById('departamentoCliente').value
      }])
      .select()
      .single()

    modal.classList.add('hidden')
    form.reset()

    // callback (para factura o clientes)
    if (clienteCallback) clienteCallback(data)
  })
}

// ABRIR MODAL
export function abrirModalCliente(callback = null) {
  clienteCallback = callback

  const modal = document.getElementById('modalCliente')
  const form = document.getElementById('formCliente')

  form.reset()

  modal.classList.remove('hidden')
  modal.classList.add('flex')
}
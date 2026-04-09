import { supabase } from './supabase.js'

let editandoId = null

const modal = document.getElementById('modal')
const openModal = document.getElementById('openModal')
const closeModal = document.getElementById('closeModal')
const form = document.getElementById('formCategoria')
const table = document.getElementById('tablaCategorias')
const modalTitle = document.getElementById('modalTitle')

// ABRIR
openModal.onclick = () => {
  editandoId = null
  form.reset()
  modalTitle.textContent = "Nueva Categoría"
  modal.classList.remove('hidden')
  modal.classList.add('flex')
}

// CERRAR
closeModal.onclick = () => modal.classList.add('hidden')

// GUARDAR
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const nombre = form.nombre.value

  if (editandoId) {
    await supabase.from('categorias')
      .update({ nombre })
      .eq('id', editandoId)
  } else {
    await supabase.from('categorias')
      .insert([{ nombre }])
  }

  modal.classList.add('hidden')
  cargar()
})

// CARGAR
async function cargar() {
  const { data } = await supabase.from('categorias').select('*')

  table.innerHTML = ''

  data.forEach(c => {
    table.innerHTML += `
      <tr class="border-t">
        <td class="p-3">${c.nombre}</td>
        <td class="p-3 flex justify-center gap-2">
          
          <button onclick="editar('${c.id}')" class="text-blue-500">
            <i data-lucide="pencil"></i>
          </button>

          <button onclick="eliminar('${c.id}')" class="text-red-500">
            <i data-lucide="trash-2"></i>
          </button>

        </td>
      </tr>
    `
  })

  lucide.createIcons()
}

// EDITAR
window.editar = (id) => {
  supabase.from('categorias').select('*').eq('id', id).single()
    .then(({ data }) => {
      editandoId = id
      form.nombre.value = data.nombre
      modalTitle.textContent = "Editar Categoría"

      modal.classList.remove('hidden')
      modal.classList.add('flex')
    })
}

// ELIMINAR
window.eliminar = async (id) => {
  if (!confirm("¿Eliminar categoría?")) return
  await supabase.from('categorias').delete().eq('id', id)
  cargar()
}

// INIT
cargar()
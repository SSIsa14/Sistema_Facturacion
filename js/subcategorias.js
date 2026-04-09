import { supabase } from './supabase.js'

let editandoId = null

// =============================
// ELEMENTOS
// =============================
const modal = document.getElementById('modal')
const openModal = document.getElementById('openModal')
const closeModal = document.getElementById('closeModal')
const form = document.getElementById('formSubcategoria')
const table = document.getElementById('tablaSubcategorias')
const modalTitle = document.getElementById('modalTitle')

// DROPDOWN
const dropdownBtn = document.getElementById('dropdownBtn')
const dropdownList = document.getElementById('dropdownList')
const dropdownText = document.getElementById('dropdownText')
const categoriaHidden = document.getElementById('categoria')

let categoriasCache = []

// =============================
// DROPDOWN TOGGLE
// =============================
dropdownBtn.onclick = () => {
  dropdownList.classList.toggle('hidden')
}

// cerrar al click fuera
document.addEventListener('click', (e) => {
  if (!dropdownBtn.contains(e.target) && !dropdownList.contains(e.target)) {
    dropdownList.classList.add('hidden')
  }
})

// =============================
// CARGAR CATEGORÍAS (DROPDOWN)
// =============================
async function cargarCategorias(selectedId = null) {
  const { data } = await supabase.from('categorias').select('*')

  categoriasCache = data || []

  dropdownList.innerHTML = ''

  data.forEach(c => {
    const item = document.createElement('div')

    item.className = `
      p-3 hover:bg-gray-100 cursor-pointer transition
    `

    item.textContent = c.nombre

    item.onclick = () => {
      categoriaHidden.value = c.id
      dropdownText.textContent = c.nombre
      dropdownText.classList.remove('text-gray-500')
      dropdownList.classList.add('hidden')
    }

    dropdownList.appendChild(item)
  })

  // preselección
  if (selectedId) {
    const sel = data.find(c => c.id === selectedId)
    if (sel) {
      categoriaHidden.value = sel.id
      dropdownText.textContent = sel.nombre
      dropdownText.classList.remove('text-gray-500')
    }
  }
}

// =============================
// ABRIR MODAL
// =============================
openModal.onclick = async () => {
  editandoId = null
  form.reset()

  dropdownText.textContent = "Selecciona una categoría"
  dropdownText.classList.add('text-gray-500')
  categoriaHidden.value = ""

  modalTitle.textContent = "Nueva Subcategoría"

  await cargarCategorias()

  modal.classList.remove('hidden')
  modal.classList.add('flex')
}

// =============================
// CERRAR MODAL
// =============================
closeModal.onclick = () => {
  modal.classList.add('hidden')
}

// =============================
// GUARDAR
// =============================
form.addEventListener('submit', async (e) => {
  e.preventDefault()

  const nombre = document.getElementById('nombre').value
  const categoria_id = categoriaHidden.value

  if (!categoria_id) {
    alert("Selecciona una categoría")
    return
  }

  if (editandoId) {
    await supabase.from('subcategorias')
      .update({ nombre, categoria_id })
      .eq('id', editandoId)
  } else {
    await supabase.from('subcategorias')
      .insert([{ nombre, categoria_id }])
  }

  modal.classList.add('hidden')
  cargar()
})

// =============================
// LISTAR
// =============================
async function cargar() {
  const { data } = await supabase
    .from('subcategorias')
    .select(`*, categorias ( nombre )`)

  table.innerHTML = ''

  data.forEach(s => {
    table.innerHTML += `
      <tr class="border-t">
        <td class="p-3">${s.nombre}</td>
        <td class="p-3">${s.categorias?.nombre || ''}</td>
        <td class="p-3 flex justify-center gap-2">

          <button onclick="editar('${s.id}')" class="text-blue-500">
            <i data-lucide="pencil"></i>
          </button>

          <button onclick="eliminar('${s.id}')" class="text-red-500">
            <i data-lucide="trash-2"></i>
          </button>

        </td>
      </tr>
    `
  })

  lucide.createIcons()
}

// =============================
// EDITAR
// =============================
window.editar = async (id) => {
  const { data } = await supabase
    .from('subcategorias')
    .select('*')
    .eq('id', id)
    .single()

  editandoId = id

  document.getElementById('nombre').value = data.nombre

  await cargarCategorias(data.categoria_id)

  modalTitle.textContent = "Editar Subcategoría"

  modal.classList.remove('hidden')
  modal.classList.add('flex')
}

// =============================
// ELIMINAR
// =============================
window.eliminar = async (id) => {
  if (!confirm("¿Eliminar subcategoría?")) return

  await supabase.from('subcategorias').delete().eq('id', id)

  cargar()
}

// INIT
cargar()
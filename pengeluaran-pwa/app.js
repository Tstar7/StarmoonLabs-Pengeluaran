const STORAGE_KEYS = {
  transactions: 'dompetBulanan.transactions.v1',
  budgets: 'dompetBulanan.budgets.v1',
  theme: 'dompetBulanan.theme.v1'
}

const expenseCategories = [
  'Makan & Minum',
  'Transportasi',
  'Belanja',
  'Tagihan',
  'Hiburan',
  'Kesehatan',
  'Pendidikan',
  'Rumah',
  'Keluarga',
  'Lainnya'
]

const incomeCategories = [
  'Gaji',
  'Freelance',
  'Hadiah',
  'Jualan',
  'Tabungan',
  'Lainnya'
]

const categoryIcons = {
  'Makan & Minum': '🍜',
  'Transportasi': '🛵',
  'Belanja': '🛍️',
  'Tagihan': '🧾',
  'Hiburan': '🎮',
  'Kesehatan': '💊',
  'Pendidikan': '📚',
  'Rumah': '🏠',
  'Keluarga': '👨‍👩‍👧',
  'Gaji': '💼',
  'Freelance': '💻',
  'Hadiah': '🎁',
  'Jualan': '🛒',
  'Tabungan': '🏦',
  'Lainnya': '✨'
}

const palette = ['#2563eb', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#14b8a6', '#ec4899', '#64748b']
const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })
const dateFormatter = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
const monthFormatter = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' })

let transactions = []
let budgets = {}
let deferredPrompt = null
let selectedImportFile = null

const els = {
  pageTitle: document.getElementById('pageTitle'),
  heroMonth: document.getElementById('heroMonth'),
  monthFilter: document.getElementById('monthFilter'),
  totalExpense: document.getElementById('totalExpense'),
  totalIncome: document.getElementById('totalIncome'),
  budgetLeft: document.getElementById('budgetLeft'),
  dailyAverage: document.getElementById('dailyAverage'),
  expenseCount: document.getElementById('expenseCount'),
  incomeCount: document.getElementById('incomeCount'),
  budgetStatus: document.getElementById('budgetStatus'),
  topCategory: document.getElementById('topCategory'),
  form: document.getElementById('transactionForm'),
  formTitle: document.getElementById('formTitle'),
  editId: document.getElementById('editId'),
  typeInput: document.getElementById('typeInput'),
  dateInput: document.getElementById('dateInput'),
  nameInput: document.getElementById('nameInput'),
  categoryInput: document.getElementById('categoryInput'),
  amountInput: document.getElementById('amountInput'),
  methodInput: document.getElementById('methodInput'),
  noteInput: document.getElementById('noteInput'),
  cancelEditBtn: document.getElementById('cancelEditBtn'),
  budgetInput: document.getElementById('budgetInput'),
  saveBudgetBtn: document.getElementById('saveBudgetBtn'),
  budgetPercent: document.getElementById('budgetPercent'),
  budgetProgress: document.getElementById('budgetProgress'),
  budgetHint: document.getElementById('budgetHint'),
  searchInput: document.getElementById('searchInput'),
  typeFilter: document.getElementById('typeFilter'),
  categoryFilter: document.getElementById('categoryFilter'),
  transactionList: document.getElementById('transactionList'),
  listEmpty: document.getElementById('listEmpty'),
  exportJsonBtn: document.getElementById('exportJsonBtn'),
  exportCsvBtn: document.getElementById('exportCsvBtn'),
  exportPdfBtn: document.getElementById('exportPdfBtn'),
  importFile: document.getElementById('importFile'),
  importMergeBtn: document.getElementById('importMergeBtn'),
  importReplaceBtn: document.getElementById('importReplaceBtn'),
  sampleBtn: document.getElementById('sampleBtn'),
  resetBtn: document.getElementById('resetBtn'),
  installBtn: document.getElementById('installBtn'),
  themeToggle: document.getElementById('themeToggle'),
  toast: document.getElementById('toast'),
  categoryEmpty: document.getElementById('categoryEmpty'),
  dailyEmpty: document.getElementById('dailyEmpty')
}

function init(){
  transactions = loadJson(STORAGE_KEYS.transactions, [])
  budgets = loadJson(STORAGE_KEYS.budgets, {})
  applyTheme(localStorage.getItem(STORAGE_KEYS.theme) || 'light')
  els.monthFilter.value = getCurrentMonthKey()
  els.dateInput.value = getToday()
  populateCategorySelect()
  populateCategoryFilter()
  bindEvents()
  renderAll()
  registerServiceWorker()
}

function bindEvents(){
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', event => {
      event.preventDefault()
      setView(item.dataset.view)
    })
  })

  els.monthFilter.addEventListener('change', () => {
    els.budgetInput.value = budgets[getMonthKey()] || ''
    renderAll()
  })

  els.typeInput.addEventListener('change', populateCategorySelect)
  els.form.addEventListener('submit', handleSubmit)
  els.cancelEditBtn.addEventListener('click', resetForm)
  els.saveBudgetBtn.addEventListener('click', saveBudget)
  els.searchInput.addEventListener('input', renderTransactionList)
  els.typeFilter.addEventListener('change', renderTransactionList)
  els.categoryFilter.addEventListener('change', renderTransactionList)
  els.exportJsonBtn.addEventListener('click', exportJson)
  els.exportCsvBtn.addEventListener('click', exportCsv)
  els.exportPdfBtn.addEventListener('click', exportPdf)
  els.importFile.addEventListener('change', event => selectedImportFile = event.target.files[0] || null)
  els.importMergeBtn.addEventListener('click', () => importData('merge'))
  els.importReplaceBtn.addEventListener('click', () => importData('replace'))
  els.sampleBtn.addEventListener('click', fillSampleData)
  els.resetBtn.addEventListener('click', resetAllData)
  els.themeToggle.addEventListener('click', toggleTheme)
  els.installBtn.addEventListener('click', installApp)
  window.addEventListener('resize', debounce(renderCharts, 160))

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault()
    deferredPrompt = event
    updateInstallButton()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    updateInstallButton()
    showToast('Aplikasi berhasil di-install.')
  })

  const displayModeQuery = window.matchMedia('(display-mode: standalone)')
  if(displayModeQuery.addEventListener){
    displayModeQuery.addEventListener('change', updateInstallButton)
  }

  updateInstallButton()
}

function setView(viewName){
  document.querySelectorAll('.menu-item').forEach(item => {
    item.classList.toggle('active', item.dataset.view === viewName)
  })
  document.querySelectorAll('.view').forEach(view => {
    view.classList.toggle('active-view', view.id === viewName)
  })
  els.pageTitle.textContent = viewName.charAt(0).toUpperCase() + viewName.slice(1)
  setTimeout(renderCharts, 60)
}

function handleSubmit(event){
  event.preventDefault()

  const id = els.editId.value || makeId()
  const item = {
    id,
    type: els.typeInput.value,
    date: els.dateInput.value,
    name: cleanText(els.nameInput.value),
    category: els.categoryInput.value,
    amount: Number(els.amountInput.value),
    method: els.methodInput.value,
    note: cleanText(els.noteInput.value),
    updatedAt: new Date().toISOString()
  }

  if(!item.date || !item.name || !item.category || !item.amount || item.amount <= 0){
    showToast('Lengkapi data transaksi dulu ya.')
    return
  }

  const index = transactions.findIndex(tx => tx.id === id)
  if(index >= 0){
    transactions[index] = { ...transactions[index], ...item }
    showToast('Transaksi berhasil diperbarui.')
  }else{
    transactions.push({ ...item, createdAt: new Date().toISOString() })
    showToast('Transaksi berhasil disimpan.')
  }

  saveTransactions()
  resetForm()
  renderAll()
}

function resetForm(){
  els.editId.value = ''
  els.formTitle.textContent = 'Tambah Transaksi'
  els.cancelEditBtn.classList.add('hidden')
  els.typeInput.value = 'expense'
  populateCategorySelect()
  els.dateInput.value = getToday()
  els.nameInput.value = ''
  els.amountInput.value = ''
  els.methodInput.value = 'Tunai'
  els.noteInput.value = ''
}

function editTransaction(id){
  const item = transactions.find(tx => tx.id === id)
  if(!item) return
  setView('dashboard')
  els.editId.value = item.id
  els.formTitle.textContent = 'Edit Transaksi'
  els.cancelEditBtn.classList.remove('hidden')
  els.typeInput.value = item.type
  populateCategorySelect()
  els.dateInput.value = item.date
  els.nameInput.value = item.name
  els.categoryInput.value = item.category
  els.amountInput.value = item.amount
  els.methodInput.value = item.method || 'Tunai'
  els.noteInput.value = item.note || ''
  els.nameInput.focus()
}

function deleteTransaction(id){
  const item = transactions.find(tx => tx.id === id)
  if(!item) return
  const ok = confirm(`Hapus transaksi "${item.name}"?`)
  if(!ok) return
  transactions = transactions.filter(tx => tx.id !== id)
  saveTransactions()
  renderAll()
  showToast('Transaksi dihapus.')
}

function saveBudget(){
  const value = Number(els.budgetInput.value || 0)
  const key = getMonthKey()
  if(value <= 0){
    delete budgets[key]
    showToast('Budget bulan ini dihapus.')
  }else{
    budgets[key] = value
    showToast('Budget bulan ini disimpan.')
  }
  localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets))
  renderAll()
}

function populateCategorySelect(){
  const list = els.typeInput.value === 'income' ? incomeCategories : expenseCategories
  els.categoryInput.innerHTML = list.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')
}

function populateCategoryFilter(){
  const allCategories = [...new Set([...expenseCategories, ...incomeCategories])]
  els.categoryFilter.innerHTML = '<option value="all">Semua kategori</option>' + allCategories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join('')
}

function renderAll(){
  const monthKey = getMonthKey()
  els.heroMonth.textContent = monthFormatter.format(new Date(`${monthKey}-01T00:00:00`))
  els.budgetInput.value = budgets[monthKey] || ''
  renderSummary()
  renderTransactionList()
  renderCharts()
}

function renderSummary(){
  const monthData = getMonthTransactions()
  const expenseData = monthData.filter(item => item.type === 'expense')
  const incomeData = monthData.filter(item => item.type === 'income')
  const totalExpense = sumAmount(expenseData)
  const totalIncome = sumAmount(incomeData)
  const budget = Number(budgets[getMonthKey()] || 0)
  const budgetLeft = budget - totalExpense
  const daysInMonth = new Date(Number(getMonthKey().slice(0,4)), Number(getMonthKey().slice(5,7)), 0).getDate()
  const dailyAverage = totalExpense / daysInMonth
  const topCategory = getTopCategory(expenseData)

  els.totalExpense.textContent = rupiah.format(totalExpense)
  els.totalIncome.textContent = rupiah.format(totalIncome)
  els.budgetLeft.textContent = budget ? rupiah.format(budgetLeft) : rupiah.format(totalIncome - totalExpense)
  els.dailyAverage.textContent = rupiah.format(dailyAverage)
  els.expenseCount.textContent = `${expenseData.length} transaksi keluar`
  els.incomeCount.textContent = `${incomeData.length} transaksi masuk`
  els.topCategory.textContent = `Kategori teratas: ${topCategory || '-'}`

  if(!budget){
    els.budgetStatus.textContent = 'Atur budget bulanan'
    els.budgetPercent.textContent = '0%'
    els.budgetProgress.style.width = '0%'
    els.budgetHint.textContent = 'Budget belum diatur.'
    return
  }

  const percent = Math.min((totalExpense / budget) * 100, 999)
  els.budgetStatus.textContent = budgetLeft >= 0 ? 'Masih aman' : 'Melebihi budget'
  els.budgetPercent.textContent = `${Math.round(percent)}%`
  els.budgetProgress.style.width = `${Math.min(percent, 100)}%`
  els.budgetHint.textContent = budgetLeft >= 0
    ? `Masih tersisa ${rupiah.format(budgetLeft)} dari budget ${rupiah.format(budget)}.`
    : `Sudah melewati budget sebesar ${rupiah.format(Math.abs(budgetLeft))}.`
}

function renderTransactionList(){
  const query = cleanText(els.searchInput.value).toLowerCase()
  const type = els.typeFilter.value
  const category = els.categoryFilter.value

  let list = getMonthTransactions()
    .filter(item => type === 'all' || item.type === type)
    .filter(item => category === 'all' || item.category === category)
    .filter(item => {
      const haystack = `${item.name} ${item.category} ${item.method} ${item.note}`.toLowerCase()
      return !query || haystack.includes(query)
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))

  els.listEmpty.classList.toggle('hidden', list.length > 0)
  els.transactionList.innerHTML = list.map(item => {
    const sign = item.type === 'expense' ? '-' : '+'
    const typeLabel = item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan'
    return `
      <div class="transaction-item">
        <div class="transaction-main">
          <div class="transaction-icon">${categoryIcons[item.category] || '✨'}</div>
          <div class="min-w-0">
            <p class="transaction-title">${escapeHtml(item.name)}</p>
            <p class="transaction-meta">${formatDate(item.date)} • ${escapeHtml(item.category)} • ${escapeHtml(item.method || 'Tunai')}</p>
            ${item.note ? `<p class="transaction-meta">${escapeHtml(item.note)}</p>` : ''}
          </div>
        </div>
        <div>
          <div class="transaction-amount ${item.type}">${sign}${rupiah.format(item.amount)}</div>
          <p class="transaction-meta">${typeLabel}</p>
          <div class="transaction-actions">
            <button class="action-btn" type="button" onclick="editTransaction('${item.id}')">Edit</button>
            <button class="action-btn" type="button" onclick="deleteTransaction('${item.id}')">Hapus</button>
          </div>
        </div>
      </div>
    `
  }).join('')
}

function renderCharts(){
  const monthData = getMonthTransactions().filter(item => item.type === 'expense')
  const categoryData = groupByCategory(monthData)
  const dailyData = groupByDay(monthData)
  const weeklyData = groupByWeek(monthData)

  els.categoryEmpty.classList.toggle('hidden', categoryData.length > 0)
  els.dailyEmpty.classList.toggle('hidden', dailyData.some(item => item.value > 0))

  drawHorizontalBars(document.getElementById('categoryChart'), categoryData.slice(0, 8), 'Belum ada data kategori')
  drawLineChart(document.getElementById('dailyChart'), dailyData, 'Belum ada data harian')
  drawPieChart(document.getElementById('pieChart'), categoryData, 'Belum ada data kategori')
  drawVerticalBars(document.getElementById('weeklyChart'), weeklyData, 'Belum ada data mingguan')
}

function drawHorizontalBars(canvas, data, emptyText){
  const ctx = setupCanvas(canvas)
  if(!ctx) return
  const { width, height } = canvas
  clearCanvas(ctx, width, height)
  if(!data.length){
    drawEmpty(ctx, width, height, emptyText)
    return
  }

  const max = Math.max(...data.map(item => item.value)) || 1
  const left = 130
  const right = 22
  const top = 18
  const barHeight = 22
  const gap = 15

  data.forEach((item, index) => {
    const y = top + index * (barHeight + gap)
    const barWidth = ((width - left - right) * item.value) / max
    ctx.fillStyle = getTextColor()
    ctx.font = '600 12px system-ui'
    ctx.fillText(truncate(item.label, 16), 14, y + 16)
    roundedRect(ctx, left, y, width - left - right, barHeight, 9, 'rgba(148, 163, 184, 0.18)')
    roundedRect(ctx, left, y, Math.max(barWidth, 6), barHeight, 9, palette[index % palette.length])
    ctx.fillStyle = getMutedColor()
    ctx.font = '600 11px system-ui'
    ctx.fillText(shortCurrency(item.value), left + Math.min(barWidth + 8, width - left - 72), y + 16)
  })
}

function drawLineChart(canvas, data, emptyText){
  const ctx = setupCanvas(canvas)
  if(!ctx) return
  const { width, height } = canvas
  clearCanvas(ctx, width, height)
  if(!data.some(item => item.value > 0)){
    drawEmpty(ctx, width, height, emptyText)
    return
  }

  const pad = { top: 22, right: 18, bottom: 34, left: 50 }
  const max = Math.max(...data.map(item => item.value), 1)
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)'
  ctx.lineWidth = 1
  for(let i = 0; i <= 4; i++){
    const y = pad.top + (innerH / 4) * i
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(width - pad.right, y)
    ctx.stroke()
  }

  ctx.beginPath()
  data.forEach((item, index) => {
    const x = pad.left + (innerW / Math.max(data.length - 1, 1)) * index
    const y = pad.top + innerH - (item.value / max) * innerH
    if(index === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = '#2563eb'
  ctx.lineWidth = 3
  ctx.stroke()

  data.forEach((item, index) => {
    if(item.value <= 0) return
    const x = pad.left + (innerW / Math.max(data.length - 1, 1)) * index
    const y = pad.top + innerH - (item.value / max) * innerH
    ctx.fillStyle = '#2563eb'
    ctx.beginPath()
    ctx.arc(x, y, 3.5, 0, Math.PI * 2)
    ctx.fill()
  })

  ctx.fillStyle = getMutedColor()
  ctx.font = '600 11px system-ui'
  ctx.fillText('1', pad.left - 4, height - 12)
  ctx.fillText(String(data.length), width - pad.right - 12, height - 12)
  ctx.fillText(shortCurrency(max), 8, pad.top + 4)
}

function drawPieChart(canvas, data, emptyText){
  const ctx = setupCanvas(canvas)
  if(!ctx) return
  const { width, height } = canvas
  clearCanvas(ctx, width, height)
  if(!data.length){
    drawEmpty(ctx, width, height, emptyText)
    return
  }

  const total = sumAmount(data.map(item => ({ amount: item.value })))
  const cx = Math.min(width * 0.36, 180)
  const cy = height / 2
  const radius = Math.min(width, height) * 0.27
  let start = -Math.PI / 2

  data.slice(0, 8).forEach((item, index) => {
    const angle = (item.value / total) * Math.PI * 2
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, start + angle)
    ctx.closePath()
    ctx.fillStyle = palette[index % palette.length]
    ctx.fill()
    start += angle
  })

  ctx.beginPath()
  ctx.fillStyle = getPanelColor()
  ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = getTextColor()
  ctx.font = '800 16px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(shortCurrency(total), cx, cy + 5)
  ctx.textAlign = 'left'

  const legendX = Math.min(width * 0.64, width - 190)
  data.slice(0, 8).forEach((item, index) => {
    const y = 28 + index * 30
    ctx.fillStyle = palette[index % palette.length]
    roundedRect(ctx, legendX, y - 12, 14, 14, 4, palette[index % palette.length])
    ctx.fillStyle = getTextColor()
    ctx.font = '700 12px system-ui'
    ctx.fillText(truncate(item.label, 18), legendX + 22, y)
    ctx.fillStyle = getMutedColor()
    ctx.font = '600 11px system-ui'
    ctx.fillText(`${Math.round((item.value / total) * 100)}%`, legendX + 22, y + 14)
  })
}

function drawVerticalBars(canvas, data, emptyText){
  const ctx = setupCanvas(canvas)
  if(!ctx) return
  const { width, height } = canvas
  clearCanvas(ctx, width, height)
  if(!data.some(item => item.value > 0)){
    drawEmpty(ctx, width, height, emptyText)
    return
  }

  const pad = { top: 28, right: 18, bottom: 42, left: 48 }
  const max = Math.max(...data.map(item => item.value), 1)
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const gap = 12
  const barWidth = Math.max((innerW - gap * (data.length - 1)) / data.length, 16)

  ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)'
  ctx.lineWidth = 1
  for(let i = 0; i <= 4; i++){
    const y = pad.top + (innerH / 4) * i
    ctx.beginPath()
    ctx.moveTo(pad.left, y)
    ctx.lineTo(width - pad.right, y)
    ctx.stroke()
  }

  data.forEach((item, index) => {
    const x = pad.left + index * (barWidth + gap)
    const barH = (item.value / max) * innerH
    const y = pad.top + innerH - barH
    roundedRect(ctx, x, y, barWidth, Math.max(barH, item.value ? 5 : 0), 9, palette[index % palette.length])
    ctx.fillStyle = getMutedColor()
    ctx.font = '700 11px system-ui'
    ctx.textAlign = 'center'
    ctx.fillText(item.label, x + barWidth / 2, height - 14)
  })
  ctx.textAlign = 'left'
  ctx.fillStyle = getMutedColor()
  ctx.font = '600 11px system-ui'
  ctx.fillText(shortCurrency(max), 8, pad.top + 4)
}

function setupCanvas(canvas){
  if(!canvas) return null
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(Math.floor(rect.width), 300)
  const height = Number(canvas.getAttribute('height')) || 260
  canvas.width = width
  canvas.height = height
  canvas.style.height = `${height}px`
  return canvas.getContext('2d')
}

function clearCanvas(ctx, width, height){
  ctx.clearRect(0, 0, width, height)
}

function drawEmpty(ctx, width, height, text){
  ctx.fillStyle = getMutedColor()
  ctx.font = '700 14px system-ui'
  ctx.textAlign = 'center'
  ctx.fillText(text, width / 2, height / 2)
  ctx.textAlign = 'left'
}

function roundedRect(ctx, x, y, w, h, r, fill){
  const radius = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + w - radius, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
  ctx.lineTo(x + w, y + h - radius)
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
  ctx.lineTo(x + radius, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
}

function groupByCategory(data){
  const grouped = {}
  data.forEach(item => grouped[item.category] = (grouped[item.category] || 0) + item.amount)
  return Object.entries(grouped)
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value)
}

function groupByDay(data){
  const key = getMonthKey()
  const year = Number(key.slice(0, 4))
  const month = Number(key.slice(5, 7))
  const days = new Date(year, month, 0).getDate()
  const rows = Array.from({ length: days }, (_, index) => ({ label: String(index + 1), value: 0 }))
  data.forEach(item => {
    const day = Number(item.date.slice(8, 10))
    if(rows[day - 1]) rows[day - 1].value += item.amount
  })
  return rows
}

function groupByWeek(data){
  const rows = [1, 2, 3, 4, 5].map(num => ({ label: `M${num}`, value: 0 }))
  data.forEach(item => {
    const day = Number(item.date.slice(8, 10))
    const week = Math.min(Math.ceil(day / 7), 5)
    rows[week - 1].value += item.amount
  })
  return rows
}

function getMonthTransactions(){
  const key = getMonthKey()
  return transactions.filter(item => item.date && item.date.startsWith(key))
}

function getTopCategory(data){
  const grouped = groupByCategory(data)
  return grouped[0]?.label || ''
}

function sumAmount(data){
  return data.reduce((total, item) => total + Number(item.amount || item.value || 0), 0)
}

function exportJson(){
  const payload = {
    app: 'Dompet Bulanan',
    version: 1,
    exportedAt: new Date().toISOString(),
    transactions,
    budgets
  }
  downloadFile(`backup-dompet-bulanan-${getToday()}.json`, JSON.stringify(payload, null, 2), 'application/json')
  showToast('Backup JSON dibuat.')
}

function exportCsv(){
  const header = ['tanggal', 'jenis', 'nama', 'kategori', 'nominal', 'metode', 'catatan']
  const rows = transactions
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(item => [item.date, item.type, item.name, item.category, item.amount, item.method, item.note || ''])
  const csv = [header, ...rows]
    .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n')
  downloadFile(`transaksi-dompet-bulanan-${getToday()}.csv`, csv, 'text/csv')
  showToast('File CSV dibuat.')
}


function exportPdf(){
  const monthKey = getMonthKey()
  const monthLabel = monthFormatter.format(new Date(`${monthKey}-01T00:00:00`))
  const monthData = getMonthTransactions().sort((a, b) => a.date.localeCompare(b.date))
  const expenseData = monthData.filter(item => item.type === 'expense')
  const incomeData = monthData.filter(item => item.type === 'income')
  const totalExpense = sumAmount(expenseData)
  const totalIncome = sumAmount(incomeData)
  const budget = Number(budgets[monthKey] || 0)
  const balance = totalIncome - totalExpense
  const budgetLeft = budget - totalExpense
  const categoryRows = groupByCategory(expenseData)
    .slice(0, 5)
    .map(item => `<li><span>${escapeHtml(item.label)}</span><strong>${rupiah.format(item.value)}</strong></li>`)
    .join('') || '<li><span>Belum ada pengeluaran</span><strong>Rp0</strong></li>'

  const transactionRows = monthData.length
    ? monthData.map((item, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(formatDate(item.date))}</td>
          <td>${escapeHtml(item.type === 'expense' ? 'Pengeluaran' : 'Pemasukan')}</td>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.category)}</td>
          <td>${escapeHtml(item.method || 'Tunai')}</td>
          <td class="${item.type === 'expense' ? 'minus' : 'plus'}">
            ${item.type === 'expense' ? '-' : '+'}${rupiah.format(Number(item.amount || 0))}
          </td>
        </tr>
      `).join('')
    : `
        <tr>
          <td colspan="7" class="empty-row">Belum ada transaksi pada bulan ini.</td>
        </tr>
      `

  const pdfWindow = window.open('', '_blank')

  if(!pdfWindow){
    showToast('Popup diblokir. Izinkan popup dulu untuk export PDF.')
    return
  }

  pdfWindow.document.open()
  pdfWindow.document.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Laporan Dompet Bulanan - ${escapeHtml(monthLabel)}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 32px;
          font-family: Arial, sans-serif;
          color: #172033;
          background: #ffffff;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          border-bottom: 3px solid #2563eb;
          padding-bottom: 18px;
          margin-bottom: 24px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .logo {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: grid;
          place-items: center;
          background: linear-gradient(135deg, #2563eb, #7c3aed);
          box-shadow: 0 12px 24px rgba(37, 99, 235, 0.25);
        }
        .logo svg {
          width: 42px;
          height: 42px;
        }
        h1, h2, h3, p { margin: 0; }
        h1 { font-size: 24px; }
        .muted {
          color: #64748b;
          font-size: 13px;
          margin-top: 4px;
        }
        .summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 18px;
        }
        .card {
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          padding: 14px;
          background: #f8fafc;
        }
        .card p {
          color: #64748b;
          font-size: 12px;
          margin-bottom: 8px;
        }
        .card h3 { font-size: 17px; }
        .section-title {
          font-size: 16px;
          margin: 20px 0 10px;
        }
        .category-list {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px 16px;
          margin: 0 0 18px;
          padding: 0;
          list-style: none;
        }
        .category-list li {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          padding: 10px 12px;
          background: #ffffff;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th {
          background: #2563eb;
          color: white;
          text-align: left;
          padding: 10px;
        }
        td {
          border-bottom: 1px solid #e2e8f0;
          padding: 10px;
          vertical-align: top;
        }
        .plus { color: #16a34a; font-weight: 700; }
        .minus { color: #ef4444; font-weight: 700; }
        .empty-row {
          text-align: center;
          color: #64748b;
          padding: 24px;
        }
        .footer {
          margin-top: 24px;
          color: #64748b;
          font-size: 12px;
          text-align: center;
        }
        @media print {
          body { padding: 20px; }
          .summary { grid-template-columns: repeat(2, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="brand">
          <div class="logo" aria-hidden="true">
            <svg viewBox="0 0 64 64">
              <defs>
                <linearGradient id="pdfMoonGradient" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0%" stop-color="#fde68a" />
                  <stop offset="100%" stop-color="#f97316" />
                </linearGradient>
              </defs>
              <circle cx="30" cy="32" r="22" fill="url(#pdfMoonGradient)" />
              <circle cx="39" cy="25" r="22" fill="#2563eb" />
              <path d="M47 8l2.2 7h7.3l-5.9 4.3 2.3 7-5.9-4.3-6 4.3 2.3-7-5.9-4.3h7.3L47 8z" fill="#ffffff" />
              <path d="M18 40l1.4 4.3H24l-3.7 2.7 1.4 4.3L18 48.6l-3.7 2.7 1.4-4.3L12 44.3h4.6L18 40z" fill="#ffffff" opacity="0.95" />
            </svg>
          </div>
          <div>
            <h1>Dompet Bulanan</h1>
            <p class="muted">Laporan transaksi bulan ${escapeHtml(monthLabel)}</p>
          </div>
        </div>
        <div>
          <p class="muted">Tanggal export</p>
          <h3>${escapeHtml(formatDate(getToday()))}</h3>
        </div>
      </div>

      <section class="summary">
        <div class="card"><p>Total Pengeluaran</p><h3>${rupiah.format(totalExpense)}</h3></div>
        <div class="card"><p>Total Pemasukan</p><h3>${rupiah.format(totalIncome)}</h3></div>
        <div class="card"><p>Saldo Bulan Ini</p><h3>${rupiah.format(balance)}</h3></div>
        <div class="card"><p>Sisa Budget</p><h3>${budget ? rupiah.format(budgetLeft) : 'Budget belum diatur'}</h3></div>
      </section>

      <h2 class="section-title">Kategori Pengeluaran Terbesar</h2>
      <ul class="category-list">${categoryRows}</ul>

      <h2 class="section-title">Daftar Transaksi</h2>
      <table>
        <thead>
          <tr>
            <th>No</th>
            <th>Tanggal</th>
            <th>Jenis</th>
            <th>Nama</th>
            <th>Kategori</th>
            <th>Metode</th>
            <th>Nominal</th>
          </tr>
        </thead>
        <tbody>${transactionRows}</tbody>
      </table>

      <p class="footer">Dibuat otomatis dari aplikasi Dompet Bulanan by StarmoonLabs.</p>

      <script>
        window.onload = function(){
          window.print()
        }
      <\/script>
    </body>
    </html>
  `)
  pdfWindow.document.close()

  showToast('Laporan PDF dibuka. Pilih Save as PDF saat print.')
}


async function importData(mode){
  if(!selectedImportFile){
    showToast('Pilih file JSON dulu.')
    return
  }

  try{
    const text = await selectedImportFile.text()
    const parsed = JSON.parse(text)
    const importedTransactions = Array.isArray(parsed) ? parsed : parsed.transactions
    const importedBudgets = parsed.budgets || {}

    if(!Array.isArray(importedTransactions)){
      showToast('Format file tidak sesuai.')
      return
    }

    const sanitized = importedTransactions
      .filter(item => item && item.date && item.name && item.amount)
      .map(item => ({
        id: item.id || makeId(),
        type: item.type === 'income' ? 'income' : 'expense',
        date: item.date,
        name: cleanText(item.name),
        category: item.category || 'Lainnya',
        amount: Number(item.amount),
        method: item.method || 'Tunai',
        note: cleanText(item.note || ''),
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }))

    if(mode === 'replace'){
      const ok = confirm('Ganti semua data dengan file backup ini?')
      if(!ok) return
      transactions = sanitized
      budgets = importedBudgets
    }else{
      const map = new Map(transactions.map(item => [item.id, item]))
      sanitized.forEach(item => map.set(item.id, item))
      transactions = Array.from(map.values())
      budgets = { ...budgets, ...importedBudgets }
    }

    saveTransactions()
    localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets))
    els.importFile.value = ''
    selectedImportFile = null
    renderAll()
    showToast('Data berhasil di-import.')
  }catch(error){
    console.error(error)
    showToast('Import gagal. Pastikan file JSON benar.')
  }
}

function fillSampleData(){
  const ok = confirm('Tambahkan beberapa data contoh ke bulan yang sedang dipilih?')
  if(!ok) return
  const month = getMonthKey()
  const sample = [
    ['expense', `${month}-02`, 'Sarapan', 'Makan & Minum', 18000, 'Tunai'],
    ['expense', `${month}-03`, 'Bensin motor', 'Transportasi', 30000, 'QRIS'],
    ['income', `${month}-05`, 'Gaji bulanan', 'Gaji', 2500000, 'Transfer'],
    ['expense', `${month}-07`, 'Paket internet', 'Tagihan', 85000, 'E-Wallet'],
    ['expense', `${month}-10`, 'Belanja bulanan', 'Belanja', 230000, 'Kartu Debit'],
    ['expense', `${month}-14`, 'Nonton film', 'Hiburan', 55000, 'QRIS'],
    ['expense', `${month}-18`, 'Obat flu', 'Kesehatan', 42000, 'Tunai'],
    ['income', `${month}-20`, 'Freelance desain', 'Freelance', 350000, 'Transfer']
  ].map(row => ({
    id: makeId(),
    type: row[0],
    date: row[1],
    name: row[2],
    category: row[3],
    amount: row[4],
    method: row[5],
    note: 'Data contoh',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }))
  transactions = [...transactions, ...sample]
  if(!budgets[month]) budgets[month] = 1500000
  saveTransactions()
  localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets))
  renderAll()
  showToast('Data contoh ditambahkan.')
}

function resetAllData(){
  const ok = confirm('Yakin hapus semua transaksi dan budget? Data tidak bisa dikembalikan kecuali punya backup.')
  if(!ok) return
  transactions = []
  budgets = {}
  saveTransactions()
  localStorage.setItem(STORAGE_KEYS.budgets, JSON.stringify(budgets))
  renderAll()
  showToast('Semua data dihapus.')
}

function downloadFile(filename, content, type){
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function loadJson(key, fallback){
  try{
    return JSON.parse(localStorage.getItem(key)) || fallback
  }catch(error){
    return fallback
  }
}

function saveTransactions(){
  localStorage.setItem(STORAGE_KEYS.transactions, JSON.stringify(transactions))
}

function getMonthKey(){
  return els.monthFilter.value || getCurrentMonthKey()
}

function getCurrentMonthKey(){
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function getToday(){
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

function formatDate(dateString){
  return dateFormatter.format(new Date(`${dateString}T00:00:00`))
}

function makeId(){
  return `tx-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function cleanText(value){
  return String(value || '').trim()
}

function escapeHtml(value){
  return String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[char]))
}

function truncate(text, max){
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function shortCurrency(value){
  if(value >= 1000000000) return `Rp${(value / 1000000000).toFixed(1)}M`
  if(value >= 1000000) return `Rp${(value / 1000000).toFixed(1)}jt`
  if(value >= 1000) return `Rp${Math.round(value / 1000)}rb`
  return rupiah.format(value)
}

function getTextColor(){
  return getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#172033'
}

function getMutedColor(){
  return getComputedStyle(document.documentElement).getPropertyValue('--muted').trim() || '#64748b'
}

function getPanelColor(){
  return getComputedStyle(document.documentElement).getPropertyValue('--surface-strong').trim() || '#ffffff'
}

function debounce(fn, wait){
  let timeout
  return (...args) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => fn(...args), wait)
  }
}

function showToast(message){
  els.toast.textContent = message
  els.toast.classList.add('show')
  clearTimeout(showToast.timeout)
  showToast.timeout = setTimeout(() => els.toast.classList.remove('show'), 2300)
}

function applyTheme(theme){
  document.documentElement.dataset.theme = theme
  els.themeToggle.textContent = theme === 'dark' ? '☀️' : '🌙'
  localStorage.setItem(STORAGE_KEYS.theme, theme)
  setTimeout(renderCharts, 30)
}

function toggleTheme(){
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'
  applyTheme(next)
}

function isRunningAsInstalledApp(){
  return window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

function updateInstallButton(){
  if(!els.installBtn) return

  if(isRunningAsInstalledApp()){
    els.installBtn.classList.add('hidden')
    return
  }

  if(deferredPrompt){
    els.installBtn.classList.remove('hidden')
  }else{
    els.installBtn.classList.add('hidden')
  }
}

async function installApp(){
  if(isRunningAsInstalledApp()){
    updateInstallButton()
    return
  }

  if(!deferredPrompt){
    showToast('Tombol install akan aktif kalau aplikasi dibuka dari Chrome/Edge lewat link HTTPS GitHub Pages.')
    updateInstallButton()
    return
  }

  deferredPrompt.prompt()
  const choice = await deferredPrompt.userChoice
  deferredPrompt = null
  updateInstallButton()

  if(choice.outcome === 'accepted'){
    showToast('Aplikasi sedang dipasang.')
  }else{
    showToast('Install aplikasi dibatalkan.')
  }
}

function registerServiceWorker(){
  if('serviceWorker' in navigator){
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(error => console.warn('Service worker gagal:', error))
    })
  }
}

window.editTransaction = editTransaction
window.deleteTransaction = deleteTransaction
init()

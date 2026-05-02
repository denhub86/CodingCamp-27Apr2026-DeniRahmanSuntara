# Design Document

## Expense & Budget Visualizer

---

## Overview

Expense & Budget Visualizer adalah aplikasi web standalone satu halaman (single-page) yang berjalan sepenuhnya di browser. Tidak ada server, tidak ada build tool, tidak ada framework — hanya tiga file: `index.html`, `css/style.css`, dan `js/app.js`.

Pengguna mencatat pengeluaran (nama item, jumlah, kategori), melihat total saldo, dan memahami pola pengeluaran melalui grafik donat (doughnut chart) berbasis Chart.js. Semua data disimpan di `localStorage` sehingga persisten antar sesi browser.

**Keputusan desain utama:**
- **Vanilla JS** — tidak ada React, Vue, atau framework lain. Ini menjaga ukuran bundle nol dan kompatibilitas maksimal termasuk sebagai browser extension.
- **Chart.js via CDN** — library charting yang matang, ringan, dan mudah diintegrasikan tanpa build step.
- **localStorage** — cukup untuk use case personal finance tracker; tidak perlu IndexedDB karena volume data kecil.
- **Doughnut chart** — lebih cocok untuk menampilkan proporsi per kategori dibanding bar chart, dan lebih kompak di layar mobile.

---

## Architecture

Aplikasi menggunakan arsitektur **MVC sederhana tanpa framework** yang sepenuhnya diimplementasikan dalam satu file `js/app.js`.

```
┌─────────────────────────────────────────────────────────┐
│                      index.html                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │
│  │ Balance  │  │  Chart   │  │  Form    │  │  List  │  │
│  │ Section  │  │ Section  │  │ Section  │  │Section │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────┘  │
└─────────────────────────────────────────────────────────┘
         │                │               │
         ▼                ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                      js/app.js                          │
│                                                         │
│  ┌─────────────┐   ┌──────────────┐   ┌─────────────┐  │
│  │   Storage   │   │    State     │   │     UI      │  │
│  │   Module    │◄──│   Manager   │──►│   Renderer  │  │
│  │(localStorage│   │(transactions │   │(DOM updates)│  │
│  │   CRUD)     │   │  array)      │   │             │  │
│  └─────────────┘   └──────────────┘   └─────────────┘  │
│                           │                             │
│                    ┌──────────────┐                     │
│                    │Chart Manager │                     │
│                    │(Chart.js API)│                     │
│                    └──────────────┘                     │
└─────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────┐
│    localStorage     │
│  key: "expenses"    │
│  value: JSON array  │
└─────────────────────┘
```

**Alur data (data flow):**

1. Pengguna mengisi form → event handler di UI layer memvalidasi input
2. Jika valid → State Manager menambahkan transaction ke array in-memory
3. State Manager memanggil Storage Module untuk persist ke localStorage
4. State Manager memanggil UI Renderer untuk update DOM (balance, list)
5. State Manager memanggil Chart Manager untuk update chart
6. Saat app load → Storage Module membaca localStorage → State Manager diinisialisasi → UI Renderer dan Chart Manager dirender

---

## Components and Interfaces

### 1. Storage Module

Bertanggung jawab atas semua operasi localStorage. Tidak tahu tentang UI.

```javascript
// Interface
StorageModule = {
  load()           // → Transaction[]  — baca dari localStorage, return array (kosong jika belum ada)
  save(transactions) // Transaction[] → void — serialisasi ke JSON dan simpan
}
```

**Key localStorage:** `"expenses"`

### 2. State Manager

Menyimpan state aplikasi (array transactions in-memory) dan mengkoordinasikan semua modul lain.

```javascript
// Interface
StateManager = {
  init()                    // void — load dari storage, render UI awal
  addTransaction(data)      // {name, amount, category} → void — validasi, tambah, persist, render
  deleteTransaction(id)     // string → void — hapus by id, persist, render
  getTransactions()         // → Transaction[]
  getTotalBalance()         // → number — sum semua amounts
  getCategoryTotals()       // → {Food: number, Transport: number, Fun: number}
}
```

### 3. UI Renderer

Bertanggung jawab atas semua manipulasi DOM. Menerima data, menghasilkan HTML.

```javascript
// Interface
UIRenderer = {
  renderBalance(amount)         // number → void — update teks balance display
  renderTransactionList(items)  // Transaction[] → void — rebuild daftar transaksi di DOM
  clearForm()                   // void — reset semua field form ke nilai default
  showError(field, message)     // string, string → void — tampilkan pesan error di bawah field
  clearErrors()                 // void — hapus semua pesan error
}
```

### 4. Chart Manager

Mengelola instance Chart.js. Dibuat sekali saat init, diupdate saat data berubah.

```javascript
// Interface
ChartManager = {
  init(canvasId)              // string → void — buat instance Chart.js
  update(categoryTotals)      // {Food, Transport, Fun} → void — update data chart
}
```

### 5. Form Event Handler

Menangkap event submit form, mengekstrak nilai input, memanggil validasi, lalu memanggil StateManager.

```javascript
// Interface
FormHandler = {
  init()   // void — attach event listeners ke form dan tombol hapus (event delegation)
}
```

---

## Data Models

### Transaction

Satu catatan pengeluaran yang disimpan di localStorage dan ditampilkan di UI.

```javascript
/**
 * @typedef {Object} Transaction
 * @property {string} id         - UUID unik, dibuat saat transaction dibuat (crypto.randomUUID() atau fallback)
 * @property {string} name       - Nama item pengeluaran, non-empty string
 * @property {number} amount     - Jumlah pengeluaran, bilangan positif (> 0)
 * @property {string} category   - Salah satu dari: "Food" | "Transport" | "Fun"
 * @property {number} timestamp  - Unix timestamp (Date.now()) saat transaction dibuat
 */
```

**Contoh data di localStorage:**
```json
[
  {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "name": "Nasi Goreng",
    "amount": 25000,
    "category": "Food",
    "timestamp": 1704067200000
  },
  {
    "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
    "name": "Grab ke kantor",
    "amount": 18000,
    "category": "Transport",
    "timestamp": 1704070800000
  }
]
```

### CategoryTotals

Objek agregasi yang dihitung dari array transactions, digunakan untuk chart.

```javascript
/**
 * @typedef {Object} CategoryTotals
 * @property {number} Food       - Total pengeluaran kategori Food
 * @property {number} Transport  - Total pengeluaran kategori Transport
 * @property {number} Fun        - Total pengeluaran kategori Fun
 */
```

### ValidationResult

Hasil validasi form sebelum transaction dibuat.

```javascript
/**
 * @typedef {Object} ValidationResult
 * @property {boolean} valid     - true jika semua field valid
 * @property {Object} errors     - map field name → pesan error (kosong jika valid)
 *                                 { name?: string, amount?: string, category?: string }
 */
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Form validation menolak input tidak valid

*For any* kombinasi input form di mana setidaknya satu field kosong, atau field amount berisi nilai yang bukan angka positif (nol, negatif, atau non-numerik), maka sistem SHALL menolak penyimpanan transaction dan menampilkan pesan error — sehingga jumlah transaction tidak bertambah.

**Validates: Requirements 1.6, 1.7**

---

### Property 2: Submission valid menambah transaction dan mereset form

*For any* input form yang valid (name non-empty, amount > 0, category salah satu dari Food/Transport/Fun), setelah form disubmit, transaction tersebut SHALL muncul di Transaction_List DAN semua field form SHALL dikosongkan/direset ke nilai default.

**Validates: Requirements 1.4, 1.5**

---

### Property 3: Transaction list merender semua field setiap transaction

*For any* kumpulan transactions yang tersimpan, setiap transaction SHALL dirender sebagai item di Transaction_List yang menampilkan nama item, jumlah, dan kategori — dengan transaction terbaru (timestamp tertinggi) muncul di posisi paling atas.

**Validates: Requirements 5.1, 5.2**

---

### Property 4: Hapus transaction menghilangkannya dari list dan storage

*For any* transaction yang ada di Transaction_List, setelah tombol hapus ditekan, transaction tersebut SHALL tidak lagi muncul di Transaction_List DAN tidak lagi ada di data yang tersimpan di localStorage.

**Validates: Requirements 5.5, 2.3**

---

### Property 5: Storage round-trip mempertahankan data transaction

*For any* kumpulan transactions yang ditambahkan ke aplikasi, data yang tersimpan di localStorage SHALL dapat di-parse sebagai JSON yang valid DAN menghasilkan array transaction yang ekuivalen (sama id, name, amount, category, timestamp) dengan data in-memory aplikasi.

**Validates: Requirements 2.1, 2.2, 2.4**

---

### Property 6: Balance sama dengan jumlah semua amount transaction

*For any* kumpulan transactions (termasuk kumpulan kosong), nilai Balance yang ditampilkan SHALL sama persis dengan hasil penjumlahan aritmatika semua nilai `amount` dari seluruh transactions yang tercatat (0 jika tidak ada transaction).

**Validates: Requirements 3.2, 3.3**

---

### Property 7: Format balance menyertakan pemisah ribuan

*For any* nilai balance yang lebih besar dari atau sama dengan 1.000, string yang ditampilkan di UI SHALL mengandung karakter pemisah ribuan (titik atau koma sesuai locale) sehingga angka mudah dibaca.

**Validates: Requirements 3.4**

---

### Property 8: Data chart mencerminkan total per kategori

*For any* kumpulan transactions, nilai dataset Chart.js untuk setiap kategori (Food, Transport, Fun) SHALL sama dengan jumlah aritmatika semua `amount` dari transactions dengan kategori tersebut.

**Validates: Requirements 4.2, 4.3**

---

## Error Handling

### Validasi Input Form

Validasi dilakukan di sisi klien sebelum data diproses. Setiap field memiliki aturan validasi sendiri:

| Field    | Aturan Validasi                                      | Pesan Error                                      |
|----------|------------------------------------------------------|--------------------------------------------------|
| name     | Tidak boleh kosong atau hanya whitespace             | "Nama item tidak boleh kosong."                  |
| amount   | Harus angka, harus > 0, tidak boleh NaN/Infinity     | "Jumlah harus berupa angka lebih dari 0."        |
| category | Harus salah satu dari: Food, Transport, Fun          | "Pilih kategori pengeluaran."                    |

Pesan error ditampilkan di bawah field yang bermasalah menggunakan elemen `<span class="error-message">`. Error dihapus saat pengguna mulai mengetik di field tersebut (event `input`).

### localStorage Errors

- **Quota exceeded**: Jika localStorage penuh, tampilkan notifikasi singkat di UI ("Penyimpanan penuh, hapus beberapa transaksi lama."). Transaction tidak ditambahkan ke state.
- **JSON parse error**: Jika data di localStorage corrupt (tidak bisa di-parse), reset ke array kosong dan lanjutkan. Log error ke console untuk debugging.
- **localStorage tidak tersedia**: Deteksi di awal (`try/catch` saat akses `window.localStorage`). Jika tidak tersedia, aplikasi tetap berjalan dengan data in-memory saja (data hilang saat refresh). Tampilkan banner peringatan.

### Chart.js Load Failure

Jika Chart.js gagal dimuat dari CDN (offline, CDN down), elemen canvas tetap ada tapi chart tidak dirender. Tampilkan pesan fallback di dalam `<div>` yang membungkus canvas: "Grafik tidak tersedia. Periksa koneksi internet."

### ID Generation Fallback

`crypto.randomUUID()` digunakan untuk generate ID unik. Jika tidak tersedia (browser sangat lama), fallback ke kombinasi `Date.now() + Math.random()` yang diformat sebagai string.

---

## Testing Strategy

Karena aplikasi ini adalah Vanilla JS tanpa build tools, strategi testing menggunakan pendekatan pragmatis yang dapat dijalankan langsung di browser atau dengan runner minimal.

### Unit Tests (Example-Based)

Fokus pada fungsi-fungsi murni (pure functions) yang dapat diisolasi:

- **`calculateBalance(transactions)`** — verifikasi dengan contoh konkret: array kosong → 0, satu item → amount-nya, beberapa item → sum-nya.
- **`calculateCategoryTotals(transactions)`** — verifikasi distribusi per kategori dengan contoh campuran.
- **`formatCurrency(amount)`** — verifikasi format output untuk nilai 0, 999, 1000, 1000000.
- **`validateForm(data)`** — verifikasi semua kombinasi input invalid (field kosong, amount negatif, amount nol, amount non-numerik).
- **`renderTransactionItem(transaction)`** — verifikasi HTML output mengandung name, amount, category.

### Property-Based Tests

Menggunakan library **[fast-check](https://fast-check.dev/)** via CDN untuk property-based testing di browser, atau dijalankan via Node.js dengan `fast-check` npm package.

Setiap property test dikonfigurasi dengan minimum **100 iterasi**.

Setiap test diberi tag komentar dengan format:
`// Feature: expense-budget-visualizer, Property {N}: {property_text}`

**Property 1 — Form validation menolak input tidak valid**
```
// Feature: expense-budget-visualizer, Property 1: Form validation menolak input tidak valid
// Generator: kombinasi acak dari {name: "", amount: 0/-N/NaN, category: ""}
// Assertion: validateForm(input).valid === false DAN errors tidak kosong
// Iterations: 100
```

**Property 2 — Submission valid menambah transaction dan mereset form**
```
// Feature: expense-budget-visualizer, Property 2: Submission valid menambah transaction dan mereset form
// Generator: {name: non-empty string, amount: positive number, category: random dari [Food,Transport,Fun]}
// Assertion: setelah addTransaction(data), transactions.length bertambah 1 DAN form fields kosong
// Iterations: 100
```

**Property 3 — Transaction list merender semua field**
```
// Feature: expense-budget-visualizer, Property 3: Transaction list merender semua field setiap transaction
// Generator: array acak dari Transaction objects
// Assertion: setiap rendered item mengandung name, amount string, dan category dari transaction-nya
// Iterations: 100
```

**Property 4 — Hapus transaction menghilangkannya dari list dan storage**
```
// Feature: expense-budget-visualizer, Property 4: Hapus transaction menghilangkannya dari list dan storage
// Generator: array acak Transaction (min 1 item), pilih random index untuk dihapus
// Assertion: setelah deleteTransaction(id), id tersebut tidak ada di transactions array DAN tidak ada di localStorage
// Iterations: 100
```

**Property 5 — Storage round-trip**
```
// Feature: expense-budget-visualizer, Property 5: Storage round-trip mempertahankan data transaction
// Generator: array acak Transaction objects
// Assertion: JSON.parse(localStorage.getItem("expenses")) deep-equals transactions array
// Iterations: 100
```

**Property 6 — Balance sama dengan sum amounts**
```
// Feature: expense-budget-visualizer, Property 6: Balance sama dengan jumlah semua amount transaction
// Generator: array acak Transaction dengan amount positif
// Assertion: calculateBalance(transactions) === transactions.reduce((sum, t) => sum + t.amount, 0)
// Iterations: 100
```

**Property 7 — Format balance menyertakan pemisah ribuan**
```
// Feature: expense-budget-visualizer, Property 7: Format balance menyertakan pemisah ribuan
// Generator: angka acak >= 1000
// Assertion: formatCurrency(n) mengandung karakter pemisah ribuan
// Iterations: 100
```

**Property 8 — Data chart mencerminkan total per kategori**
```
// Feature: expense-budget-visualizer, Property 8: Data chart mencerminkan total per kategori
// Generator: array acak Transaction dengan kategori acak dari [Food, Transport, Fun]
// Assertion: calculateCategoryTotals(transactions).Food === sum amounts dengan category "Food", dst.
// Iterations: 100
```

### Integration / Smoke Tests (Manual)

Dijalankan secara manual di browser:

- Buka `index.html` langsung dari filesystem → app load tanpa error console
- Chart.js termuat dari CDN → canvas terrender
- Tambah transaction → muncul di list, balance update, chart update
- Refresh browser → data masih ada (localStorage persisten)
- Hapus transaction → hilang dari list, balance update, chart update
- Test di Chrome, Firefox, Edge, Safari versi terkini
- Test di viewport 320px (mobile) dan 1920px (desktop)

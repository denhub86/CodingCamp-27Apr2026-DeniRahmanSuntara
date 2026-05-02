# Implementation Plan: Expense & Budget Visualizer

## Overview

Implementasi aplikasi web standalone tiga file (`index.html`, `css/style.css`, `js/app.js`) menggunakan Vanilla JavaScript tanpa framework. Urutan pengerjaan diprioritaskan sesuai permintaan user: CSS mobile-friendly terlebih dahulu, kemudian struktur HTML semantik, lalu logika JavaScript secara bertahap dari modul terkecil hingga integrasi penuh.

## Tasks

- [ ] 1. Buat CSS mobile-friendly di `css/style.css`
  - Buat file `css/style.css` dengan CSS reset dan base styles
  - Definisikan CSS custom properties (variabel) untuk warna, spacing, dan typography
  - Styling layout utama: single-column vertikal, max-width container, padding responsif
  - Styling section Balance: tampilan angka besar, warna menonjol, mudah dibaca
  - Styling section Chart: container responsif dengan aspect-ratio yang proporsional di mobile
  - Styling Input_Form: field teks dan angka full-width, label jelas, spacing antar field
  - Styling tombol simpan: min-height 44px, min-width 44px (touch target), warna kontras, border-radius
  - Styling select/dropdown kategori: min-height 44px, tampilan konsisten antar browser
  - Styling pesan error: warna merah/oranye, font kecil, muncul di bawah field
  - Styling Transaction_List: card per item, nama/jumlah/kategori terbaca jelas
  - Styling tombol hapus per item: min 44px tap target, ikon atau teks "Hapus"
  - Styling badge/label kategori: warna berbeda untuk Food, Transport, Fun
  - Media query untuk layar ≥ 600px: opsional dua kolom (chart + form berdampingan)
  - Styling banner peringatan localStorage tidak tersedia
  - Styling notifikasi "Penyimpanan penuh"
  - Styling pesan fallback chart (Chart.js gagal load)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 2. Buat struktur HTML semantik di `index.html`
  - Buat file `index.html` dengan doctype, meta charset, meta viewport (width=device-width)
  - Tambahkan tag `<title>` dan meta description
  - Buat `<header>` dengan judul aplikasi
  - Buat `<section id="balance-section">` dengan elemen `<p>` atau `<span>` untuk menampilkan nilai Balance
  - Buat `<section id="chart-section">` dengan `<div>` wrapper dan `<canvas id="expense-chart">`
  - Tambahkan `<div id="chart-fallback">` di dalam chart section untuk pesan fallback
  - Buat `<section id="form-section">` dengan `<form id="expense-form">`
    - `<input type="text" id="item-name">` dengan label dan `<span class="error-message">` untuk error
    - `<input type="number" id="item-amount">` dengan label dan `<span class="error-message">` untuk error
    - `<select id="item-category">` dengan opsi Food, Transport, Fun dan `<span class="error-message">` untuk error
    - `<button type="submit">` tombol simpan
  - Buat `<section id="list-section">` dengan `<ul id="transaction-list">` kosong
  - Tambahkan `<div id="storage-warning" hidden>` untuk banner peringatan localStorage
  - Load Chart.js via CDN `<script>` sebelum `</body>`
  - Load `<script src="js/app.js">` setelah Chart.js
  - Link `<link rel="stylesheet" href="css/style.css">` di `<head>`
  - _Requirements: 6.2, 6.3, 6.4, 7.3_

- [x] 3. Implementasi Storage Module di `js/app.js`
  - Buat file `js/app.js` dengan IIFE atau module pattern
  - Implementasi deteksi ketersediaan localStorage (`try/catch`)
  - Implementasi `StorageModule.load()`: baca key `"expenses"`, parse JSON, return array (kosong jika null/error), log error ke console jika JSON corrupt
  - Implementasi `StorageModule.save(transactions)`: serialisasi ke JSON, simpan ke localStorage, tangani QuotaExceededError
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 7.1, 7.2_

  - [ ]* 3.1 Tulis property test untuk Storage round-trip (Property 5)
    - **Property 5: Storage round-trip mempertahankan data transaction**
    - **Validates: Requirements 2.1, 2.2, 2.4**
    - Generator: array acak Transaction objects
    - Assertion: `JSON.parse(localStorage.getItem("expenses"))` deep-equals transactions array

- [-] 4. Implementasi fungsi-fungsi kalkulasi murni di `js/app.js`
  - Implementasi `calculateBalance(transactions)`: sum semua `amount`, return 0 untuk array kosong
  - Implementasi `calculateCategoryTotals(transactions)`: return `{Food, Transport, Fun}` dengan sum per kategori
  - Implementasi `formatCurrency(amount)`: format angka dengan pemisah ribuan (gunakan `toLocaleString` atau manual)
  - Implementasi `generateId()`: gunakan `crypto.randomUUID()` dengan fallback ke `Date.now() + Math.random()`
  - _Requirements: 3.3, 3.4, 4.2_

  - [ ]* 4.1 Tulis property test untuk Balance (Property 6)
    - **Property 6: Balance sama dengan jumlah semua amount transaction**
    - **Validates: Requirements 3.2, 3.3**
    - Generator: array acak Transaction dengan amount positif
    - Assertion: `calculateBalance(transactions) === transactions.reduce((sum, t) => sum + t.amount, 0)`

  - [ ]* 4.2 Tulis property test untuk format currency (Property 7)
    - **Property 7: Format balance menyertakan pemisah ribuan**
    - **Validates: Requirements 3.4**
    - Generator: angka acak >= 1000
    - Assertion: `formatCurrency(n)` mengandung karakter pemisah ribuan

  - [ ]* 4.3 Tulis property test untuk category totals (Property 8)
    - **Property 8: Data chart mencerminkan total per kategori**
    - **Validates: Requirements 4.2, 4.3**
    - Generator: array acak Transaction dengan kategori acak dari [Food, Transport, Fun]
    - Assertion: `calculateCategoryTotals(transactions).Food === sum amounts dengan category "Food"`, dst.

- [ ] 5. Implementasi validasi form di `js/app.js`
  - Implementasi `validateForm(data)`: return `ValidationResult` `{valid, errors}`
  - Validasi field `name`: tidak boleh kosong atau hanya whitespace → error "Nama item tidak boleh kosong."
  - Validasi field `amount`: harus angka, harus > 0, tidak boleh NaN/Infinity → error "Jumlah harus berupa angka lebih dari 0."
  - Validasi field `category`: harus salah satu dari Food/Transport/Fun → error "Pilih kategori pengeluaran."
  - _Requirements: 1.6, 1.7_

  - [ ]* 5.1 Tulis property test untuk validasi form (Property 1)
    - **Property 1: Form validation menolak input tidak valid**
    - **Validates: Requirements 1.6, 1.7**
    - Generator: kombinasi acak dari `{name: "", amount: 0/-N/NaN, category: ""}`
    - Assertion: `validateForm(input).valid === false` DAN `errors` tidak kosong

- [ ] 6. Implementasi UI Renderer di `js/app.js`
  - Implementasi `UIRenderer.renderBalance(amount)`: update teks elemen balance dengan `formatCurrency(amount)`
  - Implementasi `UIRenderer.renderTransactionList(items)`: rebuild `<ul>` — sort by timestamp descending, render setiap item sebagai `<li>` dengan nama, jumlah (formatted), badge kategori, dan tombol hapus
  - Implementasi `UIRenderer.clearForm()`: reset semua field form ke nilai default
  - Implementasi `UIRenderer.showError(field, message)`: tampilkan teks di `<span class="error-message">` yang sesuai
  - Implementasi `UIRenderer.clearErrors()`: kosongkan semua `<span class="error-message">`
  - Implementasi tampilan pesan fallback chart jika Chart.js tidak tersedia
  - Implementasi tampilan banner peringatan localStorage tidak tersedia
  - Implementasi notifikasi "Penyimpanan penuh"
  - _Requirements: 3.1, 3.2, 3.4, 4.5, 5.1, 5.2, 5.3_

  - [ ]* 6.1 Tulis property test untuk rendering transaction list (Property 3)
    - **Property 3: Transaction list merender semua field setiap transaction**
    - **Validates: Requirements 5.1, 5.2**
    - Generator: array acak Transaction objects
    - Assertion: setiap rendered item mengandung `name`, `amount` string, dan `category` dari transaction-nya; item pertama memiliki timestamp tertinggi

- [ ] 7. Checkpoint — Pastikan semua tests lulus
  - Pastikan semua tests lulus, tanyakan ke user jika ada pertanyaan.

- [ ] 8. Implementasi Chart Manager di `js/app.js`
  - Implementasi `ChartManager.init(canvasId)`: buat instance `new Chart(...)` dengan tipe `doughnut`, konfigurasi warna per kategori (Food, Transport, Fun), dan opsi responsif
  - Implementasi `ChartManager.update(categoryTotals)`: update `chart.data.datasets[0].data` dan panggil `chart.update()`
  - Tangani kondisi Chart.js tidak tersedia: cek `typeof Chart !== 'undefined'` sebelum init
  - Tangani kondisi semua kategori nol: tampilkan state kosong yang informatif
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [ ]* 8.1 Tulis unit test untuk ChartManager.update
    - Verifikasi bahwa data yang dikirim ke chart sesuai dengan `calculateCategoryTotals`
    - _Requirements: 4.2, 4.3_

- [ ] 9. Implementasi State Manager di `js/app.js`
  - Implementasi `StateManager.init()`: load dari StorageModule, inisialisasi array in-memory, panggil render awal (balance, list, chart)
  - Implementasi `StateManager.addTransaction(data)`: buat Transaction baru dengan `generateId()` dan `Date.now()`, tambahkan ke array, panggil `StorageModule.save()`, panggil render ulang
  - Implementasi `StateManager.deleteTransaction(id)`: filter array, panggil `StorageModule.save()`, panggil render ulang
  - Implementasi `StateManager.getTransactions()`: return array in-memory
  - Implementasi `StateManager.getTotalBalance()`: delegasikan ke `calculateBalance()`
  - Implementasi `StateManager.getCategoryTotals()`: delegasikan ke `calculateCategoryTotals()`
  - _Requirements: 1.4, 2.1, 2.3, 3.2, 4.3, 5.3, 5.5_

- [ ] 10. Implementasi Form Event Handler dan wiring di `js/app.js`
  - Implementasi `FormHandler.init()`: attach event listener `submit` ke `<form id="expense-form">`
  - Di handler submit: panggil `UIRenderer.clearErrors()`, ekstrak nilai input, panggil `validateForm()`, jika tidak valid panggil `UIRenderer.showError()` per field, jika valid panggil `StateManager.addTransaction()` lalu `UIRenderer.clearForm()`
  - Attach event listener `input` ke setiap field form untuk menghapus error saat pengguna mulai mengetik
  - Implementasi event delegation untuk tombol hapus di `<ul id="transaction-list">`: tangkap klik pada tombol hapus, ekstrak `data-id`, panggil `StateManager.deleteTransaction(id)`
  - Panggil `StateManager.init()` saat DOM ready (`DOMContentLoaded`)
  - Panggil `ChartManager.init("expense-chart")` saat DOM ready
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 5.4, 5.5_

  - [ ]* 10.1 Tulis property test untuk submission valid (Property 2)
    - **Property 2: Submission valid menambah transaction dan mereset form**
    - **Validates: Requirements 1.4, 1.5**
    - Generator: `{name: non-empty string, amount: positive number, category: random dari [Food, Transport, Fun]}`
    - Assertion: setelah `addTransaction(data)`, `transactions.length` bertambah 1 DAN form fields kosong

  - [ ]* 10.2 Tulis property test untuk hapus transaction (Property 4)
    - **Property 4: Hapus transaction menghilangkannya dari list dan storage**
    - **Validates: Requirements 5.5, 2.3**
    - Generator: array acak Transaction (min 1 item), pilih random index untuk dihapus
    - Assertion: setelah `deleteTransaction(id)`, id tersebut tidak ada di transactions array DAN tidak ada di localStorage

- [ ] 11. Final checkpoint — Pastikan semua tests lulus
  - Pastikan semua tests lulus, tanyakan ke user jika ada pertanyaan.

## Notes

- Tasks bertanda `*` bersifat opsional dan dapat dilewati untuk MVP yang lebih cepat
- Setiap task mereferensikan requirements spesifik untuk keterlacakan
- Urutan task dirancang inkremental: CSS → HTML → JS modul kecil → integrasi penuh
- Property tests menggunakan library **fast-check** via CDN atau npm
- Setiap property test diberi tag komentar: `// Feature: expense-budget-visualizer, Property {N}: {teks}`
- Minimum 100 iterasi per property test
- Tombol dan field form wajib memiliki tap target minimal 44×44px (touch-friendly)

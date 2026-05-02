# Requirements Document

## Introduction

Expense & Budget Visualizer adalah aplikasi web standalone yang memungkinkan pengguna mencatat pengeluaran harian, mengkategorikannya, dan memvisualisasikan distribusi pengeluaran melalui grafik interaktif. Aplikasi berjalan sepenuhnya di browser tanpa backend server, menyimpan data di Local Storage, dan dapat digunakan sebagai halaman web biasa maupun browser extension. Antarmuka dirancang bersih, minimal, dan mobile-friendly.

## Glossary

- **App**: Aplikasi Expense & Budget Visualizer secara keseluruhan
- **Transaction**: Satu catatan pengeluaran yang terdiri dari nama item, jumlah uang, dan kategori
- **Category**: Klasifikasi pengeluaran; salah satu dari: Food, Transport, Fun
- **Balance**: Total saldo yang dihitung dari selisih antara total pemasukan dan total pengeluaran yang tercatat
- **Chart**: Visualisasi grafis distribusi pengeluaran per kategori menggunakan Chart.js
- **Local_Storage**: Mekanisme penyimpanan data di browser yang digunakan App untuk menyimpan semua Transaction secara persisten
- **Transaction_List**: Daftar tampilan seluruh Transaction yang telah dicatat
- **Input_Form**: Formulir antarmuka yang digunakan pengguna untuk memasukkan data Transaction baru
- **Chart_Canvas**: Elemen HTML canvas tempat Chart dirender

## Requirements

### Requirement 1: Pencatatan Transaksi

**User Story:** Sebagai pengguna, saya ingin mencatat pengeluaran dengan nama item, jumlah, dan kategori, sehingga saya dapat melacak ke mana uang saya pergi.

#### Acceptance Criteria

1. THE Input_Form SHALL menyediakan field teks untuk nama item pengeluaran.
2. THE Input_Form SHALL menyediakan field angka untuk jumlah pengeluaran dalam satuan mata uang.
3. THE Input_Form SHALL menyediakan pilihan kategori dengan opsi: Food, Transport, dan Fun.
4. WHEN pengguna mengisi semua field dan menekan tombol simpan, THE App SHALL menambahkan Transaction baru ke Transaction_List.
5. WHEN pengguna menekan tombol simpan, THE Input_Form SHALL mengosongkan semua field setelah Transaction berhasil disimpan.
6. IF pengguna menekan tombol simpan dengan satu atau lebih field kosong, THEN THE Input_Form SHALL menampilkan pesan kesalahan yang menjelaskan field mana yang belum diisi.
7. IF pengguna memasukkan nilai jumlah yang bukan angka positif, THEN THE Input_Form SHALL menampilkan pesan kesalahan dan menolak penyimpanan Transaction.

---

### Requirement 2: Penyimpanan Data Persisten

**User Story:** Sebagai pengguna, saya ingin data pengeluaran saya tersimpan secara otomatis, sehingga data tidak hilang ketika saya menutup atau me-refresh browser.

#### Acceptance Criteria

1. WHEN sebuah Transaction baru ditambahkan, THE App SHALL menyimpan seluruh daftar Transaction ke Local_Storage secara otomatis.
2. WHEN App dimuat di browser, THE App SHALL membaca dan memuat semua Transaction yang tersimpan dari Local_Storage.
3. WHEN sebuah Transaction dihapus, THE App SHALL memperbarui data di Local_Storage untuk mencerminkan penghapusan tersebut.
4. THE App SHALL menyimpan data Transaction dalam format JSON di Local_Storage.

---

### Requirement 3: Tampilan Saldo (Balance)

**User Story:** Sebagai pengguna, saya ingin melihat total saldo saya di bagian atas halaman, sehingga saya dapat langsung mengetahui kondisi keuangan saya.

#### Acceptance Criteria

1. THE App SHALL menampilkan nilai Balance di bagian paling atas antarmuka.
2. WHEN sebuah Transaction ditambahkan atau dihapus, THE App SHALL memperbarui tampilan Balance secara langsung tanpa perlu me-refresh halaman.
3. THE App SHALL menghitung Balance sebagai total seluruh nilai jumlah Transaction yang tercatat.
4. THE App SHALL menampilkan Balance dengan format angka yang mudah dibaca, termasuk pemisah ribuan.

---

### Requirement 4: Visualisasi Grafik Pengeluaran

**User Story:** Sebagai pengguna, saya ingin melihat grafik distribusi pengeluaran per kategori, sehingga saya dapat memahami pola pengeluaran saya secara visual.

#### Acceptance Criteria

1. THE App SHALL merender Chart pada Chart_Canvas menggunakan library Chart.js.
2. THE Chart SHALL menampilkan distribusi pengeluaran berdasarkan tiga kategori: Food, Transport, dan Fun.
3. WHEN sebuah Transaction ditambahkan atau dihapus, THE Chart SHALL diperbarui secara otomatis untuk mencerminkan data terkini.
4. THE Chart SHALL menggunakan warna berbeda untuk setiap kategori agar mudah dibedakan secara visual.
5. WHEN tidak ada Transaction yang tercatat, THE Chart SHALL menampilkan kondisi kosong atau pesan yang menginformasikan belum ada data.

---

### Requirement 5: Daftar Transaksi

**User Story:** Sebagai pengguna, saya ingin melihat daftar semua transaksi yang telah saya catat, sehingga saya dapat meninjau riwayat pengeluaran saya.

#### Acceptance Criteria

1. THE Transaction_List SHALL menampilkan semua Transaction yang tersimpan, masing-masing dengan nama item, jumlah, dan kategori.
2. THE Transaction_List SHALL menampilkan Transaction terbaru di urutan paling atas.
3. WHEN sebuah Transaction baru ditambahkan, THE Transaction_List SHALL memperbarui tampilan secara langsung tanpa perlu me-refresh halaman.
4. THE Transaction_List SHALL menyediakan tombol hapus pada setiap item Transaction.
5. WHEN pengguna menekan tombol hapus pada sebuah Transaction, THE App SHALL menghapus Transaction tersebut dari Transaction_List dan Local_Storage.

---

### Requirement 6: Antarmuka Responsif dan Mobile-Friendly

**User Story:** Sebagai pengguna, saya ingin menggunakan aplikasi di perangkat apa pun, sehingga saya dapat mencatat pengeluaran kapan saja dan di mana saja.

#### Acceptance Criteria

1. THE App SHALL merender antarmuka yang dapat digunakan dengan baik pada lebar layar mulai dari 320px hingga 1920px.
2. THE App SHALL menggunakan struktur HTML yang semantik dan mobile-friendly di file index.html.
3. THE App SHALL menggunakan CSS di file css/style.css untuk seluruh styling tanpa inline style yang bersifat presentasional.
4. THE App SHALL menampilkan hierarki visual yang jelas dengan Balance di bagian atas, diikuti Chart, Input_Form, dan Transaction_List.
5. WHERE perangkat memiliki layar kecil (lebar di bawah 600px), THE App SHALL menyesuaikan tata letak menjadi satu kolom vertikal.

---

### Requirement 7: Kompatibilitas Browser dan Performa

**User Story:** Sebagai pengguna, saya ingin aplikasi berjalan cepat dan lancar di browser modern yang saya gunakan, sehingga pengalaman penggunaan terasa nyaman.

#### Acceptance Criteria

1. THE App SHALL berjalan tanpa error pada browser modern: Chrome, Firefox, Edge, dan Safari versi terkini.
2. THE App SHALL diimplementasikan menggunakan Vanilla JavaScript tanpa framework di file js/app.js.
3. THE App SHALL dapat dijalankan sebagai file HTML standalone (dibuka langsung dari sistem file) maupun sebagai browser extension.
4. WHEN App dimuat untuk pertama kali, THE App SHALL menampilkan antarmuka yang siap digunakan dalam waktu di bawah 2 detik pada koneksi broadband standar.
5. THE App SHALL memuat Chart.js melalui CDN sehingga tidak memerlukan proses build atau instalasi dependensi.

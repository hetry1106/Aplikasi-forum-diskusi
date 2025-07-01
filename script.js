import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Inisialisasi Supabase client
const supabase = createClient(
  "https://feriqnmbfzixgeedmvzw.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcmlxbm1iZnppeGdlZWRtdnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODY3NTAsImV4cCI6MjA2NjI2Mjc1MH0.POc4TH7fATyb1lsWmMPmUZUww4vaH_5qgGCsD3MsW-E"
);

// Mendapatkan elemen DOM
const halamanAuth = document.getElementById("halaman-auth");
const halamanChat = document.getElementById("halaman-chat");
const namaPenggunaDropdown = document.getElementById("nama-pengguna-dropdown");
const formLogin = document.getElementById("form-login");
const formDaftar = document.getElementById("form-daftar");
const daftarPengguna = document.getElementById("daftar-pengguna"); // Daftar pengguna di sidebar chat
const kotakPesan = document.getElementById("kotak-pesan");
const inputPesan = document.getElementById("input-pesan");
const btnKirim = document.querySelector(".btn-send-wrapper");
const btnKeluar = document.getElementById("btn-keluar"); // Tombol logout desktop
const btnKeluarMobile = document.getElementById("btn-keluar-mobile"); // Tombol logout mobile
const btnLogin = document.getElementById("btn-login");
const btnDaftar = document.getElementById("btn-daftar");
const sidebarChat = document.getElementById("sidebar-chat");
const mainChatArea = document.getElementById("main-chat-area");
const emptyChatPlaceholder = document.getElementById("empty-chat-placeholder");
const chatContentContainer = document.getElementById("chat-content-container");
const chatPartnerName = document.getElementById("chat-partner-name");
const chatPartnerAvatar = document.querySelector(".chat-partner-avatar"); // Menambahkan ini untuk avatar penerima

// Elemen untuk fungsionalitas responsif
const btnToggleChatlist = document.getElementById("btn-toggle-chatlist"); // Tombol hamburger (daftar chat)
const btnBackToChatlist = document.getElementById("btn-back-to-chatlist"); // Tombol panah kembali di header chat

let penggunaSekarang = null;
let penerimaID = null;
let penerimaNama = "";

// Cek status login saat halaman dimuat
document.addEventListener("DOMContentLoaded", async () => {
  const storedUserId = localStorage.getItem("userId");
  if (storedUserId) {
    await loginWithStoredUser(storedUserId);
  } else {
    // Jika tidak ada pengguna yang login, pastikan halaman autentikasi ditampilkan
    halamanAuth.classList.remove("d-none");
    halamanAuth.classList.add("d-flex");
    halamanChat.classList.add("d-none");
    halamanChat.classList.remove("d-flex");
  }

  // Atur tampilan sidebar awal berdasarkan ukuran layar
  handleResponsiveLayout();
});

async function loginWithStoredUser(userId) {
  const { data, error } = await supabase
    .from("pengguna")
    .select("*")
    .eq("id", userId)
    .single();

  if (data) {
    penggunaSekarang = data;
    localStorage.setItem("userId", data.id);
    halamanAuth.classList.add("d-none");
    halamanChat.classList.remove("d-none");
    halamanChat.classList.add("d-flex"); // Penting untuk flexbox
    namaPenggunaDropdown.textContent = data.nama;
    await muatPengguna(); // Muat pengguna lain setelah login
    handleResponsiveLayout(); // Sesuaikan tampilan setelah login
  } else {
    console.error("Gagal login dengan stored user:", error?.message);
    localStorage.removeItem("userId"); // Hapus ID yang invalid
    halamanAuth.classList.remove("d-none");
    halamanAuth.classList.add("d-flex");
    halamanChat.classList.add("d-none");
    halamanChat.classList.remove("d-flex");
  }
}

// --- Autentikasi ---
formDaftar.addEventListener("submit", async (e) => {
  e.preventDefault();
  btnDaftar.disabled = true;
  btnDaftar.innerText = "Memproses...";
  const nama = document.getElementById("nama-daftar").value;
  const email = document.getElementById("email-daftar").value;
  const password = document.getElementById("password-daftar").value; // Perhatian: Menyimpan password plaintext tidak aman. Gunakan hashing.
  const { data, error } = await supabase
    .from("pengguna")
    .insert([{ nama, email, password }])
    .select()
    .single();
  btnDaftar.disabled = false;
  btnDaftar.innerText = "Daftar";
  if (!error) {
    penggunaSekarang = data;
    localStorage.setItem("userId", data.id);
    halamanAuth.classList.add("d-none");
    halamanChat.classList.remove("d-none");
    halamanChat.classList.add("d-flex");
    namaPenggunaDropdown.textContent = data.nama;
    await muatPengguna(); // Muat pengguna lain setelah daftar
    handleResponsiveLayout();
  } else {
    alert("Daftar gagal: " + error.message);
  }
});

formLogin.addEventListener("submit", async (e) => {
  e.preventDefault();
  btnLogin.disabled = true;
  btnLogin.innerText = "Memproses...";
  const email = document.getElementById("email-login").value;
  const password = document.getElementById("password-login").value; // Perhatian: Jangan kirim password plaintext di produksi.
  const { data, error } = await supabase
    .from("pengguna")
    .select("*")
    .eq("email", email)
    .eq("password", password)
    .single(); // Ini tidak aman untuk produksi, butuh autentikasi server-side
  btnLogin.disabled = false;
  btnLogin.innerText = "Masuk";
  if (data) {
    penggunaSekarang = data;
    localStorage.setItem("userId", data.id);
    halamanAuth.classList.add("d-none");
    halamanChat.classList.remove("d-none");
    halamanChat.classList.add("d-flex");
    namaPenggunaDropdown.textContent = data.nama;
    await muatPengguna(); // Muat pengguna lain setelah login
    handleResponsiveLayout();
  } else {
    alert("Login gagal: " + (error?.message || "Email atau password salah"));
  }
});

// --- Fungsi Utama Chat ---

async function muatPengguna() {
  if (!penggunaSekarang) return;

  try {
    const { data: penggunaData, error } = await supabase
      .from("pengguna")
      .select("id, nama")
      .neq("id", penggunaSekarang.id);

    if (error) {
      console.error("Error fetching users:", error.message);
      return;
    }

    daftarPengguna.innerHTML = "";
    for (const p of penggunaData) {
      const li = document.createElement("li");
      li.className = "list-group-item";
      if (penerimaID === p.id) {
        li.classList.add("active");
      }
      li.dataset.userId = p.id;

      li.innerHTML = `
        <div class="avatar"><i class="bi bi-person-fill"></i></div>
        <div class="chat-info">
          <div class="name">${p.nama}</div>
          <div class="last-message" id="last-message-${p.id}"></div>
        </div>
        <div class="chat-meta">
          <div class="time" id="chat-time-${p.id}"></div>
          <div class="unread-badge d-none" id="unread-badge-${p.id}">0</div>
        </div>
      `;
      li.addEventListener("click", () => pilihPenerima(p.id, p.nama, li));
      daftarPengguna.appendChild(li);

      await updateChatPreview(p.id); // Update preview untuk setiap pengguna
    }
  } catch (err) {
    console.error("Kesalahan saat memuat pengguna:", err);
  }
}

async function updateChatPreview(contactId) {
  if (!penggunaSekarang) return;

  const { data: messages, error } = await supabase
    .from("pesan")
    .select("konten, dibuat_pada, pengirim_id")
    .or(
      `and(pengirim_id.eq.${penggunaSekarang.id},penerima_id.eq.${contactId}),and(pengirim_id.eq.${contactId},penerima_id.eq.${penggunaSekarang.id})`
    )
    .order("dibuat_pada", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching chat preview:", error.message);
    return;
  }

  const lastMessageElem = document.getElementById(`last-message-${contactId}`);
  const chatTimeElem = document.getElementById(`chat-time-${contactId}`);

  if (messages && messages.length > 0) {
    const lastMessage = messages[0];
    const isSender = lastMessage.pengirim_id === penggunaSekarang.id;
    const prefix = isSender ? "Anda: " : "";
    lastMessageElem.textContent = prefix + lastMessage.konten;

    const messageDate = new Date(lastMessage.dibuat_pada);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      chatTimeElem.textContent = messageDate.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      chatTimeElem.textContent = "Kemarin";
    } else {
      chatTimeElem.textContent = messageDate.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
  } else {
    lastMessageElem.textContent = "Belum ada chat.";
    chatTimeElem.textContent = "";
  }
}

function pilihPenerima(id, nama, liElement) {
  penerimaID = id;
  penerimaNama = nama;

  // Hapus 'active' dari semua item dan tambahkan ke item yang dipilih
  document
    .querySelectorAll("#daftar-pengguna li")
    .forEach((li) => li.classList.remove("active"));
  liElement.classList.add("active");

  // Tampilkan area chat
  emptyChatPlaceholder.classList.add("d-none");
  chatContentContainer.classList.remove("d-none");
  chatContentContainer.classList.add("d-flex"); // Pastikan ini ada

  chatPartnerName.textContent = penerimaNama;
  // Atur avatar penerima (misal selalu icon orang jika tidak ada gambar)
  chatPartnerAvatar.innerHTML = `<i class="bi bi-person-fill"></i>`;

  muatPesan(); // Muat pesan awal saat memilih penerima

  // Sembunyikan sidebar chat saat di mobile setelah memilih chat
  if (window.innerWidth <= 768) {
    sidebarChat.classList.remove("show");
  }
}

async function muatPesan() {
  if (!penggunaSekarang || !penerimaID) {
    kotakPesan.innerHTML =
      "<p class='text-center text-muted mt-5'>Pilih kontak untuk mulai chat.</p>";
    return;
  }

  const { data, error } = await supabase
    .from("pesan")
    .select("*")
    .or(
      `and(pengirim_id.eq.${penggunaSekarang.id},penerima_id.eq.${penerimaID}),and(pengirim_id.eq.${penerimaID},penerima_id.eq.${penggunaSekarang.id})`
    )
    .order("dibuat_pada", { ascending: true });

  if (error) {
    console.error("Error loading messages:", error.message);
    kotakPesan.innerHTML =
      "<p class='text-center text-danger mt-5'>Gagal memuat pesan.</p>";
    return;
  }

  kotakPesan.innerHTML = "";
  if (data && data.length > 0) {
    data.forEach((p) => {
      tampilkanPesan(p);
    });
  } else {
    kotakPesan.innerHTML =
      "<p class='text-center text-muted mt-5'>Belum ada pesan dalam obrolan ini.</p>";
  }

  kotakPesan.scrollTop = kotakPesan.scrollHeight;
}

function tampilkanPesan(pesan) {
  const div = document.createElement("div");
  const messageDate = new Date(pesan.dibuat_pada);
  const timeString = messageDate.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  div.className =
    "pesan " +
    (pesan.pengirim_id === penggunaSekarang.id ? "dikirim" : "diterima");
  div.innerHTML = `${pesan.konten}<span class="pesan-timestamp">${timeString}</span>`;
  kotakPesan.appendChild(div);
  kotakPesan.scrollTop = kotakPesan.scrollHeight;
}

btnKirim.addEventListener("click", kirimPesan);
inputPesan.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    kirimPesan();
  }
});

async function kirimPesan() {
  const konten = inputPesan.value.trim();
  if (!konten || !penerimaID || !penggunaSekarang) return; // Pastikan penggunaSekarang ada

  btnKirim.style.pointerEvents = "none"; // Disable button while sending

  const { data, error } = await supabase
    .from("pesan")
    .insert({
      pengirim_id: penggunaSekarang.id,
      penerima_id: penerimaID,
      konten: konten,
    })
    .select()
    .single();

  btnKirim.style.pointerEvents = "auto"; // Enable button after sending

  if (!error) {
    inputPesan.value = "";
  } else {
    console.error("Gagal mengirim pesan:", error.message);
  }
}

// --- Logout ---
btnKeluar.addEventListener("click", () => {
  localStorage.removeItem("userId");
  location.reload(); // Reload halaman untuk kembali ke halaman auth
});

if (btnKeluarMobile) {
  btnKeluarMobile.addEventListener("click", () => {
    localStorage.removeItem("userId");
    location.reload(); // Reload halaman untuk kembali ke halaman auth
  });
}

// --- Realtime Supabase ---
supabase
  .channel("pesan-realtime")
  .on(
    "postgres_changes",
    {
      event: "INSERT",
      schema: "public",
      table: "pesan",
    },
    (payload) => {
      const p = payload.new;
      // Periksa apakah pesan masuk ditujukan ke pengguna sekarang (kita sebagai penerima)
      // atau pesan keluar dari pengguna sekarang (kita sebagai pengirim) ke penerima aktif
      if (
        (p.penerima_id === penggunaSekarang.id && p.pengirim_id === penerimaID) || // Pesan diterima dari kontak aktif
        (p.pengirim_id === penggunaSekarang.id && p.penerima_id === penerimaID)   // Pesan dikirim ke kontak aktif
      ) {
        tampilkanPesan(p); // Tampilkan pesan di kotak pesan utama
      }
      // Selalu update preview untuk chat yang terkait dengan pesan baru,
      // baik itu pesan yang baru diterima atau pesan yang baru dikirim oleh kita.
      updateChatPreview(
        p.pengirim_id === penggunaSekarang.id
          ? p.penerima_id
          : p.pengirim_id
      );
    }
  )
  .subscribe();

// --- Logika Responsif ---

// Event listener untuk tombol hamburger (muncul di chatlist-header di mobile)
if (btnToggleChatlist) {
  btnToggleChatlist.addEventListener("click", function () {
    sidebarChat.classList.toggle("show");
  });
}

// Event listener untuk tombol kembali (muncul di chat-header-main di mobile)
if (btnBackToChatlist) {
  btnBackToChatlist.addEventListener("click", function () {
    sidebarChat.classList.add("show"); // Tampilkan sidebar
    // Sembunyikan area chat utama dan tampilkan placeholder
    chatContentContainer.classList.add("d-none");
    emptyChatPlaceholder.classList.remove("d-none");

    // Opsional: hapus status 'active' dari item yang dipilih sebelumnya
    document.querySelectorAll("#daftar-pengguna li").forEach(li => li.classList.remove("active"));
    penerimaID = null; // Reset penerimaID agar tidak ada chat yang aktif
    penerimaNama = ""; // Reset penerimaNama
  });
}

// Fungsi untuk menangani tampilan layout berdasarkan ukuran layar
function handleResponsiveLayout() {
  if (window.innerWidth > 768) {
    // Desktop view
    sidebarChat.classList.remove("show"); // Pastikan sidebar tidak di-toggle (selalu terlihat)
    mainChatArea.classList.remove("d-none"); // Pastikan area chat terlihat
    mainChatArea.classList.add("d-flex");

    if (!penerimaID) {
      emptyChatPlaceholder.classList.remove("d-none");
      chatContentContainer.classList.add("d-none");
    } else {
      emptyChatPlaceholder.classList.add("d-none");
      chatContentContainer.classList.remove("d-none");
    }
  } else {
    // Mobile view
    // Jika belum ada chat yang aktif, tampilkan sidebar secara default
    // Atau jika penerimaID direset oleh tombol kembali
    if (!penerimaID) {
      sidebarChat.classList.add("show");
      emptyChatPlaceholder.classList.remove("d-none"); // Pastikan placeholder terlihat di belakang sidebar
      chatContentContainer.classList.add("d-none");
    } else {
      sidebarChat.classList.remove("show"); // Jika sudah ada chat aktif, sembunyikan sidebar
      emptyChatPlaceholder.classList.add("d-none");
      chatContentContainer.classList.remove("d-none");
    }
  }
}

window.addEventListener("resize", handleResponsiveLayout);


# FitApp Admin Dashboard 🚀

FitApp mobil ekosistemi için geliştirilmiş, modern "glassmorphism" ve koyu tema (Dark Mode) tasarım diline sahip güçlü yönetim panelidir. Antrenman programlarını, egzersiz hareket havuzunu, kullanıcı hedeflerini, canlı widget'ları ve Health Connect istatistiklerini gerçek zamanlı yönetmenizi sağlar.

---

## 🌟 Öne Çıkan Özellikler

### 📱 1. Canlı Mobil & Native Widget Yönetimi (AppWidget Sync)
- **Canlı Geri Sayım Widget'ı:** Admin panelinden belirlenen antrenman geri sayımı (başlık, hedef saat, motivasyon mesajı), mobil uygulamanın içine ve kullanıcının **Android Ana Ekranına (Launcher AppWidget)** anlık senkronize olur.
- **Tek Tıkla Güncelleme:** Yapılan değişiklikler Supabase veritabanına kaydedilir ve aktif mobil cihazlara anında yansır.
- **Görsel Durum Takibi:** Aktif/Pasif toggle kontrolleri ve kart önizlemeleri.

### 👥 2. Kullanıcı & Kimlik Yönetimi
- **Esnek Giriş & Güvenlik:** Mobil ve web için optimize edilmiş, büyük/küçük harf duyarsız (`ilike`) ve otomatik boşluk temizleyen (trim) güvenli kimlik doğrulama.
- **Global Kullanıcı Filtresi:** Header üzerinden seçilen kullanıcıya göre tüm istatistikler, ölçüler ve antrenman logları anında filtrelenir.
- **Kullanıcı Profilleri:** Boy, kilo, hedef ve fiziksel aktivite verilerinin merkezi yönetimi.

### 🏋️ 3. Antrenman Programları & Egzersiz Havuzu
- **Sürükle & Bırak (Drag & Drop):** Antrenman günleri ve hareket sıralamasını kolayca düzenleme.
- **Geniş Hareket Veritabanı:** Kas gruplarına göre kategorize edilmiş görsel ve detaylı egzersiz kütüphanesi.
- **📥 CSV Toplu İçe Aktarma:** Bodybuilding.com ve FitnessProgramer.com formatlarında toplu hareket yükleme desteği.

### 📊 4. Gerçek Sağlık Analitikleri (Health Connect Entegrasyonu)
- Sahte / mock verilerden arındırılmış, telefon sensörlerinden ve Google Health Connect'ten gelen gerçek adımlar (`Steps`), aktif kaloriler (`ActiveCaloriesBurned`) ve kat edilen mesafe (`Distance`).
- Günlük ve haftalık aktivite grafikleri, su tüketimi ve vücut ölçüleri takibi.

---

## 🛠️ Teknoloji Yığını

- **Framework:** [Next.js](https://nextjs.org/) (App Router, Server Actions, Route Handlers)
- **Dil:** TypeScript
- **Veritabanı & Backend:** [Supabase](https://supabase.com/) (PostgreSQL, Row Level Security)
- **Stil & Tasarım:** Tailwind CSS, Glassmorphism UI
- **İkonlar:** Lucide React
- **Dağıtım (Deployment):** [Vercel](https://vercel.com/) (Edge / Serverless Functions)

---

## 🔌 API Uç Noktaları (RESTful API)

Mobil uygulamanın ve harici servislerin haberleştiği ana uç noktalar:

| Uç Nokta | Metot | Açıklama |
|---|---|---|
| `/api/auth/login` | `POST` | E-posta/şifre ile güvenli kullanıcı girişi |
| `/api/custom-widgets` | `GET`, `POST`, `PUT`, `DELETE` | Canlı geri sayım ve hedef widget'larının yönetimi |
| `/api/stats` | `GET`, `POST` | Günlük adım, kalori ve mesafe istatistikleri senkronizasyonu |
| `/api/users` | `GET`, `POST`, `PUT` | Kullanıcı listesi ve profil güncellemeleri |

---

## 🚀 Kurulum ve Yerel Geliştirme

Projeyi yerel ortamınızda çalıştırmak için:

### 1. Bağımlılıkları Yükleyin:
```bash
npm install
```

### 2. Çevre Değişkenlerini Tanımlayın (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

ADMIN_EMAIL=admin@fitapp.com
ADMIN_PASSWORD=your-secure-password
```

### 3. Geliştirme Sunucusunu Başlatın:
```bash
npm run dev
```
Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine giderek yönetim paneline erişebilirsiniz.

---

## 📦 Dağıtım & Yayınlama (Vercel)

Proje Vercel ortamına tam uyumludur. Git üzerinden push yapıldığında Vercel otomatik olarak derleyip canlıya alır:

```bash
git add .
git commit -m "feat: Güncel admin dashboard ve widget yönetimi"
git push origin main
```

---

## 📄 Lisans
Bu proje özel kullanım ve FitApp mobil ekosistemi için geliştirilmiştir.

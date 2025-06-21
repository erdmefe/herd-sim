# 🐄 HerdSIM

**HerdSIM**, büyükbaş hayvancılık yapan işletmeler için geliştirilmiş Python destekli bir masaüstü sürü simülasyon aracıdır. Kullanıcılar başlangıç hayvan sayısı, yem giderleri, süt verimi, buzağı oranı gibi birçok parametreyi girerek gelecekteki kârlılık, sürü büyüklüğü ve hayvan döngüsünü detaylı bir şekilde simüle edebilir.

---

## 🇹🇷 Özellikler (Türkçe)

- 🧮 Detaylı parametre giriş arayüzü (Gebelik, yem gideri, çalışan maaşı vb.)
- 📈 Aylık bazda süt üretimi, buzağı sayısı, gelir/gider ve kâr hesaplaması
- 🔄 Otomatik buzağıdan inek ekleme, kardan alım, ölüm oranları gibi gelişmiş seçenekler
- 📤 Hesaplama sonuçlarını PDF olarak dışa aktarma
- 🌗 Karanlık ve aydınlık tema desteği
- 💾 Profil kaydetme ve geri yükleme
- 🖥️ Electron + Python ile modern masaüstü uygulama mimarisi

---

## 🇬🇧 Features (English)

- 🧮 Full-featured input panel (Pregnancy, feed cost, staff salary, etc.)
- 📈 Monthly simulation of milk production, calf count, profit/loss
- 🔄 Advanced features like calf-to-cow auto conversion, profit-based cow purchase, death ratios
- 📤 Export simulation results as PDF
- 🌗 Dark and light theme support
- 💾 Profile save/load support
- 🖥️ Modern desktop architecture with Electron + Python backend

---

## 🚀 Kurulum / Setup

### Gerekli Bağımlılıklar / Requirements

- **Node.js** (v16+)
- **Python 3.9+**
- `pip install -r requirements.txt` (Simülasyon motoru için)

### Kurulum Adımları / Installation Steps

```bash
# Node modüllerini yükleyin / Install Node dependencies
npm install

# Uygulamayı başlatın / Run the application
npm start
```

> `herd_calculator.py` dosyası çalıştırılırken `.exe`'ye çevrilmiş olmalı. Bunun için `pyinstaller` ile derleyebilirsiniz:

```bash
pyinstaller --onefile herd_calculator.py -n herd_calculator
```

> Oluşan `herd_calculator.exe`, `main.js` tarafından Electron arayüzü ile haberleşerek simülasyonu çalıştırır.

---

## 🖼️ Ekran Görüntüleri / Screenshots

### Türkçe Arayüz

![Simülasyon Ekranı](docs/screenshots/simulation_tr.png)

### English Interface

![Simulation Screen](docs/screenshots/simulation_tr.png)

---

## 📁 Proje Yapısı / Project Structure

```
herd-sim/
├── assets/                 # Uygulama ikonları ve logolar
├── index.html              # Uygulama arayüzü
├── main.js                 # Electron ana süreç
├── herd_calculator.py      # Simülasyon motoru (Python)
├── splash.html             # Açılış ekranı (isteğe bağlı)
├── node_modules/
├── package.json
└── README.md
```

---

## 📃 Lisans / License

MIT Lisansı

Bu projeyi özgürce kullanabilir, geliştirebilir ve dağıtabilirsiniz.

---

## 👤 Geliştirici / Developer

**Erdem EFE**

Her türlü katkı ve geri bildirim için iletişime geçmekten çekinmeyin.

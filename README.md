
# 🐄 HerdSim — Büyükbaş Sürü Simülasyonu ve Karlılık Takibi

**TR | Türkçe Açıklama**

HerdSim, büyükbaş süt sığırcılığı yapan çiftçiler için aylık bazda hayvan yönetimi, süt üretimi ve finansal simülasyonlar sunan bir masaüstü uygulamasıdır. Python'da geliştirilen simülasyon motoru, Electron ile modern bir arayüz üzerinden çalıştırılır.

## 🚀 Özellikler
- Gebelik, doğum, sağım ve buzağı büyümesini simüle eder
- Aylık gelir, gider ve kâr hesaplaması yapar
- Erkek buzağı satışını ve yem giderlerini içerir
- Basit ve kullanıcı dostu arayüz (Electron)

## 🔧 Kurulum
### Gerekli Yazılımlar:
- Python 3.9+
- Node.js & npm
- Electron (otomatik kurulur)

### Kurulum Adımları:
```bash
pip install python-dateutil
npm install electron
npm start
```

## 📁 Dosya Yapısı
- `herd_calculator.py`: Python simülasyon motoru
- `main.js`: Electron uygulama ana süreci
- `index.html`: Arayüz
- `package.json`: Node bağımlılıkları
- `assets/`: Uygulama ikonları

---

**EN | English Description**

HerdSim is a desktop application that simulates herd management and financial projections for dairy cattle farms. It uses a Python-based simulation engine, integrated with a modern Electron GUI.

## 🚀 Features
- Simulates pregnancy, calving, milking, and calf growth
- Calculates monthly income, expenses, and profit
- Includes male calf sales and feed costs
- Simple and user-friendly Electron interface

## 🔧 Installation
### Requirements:
- Python 3.9+
- Node.js & npm
- Electron (auto-installed)

### Steps:
```bash
pip install python-dateutil
npm install electron
npm start
```

## 📁 Project Structure
- `herd_calculator.py`: Python simulation engine
- `main.js`: Electron main process
- `index.html`: Front-end interface
- `package.json`: Node dependencies
- `assets/`: App icons

---

Bilinen hatalar:
-

Eklenecekler
-görsel düzenlemeler
-daha detaylı girdi opsiyonları
-kararlılıkta iyileştirmeler
-inek sayısına oranla işçi gideri ekleme
-varsayılan değerler profili kaydetme

MIT Lisansı ile lisanslanmıştır. | Licensed under MIT License.
const { app, BrowserWindow, ipcMain, dialog, shell} = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// Pencere değişkenlerini global olarak tanımla
let mainWindow;
let splashWindow;

function createWindows() {
    // 1. Başlangıç Ekranı Penceresini (splashWindow) oluştur
    splashWindow = new BrowserWindow({
        width: 400,
        height: 300,
        transparent: true, // Pencerenin arkaplanını saydam yapabilir
        frame: false,      // Pencere çerçevesini kaldır
        alwaysOnTop: true, // Her zaman üstte kal
        center: true       // Ekranda ortala
    });
    splashWindow.loadFile('splash.html');

    // 2. Ana Pencereyi (mainWindow) oluştur ama gösterme (show: false)
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        show: false, // Arka planda yüklenmesi için başlangıçta gizli tut
        frame: false,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');

    // 3. Ana pencere tamamen yüklenip gösterilmeye hazır olduğunda...
    mainWindow.once('ready-to-show', () => {
        // Ufak bir gecikme, geçişin daha pürüzsüz görünmesini sağlayabilir
        setTimeout(() => {
            splashWindow.destroy(); // Başlangıç ekranını kapat
            mainWindow.show();      // Ana pencereyi göster
        }, 200); // 200 milisaniye bekle
    });
}

// PDF Dışa Aktarma İşlemi (Bu fonksiyon aynı kalıyor)
ipcMain.on('export-to-pdf', (event, content) => {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
ipcMain.on('open-file', (event, filePath) => {
    // shell.openPath, verilen dosya yolunu sistemin varsayılan uygulamasıyla açar.
    // Örneğin .pdf dosyaları için Adobe Reader, web tarayıcısı vb.
    shell.openPath(filePath)
        .catch(err => {
            // Hata olursa konsola yazdır.
            console.error("Dosya açılamadı:", err);
            // İsteğe bağlı olarak kullanıcıya bir hata mesajı da gösterebilirsiniz.
        });
});

  const paramLabels = {
    initialCowCount: "Başlangıç İnek Sayısı",
    initialPregnancyMonth: "Başlangıç Gebelik Ayı",
    randomInitialPregnancy: "Rastgele Başlangıç Gebelik",
    monthlyCows: "Aylık Eklenecek İnek",
    newCowPregnancyMonth: "Yeni İnek Gebelik Ayı",
    randomMonthlyPregnancy: "Rastgele Aylık Gebelik",
    autoAddCows: "Buzağıdan Otomatik Ekle",
    femaleCowThreshold: "Gerekli Dişi Buzağı",
    maxAutoAddCows: "Aylık Maks. Otomatik Ekleme",
    cowSourceType: "İnek Alım Kaynağı",
    newCowPrice: "Yeni İnek Alış Fiyatı",
    months: "Simülasyon Süresi",
    summaryPeriod: "Özet Periyodu",
    milkingThreshold: "Kuruya Alma Süresi",
    calfMaturityAge: "Düve Olma Yaşı",
    maleCalfRemovalAge: "Erkek Buzağı Satış Yaşı",
    birthSuccessRate: "Doğum Başarı Oranı",
    postBirthWait: "Doğum Sonrası Mola",
    useFemaleSeed: "Dişi Odaklı Tohumlama",
    startYear: "Başlangıç Yılı",
    startMonth: "Başlangıç Ayı",
    milkPerCow: "Günlük Süt/İnek",
    milkPrice: "Süt Fiyatı/Litre",
    maleCalf: "Erkek Buzağı Fiyatı",
    feedCostPerCow: "Günlük Yem/İnek",
    calfFeedRatio: "Buzağı Yem Oranı",
    otherExpenses: "Aylık Diğer Giderler",
    herdSizeLimit: "Sürü Limiti",
    oldCowPrice: "Yaşlı İnek Satış Fiyatı",
    enableDeaths: "Ölüm Oranları Aktif",
    monthlyCowDeathRate: "Aylık İnek Ölüm Oranı",
    monthlyCalfDeathRate: "Aylık Buzağı Ölüm Oranı",
    enableCowAddition: "Periyodik İnek Ekleme Aktif",
    cowAdditionFrequency: "İnek Ekleme Sıklığı",
    staffSalary: "Çalışan Maaşı",
    staffPerAnimal: "Çalışan/Hayvan Oranı",
    enableProfitBasedPurchase: "Kardan Otomatik Alım",
    profitThresholdForPurchase: "Kar Eşiği",
    maxProfitBasedPurchase: "Maks. Kardan Alım Limiti",
    stopPurchaseAtLimit: "Limitte Alımı Durdur"
  };

  function formatParamValue(key, value) {
    if (typeof value === 'boolean') {
      return value ? 'Evet' : 'Hayır';
    }
    if (key === 'calfFeedRatio') {
        return value ? `${(value * 100).toFixed(0)}%` : '0%';
    }
    if (['milkPrice', 'maleCalf', 'feedCostPerCow', 'otherExpenses', 'newCowPrice', 'oldCowPrice', 'staffSalary', 'profitThresholdForPurchase'].includes(key)) {
      return `${parseFloat(value).toLocaleString('tr-TR')} ₺`;
    }
    if (['birthSuccessRate', 'monthlyCowDeathRate', 'monthlyCalfDeathRate'].includes(key)) {
      return `${parseFloat(value)}%`;
    }
    if (['startYear', 'startMonth', 'months', 'summaryPeriod', 'initialCowCount', 'initialPregnancyMonth', 'calfMaturityAge', 'postBirthWait', 'milkingThreshold', 'maleCalfRemovalAge', 'monthlyCows', 'cowAdditionFrequency', 'newCowPregnancyMonth', 'femaleCowThreshold', 'maxAutoAddCows', 'staffPerAnimal', 'herdSizeLimit', 'maxProfitBasedPurchase'].includes(key)) {
      return value === null || value === '' ? 'Belirtilmemiş' : `${value}`;
    }
    if (key === 'cowSourceType') {
      return value === 'internal' ? 'Sermayeden (Gider)' : 'Harici (Gider Dışı)';
    }
    return value;
  }

  function generateParamsHtml(params) {
    let html = '<div style="display: flex; flex-wrap: wrap; margin-bottom: 20px; border: 1px solid #ccc; padding: 10px; border-radius: 5px;">';
    html += '<h4 style="width: 100%; margin-bottom: 15px; padding-bottom: 5px; border-bottom: 1px solid #eee;">Hesaplama Değişkenleri</h4>';
    for (const key in params) {
      if (paramLabels[key]) {
        html += `
          <div style="width: 33%; padding: 5px; box-sizing: border-box; font-size: 12px;">
            <strong>${paramLabels[key]}:</strong> ${formatParamValue(key, params[key])}
          </div>
        `;
      }
    }
    html += '</div>';
    return html;
  }

  const paramsHtml = generateParamsHtml(content.params);

  const pdfContent = `
    <!DOCTYPE html>
    <html lang="tr" data-bs-theme="${content.theme}">
      <head>
        <meta charset="UTF-8">
        <title>Hesaplama Sonuçları</title>
        <style>
          ${content.styles}
          body { 
            padding: 20px; 
            background-color: var(--bs-body-bg); 
            color: var(--bs-body-color);
            -webkit-print-color-adjust: exact;
          }
          .table { font-size: 10px; }
          .progress-bar { -webkit-print-color-adjust: exact; }
        </style>
      </head>
      <body>
        ${paramsHtml}
        <h2>Hesaplama Sonuçları</h2>
        ${content.body}
      </body>
    </html>
  `;

  pdfWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(pdfContent));

  pdfWindow.webContents.on('did-finish-load', async () => {
    try {
      const pdfData = await pdfWindow.webContents.printToPDF({
        landscape: true,
        pageSize: 'A4',
        printBackground: true
      });

      const { filePath } = await dialog.showSaveDialog({
        title: 'PDF Olarak Kaydet',
        defaultPath: `herdsim-sonuclari-${Date.now()}.pdf`,
        filters: [{ name: 'PDF Dosyaları', extensions: ['pdf'] }]
      });

      if (filePath) {
        fs.writeFileSync(filePath, pdfData);
        event.sender.send('pdf-export-complete', { success: true, path: filePath });
      }
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      event.sender.send('pdf-export-complete', { success: false, error: error.message });
    } finally {
      pdfWindow.close();
    }
  });
});

// Uygulama hazır olduğunda createWindow yerine createWindows'u çağır
app.whenReady().then(createWindows);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // Eğer uygulama aktifken hiç pencere yoksa yeniden oluştur
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindows();
    }
});

// Pencere kontrol butonları artık 'mainWindow' üzerinde çalışmalı
ipcMain.on('minimize-window', () => {
    if(mainWindow) mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if(mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if(mainWindow) mainWindow.close();
});

// Hesaplama IPC dinleyicisi aynı kalıyor
ipcMain.on('calculate-herd', (event, params) => {
    calculateHerd(params, event);
});

// calculateHerd fonksiyonu aynı kalıyor
function calculateHerd(params, event) {
    const executableName = 'herd_calculator.exe';
    
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, executableName)
      : path.join(__dirname, executableName);

    const pythonArgs = [JSON.stringify(params)];
    
    const pythonProcess = spawn(scriptPath, pythonArgs);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error(`Python Hata Çıktısı: ${data}`);
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Python script'i hata koduyla kapandı: ${code}`);
            console.error(`Tam Hata Mesajı: ${error}`);
            event.reply('calculation-error', error || `Hesaplama sırasında bir hata oluştu (Kod: ${code}).`);
            return;
        }

        try {
            const calculationResults = JSON.parse(result);
            event.reply('calculation-results', calculationResults);
        } catch (e) {
            console.error(`JSON parse hatası: ${e.message}`);
            console.error(`Alınan Ham Veri: ${result}`);
            event.reply('calculation-error', 'Sonuçlar işlenirken bir hata oluştu (JSON Hatası).');
        }
    });

    pythonProcess.on('error', (err) => {
        console.error('Python prosesi başlatılamadı:', err);
        dialog.showErrorBox('Kritik Hata', `Hesaplama motoru ('${executableName}') başlatılamadı. Lütfen uygulamanın doğru kurulduğundan emin olun.\n\nHata Detayı: ${err.message}`);
        event.reply('calculation-error', 'Hesaplama motoru başlatılamadı.');
    });
}
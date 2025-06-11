const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let lastCalculationParams = null;  // Son hesaplama parametrelerini saklayacak değişken
let lastHerdState = null;  // Son sürü durumunu saklayacak değişken

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        frame: false,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    // mainWindow.webContents.openDevTools();
}

// PDF Dışa Aktarma İşlemi
ipcMain.on('export-to-pdf', (event, content) => {
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
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
    staffPerAnimal: "Çalışan/Hayvan Oranı"
  };

  function formatParamValue(key, value) {
    if (typeof value === 'boolean') {
      return value ? 'Evet' : 'Hayır';
    }
    if (key === 'calfFeedRatio') {
      return `${(value * 100).toFixed(0)}%`;
    }
    if (['milkPrice', 'maleCalf', 'feedCostPerCow', 'otherExpenses', 'newCowPrice', 'oldCowPrice', 'staffSalary'].includes(key)) {
      return `${parseFloat(value).toLocaleString('tr-TR')} ₺`;
    }
    if (['birthSuccessRate', 'monthlyCowDeathRate', 'monthlyCalfDeathRate'].includes(key)) {
      return `${parseFloat(value)}%`;
    }
    if (['startYear', 'startMonth', 'months', 'summaryPeriod', 'initialCowCount', 'initialPregnancyMonth', 'calfMaturityAge', 'postBirthWait', 'milkingThreshold', 'maleCalfRemovalAge', 'monthlyCows', 'cowAdditionFrequency', 'newCowPregnancyMonth', 'femaleCowThreshold', 'maxAutoAddCows', 'staffPerAnimal', 'herdSizeLimit'].includes(key)) {
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
    }
});

ipcMain.on('minimize-window', () => {
    mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
    if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
    } else {
        mainWindow.maximize();
    }
});

ipcMain.on('close-window', () => {
    mainWindow.close();
});

ipcMain.on('reset-calculations', () => {
    lastCalculationParams = null;
    lastHerdState = null;
});

ipcMain.on('calculate-herd', (event, params) => {
    lastCalculationParams = params;
    calculateHerd(params, event, true);
});

ipcMain.on('update-financials', (event, financialParams) => {
    if (!lastCalculationParams || !lastHerdState) {
        event.reply('calculation-error', 'Önce bir hesaplama yapmalısınız!');
        return;
    }

    const updatedParams = {
        herd_state: Buffer.from(lastHerdState, 'binary').toString('base64'),
        milk_per_cow: financialParams.milk_per_cow,
        milk_price: financialParams.milk_price,
        male_calf_price: financialParams.male_calf_price,
        feed_cost_per_cow: financialParams.feed_cost_per_cow,
        calf_feed_ratio: financialParams.calf_feed_ratio,
        other_expenses: financialParams.other_expenses,
        staff_salary: financialParams.staff_salary,
        staff_per_animal: financialParams.staff_per_animal,
        cow_source_type: financialParams.cow_source_type,
        new_cow_price: financialParams.new_cow_price,
        enable_cow_addition: financialParams.enable_cow_addition,
        cow_addition_frequency: financialParams.cow_addition_frequency,
        herd_size_limit: financialParams.herd_size_limit,
        old_cow_price: financialParams.old_cow_price,
        enable_deaths: financialParams.enable_deaths,
        monthly_cow_death_rate: financialParams.monthly_cow_death_rate,
        monthly_calf_death_rate: financialParams.monthly_calf_death_rate
    };

    calculateHerd(updatedParams, event, false, true);
});

// ===================================================================
// GÜNCELLENMİŞ FONKSİYON
// ===================================================================
function calculateHerd(params, event, saveState = false, updateFinancials = false) {
    const executableName = 'herd_calculator.exe';
    
    // Uygulama paketlendiğinde (`.exe` olarak çalışırken) ve geliştirme ortamında
    // çalıştırılabilir dosyanın yolunu doğru şekilde belirler.
    const scriptPath = app.isPackaged
      ? path.join(process.resourcesPath, executableName)
      : path.join(__dirname, executableName);

    // Argümanlar dizisinden 'herd_calculator.py' script adını kaldırıyoruz.
    const pythonArgs = [JSON.stringify({
        ...params,
        enable_cow_addition: params.enable_cow_addition !== undefined ? params.enable_cow_addition : true,
        cow_addition_frequency: params.cow_addition_frequency || 1
    })];
    
    if (updateFinancials) {
        pythonArgs.push('update_financials');
    }
    
    // `spawn` komutu artık 'python' yerine doğrudan çalıştırılabilir dosyanın yolunu (`scriptPath`) kullanır.
    const pythonProcess = spawn(scriptPath, pythonArgs);
    
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
        console.error(`Python Hata Çıktısı: ${data}`); // Hata ayıklama için
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
            if (saveState) {
                lastHerdState = Buffer.from(calculationResults.pop().herd_state, 'base64').toString('binary');
            }
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
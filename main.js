const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let lastCalculationParams = null;  // Son hesaplama parametrelerini saklayacak değişken
let lastHerdState = null;  // Son sürü durumunu saklayacak değişken

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 900,
        frame: false,
        icon: path.join(__dirname, 'assets/icon.png'),
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile('index.html');
    // Uncomment the following line to open DevTools by default
    // mainWindow.webContents.openDevTools();
}
// YENİ: PDF Dışa Aktarma İşlemi
ipcMain.on('export-to-pdf', (event, content) => {
  // PDF içeriğini oluşturmak için gizli bir pencere aç
  const pdfWindow = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  // Renderer'dan gelen HTML ve stilleri kullanarak tam bir HTML sayfası oluştur
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
            -webkit-print-color-adjust: exact; /* Arka plan renklerinin yazdırılmasını zorunlu kılar */
          }
          .table { font-size: 10px; }
          .progress-bar { -webkit-print-color-adjust: exact; } /* Progress barların renkli çıkması için */
        </style>
      </head>
      <body>
        <h2>Hesaplama Sonuçları</h2>
        ${content.body}
      </body>
    </html>
  `;

  // Oluşturulan HTML'i gizli pencereye yükle
  pdfWindow.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(pdfContent));

  pdfWindow.webContents.on('did-finish-load', async () => {
    try {
      // Sayfa yüklendiğinde PDF'e dönüştür
      const pdfData = await pdfWindow.webContents.printToPDF({
        landscape: true,
        pageSize: 'A4',
        printBackground: true
      });

      // Kullanıcıya nereye kaydedeceğini sor
      const { filePath } = await dialog.showSaveDialog({
        title: 'PDF Olarak Kaydet',
        defaultPath: `herdsim-sonuclari-${Date.now()}.pdf`,
        filters: [{ name: 'PDF Dosyaları', extensions: ['pdf'] }]
      });

      if (filePath) {
        // Seçilen yola dosyayı yaz
        fs.writeFileSync(filePath, pdfData);
        // Başarı mesajını renderer'a gönder
        event.sender.send('pdf-export-complete', { success: true, path: filePath });
      }
    } catch (error) {
      console.error('PDF oluşturma hatası:', error);
      event.sender.send('pdf-export-complete', { success: false, error: error.message });
    } finally {
      // İşlem bittikten sonra gizli pencereyi kapat
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

// Window control handlers
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

// Hesaplama sonuçlarını sıfırlama handler'ı
ipcMain.on('reset-calculations', () => {
    lastCalculationParams = null;
    lastHerdState = null;
});

ipcMain.on('calculate-herd', (event, params) => {
    lastCalculationParams = params;  // Son parametreleri sakla
    calculateHerd(params, event, true);  // true = save state
});

ipcMain.on('update-financials', (event, financialParams) => {
    if (!lastCalculationParams || !lastHerdState) {
        event.reply('calculation-error', 'Önce bir hesaplama yapmalısınız!');
        return;
    }

    // Sadece finansal parametreleri güncelle
    // ...
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
        // Yeni inek parametreleri
        cow_source_type: financialParams.cow_source_type,
        new_cow_price: financialParams.new_cow_price,
        // İnek ekleme parametreleri
        enable_cow_addition: financialParams.enable_cow_addition,
        cow_addition_frequency: financialParams.cow_addition_frequency, // <-- BU SATIRI EKLEYİN
        // Sürü limiti parametreleri
        herd_size_limit: financialParams.herd_size_limit,
        old_cow_price: financialParams.old_cow_price,
        // Ölüm parametreleri
        enable_deaths: financialParams.enable_deaths,
        monthly_cow_death_rate: financialParams.monthly_cow_death_rate,
        monthly_calf_death_rate: financialParams.monthly_calf_death_rate
    };
    //...

    // Hesaplamayı yeni finansal parametrelerle tekrarla
    calculateHerd(updatedParams, event, false, true);  // false = don't save state, true = update financials
});

function calculateHerd(params, event, saveState = false, updateFinancials = false) {
    const pythonArgs = ['herd_calculator.py', JSON.stringify({
        ...params,
        enable_cow_addition: params.enable_cow_addition !== undefined ? params.enable_cow_addition : true,
        cow_addition_frequency: params.cow_addition_frequency || 1
    })];
    if (updateFinancials) {
        pythonArgs.push('update_financials');
    }
    
    const pythonProcess = spawn('python', pythonArgs);
    let result = '';
    let error = '';

    pythonProcess.stdout.on('data', (data) => {
        result += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
        error += data.toString();
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0) {
            event.reply('calculation-error', error || 'Hesaplama sırasında bir hata oluştu.');
            return;
        }

        try {
            const calculationResults = JSON.parse(result);
            if (saveState) {
                // Son sürü durumunu sakla
                lastHerdState = Buffer.from(calculationResults.pop().herd_state, 'base64').toString('binary');
            }
            event.reply('calculation-results', calculationResults);
        } catch (e) {
            event.reply('calculation-error', 'Sonuçlar işlenirken bir hata oluştu.');
        }
    });
}

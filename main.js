const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

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
    const updatedParams = {
        herd_state: Buffer.from(lastHerdState, 'binary').toString('base64'),  // Binary'den base64'e çevir
        milk_per_cow: financialParams.milk_per_cow,
        milk_price: financialParams.milk_price,
        male_calf_price: financialParams.male_calf_price,
        feed_cost_per_cow: financialParams.feed_cost_per_cow,
        calf_feed_ratio: financialParams.calf_feed_ratio,
        other_expenses: financialParams.other_expenses,
        // Yeni inek parametreleri
        cow_source_type: financialParams.cow_source_type,
        new_cow_price: financialParams.new_cow_price,
        // Sürü limiti parametreleri
        herd_size_limit: financialParams.herd_size_limit,
        old_cow_price: financialParams.old_cow_price
    };

    // Hesaplamayı yeni finansal parametrelerle tekrarla
    calculateHerd(updatedParams, event, false, true);  // false = don't save state, true = update financials
});

function calculateHerd(params, event, saveState = false, updateFinancials = false) {
    const pythonArgs = ['herd_calculator.py', JSON.stringify(params)];
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
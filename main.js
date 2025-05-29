const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let lastCalculationParams = null;  // Son hesaplama parametrelerini saklayacak değişken

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
    lastCalculationParams = null;  // Son hesaplama parametrelerini sıfırla
});

ipcMain.on('calculate-herd', (event, params) => {
    lastCalculationParams = params;  // Parametreleri sakla
    calculateHerd(params, event);
});

ipcMain.on('update-financials', (event, financialParams) => {
    if (!lastCalculationParams) {
        event.reply('calculation-error', 'Önce bir hesaplama yapmalısınız!');
        return;
    }

    // Sadece finansal parametreleri güncelle
    const updatedParams = {
        ...lastCalculationParams,
        milk_per_cow: financialParams.milk_per_cow,
        milk_price: financialParams.milk_price,
        male_calf_price: financialParams.male_calf_price,
        feed_cost_per_cow: financialParams.feed_cost_per_cow,
        calf_feed_ratio: financialParams.calf_feed_ratio,
        other_expenses: financialParams.other_expenses
    };

    // Hesaplamayı yeni finansal parametrelerle tekrarla
    calculateHerd(updatedParams, event);
});

function calculateHerd(params, event) {
    const pythonProcess = spawn('python', ['herd_calculator.py', JSON.stringify(params)]);
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
            event.reply('calculation-results', calculationResults);
        } catch (e) {
            event.reply('calculation-error', 'Sonuçlar işlenirken bir hata oluştu.');
        }
    });
} 
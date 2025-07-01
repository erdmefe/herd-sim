const { ipcRenderer } = require('electron');

let saveProfileModal;
let deleteConfirmModal;
let profileToDelete = null;
let monthDetailModal;
let originalHerdStats = [];

function toggleRelatedInputs(switchId, relatedIds, reverseLogic = false, parentSelector = '.col-6, .col-12') {
    const switchEl = document.getElementById(switchId);
    if (!switchEl) return;
    const relatedElements = relatedIds.map(id => document.getElementById(id));
    function updateState() {
        const isDisabled = reverseLogic ? switchEl.checked : !switchEl.checked;
        relatedElements.forEach(el => {
            if (el) {
                el.disabled = isDisabled;
                const parentContainer = el.closest(parentSelector) || el.closest('.form-check');
                if (parentContainer) {
                    parentContainer.style.opacity = isDisabled ? '0.6' : '1';
                    parentContainer.style.pointerEvents = isDisabled ? 'none' : 'auto';
                }
            }
        });
    }
    switchEl.addEventListener('change', updateState);
    updateState();
}

document.addEventListener('DOMContentLoaded', () => {
    saveProfileModal = new bootstrap.Modal(document.getElementById('saveProfileModal'));
    deleteConfirmModal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    monthDetailModal = new bootstrap.Modal(document.getElementById('monthDetailModal'));
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));

    document.getElementById('minimizeBtn').addEventListener('click', () => { ipcRenderer.send('minimize-window'); });
    document.getElementById('maximizeBtn').addEventListener('click', () => { ipcRenderer.send('maximize-window'); });
    document.getElementById('closeBtn').addEventListener('click', () => { ipcRenderer.send('close-window'); });

    initializeProfileSystem();

    const themeSwitch = document.getElementById('themeSwitch');
    const html = document.documentElement;
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        html.setAttribute('data-bs-theme', savedTheme);
        themeSwitch.checked = savedTheme === 'dark';
    }
    themeSwitch.addEventListener('change', function() {
        const theme = this.checked ? 'dark' : 'light';
        html.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    });
    
    toggleRelatedInputs('enableCowAddition', ['monthlyCows', 'cowAdditionFrequency', 'newCowPregnancyMonth', 'randomMonthlyPregnancy'], false);
    toggleRelatedInputs('autoAddCows', ['femaleCowThreshold', 'maxAutoAddCows'], false);
    toggleRelatedInputs('enableDeaths', ['monthlyCowDeathRate', 'monthlyCalfDeathRate'], false);
    toggleRelatedInputs('randomInitialPregnancy', ['initialPregnancyMonth'], true);
    toggleRelatedInputs('randomMonthlyPregnancy', ['newCowPregnancyMonth'], true);
    toggleRelatedInputs('enableProfitBasedPurchase', ['profitThresholdForPurchase', 'maxProfitBasedPurchase'], false);

    document.getElementById('resetTableBtn').addEventListener('click', resetTable);
    document.getElementById('calculatorForm').addEventListener('submit', runFullCalculation);
    document.getElementById('updateFinancials').addEventListener('click', runFinancialRecalculation);
    document.getElementById('saveProfileBtn').addEventListener('click', openSaveProfileModal);
    document.getElementById('modalSaveBtn').addEventListener('click', executeSaveProfile);
    document.getElementById('deleteProfileBtn').addEventListener('click', openDeleteConfirmModal);
    document.getElementById('modalDeleteBtn').addEventListener('click', executeDeleteProfile); 
    document.getElementById('resetInputsBtn').addEventListener('click', () => {
        const selectedProfile = document.getElementById('profileSelector').value;
        if (selectedProfile) { loadProfile(selectedProfile); showAlert(`'${selectedProfile}' profili yeniden yüklendi.`, 'info'); }
    });
    document.getElementById('profileSelector').addEventListener('change', (e) => loadProfile(e.target.value));

    document.getElementById('exportPdfBtn').addEventListener('click', () => {
        const tableBody = document.getElementById('resultsTable');
        if (tableBody.rows.length === 0) {
            showAlert('Dışa aktarılacak veri bulunmuyor.', 'info');
            return;
        }
        const tableHTML = document.querySelector('.table-responsive').innerHTML;
        const theme = document.documentElement.getAttribute('data-bs-theme');
        const styles = Array.from(document.styleSheets).map(sheet => { try { return Array.from(sheet.cssRules).map(rule => rule.cssText).join(''); } catch (e) { return ''; } }).join('');
        const calculationParams = getFormValues();
        ipcRenderer.send('export-to-pdf', { body: tableHTML, styles: styles, theme: theme, params: calculationParams });
    });
    
    ipcRenderer.on('pdf-export-complete', (event, result) => {
    if (result.success) {
        // Üçüncü parametre olarak dosya yolunu gönderiyoruz
        showAlert(`PDF başarıyla kaydedildi: ${result.path}`, 'success', result.path);
        } 
    else {
        showAlert(`PDF oluşturulurken bir hata oluştu: ${result.error}`, 'danger');
        }
    });
});

const PROFILE_STORAGE_KEY = 'herdSimProfiles';
const LAST_PROFILE_KEY = 'herdSimLastProfile';
function getFormValues() { const formIds = ['initialCowCount', 'initialPregnancyMonth', 'randomInitialPregnancy', 'monthlyCows', 'newCowPregnancyMonth', 'randomMonthlyPregnancy', 'autoAddCows', 'femaleCowThreshold', 'maxAutoAddCows', 'cowSourceType', 'newCowPrice', 'months', 'summaryPeriod', 'milkingThreshold', 'calfMaturityAge', 'maleCalfRemovalAge', 'birthSuccessRate', 'postBirthWait', 'useFemaleSeed', 'startYear', 'startMonth', 'milkPerCow', 'milkPrice', 'maleCalf', 'feedCostPerCow', 'calfFeedRatio', 'otherExpenses', 'herdSizeLimit', 'oldCowPrice', 'enableDeaths', 'monthlyCowDeathRate', 'monthlyCalfDeathRate', 'enableCowAddition', 'cowAdditionFrequency', 'staffSalary', 'staffPerAnimal', 'enableProfitBasedPurchase', 'profitThresholdForPurchase', 'maxProfitBasedPurchase', 'stopPurchaseAtLimit']; const values = {}; formIds.forEach(id => { const el = document.getElementById(id); if(el) { if (el.type === 'checkbox') { values[id] = el.checked; } else { values[id] = el.value; } } }); return values; }
function setFormValues(profileData) { for (const id in profileData) { const el = document.getElementById(id); if (el) { if (el.type === 'checkbox') { el.checked = profileData[id]; } else { el.value = profileData[id]; } const changeEvent = new Event('change'); if (['randomInitialPregnancy', 'randomMonthlyPregnancy', 'enableCowAddition', 'autoAddCows', 'enableDeaths', 'cowSourceType', 'enableProfitBasedPurchase'].includes(id)) { el.dispatchEvent(changeEvent); } } } }
function getProfiles() { const profiles = localStorage.getItem(PROFILE_STORAGE_KEY); return profiles ? JSON.parse(profiles) : {}; }
function initializeProfileSystem() { let profiles = getProfiles(); if (Object.keys(profiles).length === 0) { profiles['Varsayılan'] = getFormValues(); localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles)); } populateProfileSelector(profiles); const lastProfileName = localStorage.getItem(LAST_PROFILE_KEY); if (lastProfileName && profiles[lastProfileName]) { document.getElementById('profileSelector').value = lastProfileName; loadProfile(lastProfileName); } else { const firstProfileName = Object.keys(profiles)[0]; if (firstProfileName) { loadProfile(firstProfileName); } } }
function populateProfileSelector(profiles) { const selector = document.getElementById('profileSelector'); selector.innerHTML = ''; for (const name in profiles) { const option = document.createElement('option'); option.value = name; option.textContent = name; selector.appendChild(option); } }
function loadProfile(profileName) { const profiles = getProfiles(); if (profiles[profileName]) { setFormValues(profiles[profileName]); localStorage.setItem(LAST_PROFILE_KEY, profileName); document.getElementById('profileSelector').value = profileName; } }
function openSaveProfileModal() { const currentProfileName = document.getElementById('profileSelector').value || 'Yeni Profil'; document.getElementById('profileNameInput').value = currentProfileName; saveProfileModal.show(); }
function executeSaveProfile() { const profileNameInput = document.getElementById('profileNameInput'); const profileName = profileNameInput.value.trim(); if (profileName) { const profiles = getProfiles(); profiles[profileName] = getFormValues(); localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles)); localStorage.setItem(LAST_PROFILE_KEY, profileName); populateProfileSelector(profiles); document.getElementById('profileSelector').value = profileName; saveProfileModal.hide(); showAlert(`'${profileName}' profili kaydedildi.`, 'success'); } else { showAlert('Profil adı boş olamaz.', 'danger'); } }
function openDeleteConfirmModal() { const selector = document.getElementById('profileSelector'); const profileNameToDelete = selector.value; if (!profileNameToDelete) { showAlert('Silinecek bir profil seçili değil.', 'danger'); return; } const profiles = getProfiles(); if (Object.keys(profiles).length <= 1) { showAlert('Son profili silemezsiniz.', 'danger'); return; } profileToDelete = profileNameToDelete; document.getElementById('profileNameToDeleteSpan').textContent = profileToDelete; deleteConfirmModal.show(); }
function executeDeleteProfile() { if (!profileToDelete) return; const profiles = getProfiles(); delete profiles[profileToDelete]; localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles)); const remainingProfiles = Object.keys(profiles); const newActiveProfile = remainingProfiles.length > 0 ? remainingProfiles[0] : null; localStorage.setItem(LAST_PROFILE_KEY, newActiveProfile); populateProfileSelector(profiles); if (newActiveProfile) { loadProfile(newActiveProfile); } showAlert(`'${profileToDelete}' profili silindi.`, 'info'); deleteConfirmModal.hide(); profileToDelete = null; }
    
function showAlert(message, type = 'info', filePath = null) {
    const alertContainer = document.querySelector('.alert-container');
    const alertElement = document.createElement('div');
    alertElement.className = `custom-alert alert-${type}`;
    alertElement.innerHTML = `<div class="alert-content"><i class="bi ${type === 'success' ? 'bi-check-circle' : 'bi-info-circle'}"></i><span>${message}</span></div><button type="button" class="close-btn" onclick="this.parentElement.remove()"><i class="bi bi-x"></i></button>`;

    // Eğer bir dosya yolu geldiyse, alert'i tıklanabilir yap
    if (filePath) {
        alertElement.classList.add('alert-clickable');
        alertElement.title = 'Dosyayı açmak için tıklayın'; // Tooltip ekle
        alertElement.onclick = (e) => {
            // Kapatma butonuna tıklandıysa işlemi yapma
            if (e.target.tagName.toLowerCase() !== 'i' && e.target.tagName.toLowerCase() !== 'button') {
                ipcRenderer.send('open-file', filePath);
            }
        };
    }

    alertContainer.appendChild(alertElement);
    setTimeout(() => alertElement.classList.add('show'), 10);
    setTimeout(() => {
        alertElement.classList.remove('show');
        setTimeout(() => alertElement.remove(), 300);
    }, 8000); // Alert'in ekranda kalma süresini biraz artırdık
}

    function showLoader() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.style.display = 'flex';
        }
    }

    function hideLoader() {
        const loader = document.querySelector('.loading-overlay');
        if (loader) {
            loader.style.display = 'none';
        }
    }
    
    function createRatioProgressBar(ratio) {
        if (typeof ratio === 'undefined' || ratio === null) {
            ratio = 0;
        }
        const getRatioBarClass = (r) => { if (r >= 80) return 'excellent'; if (r >= 70) return 'good'; if (r >= 60) return 'average'; return 'poor'; }; 
        const barClass = getRatioBarClass(ratio); 
        return `<div class="ratio-progress"><div class="progress-bar ${barClass}" style="width: ${ratio}%"></div><div class="progress-text">${ratio}%</div></div>`; 
    }

    function resetTable() {
        const tbody = document.getElementById('resultsTable');
        if (tbody.children.length > 0) {
            tbody.innerHTML = '';
            originalHerdStats = [];
            showAlert('Hesaplama sonuçları temizlendi.', 'info');
        } else {
            showAlert('Tablo zaten boş.', 'info');
        }
    }

    function runFullCalculation(e) {
        e.preventDefault();
        showLoader();
        const params = getFormValues();
        try {
            const numericParams = { initial_cow_count: parseInt(params.initialCowCount), initial_pregnancy_month: params.randomInitialPregnancy ? 'random' : parseInt(params.initialPregnancyMonth), monthly_new_cows: parseInt(params.monthlyCows), new_cow_pregnancy_month: params.randomMonthlyPregnancy ? 'random' : parseInt(params.newCowPregnancyMonth), months: parseInt(params.months), milking_threshold: parseInt(params.milkingThreshold), calf_maturity_age: parseInt(params.calfMaturityAge), male_calf_removal_age: parseInt(params.maleCalfRemovalAge), birth_success_rate: parseInt(params.birthSuccessRate), post_birth_wait: parseInt(params.postBirthWait), start_year: parseInt(params.startYear), start_month: parseInt(params.startMonth), milk_per_cow: parseFloat(params.milkPerCow), milk_price: parseFloat(params.milkPrice), male_calf_price: parseFloat(params.maleCalf), feed_cost_per_cow: parseFloat(params.feedCostPerCow), calf_feed_ratio: parseFloat(params.calfFeedRatio) / 100, other_expenses: parseFloat(params.otherExpenses), staff_salary: parseFloat(params.staffSalary), staff_per_animal: parseInt(params.staffPerAnimal), female_cow_threshold: parseInt(params.femaleCowThreshold), max_auto_add_cows: parseInt(params.maxAutoAddCows), new_cow_price: parseFloat(params.newCowPrice), cow_addition_frequency: parseInt(params.cowAdditionFrequency), old_cow_price: parseFloat(params.oldCowPrice), monthly_cow_death_rate: parseFloat(params.monthlyCowDeathRate), monthly_calf_death_rate: parseFloat(params.monthlyCalfDeathRate), herd_size_limit: params.herdSizeLimit ? parseInt(params.herdSizeLimit) : null, use_female_sperm: params.useFemaleSeed, auto_add_cows: params.autoAddCows, cow_source_type: params.cowSourceType, enable_cow_addition: params.enableCowAddition, enable_deaths: params.enableDeaths, enable_profit_based_purchase: params.enableProfitBasedPurchase, profit_threshold_for_purchase: parseFloat(params.profitThresholdForPurchase), max_profit_based_purchase: parseInt(params.maxProfitBasedPurchase), stop_purchase_at_limit: params.stopPurchaseAtLimit };
            ipcRenderer.send('calculate-herd', numericParams);
        } catch (error) {
            hideLoader();
            showAlert('Lütfen tüm alanları doğru şekilde doldurun.', 'danger');
        }
    }
    
    function runFinancialRecalculation() {
        if (originalHerdStats.length === 0) {
            showAlert('Önce bir hesaplama yapmalısınız!', 'danger');
            return;
        }

        const params = getFormValues();
        const financialParams = {
            milk_per_cow: parseFloat(params.milkPerCow),
            milk_price: parseFloat(params.milkPrice),
            male_calf_price: parseFloat(params.maleCalf),
            feed_cost_per_cow: parseFloat(params.feedCostPerCow),
            calf_feed_ratio: parseFloat(params.calfFeedRatio) / 100,
            other_expenses: parseFloat(params.otherExpenses),
            staff_salary: parseFloat(params.staffSalary),
            staff_per_animal: parseInt(params.staffPerAnimal),
            cow_source_type: params.cowSourceType,
            new_cow_price: parseFloat(params.newCowPrice),
            old_cow_price: parseFloat(params.oldCowPrice),
            monthly_cows: parseInt(params.monthlyCows) || 0,
            enable_cow_addition: params.enableCowAddition,
        };

        const recalculatedStats = JSON.parse(JSON.stringify(originalHerdStats));

        recalculatedStats.forEach(month => {
            const new_income = Math.round(
                (month.milking_cows * financialParams.milk_per_cow * 30 * financialParams.milk_price) +
                (month.current_removed_males * financialParams.male_calf_price) +
                (month.current_removed_old_cows * financialParams.old_cow_price)
            );
            
            const total_cows_for_costing = month.total_animals - (month.female_calves + month.male_calves);
            const total_calves_for_costing = month.female_calves + month.male_calves;

            const cow_feed_cost = total_cows_for_costing * financialParams.feed_cost_per_cow * 30;
            const calf_feed_cost = total_calves_for_costing * financialParams.feed_cost_per_cow * 30 * financialParams.calf_feed_ratio;
            
            const staff_count = (financialParams.staff_per_animal > 0) ? Math.floor(month.total_animals / financialParams.staff_per_animal) : 0;
            const staff_expense = staff_count * financialParams.staff_salary;

            let periodic_cow_cost = 0;
            if (financialParams.cow_source_type === 'internal' && financialParams.enable_cow_addition && month.is_addition_month) {
                const manual_cows = financialParams.monthly_cows;
                const auto_cows = month.auto_added_cows || 0;
                periodic_cow_cost = (manual_cows + auto_cows) * financialParams.new_cow_price;
            }
            
            const profit_purchase_cost = (month.cows_bought_with_profit || 0) * financialParams.new_cow_price;

            const new_expenses = Math.round(
                cow_feed_cost + 
                calf_feed_cost + 
                staff_expense + 
                periodic_cow_cost + 
                profit_purchase_cost + 
                financialParams.other_expenses
            );

            month.staff_count = staff_count;
            month.income = new_income;
            month.expenses = new_expenses;
            month.profit = new_income - new_expenses;
        });

        renderTable(recalculatedStats);
        showAlert('Finansal veriler başarıyla güncellendi.', 'success');
    }

    function showMonthDetails(monthData) {
        const params = getFormValues();
        const financialParams = {
            milk_per_cow: parseFloat(params.milkPerCow),
            milk_price: parseFloat(params.milkPrice),
            male_calf_price: parseFloat(params.maleCalf),
            feed_cost_per_cow: parseFloat(params.feedCostPerCow),
            calf_feed_ratio: parseFloat(params.calfFeedRatio) / 100,
            other_expenses: parseFloat(params.otherExpenses),
            staff_salary: parseFloat(params.staffSalary),
            new_cow_price: parseFloat(params.newCowPrice),
            old_cow_price: parseFloat(params.oldCowPrice),
            cow_source_type: params.cowSourceType,
        };

        const milk_income = monthData.milking_cows * financialParams.milk_per_cow * 30 * financialParams.milk_price;
        const male_calf_income = monthData.current_removed_males * financialParams.male_calf_price;
        const old_cow_income = monthData.current_removed_old_cows * financialParams.old_cow_price;

        const total_cows_for_costing = monthData.total_animals - (monthData.female_calves + monthData.male_calves);
        const total_calves_for_costing = monthData.female_calves + monthData.male_calves;
        const cow_feed_cost = total_cows_for_costing * financialParams.feed_cost_per_cow * 30;
        const calf_feed_cost = total_calves_for_costing * financialParams.feed_cost_per_cow * 30 * financialParams.calf_feed_ratio;
        const total_feed_cost = cow_feed_cost + calf_feed_cost;
        const staff_expense = monthData.staff_count * financialParams.staff_salary;
        let purchase_cost = 0;
        if (financialParams.cow_source_type === 'internal' && monthData.is_addition_month) {
            purchase_cost += (monthData.manual_cows_added + monthData.auto_added_cows) * financialParams.new_cow_price;
        }
        purchase_cost += (monthData.cows_bought_with_profit || 0) * financialParams.new_cow_price;
        const other_expenses = financialParams.other_expenses;

        const formatCurrency = (value) => `${Math.round(value).toLocaleString('tr-TR')} ₺`;

        document.getElementById('modal-date').textContent = monthData.date;

        document.getElementById('modal-milk-income').textContent = formatCurrency(milk_income);
        document.getElementById('modal-male-calf-income').textContent = formatCurrency(male_calf_income);
        document.getElementById('modal-old-cow-income').textContent = formatCurrency(old_cow_income);
        document.getElementById('modal-total-income').textContent = formatCurrency(monthData.income);

        document.getElementById('modal-feed-cost').textContent = formatCurrency(total_feed_cost);
        document.getElementById('modal-staff-cost').textContent = formatCurrency(staff_expense);
        document.getElementById('modal-purchase-cost').textContent = formatCurrency(purchase_cost);
        document.getElementById('modal-other-expenses').textContent = formatCurrency(other_expenses);
        document.getElementById('modal-total-expenses').textContent = formatCurrency(monthData.expenses);

        // Aylık Net Kar/Zarar
        const netProfitElement = document.getElementById('modal-net-profit');
        netProfitElement.textContent = formatCurrency(monthData.profit);
        netProfitElement.className = `stat-value ${monthData.profit >= 0 ? 'text-success' : 'text-danger'}`;

        // Aylık Hareketler
        document.getElementById('modal-born-female-calves').textContent = monthData.born_female_calves_this_month || 0;
        document.getElementById('modal-born-male-calves').textContent = monthData.born_male_calves_this_month || 0;

        const total_added_cows = (monthData.manual_cows_added || 0) + (monthData.auto_added_cows || 0) + (monthData.cows_bought_with_profit || 0);
        document.getElementById('modal-added-cows').textContent = total_added_cows;

        const additionsDetail = [];
        if (monthData.manual_cows_added > 0) additionsDetail.push(`${monthData.manual_cows_added} Periyodik`);
        if (monthData.auto_added_cows > 0) additionsDetail.push(`${monthData.auto_added_cows} Buzağıdan`);
        if (monthData.cows_bought_with_profit > 0) additionsDetail.push(`${monthData.cows_bought_with_profit} Kardan`);

        const additionsDetailEl = document.getElementById('modal-additions-detail');
        additionsDetailEl.textContent = additionsDetail.length > 0 ? `(Detay: ${additionsDetail.join(', ')})` : '';

        document.getElementById('modal-sold-calves').textContent = monthData.total_removed_male_calves;
        document.getElementById('modal-sold-old-cows').textContent = monthData.current_removed_old_cows;

        // Ay Sonu Sürü Durumu
        document.getElementById('modal-total-animals').textContent = monthData.total_animals;
        document.getElementById('modal-milking-cows').textContent = monthData.milking_cows;
        document.getElementById('modal-dry-cows').textContent = monthData.dry_cows;
        document.getElementById('modal-pregnant-heifers').textContent = monthData.pregnant_heifers;
        document.getElementById('modal-female-calves').textContent = monthData.female_calves;
        document.getElementById('modal-male-calves').textContent = monthData.male_calves;

        monthDetailModal.show();
    }

    ipcRenderer.on('calculation-results', (event, results) => {
        originalHerdStats = results;
        renderTable(results);
        hideLoader();
        showAlert('Hesaplama başarıyla tamamlandı.', 'success');
    });

    ipcRenderer.on('calculation-error', (event, error) => {
        hideLoader();
        showAlert('Hesaplama sırasında bir hata oluştu: ' + error, 'danger');
    });
    
    function renderTable(results) {
        const tbody = document.getElementById('resultsTable');
        tbody.innerHTML = '';
        let periodIncome = 0, periodExpenses = 0, periodProfit = 0, totalIncome = 0, totalExpenses = 0, totalProfit = 0;
        const summaryPeriod = parseInt(document.getElementById('summaryPeriod').value);
        let monthCounter = 0;
        let periodStartDate = '';
        let totalDeadCows = 0;
        let totalDeadCalves = 0;

        if (!results || results.length === 0) return;

        results.forEach((month, index) => {
            if (monthCounter === 0) { periodStartDate = month.date; }
            totalDeadCows = month.total_dead_cows;
            totalDeadCalves = month.total_dead_calves;
            const profitClass = month.profit >= 0 ? 'table-success-light' : 'table-danger-light';
            const row = document.createElement('tr');
            row.className = 'data-row';
            row.addEventListener('click', () => showMonthDetails(month));
            
            let totalAnimalsText = `${month.total_animals}`;
            let additions = [];
            if (month.manual_cows_added > 0) {
                additions.push(`${month.manual_cows_added}P`);
            }
            if (month.auto_added_cows > 0) {
                additions.push(`${month.auto_added_cows}B`);
            }
            if (month.cows_bought_with_profit > 0) {
                additions.push(`${month.cows_bought_with_profit}K`);
            }

            if (additions.length > 0) {
                totalAnimalsText += ` (+${additions.join('+')})`;
            }

            if (month.current_removed_old_cows > 0) {
                totalAnimalsText += ` (-${month.current_removed_old_cows}S)`;
            }
            
            row.innerHTML = `<td>${month.date}</td><td>${month.milking_cows} / ${month.dry_cows}</td><td class="td-vertical-middle">${createRatioProgressBar(month.milking_ratio)}</td><td>${month.pregnant_heifers} / ${month.pregnant_cows}</td><td>${month.female_calves}</td><td>${month.male_calves} / ${month.total_removed_male_calves}</td><td>${totalAnimalsText}</td><td>${month.staff_count}</td><td>${month.monthly_dead_cows} / ${month.monthly_dead_calves}</td><td>${month.income.toLocaleString('tr-TR')} ₺ / ${month.expenses.toLocaleString('tr-TR')} ₺</td><td class="${profitClass}">${month.profit.toLocaleString('tr-TR')} ₺</td>`;
            tbody.appendChild(row);
            
            totalIncome += month.income; 
            totalExpenses += month.expenses; 
            totalProfit += month.profit; 
            periodIncome += month.income; 
            periodExpenses += month.expenses; 
            periodProfit += month.profit; 
            monthCounter++;

            if (monthCounter === summaryPeriod || index === results.length - 1) {
                if (monthCounter > 0) {
                    const summaryRow = document.createElement('tr');
                    summaryRow.className = 'table-secondary fw-bold summary-row';
                    const summaryProfitClass = periodProfit >= 0 ? 'text-success' : 'text-danger';
                    summaryRow.innerHTML = `<td colspan="8" class="text-end">${periodStartDate} - ${month.date} Dönemi Toplamları:</td><td>(${totalDeadCows}/${totalDeadCalves})</td><td>${periodIncome.toLocaleString('tr-TR')} ₺ / ${periodExpenses.toLocaleString('tr-TR')} ₺</td><td class="${summaryProfitClass}">${periodProfit.toLocaleString('tr-TR')} ₺</td>`;
                    tbody.appendChild(summaryRow);
                }
                periodIncome = 0; periodExpenses = 0; periodProfit = 0; monthCounter = 0;
            }
        });
        
        const totalRow = document.createElement('tr');
        totalRow.className = 'table-dark fw-bold';
        const totalProfitClass = totalProfit >= 0 ? 'text-success' : 'text-danger';
        totalRow.innerHTML = `<td colspan="8" class="text-end">Genel Toplam:</td><td>(${totalDeadCows}/${totalDeadCalves})</td><td>${totalIncome.toLocaleString('tr-TR')} ₺ / ${totalExpenses.toLocaleString('tr-TR')} ₺</td><td class="${totalProfitClass}">${totalProfit.toLocaleString('tr-TR')} ₺</td>`;
        tbody.appendChild(totalRow);
    }
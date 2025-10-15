class SaveLoadManager {
    constructor(stateManager) {
        this.state = stateManager;
        this.storageKey = 'digital_board_simulator_config';
    }

    saveConfiguration() {
        try {
            const config = this.createConfigurationData();
            const jsonData = JSON.stringify(config, null, 2);
            
            localStorage.setItem(this.storageKey, jsonData);
            
            this.downloadConfiguration(jsonData);
            
            window.uiManager.showToast('تم حفظ التكوين بنجاح', 'success');
            
        } catch (error) {
            window.uiManager.showToast('خطأ في حفظ التكوين', 'error');
        }
    }

    loadConfiguration() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.loadFromFile(file);
            }
        };
        
        const savedConfig = localStorage.getItem(this.storageKey);
        if (savedConfig) {
            window.uiManager.showConfirmDialog(
                'هل تريد تحميل آخر تكوين محفوظ أم اختيار ملف؟',
                () => {
                    try {
                        const config = JSON.parse(savedConfig);
                        this.applyConfiguration(config);
                        window.uiManager.showToast('تم تحميل التكوين المحفوظ', 'success');
                    } catch (error) {
                        window.uiManager.showToast('خطأ في تحميل التكوين المحفوظ', 'error');
                    }
                },
                () => {
                    input.click();
                }
            );
        } else {
            input.click();
        }
    }

    createConfigurationData() {
        return {
            version: '3.0',
            timestamp: new Date().toISOString(),
            description: 'Digital Board Simulator Configuration',
            state: this.state.getState(),
            metadata: {
                inputCount: CONFIG.INPUTS.COUNT,
                gateCount: CONFIG.GATES.TOTAL_COUNT,
                andGateCount: CONFIG.GATES.AND_COUNT,
                orGateCount: CONFIG.GATES.OR_COUNT,
                specialGateCount: CONFIG.GATES.SPECIAL_COUNT,
                ledCount: CONFIG.LEDS.COUNT,
                bin7segCount: CONFIG.BIN_7SEG.COUNT,
                connectionCount: this.state.connections.length
            }
        };
    }

    downloadConfiguration(jsonData) {
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `digital_board_config_${this.getTimestamp()}.json`;
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    loadFromFile(file) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                this.validateConfiguration(config);
                this.applyConfiguration(config);
                window.uiManager.showToast('تم تحميل التكوين من الملف بنجاح', 'success');
            } catch (error) {
                window.uiManager.showToast('خطأ في تحميل الملف', 'error');
            }
        };
        
        reader.onerror = () => {
            window.uiManager.showToast('خطأ في قراءة الملف', 'error');
        };
        
        reader.readAsText(file);
    }

    validateConfiguration(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('Invalid configuration format');
        }
        
        if (!config.state) {
            throw new Error('Missing state data');
        }
        
        if (!config.version) {
            throw new Error('Missing version information');
        }
        
        const state = config.state;
        
        if (!Array.isArray(state.inputs) || state.inputs.length !== CONFIG.INPUTS.COUNT) {
            throw new Error('Invalid inputs data');
        }
        
        if (!Array.isArray(state.gates) || state.gates.length !== CONFIG.GATES.TOTAL_COUNT) {
            throw new Error('Invalid gates data');
        }
        
        if (!Array.isArray(state.leds) || state.leds.length !== CONFIG.LEDS.COUNT) {
            throw new Error('Invalid LEDs data');
        }
        
        if (!Array.isArray(state.connections)) {
            throw new Error('Invalid connections data');
        }
        
        if (state.bin7segs && !Array.isArray(state.bin7segs)) {
            throw new Error('Invalid BIN/7SEG data');
        }
        
        if (state.pulses && !Array.isArray(state.pulses)) {
            throw new Error('Invalid pulse data');
        }
    }

    applyConfiguration(config) {
        const loader = window.uiManager.showLoading('جاري تطبيق التكوين...');
        
        setTimeout(() => {
            try {
                // مسح كل شيء أولاً
                window.connectionManager.clearAllConnections();
                
                // تحميل الحالة الجديدة
                this.state.loadState(config.state);
                
                // تحديث العناصر المرئية
                window.uiManager.updateAllVisuals();
                
                setTimeout(() => {
                    // إعادة رسم الاتصالات مع تنظيف محسن
                    this.redrawConnectionsWithCleanup(config.state.connections);
                    window.uiManager.hideLoading();
                }, 100);
                
            } catch (error) {
                window.uiManager.hideLoading();
                throw error;
            }
        }, 100);
    }

    // إصلاح دالة إعادة رسم الاتصالات مع تنظيف شامل
    redrawConnectionsWithCleanup(connections) {
        // تنظيف كامل قبل إعادة الرسم
        window.wireManager.clearAllWires();
        
        // رسم الاتصالات الجديدة
        connections.forEach(conn => {
            window.wireManager.drawWire(conn.from, conn.to);
            
            // تحديث حالة النقاط
            window.connectionManager.factory.setConnectionPointState(
                conn.from.type, conn.from.id, conn.from.outputType, true
            );
            window.connectionManager.factory.setConnectionPointState(
                conn.to.type, conn.to.id, conn.to.inputType, true
            );
        });
        
        // تفعيل الحالات للمداخل النشطة
        this.state.inputs.forEach((input, id) => {
            if (input.state) {
                this.state.updateConnectedElements(id, 'input');
            }
        });
        
        // تنظيف نهائي للخطوط اليتيمة
        setTimeout(() => {
            if (window.connectionManager) {
                window.connectionManager.cleanupOrphanedWires();
                // تنظيف إضافي من WireManager
                window.wireManager.syncWireElements();
            }
        }, 200);
    }

    exportAsURL() {
        try {
            const config = this.createConfigurationData();
            const compressed = this.compressConfiguration(config);
            const url = `${window.location.origin}${window.location.pathname}?config=${compressed}`;
            
            navigator.clipboard.writeText(url).then(() => {
                window.uiManager.showToast('تم نسخ الرابط للحافظة', 'success');
            }).catch(() => {
                this.showURLDialog(url);
            });
            
        } catch (error) {
            window.uiManager.showToast('خطأ في إنشاء الرابط', 'error');
        }
    }

    importFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const configParam = urlParams.get('config');
        
        if (configParam) {
            try {
                const config = this.decompressConfiguration(configParam);
                this.validateConfiguration(config);
                this.applyConfiguration(config);
                
                window.history.replaceState({}, document.title, window.location.pathname);
                
                window.uiManager.showToast('تم تحميل التكوين من الرابط', 'success');
                return true;
            } catch (error) {
                window.uiManager.showToast('خطأ في تحميل التكوين من الرابط', 'error');
            }
        }
        
        return false;
    }

    compressConfiguration(config) {
        const jsonString = JSON.stringify(config);
        return btoa(encodeURIComponent(jsonString));
    }

    decompressConfiguration(compressed) {
        const jsonString = decodeURIComponent(atob(compressed));
        return JSON.parse(jsonString);
    }

    showURLDialog(url) {
        const overlay = window.uiManager.createOverlay();
        const dialog = document.createElement('div');
        
        dialog.style.cssText = `
            background: #16213e;
            border: 2px solid #e94560;
            border-radius: 10px;
            padding: 20px;
            color: white;
            max-width: 500px;
            text-align: center;
        `;
        
        dialog.innerHTML = `
            <h3>رابط التكوين</h3>
            <p>انسخ هذا الرابط لمشاركة التكوين:</p>
            <input type="text" value="${url}" style="
                width: 100%;
                padding: 10px;
                margin: 10px 0;
                background: #333;
                color: white;
                border: 1px solid #666;
                border-radius: 5px;
            " readonly onclick="this.select()">
            <button onclick="navigator.clipboard.writeText('${url}').then(() => alert('تم النسخ!'))" style="
                background: #e94560;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin: 0 5px;
            ">نسخ</button>
            <button class="close-btn" style="
                background: #666;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin: 0 5px;
            ">إغلاق</button>
        `;
        
        dialog.querySelector('.close-btn').addEventListener('click', () => {
            overlay.remove();
        });
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
    }

    getTimestamp() {
        const now = new Date();
        return now.toISOString().slice(0, 19).replace(/[:.]/g, '-');
    }

    enableAutoSave(intervalMinutes = 5) {
        setInterval(() => {
            try {
                const config = this.createConfigurationData();
                localStorage.setItem(this.storageKey + '_autosave', JSON.stringify(config));
            } catch (error) {
                // Silent fail
            }
        }, intervalMinutes * 60 * 1000);
    }

    // إصلاح دالة استعادة الحفظ التلقائي مع تنظيف شامل
    restoreAutoSave() {
        const autoSaved = localStorage.getItem(this.storageKey + '_autosave');
        if (autoSaved) {
            try {
                const config = JSON.parse(autoSaved);
                window.uiManager.showConfirmDialog(
                    'تم العثور على حفظ تلقائي. هل تريد استعادته؟',
                    () => {
                        this.applyConfiguration(config);
                        window.uiManager.showToast('تم استعادة الحفظ التلقائي', 'success');
                    }
                );
                return true;
            } catch (error) {
                // Silent fail
            }
        }
        return false;
    }
}
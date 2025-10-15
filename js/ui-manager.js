class UIManager {
    constructor(stateManager, componentFactory) {
        this.state = stateManager;
        this.factory = componentFactory;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.state.on(CONFIG.EVENTS.INPUT_TOGGLE, (data) => {
            this.factory.updateInputVisual(data.id);
        });

        this.state.on(CONFIG.EVENTS.STATE_UPDATE, (data) => {
            this.handleStateUpdate(data);
        });

        this.state.on(CONFIG.EVENTS.CONNECTION_COMPLETE, (connection) => {
            this.handleConnectionComplete(connection);
        });

        this.state.on(CONFIG.EVENTS.CONNECTION_DELETE, (connection) => {
            this.handleConnectionDelete(connection);
        });
    }

    initializeUI() {
        this.initializeInputs();
        this.initializeGates();
        this.initializeLEDs();
        this.initializeBin7Segs();
        this.initializeControls();
        this.setupKeyboardShortcuts();
        
        // Initialize power rails and propagate their signals
        this.initializePowerRails();
    }

    initializeInputs() {
        const container = document.getElementById(CONFIG.ELEMENTS.INPUTS_CONTAINER);
        container.innerHTML = '';

        for (let i = 0; i < CONFIG.INPUTS.COUNT; i++) {
            const inputElement = this.factory.createInput(i);
            container.appendChild(inputElement);
        }

        // Add pulse generator
        for (let i = 0; i < CONFIG.INPUTS.PULSE_COUNT; i++) {
            const pulseElement = this.factory.createPulseGenerator(i);
            container.appendChild(pulseElement);
        }
    }

    initializeGates() {
        const container = document.getElementById(CONFIG.ELEMENTS.GATES_CONTAINER);
        container.innerHTML = '';

        const leftColumn = this.createElement('div', 'gates-column', 'left-column');
        leftColumn.setAttribute('data-column-title', 'AND Gates');
        
        const middleLeftColumn = this.createElement('div', 'gates-column', 'middle-left-column');
        middleLeftColumn.setAttribute('data-column-title', 'OR Gates');
        
        const middleRightColumn = this.createElement('div', 'gates-column', 'middle-right-column');
        middleRightColumn.setAttribute('data-column-title', 'Special/NOT');
        
        const rightColumn = this.createElement('div', 'gates-column', 'right-column');
        rightColumn.setAttribute('data-column-title', 'Adders/COMP/Power');

        const flipFlopColumn = this.createElement('div', 'gates-column', 'flip-flop-column');
        flipFlopColumn.setAttribute('data-column-title', 'Flip-Flops');

        for (let i = 0; i < CONFIG.GATES.AND_COUNT; i++) {
            const gateElement = this.factory.createGate(i);
            leftColumn.appendChild(gateElement);
        }

        for (let i = CONFIG.GATES.AND_COUNT; i < CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT; i++) {
            const gateElement = this.factory.createGate(i);
            middleLeftColumn.appendChild(gateElement);
        }

        for (let i = CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT; 
             i < CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT + CONFIG.GATES.SPECIAL_COUNT + CONFIG.GATES.NOT_COUNT; i++) {
            const gateElement = this.factory.createGate(i);
            middleRightColumn.appendChild(gateElement);
        }
        
        for (let i = CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT + CONFIG.GATES.SPECIAL_COUNT + CONFIG.GATES.NOT_COUNT; 
             i < CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT + CONFIG.GATES.SPECIAL_COUNT + CONFIG.GATES.NOT_COUNT + CONFIG.GATES.ADDER_COUNT + CONFIG.GATES.COMP_4BIT_COUNT + CONFIG.GATES.COMP_BASIC_COUNT + CONFIG.GATES.POWER_COUNT; i++) {
            const gateElement = this.factory.createGate(i);
            rightColumn.appendChild(gateElement);
        }

        // Add flip-flops to the new column
        for (let i = CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT + CONFIG.GATES.SPECIAL_COUNT + CONFIG.GATES.NOT_COUNT + CONFIG.GATES.ADDER_COUNT + CONFIG.GATES.COMP_4BIT_COUNT + CONFIG.GATES.COMP_BASIC_COUNT + CONFIG.GATES.POWER_COUNT; 
             i < CONFIG.GATES.TOTAL_COUNT; i++) {
            const gateElement = this.factory.createGate(i);
            flipFlopColumn.appendChild(gateElement);
        }

        container.appendChild(leftColumn);
        container.appendChild(middleLeftColumn);
        container.appendChild(middleRightColumn);
        container.appendChild(rightColumn);
        container.appendChild(flipFlopColumn);
    }

    initializePowerRails() {
        // Find power rails and initialize their outputs
        this.state.gates.forEach((gate, id) => {
            if (gate && (gate.type === 'POWER_HIGH' || gate.type === 'POWER_LOW')) {
                // Propagate power rail signals
                for (let i = 0; i < 8; i++) {
                    this.state.propagateGateOutputSignal(id, i.toString());
                }
            }
        });
        
        // Update all visual elements after power rails are initialized
        setTimeout(() => {
            this.updateAllVisuals();
        }, 100);
    }

    createElement(tag, ...classNames) {
        const element = document.createElement(tag);
        if (classNames.length > 0) {
            element.className = classNames.join(' ');
        }
        return element;
    }

    initializeLEDs() {
        const container = document.getElementById(CONFIG.ELEMENTS.LEDS_CONTAINER);
        container.innerHTML = '';

        for (let i = 0; i < CONFIG.LEDS.COUNT; i++) {
            const ledElement = this.factory.createLED(i);
            container.appendChild(ledElement);
        }
    }

    initializeBin7Segs() {
        const container = document.getElementById(CONFIG.ELEMENTS.BIN_7SEG_CONTAINER);
        if (!container) {
            return;
        }
        
        container.innerHTML = '';
        
        for (let i = 0; i < CONFIG.BIN_7SEG.COUNT; i++) {
            const bin7segElement = this.factory.createBin7Seg(i);
            container.appendChild(bin7segElement);
        }
    }

    initializeControls() {
        const clearBtn = document.getElementById(CONFIG.ELEMENTS.CLEAR_BTN);
        const saveBtn = document.getElementById(CONFIG.ELEMENTS.SAVE_BTN);
        const loadBtn = document.getElementById(CONFIG.ELEMENTS.LOAD_BTN);

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.showConfirmDialog(
                    'هل أنت متأكد من مسح جميع الاتصالات؟',
                    () => window.connectionManager.clearAllConnections()
                );
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                window.saveLoadManager.saveConfiguration();
            });
        }

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                window.saveLoadManager.loadConfiguration();
            });
        }
    }

    handleStateUpdate(data) {
        switch(data.type) {
            case 'gate':
                this.factory.updateGateVisual(data.id);
                break;
            case 'led':
                this.factory.updateLEDVisual(data.id);
                break;
            case 'bin-7seg':
                this.factory.updateBin7SegDisplay(data.id);
                break;
            case 'reset':
                this.updateAllVisuals();
                break;
            case 'load':
                this.updateAllVisuals();
                this.redrawAllConnections();
                break;
        }
    }

    handleConnectionComplete(connection) {
        this.showToast('تم إنشاء الاتصال بنجاح', 'success');
        
        setTimeout(() => {
            window.wireManager.animateWire(connection.from, connection.to);
        }, 100);
    }

    handleConnectionDelete(connection) {
        // تحقق إذا كان اتصال داخلي (جسر)
        const isInternalBridge = connection.from.type === 'gate-input' && 
                                connection.to.type === 'gate-input' && 
                                connection.from.id === connection.to.id;
        
        if (isInternalBridge) {
            this.showToast(`تم حذف الجسر الداخلي: ${connection.from.inputType}↔${connection.to.inputType}`, 'warning');
        } else {
            this.showToast('تم حذف الاتصال', 'info');
        }
    }

    updateAllVisuals() {
        this.state.inputs.forEach((input, id) => {
            this.factory.updateInputVisual(id);
        });

        this.state.gates.forEach((gate, id) => {
            this.factory.updateGateVisual(id);
        });

        this.state.leds.forEach((led, id) => {
            this.factory.updateLEDVisual(id);
        });

        this.state.bin7segs.forEach((bin7seg, id) => {
            this.factory.updateBin7SegDisplay(id);
        });
    }

    redrawAllConnections() {
        window.wireManager.redrawAllWires();
        
        window.connectionManager.updateAllConnectionPointStates();
    }

    showConfirmDialog(message, onConfirm, onCancel = null) {
        const overlay = this.createOverlay();
        const dialog = this.createConfirmDialog(message, onConfirm, onCancel, overlay);
        
        overlay.appendChild(dialog);
        document.body.appendChild(overlay);
        
        setTimeout(() => {
            dialog.querySelector('.confirm-btn').focus();
        }, 100);
    }

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.className = 'dialog-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
            animation: fadeIn 0.2s ease-out;
            backdrop-filter: blur(3px);
        `;
        
        return overlay;
    }

    createConfirmDialog(message, onConfirm, onCancel, overlay) {
        const dialog = document.createElement('div');
        dialog.className = 'confirm-dialog';
        dialog.style.cssText = `
            background: #16213e;
            border: 2px solid #e94560;
            border-radius: 10px;
            padding: 20px;
            text-align: center;
            color: white;
            min-width: 300px;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        dialog.innerHTML = `
            <div style="margin-bottom: 20px; font-size: 16px;">${message}</div>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button class="confirm-btn" style="
                    background: #e94560;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                ">نعم</button>
                <button class="cancel-btn" style="
                    background: #666;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                ">إلغاء</button>
            </div>
        `;

        dialog.querySelector('.confirm-btn').addEventListener('click', () => {
            onConfirm();
            overlay.remove();
        });

        dialog.querySelector('.cancel-btn').addEventListener('click', () => {
            if (onCancel) onCancel();
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                if (onCancel) onCancel();
                overlay.remove();
            }
        });

        return dialog;
    }

    showToast(message, type = 'info', duration = 3000) {
        const toast = this.createToast(message, type);
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.remove();
                }
            }, 300);
        }, duration);
    }

    createToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const colors = {
            success: '#27ae60',
            error: '#e74c3c',
            warning: '#f39c12',
            info: '#3498db'
        };

        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 10px 16px;
            border-radius: 5px;
            font-size: 12px;
            z-index: 3000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            max-width: 300px;
        `;

        toast.textContent = message;
        return toast;
    }

    showLoading(message = 'جاري التحميل...') {
        const loader = document.createElement('div');
        loader.id = 'loading-indicator';
        loader.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2500;
            color: white;
            font-size: 16px;
            backdrop-filter: blur(5px);
        `;

        loader.innerHTML = `
            <div style="text-align: center;">
                <div style="
                    width: 35px;
                    height: 35px;
                    border: 3px solid #333;
                    border-top: 3px solid #e94560;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 15px;
                "></div>
                <div>${message}</div>
            </div>
        `;

        document.body.appendChild(loader);
        return loader;
    }

    hideLoading() {
        const loader = document.getElementById('loading-indicator');
        if (loader) {
            loader.remove();
        }
    }

    showHelp() {
        const helpContent = `
            <h3>مساعدة - محاكي اللوحة الرقمية</h3>
            <div style="text-align: right; line-height: 1.6; font-size: 14px;">
                <p><strong>المدخلات (Inputs):</strong></p>
                <p>• اضغط على المفتاح لتبديل الحالة بين HIGH و LOW</p>
                <p>• Q يمثل الحالة العادية، Q̅ يمثل الحالة المعكوسة</p>
                
                <p><strong>البوابات المنطقية:</strong></p>
                <p>• <strong>العمود الأول:</strong> 7 بوابات AND (4 مداخل لكل بوابة)</p>
                <p>• <strong>العمود الثاني:</strong> 5 بوابات OR (4 مداخل لكل بوابة)</p>
                <p>• <strong>العمود الثالث:</strong> بوابات خاصة: 3 AB+CD، XOR، XNOR، 2 NOT</p>
                <p>• <strong>العمود الرابع:</strong> 2 جامع 4-بت، 2 مقارن (COMP)، خطوط التغذية (HIGH/LOW)</p>
                <p>• المداخل غير المتصلة: AND=HIGH، OR=LOW، NOT=LOW (مخرج HIGH)</p>
                
                <p><strong>التوصيل:</strong></p>
                <p>• اضغط على نقطة سوداء لبدء التوصيل</p>
                <p>• اضغط على نقطة أخرى لإكمال التوصيل</p>
                <p>• الأسلاك الخضراء السميكة = HIGH، الرمادية الرفيعة = LOW</p>
                <p>• اضغط على الخط لحذفه</p>
                
                <p><strong>اختصارات لوحة المفاتيح:</strong></p>
                <p>• Ctrl+S: حفظ التكوين</p>
                <p>• Ctrl+O: تحميل التكوين</p>
                <p>• Ctrl+Delete: مسح جميع الاتصالات</p>
                <p>• F1: عرض المساعدة</p>
                <p>• Escape: إلغاء الاتصال الحالي</p>
            </div>
        `;

        const overlay = this.createOverlay();
        const helpDialog = this.createHelpDialog(helpContent, overlay);
        
        overlay.appendChild(helpDialog);
        document.body.appendChild(overlay);
    }

    createHelpDialog(content, overlay) {
        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: #16213e;
            border: 2px solid #e94560;
            border-radius: 10px;
            padding: 25px;
            color: white;
            max-width: 700px;
            max-height: 80vh;
            overflow-y: auto;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        `;

        dialog.innerHTML = `
            ${content}
            <div style="text-align: center; margin-top: 20px;">
                <button class="close-help-btn" style="
                    background: #e94560;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    font-size: 14px;
                    transition: all 0.2s ease;
                ">إغلاق</button>
            </div>
        `;

        const closeBtn = dialog.querySelector('.close-help-btn');
        
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        return dialog;
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                window.saveLoadManager.saveConfiguration();
            }
            
            if (e.ctrlKey && e.key === 'o') {
                e.preventDefault();
                window.saveLoadManager.loadConfiguration();
            }
            
            if (e.ctrlKey && e.key === 'Delete') {
                e.preventDefault();
                this.showConfirmDialog(
                    'هل أنت متأكد من مسح جميع الاتصالات؟',
                    () => window.connectionManager.clearAllConnections()
                );
            }
            
            if (e.key === 'F1') {
                e.preventDefault();
                this.showHelp();
            }
            
            if (e.key === 'Escape') {
                window.connectionManager.resetCurrentConnection();
                window.connectionManager.clearTempWire();
            }
        });
    }
}
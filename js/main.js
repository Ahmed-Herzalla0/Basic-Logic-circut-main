class DigitalBoardSimulator {
    constructor() {
        this.stateManager = null;
        this.componentFactory = null;
        this.connectionManager = null;
        this.wireManager = null;
        this.uiManager = null;
        this.saveLoadManager = null;
    }

    async init() {
        try {
            this.initializeCore();
            
            this.initializeUI();
            
            this.setupGlobalReferences();
            
            this.uiManager.setupKeyboardShortcuts();
            
            this.saveLoadManager.enableAutoSave();
            
            if (!this.saveLoadManager.importFromURL()) {
                this.saveLoadManager.restoreAutoSave();
            }
            
            this.showWelcomeMessage();
            
        } catch (error) {
            this.showErrorMessage('خطأ في تهيئة التطبيق: ' + error.message);
        }
    }

    initializeCore() {
        this.stateManager = new StateManager();
        
        this.componentFactory = new ComponentFactory(this.stateManager);
        
        this.wireManager = new WireManager(this.stateManager, this.componentFactory);
        
        this.connectionManager = new ConnectionManager(
            this.stateManager, 
            this.componentFactory, 
            this.wireManager
        );
        
        this.uiManager = new UIManager(this.stateManager, this.componentFactory);
        
        this.saveLoadManager = new SaveLoadManager(this.stateManager);
    }

    initializeUI() {
        this.uiManager.initializeUI();
    }

    setupGlobalReferences() {
        window.stateManager = this.stateManager;
        window.componentFactory = this.componentFactory;
        window.connectionManager = this.connectionManager;
        window.wireManager = this.wireManager;
        window.uiManager = this.uiManager;
        window.saveLoadManager = this.saveLoadManager;
        
        window.clearAllConnections = () => this.connectionManager.clearAllConnections();
        window.toggleInput = (id) => this.stateManager.toggleInput(id);
        window.handleConnectionClick = (e, type, id, pointType) => 
            this.connectionManager.handleConnectionClick(e, type, id, pointType);
    }

    showWelcomeMessage() {
        setTimeout(() => {
            this.uiManager.showToast('مرحباً بك في محاكي اللوحة الرقمية!', 'info', 4000);
            
            setTimeout(() => {
                this.uiManager.showToast('اضغط F1 للحصول على المساعدة', 'info', 3000);
            }, 2000);
        }, 1000);
    }

    showErrorMessage(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #e74c3c;
            color: white;
            padding: 20px;
            border-radius: 10px;
            z-index: 9999;
            text-align: center;
            max-width: 400px;
        `;
        errorDiv.innerHTML = `
            <h3>خطأ</h3>
            <p>${message}</p>
            <button onclick="this.parentElement.remove()" style="
                background: white;
                color: #e74c3c;
                border: none;
                padding: 10px 20px;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 10px;
            ">إغلاق</button>
        `;
        document.body.appendChild(errorDiv);
    }

    cleanup() {
        try {
            const config = this.saveLoadManager.createConfigurationData();
            localStorage.setItem(this.saveLoadManager.storageKey + '_autosave', JSON.stringify(config));
        } catch (error) {
            // Silent fail
        }
    }
}

let app;

document.addEventListener('DOMContentLoaded', async () => {
    app = new DigitalBoardSimulator();
    await app.init();
});

window.addEventListener('beforeunload', () => {
    if (app) {
        app.cleanup();
    }
});

document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        if (app && app.wireManager) {
            setTimeout(() => {
                app.wireManager.redrawAllWires();
            }, 100);
        }
    }
});

window.digitalBoardApp = app;

// 🔧 Debug functions - اكتب في console للتشخيص
window.debugConnections = () => app.stateManager.debugConnections();
window.testBridging = () => {
    console.log('🧪 Testing bridging functionality...');
    console.log('');
    console.log('🔗 Internal Gate Bridging:');
    console.log('1. Connect AND1.A to AND1.B (internal bridge - orange wire)');
    console.log('2. Connect INPUT A.Q to AND1.A');
    console.log('3. Toggle INPUT A to HIGH');
    console.log('4. Both AND1.A and AND1.B should get HIGH signal');
    console.log('');
    console.log('🌉 External Source Bridging:');
    console.log('1. Connect INPUT A.Q to JK1.J (normal connection)');
    console.log('2. Connect JK1.J to JK1.K (external bridge - dashed wire)');
    console.log('3. Toggle INPUT A to HIGH');
    console.log('4. Both JK1.J and JK1.K should get HIGH signal');
    console.log('');
    console.log('Use debugConnections() to see current state');
};
window.clearDebug = () => {
    console.clear();
    console.log('🧹 Debug console cleared. Use testBridging() for testing instructions.');
};

// Test recursion fix
window.testRecursionFix = () => {
    console.log('🧪 Testing recursion fix...');
    
    // Add a JK Flip-Flop
    if (window.componentFactory && window.stateManager) {
        const jkFF = window.componentFactory.createComponent('JK_FF', 100, 100);
        console.log('✅ JK Flip-Flop created');
        
        // Try to create an internal bridge J ↔ K
        const jInput = { type: 'gate-input', id: jkFF.id, inputType: 'J' };
        const kInput = { type: 'gate-input', id: jkFF.id, inputType: 'K' };
        
        // Add connection
        window.stateManager.addConnection(jInput, kInput);
        console.log('✅ Internal bridge J ↔ K created');
        
        // Try to update J input (this should not cause infinite recursion)
        console.log('🔧 Testing updateGateInput...');
        window.stateManager.updateGateInput(jkFF.id, 'J', true);
        console.log('✅ updateGateInput completed without recursion');
        
        console.log('🎉 Recursion fix test passed!');
    } else {
        console.log('❌ Required managers not available');
    }
};

// Test COMP_4BIT new logic
window.testCOMP4BIT = () => {
    console.log('🧪 Testing COMP_4BIT new logic...');
    console.log('');
    
    if (window.componentFactory && window.stateManager) {
        // Create COMP_4BIT
        const comp = window.componentFactory.createComponent('COMP_4BIT', 200, 200);
        console.log('✅ COMP_4BIT created');
        
        // Set P=5 (binary: 0101)
        window.stateManager.updateGateInput(comp.id, 'A0', true);  // bit 0 = 1
        window.stateManager.updateGateInput(comp.id, 'A1', false); // bit 1 = 0
        window.stateManager.updateGateInput(comp.id, 'A2', true);  // bit 2 = 1
        window.stateManager.updateGateInput(comp.id, 'A3', false); // bit 3 = 0
        
        // Set Q=3 (binary: 0011)
        window.stateManager.updateGateInput(comp.id, 'B0', true);  // bit 0 = 1
        window.stateManager.updateGateInput(comp.id, 'B1', true);  // bit 1 = 1
        window.stateManager.updateGateInput(comp.id, 'B2', false); // bit 2 = 0
        window.stateManager.updateGateInput(comp.id, 'B3', false); // bit 3 = 0
        
        console.log('✅ Set P=5, Q=3 (P > Q is true)');
        
        // Test > input with LOW (should enable P>Q output)
        console.log('');
        console.log('🔧 Testing > input with LOW:');
        window.stateManager.updateGateInput(comp.id, '>', false); // LOW = enable
        console.log('Expected: P>Q should be HIGH');
        
        // Test > input with HIGH (should disable P>Q output) 
        console.log('');
        console.log('🔧 Testing > input with HIGH:');
        window.stateManager.updateGateInput(comp.id, '>', true); // HIGH = disable
        console.log('Expected: P>Q should be LOW');
        
        console.log('');
        console.log('📋 New COMP_4BIT Logic:');
        console.log('- > input needs LOW to enable P>Q output');
        console.log('- < input needs LOW to enable P<Q output'); 
        console.log('- = input needs HIGH to enable P=Q output');
        console.log('');
        console.log('🎉 COMP_4BIT test completed!');
    } else {
        console.log('❌ Required managers not available');
    }
};

// 🎨 دالة لفحص جميع الأسلاك البصرية
window.checkWireVisuals = () => {
    console.log('🎨 Checking all wire visuals...');
    
    const allWires = document.querySelectorAll('.wire-line');
    const highWires = document.querySelectorAll('.wire-line.high-state');
    const lowWires = document.querySelectorAll('.wire-line.low-state');
    const bridgeWires = document.querySelectorAll('.wire-line.bridged-connection');
    const internalWires = document.querySelectorAll('.wire-line.internal-bridge');
    
    console.log(`📊 Wire Statistics:`);
    console.log(`  Total wires: ${allWires.length}`);
    console.log(`  HIGH wires (green): ${highWires.length}`);
    console.log(`  LOW wires (gray): ${lowWires.length}`);
    console.log(`  Bridge wires: ${bridgeWires.length}`);
    console.log(`  Internal bridge wires: ${internalWires.length}`);
    
    internalWires.forEach((wire, index) => {
        const isHigh = wire.classList.contains('high-state');
        console.log(`  Internal wire ${index}: ${isHigh ? '🟢 HIGH' : '⚫ LOW'}`);
    });
    
    return {
        total: allWires.length,
        high: highWires.length,
        low: lowWires.length,
        bridged: bridgeWires.length,
        internal: internalWires.length
    };
};

// 🗑️ دالة اختبار حذف الاتصالات مع الحفاظ على الجسور الداخلية
window.testConnectionDeletion = () => {
    console.log('🗑️ Testing connection deletion with internal bridges...');
    
    const stateManager = app.stateManager;
    
    // ابحث عن جسر داخلي
    const internalBridge = stateManager.connections.find(conn => 
        conn.from.type === 'gate-input' && conn.to.type === 'gate-input' && 
        conn.from.id === conn.to.id
    );
    
    if (!internalBridge) {
        console.log('❌ No internal bridge found. Please create one first (e.g., A↔B in same gate)');
        return;
    }
    
    const gateId = internalBridge.from.id;
    console.log(`✅ Found internal bridge in gate ${gateId}: ${internalBridge.from.inputType}↔${internalBridge.to.inputType}`);
    
    // تطبيق إشارة HIGH على أحد المدخلين
    console.log('🔥 Setting input signal HIGH...');
    stateManager.updateGateInput(gateId, internalBridge.from.inputType, true);
    
    setTimeout(() => {
        // فحص الحالة قبل الحذف
        console.log('\n--- Before deletion ---');
        checkWireVisuals();
        
        // محاكاة حذف اتصال آخر (ليس الجسر الداخلي)
        const externalConnection = stateManager.connections.find(conn => 
            !(conn.from.type === 'gate-input' && conn.to.type === 'gate-input' && 
              conn.from.id === conn.to.id)
        );
        
        if (externalConnection) {
            console.log('\n🗑️ Deleting external connection...');
            window.connectionManager.deleteConnection(externalConnection.from, externalConnection.to);
            
            setTimeout(() => {
                console.log('\n--- After deletion ---');
                checkWireVisuals();
                
                const internalWires = document.querySelectorAll('.wire-line.internal-bridge.high-state');
                console.log(`🎨 Internal bridges still HIGH: ${internalWires.length}`);
                
                if (internalWires.length > 0) {
                    console.log('✅ SUCCESS: Internal bridges maintained their state!');
                } else {
                    console.log('❌ ISSUE: Internal bridges lost their HIGH state');
                }
            }, 100);
        } else {
            console.log('❌ No external connections found to test deletion');
        }
    }, 100);
};

// ⚡ دالة اختبار T Flip-Flop
window.testTFlipFlop = () => {
    console.log('⚡ Testing T Flip-Flop functionality...');
    
    const stateManager = app.stateManager;
    
    // البحث عن JK Flip-Flop مع جسر J↔K
    let tFlipFlopFound = false;
    stateManager.gates.forEach((gate, id) => {
        if (gate && gate.type === 'JK_FF') {
            const hasJKBridge = stateManager.hasInternalBridge(id, 'J', 'K');
            if (hasJKBridge) {
                console.log(`✅ Found T Flip-Flop: JK${id} (J↔K bridge detected)`);
                
                // محاكاة تسلسل T: 0→1→0→1 مع PULSE
                console.log('🔥 Testing T sequence: T=0→1→0→1 with PULSE...');
                
                let testState = false;
                const testSequence = [false, true, false, true];
                let testIndex = 0;
                
                const runTest = () => {
                    if (testIndex >= testSequence.length) {
                        console.log('🏁 T Flip-Flop test completed!');
                        return;
                    }
                    
                    const T_value = testSequence[testIndex];
                    console.log(`\n--- Test ${testIndex + 1}: T=${T_value ? 1 : 0} ---`);
                    
                    // تطبيق قيمة T على J (أو K - نفس الشيء لأنهما مربوطان)
                    stateManager.updateGateInput(id, 'J', T_value);
                    
                    // محاكاة PULSE (rising edge)
                    setTimeout(() => {
                        console.log('📡 PULSE rising edge...');
                        stateManager.updateGateInput(id, 'C', true);
                        
                        setTimeout(() => {
                            console.log('📡 PULSE falling edge...');
                            stateManager.updateGateInput(id, 'C', false);
                            
                            const currentOutput = gate.output;
                            console.log(`📊 Result: Q=${currentOutput ? 1 : 0}`);
                            
                            if (T_value) {
                                console.log(`✅ Expected: Toggle (should change from previous state)`);
                            } else {
                                console.log(`✅ Expected: No Change (should maintain previous state)`);
                            }
                            
                            testIndex++;
                            setTimeout(runTest, 500); // الاختبار التالي بعد 500ms
                        }, 100);
                    }, 100);
                };
                
                runTest();
                tFlipFlopFound = true;
                return; // توقف عند أول T flip-flop
            }
        }
    });
    
    if (!tFlipFlopFound) {
        console.log('❌ No T Flip-Flop found. Please:');
        console.log('1. Connect JK.J to JK.K (internal bridge)');
        console.log('2. Connect INPUT to JK.J (for T signal)');
        console.log('3. Connect PULSE to JK.C (for clock)');
    }
};

// 🧪 دالة اختبار مباشرة للجسور الداخلية
window.testInternalBridge = () => {
    console.log('🧪 Testing internal gate bridging directly...');
    
    const stateManager = app.stateManager;
    
    // اختبار: إذا كان هناك جسر A→D في البوابة 0
    const testConnection = stateManager.connections.find(conn => 
        conn.from.type === 'gate-input' && conn.from.id === 0 &&
        conn.to.type === 'gate-input' && conn.to.id === 0
    );
    
    if (testConnection) {
        console.log(`✅ Found internal bridge: ${testConnection.from.inputType} → ${testConnection.to.inputType}`);
        
        // محاكاة إشارة HIGH على المدخل الأول
        console.log('🔥 Simulating HIGH signal on first input...');
        stateManager.updateGateInput(0, testConnection.from.inputType, true);
        
        // فحص النتيجة
        setTimeout(() => {
            const gate = stateManager.gates[0];
            if (gate) {
                console.log(`📊 Gate 0 state:`);
                console.log(`  Inputs: [${gate.inputs.join(', ')}]`);
                console.log(`  Connected: [${gate.connected.join(', ')}]`);
                console.log(`  Output: ${gate.output}`);
                
                const expectedOutput = gate.inputs.every(input => input === true);
                console.log(`  Expected output for AND: ${expectedOutput}`);
                
                // فحص الأسلاك البصرية
                const wireElements = document.querySelectorAll('.wire-line.internal-bridge');
                console.log(`🎨 Found ${wireElements.length} internal bridge wires`);
                wireElements.forEach((wire, index) => {
                    const isHigh = wire.classList.contains('high-state');
                    console.log(`  Wire ${index}: ${isHigh ? 'HIGH (green)' : 'LOW (gray)'}`);
                });
            }
        }, 100);
    } else {
        console.log('❌ No internal bridge found. Please create A→D connection in first gate.');
    }
};
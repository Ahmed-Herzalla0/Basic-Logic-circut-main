class StateManager {
    constructor() {
        this.inputs = [];
        this.gates = [];
        this.leds = [];
        this.bin7segs = [];
        this.pulses = [];
        this.connections = [];
        this.currentConnection = null;
        this.listeners = {};
        this.updateInProgress = new Set(); // ⭐ إضافة حماية من التكرار اللانهائي
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    emit(event, data) {
        if (this.listeners[event]) {
            this.listeners[event].forEach(callback => callback(data));
        }
    }

    toggleInput(id) {
        if (this.inputs[id]) {
            const oldState = this.inputs[id].state;
            this.inputs[id].state = !this.inputs[id].state;
            console.log(`🔄 DEBUG: Input ${id} toggled from ${oldState} to ${this.inputs[id].state}`);
            this.emit(CONFIG.EVENTS.INPUT_TOGGLE, { id, state: this.inputs[id].state });
            this.updateConnectedElements(id, 'input');
            return this.inputs[id].state;
        }
        return false;
    }

    getInputState(id, outputType = 'q') {
        if (!this.inputs[id]) return false;
        const inputState = this.inputs[id].state;
        return outputType === 'q' ? inputState : !inputState;
    }

    updateGateInput(gateId, inputType, state) {
        const gate = this.gates[gateId];
        if (!gate) return;

        // ⭐ حماية من التكرار اللانهائي
        const updateKey = `gate-${gateId}-${inputType}`;
        if (this.updateInProgress.has(updateKey)) {
            console.log(`🔄 DEBUG: Update already in progress for ${updateKey}, skipping to prevent recursion`);
            return;
        }
        
        this.updateInProgress.add(updateKey);
        
        try {
            const inputIndex = this.getInputIndex(inputType, gate.type);
            if (inputIndex !== -1 && inputIndex < gate.inputs.length) {
                console.log(`🔧 DEBUG: Setting gate ${gateId} input ${inputType}[${inputIndex}] = ${state}`);
                gate.inputs[inputIndex] = state;
                gate.connected[inputIndex] = true;
                
                // ⭐ إذا تم تحديث مدخل، تحقق من الجسور الداخلية وحدث الأسلاك
                this.propagateGateInputBridge(gateId, inputType, state);
                this.updateInternalWireVisuals(gateId, inputType, state);
            }

            const newOutput = this.calculateGateOutput(gate);
            console.log(`📊 DEBUG: Gate ${gateId} calculated output: ${newOutput} (inputs: [${gate.inputs.join(', ')}])`);
            
            if (gate.type === 'ADDER_4BIT') {
            gate.output = newOutput;
            this.emit(CONFIG.EVENTS.STATE_UPDATE, {
                type: 'gate',
                id: gateId,
                output: newOutput
            });
            
            if (gate.outputs) {
                this.propagateGateOutputSignal(gateId, 'S0');
                this.propagateGateOutputSignal(gateId, 'S1');
                this.propagateGateOutputSignal(gateId, 'S2');
                this.propagateGateOutputSignal(gateId, 'S3');
                this.propagateGateOutputSignal(gateId, 'CO');
            }
        } else if (gate.type === 'COMP_4BIT' || gate.type === 'COMP_BASIC') {
            gate.output = newOutput;
            this.emit(CONFIG.EVENTS.STATE_UPDATE, {
                type: 'gate',
                id: gateId,
                output: newOutput
            });
            
            if (gate.outputs) {
                this.propagateGateOutputSignal(gateId, 'P>Q');
                this.propagateGateOutputSignal(gateId, 'P=Q');
                this.propagateGateOutputSignal(gateId, 'P<Q');
            }
        } else if (gate.type === 'JK_FF' || gate.type === 'D_FF') {
            // Flip-flops: always update and propagate (they manage their own state internally)
            const oldOutput = gate.output;
            gate.output = newOutput;
            
            // Update outputs object for flip-flops
            gate.outputs = {
                'q': gate.output,
                'q_not': !gate.output
            };
            
            console.log(`📤 ${gate.type}${gateId}: Always propagating Q=${gate.output}, Q̅=${!gate.output}`);
            
            this.emit(CONFIG.EVENTS.STATE_UPDATE, {
                type: 'gate',
                id: gateId,
                output: newOutput
            });
            
            this.updateConnectedElements(gateId, 'gate-output');
            this.propagateGateOutputSignal(gateId, 'q');
            this.propagateGateOutputSignal(gateId, 'q_not');
        } else if (gate.type === 'POWER_HIGH' || gate.type === 'POWER_LOW') {
            for (let i = 0; i < 8; i++) {
                this.propagateGateOutputSignal(gateId, i.toString());
            }
        } else if (gate.output !== newOutput) {
            gate.output = newOutput;
            this.emit(CONFIG.EVENTS.STATE_UPDATE, {
                type: 'gate',
                id: gateId,
                output: newOutput
            });
            
            this.updateConnectedElements(gateId, 'gate-output');
            this.propagateGateOutputSignal(gateId, 'q');
            this.propagateGateOutputSignal(gateId, 'q_not');
        }
        
        } finally {
            // ⭐ إزالة مفتاح التحديث من المجموعة بعد انتهاء العملية
            this.updateInProgress.delete(updateKey);
        }
    }

    getSourceState(source) {
        switch(source.type) {
            case 'input':
                return this.getInputState(source.id, source.outputType);
            case 'pulse':
                return this.getPulseState(source.id, source.outputType);
            case 'gate-output':
                return this.getGateOutputState(source.id, source.outputType);
            case 'led':
                return this.leds[source.id]?.state || false;
            case 'gate-input':
                return this.getGateOutputState(source.id, 'q');
            default:
                return false;
        }
    }

    getPulseState(id, outputType = 'q') {
        if (!this.pulses[id]) return false;
        const pulseState = this.pulses[id].state;
        return outputType === 'q' ? pulseState : !pulseState;
    }

    getInputIndex(inputType, gateType = null) {
        // Check gate-specific mappings first
        if (gateType === 'JK_FF') {
            const jkFFMapping = {
                'S': 0, 'J': 1, 'C': 2, 'K': 3, 'R': 4
            };
            if (jkFFMapping[inputType] !== undefined) {
                return jkFFMapping[inputType];
            }
        }
        
        if (gateType === 'D_FF') {
            const dFFMapping = { 'D': 0, 'C': 1 };
            if (dFFMapping[inputType] !== undefined) {
                return dFFMapping[inputType];
            }
        }
        
        if (gateType === 'ADDER_4BIT') {
            const adderMapping = {
                'A0': 0, 'A1': 1, 'A2': 2, 'A3': 3,
                'B0': 4, 'B1': 5, 'B2': 6, 'B3': 7,
                'Cin': 8
            };
            if (adderMapping[inputType] !== undefined) {
                return adderMapping[inputType];
            }
        }
        
        if (gateType === 'COMP_4BIT') {
            const comp4BitMapping = {
                'A0': 0, 'A1': 1, 'A2': 2, 'A3': 3,
                'B0': 4, 'B1': 5, 'B2': 6, 'B3': 7,
                '>': 8, '<': 9, '=': 10
            };
            if (comp4BitMapping[inputType] !== undefined) {
                return comp4BitMapping[inputType];
            }
        }
        
        if (gateType === 'COMP_BASIC') {
            const compBasicMapping = { 'P': 0, 'Q': 1 };
            if (compBasicMapping[inputType] !== undefined) {
                return compBasicMapping[inputType];
            }
        }
        
        // Default mapping for basic gates
        const mapping = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
        return mapping[inputType] !== undefined ? mapping[inputType] : -1;
    }

    calculateGateOutput(gate) {
        switch(gate.type) {
            case 'AND':
                const effectiveInputs = gate.inputs.map((input, index) => 
                    gate.connected[index] ? input : true
                );
                return effectiveInputs.every(input => input === true);
                
            case 'OR':
                const effectiveInputsOr = gate.inputs.map((input, index) => 
                    gate.connected[index] ? input : false
                );
                return effectiveInputsOr.some(input => input === true);
                
            case 'AB_CD':
                const A = gate.connected[0] ? gate.inputs[0] : true;
                const B = gate.connected[1] ? gate.inputs[1] : true;
                const C_input = gate.connected[2] ? gate.inputs[2] : true;
                const D_input = gate.connected[3] ? gate.inputs[3] : true;
                return (A && B) || (C_input && D_input);
                
            case 'XOR':
                const connectedXorInputs = gate.inputs.filter((input, index) => 
                    gate.connected[index] && index < gate.inputCount
                );
                return connectedXorInputs.filter(input => input).length % 2 === 1;
                
            case 'XNOR':
                const connectedXnorInputs = gate.inputs.filter((input, index) => 
                    gate.connected[index] && index < gate.inputCount
                );
                return connectedXnorInputs.filter(input => input).length % 2 === 0;
                
            case 'NOT':
                return gate.connected[0] ? !gate.inputs[0] : true;
                
            case 'ADDER_4BIT':
                let A_value = 0;
                let B_value = 0;
                let carry_in = 0;
                
                for (let i = 0; i < 4; i++) {
                    if (gate.connected[i] && gate.inputs[i]) {
                        A_value += (1 << i);
                    }
                }
                
                for (let i = 0; i < 4; i++) {
                    if (gate.connected[i + 4] && gate.inputs[i + 4]) {
                        B_value += (1 << i);
                    }
                }
                
                if (gate.connected[8] && gate.inputs[8]) {
                    carry_in = 1;
                }
                
                const sum = A_value + B_value + carry_in;
                
                gate.outputs = {
                    S0: (sum & 1) > 0,
                    S1: (sum & 2) > 0,
                    S2: (sum & 4) > 0,
                    S3: (sum & 8) > 0,
                    CO: sum > 15
                };
                
                return true;
                
            case 'COMP_4BIT':
                let P_value = 0;
                let Q_value = 0;
                
                for (let i = 0; i < 4; i++) {
                    if (gate.connected[i] && gate.inputs[i]) {
                        P_value += (1 << i);
                    }
                }
                
                for (let i = 0; i < 4; i++) {
                    if (gate.connected[i + 4] && gate.inputs[i + 4]) {
                        Q_value += (1 << i);
                    }
                }
                
                const isGreater = P_value > Q_value;
                const isEqual = P_value === Q_value;
                const isLess = P_value < Q_value;
                
                // ⭐ المنطق المحدث: > و < يحتاجان LOW، = يحتاج HIGH
                const greaterInput = gate.connected[8] ? gate.inputs[8] : true; // افتراضي HIGH (معطل)
                const lessInput = gate.connected[9] ? gate.inputs[9] : true; // افتراضي HIGH (معطل)  
                const equalInput = gate.connected[10] ? gate.inputs[10] : false; // افتراضي LOW (معطل)
                
                let finalGreater = isGreater;
                let finalEqual = isEqual;
                let finalLess = isLess;
                
                if (gate.connected[8]) {
                    finalGreater = isGreater && !greaterInput; // LOW = مفعل
                }
                if (gate.connected[9]) {
                    finalLess = isLess && !lessInput; // LOW = مفعل
                }
                if (gate.connected[10]) {
                    finalEqual = isEqual && equalInput; // HIGH = مفعل
                }
                
                console.log(`🔧 COMP4: P=${P_value}, Q=${Q_value}, >input=${greaterInput}, <input=${lessInput}, =input=${equalInput}`);
                console.log(`🔧 COMP4: Results: P>Q=${finalGreater}, P=Q=${finalEqual}, P<Q=${finalLess}`);
                
                gate.outputs = {
                    'P>Q': finalGreater,
                    'P=Q': finalEqual,
                    'P<Q': finalLess
                };
                
                return true;
                
            case 'COMP_BASIC':
                const P_input = gate.connected[0] ? gate.inputs[0] : false;
                const Q_input = gate.connected[1] ? gate.inputs[1] : false;
                
                const P_val = P_input ? 1 : 0;
                const Q_val = Q_input ? 1 : 0;
                
                gate.outputs = {
                    'P>Q': P_val > Q_val,
                    'P=Q': P_val === Q_val,
                    'P<Q': P_val < Q_val
                };
                
                return true;
                
            case 'POWER_HIGH':
                return true;
                
            case 'POWER_LOW':
                return false;
                
            case 'JK_FF':
                // Enhanced JK/SCR/T Flip-flop with automatic mode detection
                const S_hybrid = gate.connected[0] ? gate.inputs[0] : false;
                const J_hybrid = gate.connected[1] ? gate.inputs[1] : false;
                const C_hybrid = gate.connected[2] ? gate.inputs[2] : false;
                const K_hybrid = gate.connected[3] ? gate.inputs[3] : false;
                const R_hybrid = gate.connected[4] ? gate.inputs[4] : false;
                
                // ⭐ تحديد نمط التشغيل المتقدم
                const hasSR = gate.connected[0] || gate.connected[4]; // S or R connected
                const hasJK = gate.connected[1] || gate.connected[3]; // J or K connected
                
                // ⭐ فحص إذا كان هناك جسر داخلي J↔K (T mode)
                const hasInternalJKBridge = this.hasInternalBridge(gate.id, 'J', 'K');
                
                let mode = 'NONE';
                if (hasInternalJKBridge && hasJK) {
                    mode = 'T'; // T Flip-flop mode (J and K bridged together)
                } else if (hasSR && hasJK) {
                    mode = 'MIXED'; // Both modes - prioritize SCR
                } else if (hasSR) {
                    mode = 'SCR';
                } else if (hasJK) {
                    mode = 'JK';
                }
                
                console.log(`🔧 JK${gate.id}: mode=${mode}, bridge=${hasInternalJKBridge}, inputs=[${gate.inputs}], S=${S_hybrid}, J=${J_hybrid}, C=${C_hybrid}, K=${K_hybrid}, R=${R_hybrid}`);
                
                // Initialize output if not set
                if (gate.output === undefined) {
                    gate.output = false;
                }
                
                // Initialize outputs object
                if (!gate.outputs) {
                    gate.outputs = {
                        'q': gate.output,
                        'q_not': !gate.output
                    };
                }
                
                // Initialize previous clock if not set
                if (gate.previousClock === undefined) {
                    gate.previousClock = false; // Start with LOW
                }
                
                // Check for rising edge on C (from LOW to HIGH)
                const risingEdge_hybrid = gate.previousClock === false && C_hybrid === true;
                console.log(`🔧 JK${gate.id}: prevClock=${gate.previousClock}, C=${C_hybrid}, edge=${risingEdge_hybrid}`);
                
                if (risingEdge_hybrid) {
                    if (mode === 'T') {
                        // ⭐ T Flip-flop mode: T=0→No Change, T=1→Toggle
                        const T_input = J_hybrid || K_hybrid; // Either J or K represents T
                        if (T_input) {
                            gate.output = !gate.output; // Toggle
                            console.log(`🔧 JK${gate.id}: T mode - TOGGLE (T=1) to ${gate.output}`);
                        } else {
                            // T=0, maintain current state
                            console.log(`🔧 JK${gate.id}: T mode - NO CHANGE (T=0), state=${gate.output}`);
                        }
                    } else if (mode === 'SCR' || mode === 'MIXED') {
                        // SCR mode behavior
                        if (S_hybrid && R_hybrid) {
                            // Invalid state - maintain current state
                            console.log(`🔧 JK${gate.id}: SCR mode - Invalid S=R=1, maintaining state`);
                        } else if (S_hybrid && !R_hybrid) {
                            gate.output = true; // Set
                            console.log(`🔧 JK${gate.id}: SCR mode - SET to true`);
                        } else if (!S_hybrid && R_hybrid) {
                            gate.output = false; // Reset
                            console.log(`🔧 JK${gate.id}: SCR mode - RESET to false`);
                        }
                        // If S=0 and R=0, maintain current state
                    } else if (mode === 'JK') {
                        // Standard JK mode behavior
                        if (J_hybrid && K_hybrid) {
                            gate.output = !gate.output; // Toggle
                            console.log(`🔧 JK${gate.id}: JK mode - TOGGLE to ${gate.output}`);
                        } else if (J_hybrid && !K_hybrid) {
                            gate.output = true; // Set
                            console.log(`🔧 JK${gate.id}: JK mode - SET to true`);
                        } else if (!J_hybrid && K_hybrid) {
                            gate.output = false; // Reset
                            console.log(`🔧 JK${gate.id}: JK mode - RESET to false`);
                        }
                        // If J=0 and K=0, maintain current state
                    }
                    // If mode === 'NONE', just maintain current state
                }
                
                gate.previousClock = C_hybrid;
                
                // Store separate Q and Q̅ outputs
                gate.outputs = {
                    'q': gate.output,
                    'q_not': !gate.output
                };
                
                console.log(`🔧 JK${gate.id}: Final Q=${gate.output}, Q̅=${!gate.output}`);
                return gate.output;
                
            case 'D_FF':
                // D Flip-flop with D and C inputs
                const D_ff = gate.connected[0] ? gate.inputs[0] : false;
                const C_ff = gate.connected[1] ? gate.inputs[1] : false;
                
                console.log(`🔧 D${gate.id}: inputs=[${gate.inputs}], D=${D_ff}, C=${C_ff}`);
                
                // Initialize output if not set
                if (gate.output === undefined) {
                    gate.output = false;
                }
                
                // Initialize outputs object
                if (!gate.outputs) {
                    gate.outputs = {
                        'q': gate.output,
                        'q_not': !gate.output
                    };
                }
                
                // Initialize previous clock if not set
                if (gate.previousClock === undefined) {
                    gate.previousClock = false; // Start with LOW to detect first pulse
                }
                
                // Check for rising edge on C (from LOW to HIGH)
                const risingEdge_d = gate.previousClock === false && C_ff === true;
                console.log(`🔧 D${gate.id}: prevClock=${gate.previousClock}, C=${C_ff}, edge=${risingEdge_d}`);
                
                if (risingEdge_d) {
                    gate.output = D_ff;
                    console.log(`🔧 D${gate.id}: EDGE! Output = ${gate.output}`);
                }
                
                gate.previousClock = C_ff;
                
                // Store separate Q and Q̅ outputs
                gate.outputs = {
                    'q': gate.output,
                    'q_not': !gate.output
                };
                
                console.log(`🔧 D${gate.id}: Final Q=${gate.output}, Q̅=${!gate.output}`);
                return gate.output;
                
            default:
                return false;
        }
    }

    disconnectGateInput(gateId, inputType) {
        const gate = this.gates[gateId];
        if (!gate) return;

        const inputIndex = this.getInputIndex(inputType, gate.type);
        if (inputIndex !== -1 && inputIndex < gate.inputs.length) {
            gate.inputs[inputIndex] = false;
            gate.connected[inputIndex] = false;
            
            const newOutput = this.calculateGateOutput(gate);
            if (gate.output !== newOutput) {
                gate.output = newOutput;
                this.emit(CONFIG.EVENTS.STATE_UPDATE, {
                    type: 'gate',
                    id: gateId,
                    output: newOutput
                });
                this.updateConnectedElements(gateId, 'gate-output');
            }
        }
    }

    getGateOutputState(gateId, outputType = 'q') {
        const gate = this.gates[gateId];
        if (!gate) return false;
        
        if (gate.type === 'ADDER_4BIT' && gate.outputs) {
            return gate.outputs[outputType] || false;
        }
        
        if (gate.type === 'COMP_4BIT' && gate.outputs) {
            return gate.outputs[outputType] || false;
        }
        
        if (gate.type === 'COMP_BASIC' && gate.outputs) {
            return gate.outputs[outputType] || false;
        }
        
        // Flip-flops have separate Q and Q̅ outputs
        if ((gate.type === 'JK_FF' || gate.type === 'D_FF') && gate.outputs) {
            return gate.outputs[outputType] || false;
        }
        
        if (gate.type === 'POWER_HIGH') {
            return true;
        }
        
        if (gate.type === 'POWER_LOW') {
            return false;
        }
        
        return outputType === 'q' ? gate.output : !gate.output;
    }

    updateLED(id, state) {
        if (this.leds[id]) {
            this.leds[id].state = state;
            this.emit(CONFIG.EVENTS.STATE_UPDATE, {
                type: 'led',
                id,
                state
            });
        }
    }

    updateBin7Seg(id, inputType, state) {
        const bin7seg = this.bin7segs[id];
        if (!bin7seg) return;
        
        if (inputType.startsWith('bcd1_')) {
            const bitValue = inputType.split('_')[1];
            let bitIndex = -1;
            switch(bitValue) {
                case '1': bitIndex = 0; break;
                case '2': bitIndex = 1; break;
                case '4': bitIndex = 2; break;
                case '8': bitIndex = 3; break;
            }
            
            if (bitIndex >= 0) {
                if (state) {
                    bin7seg.displays[0].value |= (1 << bitIndex);
                } else {
                    bin7seg.displays[0].value &= ~(1 << bitIndex);
                }
            }
        } else if (inputType.startsWith('bcd2_')) {
            const bitValue = inputType.split('_')[1];
            let bitIndex = -1;
            switch(bitValue) {
                case '1': bitIndex = 0; break;
                case '2': bitIndex = 1; break;
                case '4': bitIndex = 2; break;
                case '8': bitIndex = 3; break;
            }
            
            if (bitIndex >= 0) {
                if (state) {
                    bin7seg.displays[1].value |= (1 << bitIndex);
                } else {
                    bin7seg.displays[1].value &= ~(1 << bitIndex);
                }
            }
        } else if (inputType.startsWith('segment_')) {
            const segmentName = inputType.split('_')[1];
            if (bin7seg.displays[2].segments[segmentName]) {
                bin7seg.displays[2].segments[segmentName].directControl = state;
            }
        }
        
        this.emit(CONFIG.EVENTS.STATE_UPDATE, {
            type: 'bin-7seg',
            id,
            displays: bin7seg.displays
        });
    }

    addConnection(from, to) {
        const connection = { from, to };
        this.connections.push(connection);
        this.emit(CONFIG.EVENTS.CONNECTION_COMPLETE, connection);
        return connection;
    }

    removeConnection(connection) {
        const index = this.connections.findIndex(conn => 
            this.connectionsEqual(conn, connection)
        );
        
        if (index !== -1) {
            const removed = this.connections.splice(index, 1)[0];
            this.emit(CONFIG.EVENTS.CONNECTION_DELETE, removed);
            return removed;
        }
        return null;
    }

    connectionsEqual(conn1, conn2) {
        return (
            conn1.from.type === conn2.from.type &&
            conn1.from.id === conn2.from.id &&
            conn1.from.outputType === conn2.from.outputType &&
            conn1.to.type === conn2.to.type &&
            conn1.to.id === conn2.to.id &&
            conn1.to.inputType === conn2.to.inputType
        );
    }

    connectionExists(from, to) {
        return this.connections.some(conn => 
            this.connectionsEqual(conn, { from, to }) ||
            this.connectionsEqual(conn, { from: to, to: from })
        );
    }

    updateConnectedElements(sourceId, sourceType, outputType = null) {
        this.connections.forEach(conn => {
            if (conn.from.type === sourceType && conn.from.id === sourceId) {
                if (outputType === null || conn.from.outputType === outputType) {
                    const sourceState = this.getSourceState(conn.from);
                    this.propagateState(conn.to, sourceState);
                    
                    if (window.wireManager) {
                        window.wireManager.updateWireState(conn.from, conn.to, sourceState);
                    }
                    
                    // ⭐ إضافة انتشار ثنائي الاتجاه للاتصالات المباشرة (بين المصادر وgate-inputs)
                    const bridgeableTypes = ['input', 'pulse', 'gate-output', 'gate-input'];
                    if (bridgeableTypes.includes(conn.to.type)) {
                        console.log(`🔄 DEBUG: Calling bidirectional propagation from ${sourceType}${sourceId} to ${conn.to.type}${conn.to.id}`);
                        this.propagateBidirectionalSignal(conn.to, sourceState);
                    }
                }
            }
            
            if (conn.to.type === sourceType && conn.to.id === sourceId) {
                if (outputType === null || conn.to.inputType === outputType) {
                    const sourceState = this.getSourceState(conn.to);
                    this.propagateState(conn.from, sourceState);
                    
                    if (window.wireManager) {
                        window.wireManager.updateWireState(conn.to, conn.from, sourceState);
                    }
                    
                    // ⭐ إضافة انتشار ثنائي الاتجاه للاتصالات المباشرة (بين المصادر وgate-inputs)
                    const bridgeableTypes = ['input', 'pulse', 'gate-output', 'gate-input'];
                    if (bridgeableTypes.includes(conn.from.type)) {
                        console.log(`🔄 DEBUG: Calling bidirectional propagation from ${sourceType}${sourceId} to ${conn.from.type}${conn.from.id}`);
                        this.propagateBidirectionalSignal(conn.from, sourceState);
                    }
                }
            }
        });
    }

    propagateState(target, state) {
        switch(target.type) {
            case 'led':
                this.updateLED(target.id, state);
                break;
            case 'gate-input':
                this.updateGateInput(target.id, target.inputType, state);
                // ⭐ أيضاً تحديث الأسلاك الداخلية عند انتشار الإشارة
                this.updateInternalWireVisuals(target.id, target.inputType, state);
                break;
            case 'input':
                this.propagateInputSignal(target.id, target.inputType, state);
                break;
            case 'pulse':
                this.propagatePulseSignal(target.id, target.inputType, state);
                break;
            case 'gate-output':
                this.propagateGateOutputSignal(target.id, target.outputType, state);
                break;
            case 'bin-7seg':
                this.updateBin7Seg(target.id, target.inputType, state);
                break;
        }
    }

    // ⭐ دالة جديدة للانتشار ثنائي الاتجاه للاتصالات المباشرة
    propagateBidirectionalSignal(node, state) {
        console.log(`🌉 DEBUG: propagateBidirectionalSignal called for ${node.type}${node.id} with state ${state}`);
        
        const sourceTypes = ['input', 'pulse', 'gate-output'];
        const bridgeableTypes = ['input', 'pulse', 'gate-output', 'gate-input']; // ⭐ إضافة gate-input للجسور
        
        // تحقق إذا كان هذا العقدة يمكن عمل bridge معها
        if (!bridgeableTypes.includes(node.type)) {
            console.log(`❌ DEBUG: Node ${node.type}${node.id} is not bridgeable type, skipping`);
            return;
        }
        
        // تتبع العقد المعالجة لتجنب التكرار اللانهائي
        const processedNodes = new Set();
        
        // دالة داخلية للانتشار التكراري
        const propagateRecursive = (currentNode, currentState, visited = new Set()) => {
            const nodeKey = `${currentNode.type}-${currentNode.id}-${currentNode.outputType || currentNode.inputType}`;
            
            console.log(`🔍 DEBUG: Processing node ${nodeKey} with state ${currentState}`);
            
            if (visited.has(nodeKey)) {
                console.log(`🔄 DEBUG: Node ${nodeKey} already visited, skipping to avoid infinite loop`);
                return; // تجنب الدوران اللانهائي
            }
            visited.add(nodeKey);
            
            let foundConnections = 0;
            
            // ابحث عن جميع الاتصالات المباشرة بين المصادر
            this.connections.forEach(conn => {
                let targetNode = null;
                
                // تحقق من الاتصالات من العقدة الحالية
                if (this.nodesEqual(conn.from, currentNode) && bridgeableTypes.includes(conn.to.type)) {
                    targetNode = conn.to;
                    console.log(`➡️ DEBUG: Found connection FROM ${nodeKey} TO ${targetNode.type}${targetNode.id}`);
                }
                // تحقق من الاتصالات إلى العقدة الحالية
                else if (this.nodesEqual(conn.to, currentNode) && bridgeableTypes.includes(conn.from.type)) {
                    targetNode = conn.from;
                    console.log(`⬅️ DEBUG: Found connection TO ${nodeKey} FROM ${targetNode.type}${targetNode.id}`);
                }
                
                if (targetNode) {
                    const targetKey = `${targetNode.type}-${targetNode.id}-${targetNode.outputType || targetNode.inputType}`;
                    if (!visited.has(targetKey)) {
                        foundConnections++;
                        console.log(`✅ DEBUG: Propagating to ${targetKey} with state ${currentState}`);
                        
                        // حدث حالة العقدة المستهدفة
                        this.setBridgedNodeState(targetNode, currentState);
                        
                        // تحديث الأسلاك
                        if (window.wireManager) {
                            const wireFrom = this.nodesEqual(conn.from, currentNode) ? currentNode : targetNode;
                            const wireTo = this.nodesEqual(conn.from, currentNode) ? targetNode : currentNode;
                            window.wireManager.updateWireState(wireFrom, wireTo, currentState);
                        }
                        
                        // استمر في الانتشار
                        propagateRecursive(targetNode, currentState, new Set(visited));
                    } else {
                        console.log(`⏭️ DEBUG: Target ${targetKey} already processed, skipping`);
                    }
                }
            });
            
            console.log(`📊 DEBUG: Found ${foundConnections} new connections for ${nodeKey}`);
        };
        
        // طباعة جميع الاتصالات الحالية للتشخيص
        console.log(`📋 DEBUG: Current connections (${this.connections.length} total):`);
        this.connections.forEach((conn, index) => {
            console.log(`  ${index}: ${conn.from.type}${conn.from.id}[${conn.from.outputType}] → ${conn.to.type}${conn.to.id}[${conn.to.inputType}]`);
        });
        
        // ابدأ الانتشار من العقدة الحالية
        console.log(`🎯 DEBUG: Starting recursive propagation from ${node.type}${node.id}`);
        propagateRecursive(node, state);
        console.log(`🏁 DEBUG: Finished bidirectional propagation for ${node.type}${node.id}`);
    }

    // دالة مساعدة لمقارنة العقد
    nodesEqual(node1, node2) {
        return node1.type === node2.type && 
               node1.id === node2.id && 
               (node1.outputType || node1.inputType) === (node2.outputType || node2.inputType);
    }

    // دالة لتحديث حالة العقدة المربوطة
    setBridgedNodeState(node, state) {
        console.log(`🔧 DEBUG: setBridgedNodeState called for ${node.type}${node.id} with state ${state}`);
        
        switch(node.type) {
            case 'input':
                console.log(`📥 DEBUG: Updating input ${node.id} signal propagation`);
                // لا نغير حالة الـ inputs مباشرة - فقط نشر الإشارة
                this.propagateInputSignal(node.id, node.outputType || node.inputType, state);
                break;
            case 'pulse':
                console.log(`⚡ DEBUG: Updating pulse ${node.id} signal propagation`);
                // لا نغير حالة الـ pulses مباشرة - فقط نشر الإشارة
                this.propagatePulseSignal(node.id, node.outputType || node.inputType, state);
                break;
            case 'gate-output':
                console.log(`🚪 DEBUG: Updating gate-output ${node.id} signal propagation`);
                // لا نغير حالة مخارج البوابات مباشرة - فقط نشر الإشارة
                this.propagateGateOutputSignal(node.id, node.outputType || node.inputType, state);
                break;
            case 'gate-input':
                const inputTypeForBridge = node.inputType || node.outputType;
                console.log(`🔌 DEBUG: Updating gate-input ${node.id}[${inputTypeForBridge}] with bridged signal ${state}`);
                // ⭐ إضافة دعم لـ gate-input bridging - انتشار الإشارة للمدخلات المربوطة
                this.propagateGateInputBridge(node.id, inputTypeForBridge, state);
                // ⭐ أيضاً تحديث البوابة نفسها بالإشارة الجديدة
                this.updateGateInput(node.id, inputTypeForBridge, state);
                break;
            default:
                console.log(`❓ DEBUG: Unknown node type ${node.type} for bridged state update`);
        }
    }

    // ⭐ دالة جديدة لانتشار الإشارات بين مدخلات البوابة
    propagateGateInputBridge(gateId, inputType, state) {
        console.log(`🌉 DEBUG: Propagating bridged signal in gate ${gateId} from input ${inputType} with state ${state}`);
        
        // ⭐ حماية من التكرار اللانهائي في انتشار الجسور الداخلية
        const bridgeKey = `bridge-${gateId}-${inputType}`;
        if (this.updateInProgress.has(bridgeKey)) {
            console.log(`🔄 DEBUG: Bridge propagation already in progress for ${bridgeKey}, skipping`);
            return;
        }
        
        this.updateInProgress.add(bridgeKey);
        
        try {
            // ابحث عن جميع الاتصالات المباشرة بين مدخلات نفس البوابة
            this.connections.forEach(conn => {
                // تحقق من الاتصالات داخل نفس البوابة
                if (conn.from.type === 'gate-input' && conn.from.id === gateId && 
                    conn.to.type === 'gate-input' && conn.to.id === gateId) {
                    
                    let targetInput = null;
                    
                    // إذا كان الاتصال من المدخل الحالي
                    if (conn.from.inputType === inputType) {
                        targetInput = conn.to.inputType;
                        console.log(`➡️ DEBUG: Found bridge FROM ${inputType} TO ${targetInput} in gate ${gateId}`);
                    }
                    // إذا كان الاتصال إلى المدخل الحالي
                    else if (conn.to.inputType === inputType) {
                        targetInput = conn.from.inputType;
                        console.log(`⬅️ DEBUG: Found bridge TO ${inputType} FROM ${targetInput} in gate ${gateId}`);
                    }
                    
                    if (targetInput && targetInput !== inputType) { // تجنب التكرار اللانهائي
                        const targetBridgeKey = `bridge-${gateId}-${targetInput}`;
                        if (!this.updateInProgress.has(targetBridgeKey)) {
                            console.log(`✅ DEBUG: Applying bridged signal ${state} to gate ${gateId} input ${targetInput}`);
                            
                            // تحديث حالة المدخل المستهدف مباشرة (بدون استدعاء updateGateInput لتجنب التكرار)
                            const gate = this.gates[gateId];
                            if (gate) {
                                const targetInputIndex = this.getInputIndex(targetInput, gate.type);
                                if (targetInputIndex !== -1 && targetInputIndex < gate.inputs.length) {
                                    gate.inputs[targetInputIndex] = state;
                                    gate.connected[targetInputIndex] = true;
                                }
                            }
                            
                            // ⭐ تحديث الأسلاك الداخلية - تحديد الاتجاه الصحيح
                            if (window.wireManager) {
                                console.log(`🔌 DEBUG: Updating internal wire visual state to ${state}`);
                                window.wireManager.updateWireState(conn.from, conn.to, state);
                                // أيضاً تحديث في الاتجاه المعاكس للتأكد
                                window.wireManager.updateWireState(conn.to, conn.from, state);
                            }
                        }
                    }
                }
            });
        } finally {
            // ⭐ إزالة مفتاح الجسر من المجموعة بعد انتهاء العملية
            this.updateInProgress.delete(bridgeKey);
        }
    }

    // ⭐ دالة للتحقق من وجود جسر داخلي بين مدخلين في نفس البوابة
    hasInternalBridge(gateId, input1, input2) {
        return this.connections.some(conn => 
            conn.from.type === 'gate-input' && conn.from.id === gateId &&
            conn.to.type === 'gate-input' && conn.to.id === gateId &&
            ((conn.from.inputType === input1 && conn.to.inputType === input2) ||
             (conn.from.inputType === input2 && conn.to.inputType === input1))
        );
    }

    // ⭐ دالة لتحديث مظهر الأسلاك الداخلية
    updateInternalWireVisuals(gateId, inputType, state) {
        console.log(`🎨 DEBUG: Updating internal wire visuals for gate ${gateId}, input ${inputType}, state ${state}`);
        
        // ابحث عن جميع الاتصالات الداخلية المرتبطة بهذا المدخل
        this.connections.forEach(conn => {
            // تحقق من الاتصالات داخل نفس البوابة
            if (conn.from.type === 'gate-input' && conn.from.id === gateId && 
                conn.to.type === 'gate-input' && conn.to.id === gateId) {
                
                // إذا كان الاتصال يشمل المدخل الحالي
                if (conn.from.inputType === inputType || conn.to.inputType === inputType) {
                    console.log(`🔌 DEBUG: Found internal wire to update: ${conn.from.inputType} ↔ ${conn.to.inputType}`);
                    
                    if (window.wireManager) {
                        // تحديث الأسلاك في كلا الاتجاهين للتأكد
                        window.wireManager.updateWireState(conn.from, conn.to, state);
                        window.wireManager.updateWireState(conn.to, conn.from, state);
                        console.log(`✅ DEBUG: Updated internal wire visual to ${state ? 'HIGH (green)' : 'LOW (gray)'}`);
                    }
                }
            }
        });
    }

    propagatePulseSignal(pulseId, outputType, state) {
        this.connections.forEach(conn => {
            if (conn.from.type === 'pulse' && 
                conn.from.id === pulseId && 
                conn.from.outputType === outputType) {
                
                const pulseState = this.getPulseState(pulseId, outputType);
                this.propagateState(conn.to, pulseState);
                
                if (window.wireManager) {
                    window.wireManager.updateWireState(conn.from, conn.to, pulseState);
                }
            }
        });
    }

    propagateInputSignal(inputId, outputType, state) {
        this.connections.forEach(conn => {
            if (conn.from.type === 'input' && 
                conn.from.id === inputId && 
                conn.from.outputType === outputType) {
                
                const inputState = this.getInputState(inputId, outputType);
                this.propagateState(conn.to, inputState);
                
                if (window.wireManager) {
                    window.wireManager.updateWireState(conn.from, conn.to, inputState);
                }
            }
        });
    }

    propagateGateOutputSignal(gateId, outputType, state) {
        this.connections.forEach(conn => {
            if (conn.from.type === 'gate-output' && 
                conn.from.id === gateId && 
                conn.from.outputType === outputType) {
                
                const gateOutputState = this.getGateOutputState(gateId, outputType);
                this.propagateState(conn.to, gateOutputState);
                
                if (window.wireManager) {
                    window.wireManager.updateWireState(conn.from, conn.to, gateOutputState);
                }
            }
        });
    }

    reset() {
        this.inputs.forEach(input => {
            input.state = false;
        });

        this.gates.forEach(gate => {
            const inputCount = gate.inputCount || 4;
            gate.inputs = new Array(inputCount).fill(false);
            gate.connected = new Array(inputCount).fill(false);
            gate.output = gate.type === 'POWER_HIGH' ? true : false;
            gate.previousClock = undefined; // Reset clock state for flip-flops
            if (gate.type === 'ADDER_4BIT' || gate.type === 'COMP_4BIT' || gate.type === 'COMP_BASIC') {
                gate.outputs = null;
            }
        });

        if (this.pulses) {
            this.pulses.forEach(pulse => {
                pulse.state = false;
            });
        }

        this.leds.forEach(led => {
            led.state = false;
        });

        this.bin7segs.forEach(bin7seg => {
            bin7seg.displays.forEach(display => {
                display.value = 0;
                Object.keys(display.segments).forEach(seg => {
                    if (display.segments[seg]) {
                        display.segments[seg].directControl = false;
                    }
                });
            });
        });

        this.connections = [];
        this.currentConnection = null;

        this.emit(CONFIG.EVENTS.STATE_UPDATE, { type: 'reset' });
    }

    getState() {
        return {
            inputs: this.inputs.map(input => ({ state: input.state })),
            gates: this.gates.map(gate => ({
                type: gate.type,
                inputs: [...gate.inputs],
                connected: [...gate.connected],
                output: gate.output,
                inputCount: gate.inputCount,
                outputs: gate.outputs ? { ...gate.outputs } : null
            })),
            leds: this.leds.map(led => ({ state: led.state })),
            pulses: this.pulses ? this.pulses.map(pulse => ({ state: pulse.state })) : [],
            bin7segs: this.bin7segs.map(bin7seg => ({
                displays: bin7seg.displays.map(display => ({
                    value: display.value,
                    segments: Object.keys(display.segments).reduce((acc, seg) => {
                        acc[seg] = display.segments[seg].directControl || false;
                        return acc;
                    }, {})
                }))
            })),
            connections: this.connections.map(conn => ({
                from: { ...conn.from },
                to: { ...conn.to }
            }))
        };
    }

    loadState(state) {
        if (state.inputs) {
            state.inputs.forEach((inputData, index) => {
                if (this.inputs[index]) {
                    this.inputs[index].state = inputData.state;
                }
            });
        }

        if (state.gates) {
            state.gates.forEach((gateData, index) => {
                if (this.gates[index]) {
                    const inputCount = gateData.inputCount || 4;
                    this.gates[index].inputs = [...(gateData.inputs || new Array(inputCount).fill(false))];
                    this.gates[index].connected = [...(gateData.connected || new Array(inputCount).fill(false))];
                    this.gates[index].output = gateData.output;
                    this.gates[index].inputCount = inputCount;
                    if (gateData.outputs) {
                        this.gates[index].outputs = { ...gateData.outputs };
                    }
                }
            });
        }

        if (state.leds) {
            state.leds.forEach((ledData, index) => {
                if (this.leds[index]) {
                    this.leds[index].state = ledData.state;
                }
            });
        }

        if (state.pulses && this.pulses) {
            state.pulses.forEach((pulseData, index) => {
                if (this.pulses[index]) {
                    this.pulses[index].state = pulseData.state;
                }
            });
        }

        if (state.bin7segs) {
            state.bin7segs.forEach((bin7segData, index) => {
                if (this.bin7segs[index]) {
                    bin7segData.displays.forEach((displayData, displayIndex) => {
                        if (this.bin7segs[index].displays[displayIndex]) {
                            this.bin7segs[index].displays[displayIndex].value = displayData.value;
                            if (displayData.segments) {
                                Object.keys(displayData.segments).forEach(seg => {
                                    if (this.bin7segs[index].displays[displayIndex].segments[seg]) {
                                        this.bin7segs[index].displays[displayIndex].segments[seg].directControl = displayData.segments[seg];
                                    }
                                });
                            }
                        }
                    });
                }
            });
        }

        if (state.connections) {
            this.connections = state.connections.map(conn => ({
                from: { ...conn.from },
                to: { ...conn.to }
            }));
        }

        this.emit(CONFIG.EVENTS.STATE_UPDATE, { type: 'load' });
    }

    // 🔧 دالة تشخيص شاملة للاتصالات (يمكن استدعاؤها من console)
    debugConnections() {
        console.log('📊 === DEBUG: CONNECTIONS ANALYSIS ===');
        console.log(`Total connections: ${this.connections.length}`);
        
        const sourceTypes = ['input', 'pulse', 'gate-output'];
        const bridgedConnections = this.connections.filter(conn => 
            sourceTypes.includes(conn.from.type) && sourceTypes.includes(conn.to.type)
        );
        
        console.log(`Bridged connections: ${bridgedConnections.length}`);
        bridgedConnections.forEach((conn, index) => {
            console.log(`  Bridge ${index}: ${conn.from.type}${conn.from.id}[${conn.from.outputType}] ⟷ ${conn.to.type}${conn.to.id}[${conn.to.inputType}]`);
        });
        
        console.log('Current states:');
        this.inputs.forEach((input, id) => {
            if (input) {
                console.log(`  Input ${id}: ${input.state ? 'HIGH' : 'LOW'}`);
            }
        });
        
        return {
            totalConnections: this.connections.length,
            bridgedConnections: bridgedConnections.length,
            connections: this.connections
        };
    }
}
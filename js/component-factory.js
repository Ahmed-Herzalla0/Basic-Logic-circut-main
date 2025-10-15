class ComponentFactory {
    constructor(stateManager) {
        this.state = stateManager;
    }

    createInput(id) {
        const inputData = {
            id,
            state: false,
            element: null,
            stateText: null,
            connectionPoints: { q: null, q_not: null }
        };

        const row = this.createElement('div', 'input-row');

        const outputConnections = this.createOutputConnections(id);

        const stateText = this.createElement('div', 'state-text');
        stateText.textContent = 'LOW';

        const toggle = this.createToggleSwitch(id);

        const label = this.createElement('div', 'input-label');
        label.textContent = CONFIG.INPUTS.LABELS[id];

        row.appendChild(outputConnections.container);
        row.appendChild(stateText);
        row.appendChild(toggle);
        row.appendChild(label);

        inputData.element = toggle;
        inputData.stateText = stateText;
        inputData.connectionPoints = outputConnections.points;

        this.state.inputs[id] = inputData;
        return row;
    }

    createPulseGenerator(id) {
        const pulseData = {
            id,
            state: false,
            element: null,
            stateText: null,
            connectionPoints: { q: null, q_not: null },
            isPulse: true
        };

        const row = this.createElement('div', 'pulse-row');

        const outputConnections = this.createPulseOutputConnections(id);

        const stateText = this.createElement('div', 'state-text');
        stateText.textContent = 'OFF';

        const pulseButton = this.createPulseButton(id);

        const label = this.createElement('div', 'pulse-label');
        label.textContent = 'PULSE';

        row.appendChild(outputConnections.container);
        row.appendChild(stateText);
        row.appendChild(pulseButton);
        row.appendChild(label);

        pulseData.element = pulseButton;
        pulseData.stateText = stateText;
        pulseData.connectionPoints = outputConnections.points;
        


        this.state.pulses = this.state.pulses || [];
        this.state.pulses[id] = pulseData;
        return row;
    }

    createPulseOutputConnections(id) {
        const container = this.createElement('div', 'output-connections');
        const points = {};

        const qWrapper = this.createElement('div', 'connection-wrapper');
        const qLabel = this.createElement('span', 'connection-point-label');
        qLabel.textContent = 'Q';
        const qPoint = this.createConnectionPoint('pulse', id, 'q');
        qWrapper.appendChild(qLabel);
        qWrapper.appendChild(qPoint);
        container.appendChild(qWrapper);
        points.q = qPoint;

        const qNotWrapper = this.createElement('div', 'connection-wrapper');
        const qNotLabel = this.createElement('span', 'connection-point-label');
        qNotLabel.innerHTML = 'Q̅';
        const qNotPoint = this.createConnectionPoint('pulse', id, 'q_not');
        qNotWrapper.appendChild(qNotLabel);
        qNotWrapper.appendChild(qNotPoint);
        container.appendChild(qNotWrapper);
        points.q_not = qNotPoint;

        return { container, points };
    }

    createPulseButton(id) {
        const button = this.createElement('div', 'pulse-button');
        const icon = this.createElement('div', 'pulse-icon');
        icon.textContent = '⚡';
        
        button.appendChild(icon);
        
        button.addEventListener('click', (e) => {
            console.log('🔥 PULSE CLICKED!');
            e.stopPropagation(); // Prevent event bubbling
            this.triggerPulse(id);
        });
        
        // Make sure button is clickable
        button.style.cursor = 'pointer';
        button.style.pointerEvents = 'auto';
        button.style.zIndex = '1000';


        return button;
    }

    triggerPulse(id) {
        console.log('⚡ triggerPulse called!');
        const pulse = this.state.pulses[id];
        if (!pulse) {
            console.log('❌ No pulse object found!');
            return;
        }

        console.log('✅ Setting pulse to HIGH');
        // Set state to HIGH briefly
        pulse.state = true;
        pulse.stateText.textContent = 'PULSE';
        pulse.element.classList.add('active');
        
        // Update connected elements
        this.state.updateConnectedElements(id, 'pulse');
        
        // Reset after 500ms (longer pulse for flip-flops)
        setTimeout(() => {
            console.log('⬇️ Setting pulse to LOW');
            pulse.state = false;
            pulse.stateText.textContent = 'OFF';
            pulse.element.classList.remove('active');
            this.state.updateConnectedElements(id, 'pulse');
        }, 500);
    }

    createToggleSwitch(id) {
        const toggle = this.createElement('div', 'toggle-switch');
        const slider = this.createElement('div', 'slider');

        toggle.appendChild(slider);
        toggle.addEventListener('click', () => {
            const newState = this.state.toggleInput(id);
            this.updateToggleVisual(toggle, newState);
            this.updateStateText(id, newState);
        });

        return toggle;
    }

    updateToggleVisual(toggle, state) {
        if (state) {
            toggle.classList.add('high');
        } else {
            toggle.classList.remove('high');
        }
    }

    updateStateText(id, state) {
        const input = this.state.inputs[id];
        if (input && input.stateText) {
            input.stateText.textContent = state ? 'HIGH' : 'LOW';
        }
    }

    createOutputConnections(id) {
        const container = this.createElement('div', 'output-connections');
        const points = {};

        const qWrapper = this.createElement('div', 'connection-wrapper');
        const qLabel = this.createElement('span', 'connection-point-label');
        qLabel.textContent = 'Q';
        const qPoint = this.createConnectionPoint('input', id, 'q');
        qWrapper.appendChild(qLabel);
        qWrapper.appendChild(qPoint);
        container.appendChild(qWrapper);
        points.q = qPoint;

        const qNotWrapper = this.createElement('div', 'connection-wrapper');
        const qNotLabel = this.createElement('span', 'connection-point-label');
        qNotLabel.innerHTML = 'Q̅';
        const qNotPoint = this.createConnectionPoint('input', id, 'q_not');
        qNotWrapper.appendChild(qNotLabel);
        qNotWrapper.appendChild(qNotPoint);
        container.appendChild(qNotWrapper);
        points.q_not = qNotPoint;

        return { container, points };
    }

    // Helper to get type/label/inputCount by gate id
    getGateInfoForId(id) {
        const {
            AND_COUNT, OR_COUNT, SPECIAL_COUNT, NOT_COUNT, ADDER_COUNT, COMP_4BIT_COUNT, COMP_BASIC_COUNT, POWER_COUNT, JK_FF_COUNT, D_FF_COUNT
        } = CONFIG.GATES;

        if (id < AND_COUNT) {
            return { type: 'AND', label: CONFIG.GATES.AND_LABELS[id], inputCount: 4 };
        }
        if (id < AND_COUNT + OR_COUNT) {
            const idx = id - AND_COUNT;
            return { type: 'OR', label: CONFIG.GATES.OR_LABELS[idx], inputCount: 4 };
        }
        if (id < AND_COUNT + OR_COUNT + SPECIAL_COUNT) {
            const specialIndex = id - AND_COUNT - OR_COUNT;
            if (specialIndex < 3) {
                return { type: 'AB_CD', label: `AB+CD${specialIndex}`, inputCount: 4 };
            } else if (specialIndex === 3) {
                return { type: 'XOR', label: 'XOR', inputCount: 2 };
            }
            return { type: 'XNOR', label: 'XNOR', inputCount: 2 };
        }
        if (id < AND_COUNT + OR_COUNT + SPECIAL_COUNT + NOT_COUNT) {
            const notIndex = id - AND_COUNT - OR_COUNT - SPECIAL_COUNT;
            return { type: 'NOT', label: CONFIG.GATES.NOT_LABELS[notIndex], inputCount: 1 };
        }
        if (id < AND_COUNT + OR_COUNT + SPECIAL_COUNT + NOT_COUNT + ADDER_COUNT) {
            const adderIndex = id - AND_COUNT - OR_COUNT - SPECIAL_COUNT - NOT_COUNT;
            return { type: 'ADDER_4BIT', label: CONFIG.GATES.ADDER_LABELS[adderIndex], inputCount: 9 };
        }
        if (id < AND_COUNT + OR_COUNT + SPECIAL_COUNT + NOT_COUNT + ADDER_COUNT + COMP_4BIT_COUNT) {
            const compIndex = id - AND_COUNT - OR_COUNT - SPECIAL_COUNT - NOT_COUNT - ADDER_COUNT;
            return { type: 'COMP_4BIT', label: CONFIG.GATES.COMP_4BIT_LABELS[compIndex], inputCount: 11 };
        }
        if (id < AND_COUNT + OR_COUNT + SPECIAL_COUNT + NOT_COUNT + ADDER_COUNT + COMP_4BIT_COUNT + COMP_BASIC_COUNT) {
            const compBasicIndex = id - AND_COUNT - OR_COUNT - SPECIAL_COUNT - NOT_COUNT - ADDER_COUNT - COMP_4BIT_COUNT;
            return { type: 'COMP_BASIC', label: CONFIG.GATES.COMP_BASIC_LABELS[compBasicIndex], inputCount: 2 };
        }
        if (id < AND_COUNT + OR_COUNT + SPECIAL_COUNT + NOT_COUNT + ADDER_COUNT + COMP_4BIT_COUNT + COMP_BASIC_COUNT + POWER_COUNT) {
            const powerIndex = id - AND_COUNT - OR_COUNT - SPECIAL_COUNT - NOT_COUNT - ADDER_COUNT - COMP_4BIT_COUNT - COMP_BASIC_COUNT;
            return powerIndex === 0
                ? { type: 'POWER_HIGH', label: 'HIGH', inputCount: 0 }
                : { type: 'POWER_LOW', label: 'LOW', inputCount: 0 };
        }
        if (id < AND_COUNT + OR_COUNT + SPECIAL_COUNT + NOT_COUNT + ADDER_COUNT + COMP_4BIT_COUNT + COMP_BASIC_COUNT + POWER_COUNT + JK_FF_COUNT) {
            const jkIndex = id - AND_COUNT - OR_COUNT - SPECIAL_COUNT - NOT_COUNT - ADDER_COUNT - COMP_4BIT_COUNT - COMP_BASIC_COUNT - POWER_COUNT;
            return { type: 'JK_FF', label: CONFIG.GATES.JK_FF_LABELS[jkIndex], inputCount: 5 };
        }
        // D flip-flops
        const dIndex = id - AND_COUNT - OR_COUNT - SPECIAL_COUNT - NOT_COUNT - ADDER_COUNT - COMP_4BIT_COUNT - COMP_BASIC_COUNT - POWER_COUNT - JK_FF_COUNT;
        return { type: 'D_FF', label: CONFIG.GATES.D_FF_LABELS[dIndex], inputCount: 2 };
    }

    getInputTypesForGate(gateType, inputCount) {
        if (gateType === 'ADDER_4BIT') {
            return ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'Cin'];
        }
        if (gateType === 'COMP_4BIT') {
            return ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', '>', '<', '='];
        }
        if (gateType === 'COMP_BASIC') {
            return ['P', 'Q'];
        }
        if (gateType === 'JK_FF') {
            return ['S', 'J', 'C', 'K', 'R'];
        }
        if (gateType === 'D_FF') {
            return ['D', 'C'];
        }
        if (gateType === 'POWER_HIGH' || gateType === 'POWER_LOW') {
            return [];
        }
        if (inputCount === 1) return ['A'];
        if (inputCount === 2) return ['A', 'B'];
        return ['A', 'B', 'C', 'D'];
    }

    getOutputTypesForGate(gateType) {
        if (gateType === 'ADDER_4BIT') {
            return ['S0', 'S1', 'S2', 'S3', 'CO'];
        }
        if (gateType === 'COMP_4BIT' || gateType === 'COMP_BASIC') {
            return ['P>Q', 'P=Q', 'P<Q'];
        }
        if (gateType === 'POWER_HIGH' || gateType === 'POWER_LOW') {
            // 8 taps
            return Array.from({ length: 8 }, (_, i) => `${i}`);
        }
        // Standard gates
        return ['q', 'q_not'];
    }

    createGate(id) {
        const { type: gateType, label: gateLabel, inputCount } = this.getGateInfoForId(id);

        const gateData = {
            id,
            type: gateType,
            inputs: new Array(inputCount).fill(false),
            connected: new Array(inputCount).fill(false),
            output: gateType === 'POWER_HIGH' ? true : false,
            inputCount: inputCount,
            element: null,
            connectionPoints: {}
        };

        // Power rails special rendering
        if (gateType === 'POWER_HIGH' || gateType === 'POWER_LOW') {
            return this.createPowerRail(id, gateType, gateLabel, gateData);
        }

        const wrapper = this.createElement('div', 'gate-wrapper');
        const gateContainer = this.createElement('div', 'gate-container');

        // Inputs
        const inputsContainer = this.createElement('div', 'gate-inputs');
        const inputTypes = this.getInputTypesForGate(gateType, inputCount);
        const inputPoints = {};

        inputTypes.forEach(inputType => {
            const inputPoint = this.createConnectionPoint('gate-input', id, inputType);
            inputPoint.classList.add('gate-input-point');

            const inputWrapper = this.createElement('div', 'input-wrapper');
            const label = this.createElement('span', 'input-label');
            label.textContent = inputType;
            inputWrapper.appendChild(label);
            inputWrapper.appendChild(inputPoint);
            inputsContainer.appendChild(inputWrapper);

            inputPoints[`input${inputType}`] = inputPoint;
        });

        // Gate body
        const gate = this.createElement('div', 'gate', gateType.toLowerCase().replace('_', '-') + '-gate');

        if (gateType === 'COMP_4BIT') {
            gate.innerHTML = `
               <div class="comp-symbols">
                   <div class="comp-symbol">=</div>
                   <div class="comp-symbol">&gt;</div>
                   <div class="comp-symbol">&lt;</div>
               </div>
           `;
        } else if (gateType === 'COMP_BASIC') {
            gate.innerHTML = 'COMP';
        } else {
            gate.innerHTML = this.getGateSymbol(gateType);
        }

        // Outputs
        const outputsContainer = this.createElement('div', 'gate-outputs');
        const outputTypes = this.getOutputTypesForGate(gateType);

        if (gateType === 'ADDER_4BIT' || gateType === 'COMP_4BIT' || gateType === 'COMP_BASIC') {
            outputTypes.forEach(outputType => {
                const outputWrapper = this.createElement('div', 'output-wrapper');
                const label = this.createElement('span', 'output-label');
                label.textContent = outputType;
                const outputPoint = this.createConnectionPoint('gate-output', id, outputType);
                outputPoint.classList.add('gate-output-point');
                outputWrapper.appendChild(label);
                outputWrapper.appendChild(outputPoint);
                outputsContainer.appendChild(outputWrapper);

                inputPoints[`output${outputType}`] = outputPoint;
            });
        } else {
            // Standard gates: Q and Q̅
            const outputQWrapper = this.createElement('div', 'output-wrapper');
            outputQWrapper.classList.add('gate-output-container');
            const labelQ = this.createElement('span', 'output-label');
            labelQ.textContent = 'Q';
            const outputQPoint = this.createConnectionPoint('gate-output', id, 'q');
            outputQPoint.classList.add('gate-output-point');
            outputQWrapper.appendChild(labelQ);
            outputQWrapper.appendChild(outputQPoint);
            outputsContainer.appendChild(outputQWrapper);

            const outputQNotWrapper = this.createElement('div', 'output-wrapper');
            outputQNotWrapper.classList.add('gate-output-container');
            const labelQNot = this.createElement('span', 'output-label');
            labelQNot.innerHTML = 'Q̅';
            const outputQNotPoint = this.createConnectionPoint('gate-output', id, 'q_not');
            outputQNotPoint.classList.add('gate-output-point');
            outputQNotWrapper.appendChild(labelQNot);
            outputQNotWrapper.appendChild(outputQNotPoint);
            outputsContainer.appendChild(outputQNotWrapper);

            inputPoints.outputQ = outputQPoint;
            inputPoints.outputQNot = outputQNotPoint;
        }

        gateContainer.appendChild(inputsContainer);
        gateContainer.appendChild(gate);
        gateContainer.appendChild(outputsContainer);

        const label = this.createElement('div', 'gate-label');
        label.textContent = gateLabel;

        wrapper.appendChild(gateContainer);
        wrapper.appendChild(label);

        gateData.element = gate;
        gateData.connectionPoints = {
            ...inputPoints
        };

        this.state.gates[id] = gateData;
        return wrapper;
    }

    createPowerRail(id, gateType, gateLabel, gateData) {
        const wrapper = this.createElement('div', 'power-rail-wrapper', gateType.toLowerCase());

        const railContainer = this.createElement('div', 'power-rail-container');

        const label = this.createElement('div', 'power-rail-label');
        label.textContent = gateLabel;

        const rail = this.createElement('div', 'power-rail-line');

        const connectionPoints = this.createElement('div', 'power-rail-points');
        const inputPoints = {};

        for (let i = 0; i < 8; i++) {
            const pointWrapper = this.createElement('div', 'power-point-wrapper');
            const point = this.createConnectionPoint('gate-output', id, `${i}`);
            point.classList.add('power-rail-point');
            pointWrapper.appendChild(point);
            connectionPoints.appendChild(pointWrapper);

            inputPoints[`output${i}`] = point;
        }

        railContainer.appendChild(label);
        railContainer.appendChild(rail);
        railContainer.appendChild(connectionPoints);
        wrapper.appendChild(railContainer);

        gateData.element = rail;
        gateData.connectionPoints = inputPoints;
        gateData.output = gateType === 'POWER_HIGH' ? true : false;

        this.state.gates[id] = gateData;
        return wrapper;
    }

    getGateSymbol(gateType) {
        switch (gateType) {
            case 'AND':
                return '&';
            case 'OR':
                return '≥1';
            case 'AB_CD':
                return 'Σ';
            case 'XOR':
                return '⊕';
            case 'XNOR':
                return '⊙';
            case 'NOT':
                return '1';
            case 'ADDER_4BIT':
                return 'Σ';
            case 'COMP_4BIT':
                return 'COMP';
            case 'COMP_BASIC':
                return 'COMP';
            case 'JK_FF':
                return 'JK';
            case 'D_FF':
                return 'D';
            case 'POWER_HIGH':
                return 'H';
            case 'POWER_LOW':
                return 'L';
            default:
                return '?';
        }
    }

    createLED(id) {
        const ledData = {
            id,
            state: false,
            element: null,
            connectionPoint: null
        };

        const row = this.createElement('div', 'led-row');

        const label = this.createElement('div', 'led-label');
        label.textContent = CONFIG.LEDS.LABELS[id];

        const led = this.createElement('div', 'led');

        const connectionPoint = this.createConnectionPoint('led', id, null);

        row.appendChild(label);
        row.appendChild(led);
        row.appendChild(connectionPoint);

        ledData.element = led;
        ledData.connectionPoint = connectionPoint;

        this.state.leds[id] = ledData;
        return row;
    }

    createBin7Seg(id) {
        const bin7segData = {
            id,
            displays: [
                {
                    segments: { a: false, b: false, c: false, d: false, e: false, f: false, g: false },
                    value: 0
                },
                {
                    segments: { a: false, b: false, c: false, d: false, e: false, f: false, g: false },
                    value: 0
                },
                {
                    segments: { a: false, b: false, c: false, d: false, e: false, f: false, g: false },
                    value: 0
                }
            ],
            element: null,
            connectionPoints: {}
        };

        const container = this.createElement('div', 'bin-7seg-wrapper');

        const label = this.createElement('div', 'bin-7seg-label');
        label.textContent = CONFIG.BIN_7SEG.LABELS[id];

        const displaysContainer = this.createElement('div', 'bin-7seg-displays-container');

        for (let displayIndex = 0; displayIndex < 3; displayIndex++) {
            const display = this.createElement('div', 'bin-7seg-display');
            display.setAttribute('data-display', displayIndex);

            const segments = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];
            const segmentElements = {};

            segments.forEach(seg => {
                const segment = this.createElement('div', `segment segment-${seg}`);
                display.appendChild(segment);
                segmentElements[seg] = segment;
            });

            bin7segData.displays[displayIndex].segments = segmentElements;
            displaysContainer.appendChild(display);
        }

        const inputsContainer = this.createElement('div', 'bin-7seg-inputs-container');

        const leftInputs = this.createElement('div', 'bin-7seg-left-inputs');

        const firstBcdGroup = this.createElement('div', 'bcd-group');
        const firstBcdLabel = this.createElement('div', 'bcd-group-label');
        firstBcdLabel.textContent = 'BCD1';
        firstBcdGroup.appendChild(firstBcdLabel);

        ['1', '2', '4', '8'].forEach((label, index) => {
            const inputWrapper = this.createElement('div', 'bin-7seg-input-wrapper');
            const labelElement = this.createElement('span', 'input-label');
            labelElement.textContent = label;

            const point = this.createConnectionPoint('bin-7seg', id, `bcd1_${label}`);
            point.classList.add('bin-7seg-input-point');

            inputWrapper.appendChild(point);
            inputWrapper.appendChild(labelElement);
            firstBcdGroup.appendChild(inputWrapper);

            bin7segData.connectionPoints[`bcd1_${label}`] = point;
        });
        leftInputs.appendChild(firstBcdGroup);

        const secondBcdGroup = this.createElement('div', 'bcd-group');
        const secondBcdLabel = this.createElement('div', 'bcd-group-label');
        secondBcdLabel.textContent = 'BCD2';
        secondBcdGroup.appendChild(secondBcdLabel);

        ['1', '2', '4', '8'].forEach((label, index) => {
            const inputWrapper = this.createElement('div', 'bin-7seg-input-wrapper');
            const labelElement = this.createElement('span', 'input-label');
            labelElement.textContent = label;

            const point = this.createConnectionPoint('bin-7seg', id, `bcd2_${label}`);
            point.classList.add('bin-7seg-input-point');

            inputWrapper.appendChild(point);
            inputWrapper.appendChild(labelElement);
            secondBcdGroup.appendChild(inputWrapper);

            bin7segData.connectionPoints[`bcd2_${label}`] = point;
        });
        leftInputs.appendChild(secondBcdGroup);

        const rightInputs = this.createElement('div', 'bin-7seg-right-inputs');
        const segmentControlLabel = this.createElement('div', 'segment-control-label');
        segmentControlLabel.textContent = 'a-g';
        rightInputs.appendChild(segmentControlLabel);

        ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach(label => {
            const inputWrapper = this.createElement('div', 'bin-7seg-input-wrapper');
            const labelElement = this.createElement('span', 'input-label');
            labelElement.textContent = label;

            const point = this.createConnectionPoint('bin-7seg', id, `segment_${label}`);
            point.classList.add('bin-7seg-input-point');

            inputWrapper.appendChild(labelElement);
            inputWrapper.appendChild(point);
            rightInputs.appendChild(inputWrapper);

            bin7segData.connectionPoints[`segment_${label}`] = point;
        });

        inputsContainer.appendChild(leftInputs);
        inputsContainer.appendChild(rightInputs);

        container.appendChild(label);
        container.appendChild(displaysContainer);
        container.appendChild(inputsContainer);

        bin7segData.element = displaysContainer;

        this.state.bin7segs[id] = bin7segData;
        return container;
    }

    updateBin7SegDisplay(id) {
        const bin7segData = this.state.bin7segs[id];
        if (!bin7segData) return;

        const patterns = {
            0: { a: true, b: true, c: true, d: true, e: true, f: true, g: false },
            1: { a: false, b: true, c: true, d: false, e: false, f: false, g: false },
            2: { a: true, b: true, c: false, d: true, e: true, f: false, g: true },
            3: { a: true, b: true, c: true, d: true, e: false, f: false, g: true },
            4: { a: false, b: true, c: true, d: false, e: false, f: true, g: true },
            5: { a: true, b: false, c: true, d: true, e: false, f: true, g: true },
            6: { a: true, b: false, c: true, d: true, e: true, f: true, g: true },
            7: { a: true, b: true, c: true, d: false, e: false, f: false, g: false },
            8: { a: true, b: true, c: true, d: true, e: true, f: true, g: true },
            9: { a: true, b: true, c: true, d: true, e: false, f: true, g: true },
            10: { a: true, b: true, c: true, d: false, e: true, f: true, g: true },
            11: { a: false, b: false, c: true, d: true, e: true, f: true, g: true },
            12: { a: true, b: false, c: false, d: true, e: true, f: true, g: false },
            13: { a: false, b: true, c: true, d: true, e: true, f: false, g: true },
            14: { a: true, b: false, c: false, d: true, e: true, f: true, g: true },
            15: { a: true, b: false, c: false, d: false, e: true, f: true, g: true }
        };

        const pattern1 = patterns[bin7segData.displays[0].value] || patterns[0];
        Object.keys(pattern1).forEach(seg => {
            if (bin7segData.displays[0].segments[seg]) {
                if (pattern1[seg]) {
                    bin7segData.displays[0].segments[seg].classList.add('on');
                } else {
                    bin7segData.displays[0].segments[seg].classList.remove('on');
                }
            }
        });

        const pattern2 = patterns[bin7segData.displays[1].value] || patterns[0];
        Object.keys(pattern2).forEach(seg => {
            if (bin7segData.displays[1].segments[seg]) {
                if (pattern2[seg]) {
                    bin7segData.displays[1].segments[seg].classList.add('on');
                } else {
                    bin7segData.displays[1].segments[seg].classList.remove('on');
                }
            }
        });

        ['a', 'b', 'c', 'd', 'e', 'f', 'g'].forEach(seg => {
            if (bin7segData.displays[2].segments[seg]) {
                if (bin7segData.displays[2].segments[seg].directControl) {
                    bin7segData.displays[2].segments[seg].classList.add('on');
                } else {
                    bin7segData.displays[2].segments[seg].classList.remove('on');
                }
            }
        });
    }

    createConnectionPoint(type, id, pointType) {
        const point = this.createElement('div', 'connection-point');

        point.addEventListener('click', (e) => {
            e.stopPropagation();
            window.connectionManager.handleConnectionClick(e, type, id, pointType);
        });

        return point;
    }

    createElement(tag, ...classNames) {
        const element = document.createElement(tag);
        if (classNames.length > 0) {
            element.className = classNames.join(' ');
        }
        return element;
    }

    updateInputVisual(id) {
        const input = this.state.inputs[id];
        if (!input) return;

        this.updateToggleVisual(input.element, input.state);
        this.updateStateText(id, input.state);
    }

    updateGateVisual(id) {
        const gate = this.state.gates[id];
        if (!gate) return;

        if (gate.output) {
            gate.element.classList.add('active');
        } else {
            gate.element.classList.remove('active');
        }
    }

    updateLEDVisual(id) {
        const led = this.state.leds[id];
        if (!led) return;

        if (led.state) {
            led.element.classList.add('on');
        } else {
            led.element.classList.remove('on');
        }
    }

    getConnectionPoint(type, id, pointType) {
        switch (type) {
            case 'input':
                return this.state.inputs[id]?.connectionPoints[pointType];
            case 'pulse':
                return this.state.pulses[id]?.connectionPoints[pointType];
            case 'gate-input': {
                const inputKey = `input${pointType}`;
                return this.state.gates[id]?.connectionPoints[inputKey];
            }
            case 'gate-output': {
                const gate = this.state.gates[id];
                if (gate && (gate.type === 'ADDER_4BIT' || gate.type === 'COMP_4BIT' || gate.type === 'COMP_BASIC' || gate.type === 'POWER_HIGH' || gate.type === 'POWER_LOW')) {
                    const outputKey = `output${pointType}`;
                    return gate.connectionPoints[outputKey];
                }
                // Flip-flops and regular gates use Q/Q̅ outputs
                const outputKey = pointType === 'q' ? 'outputQ' : 'outputQNot';
                return this.state.gates[id]?.connectionPoints[outputKey];
            }
            case 'led':
                return this.state.leds[id]?.connectionPoint;
            case 'bin-7seg':
                return this.state.bin7segs[id]?.connectionPoints[pointType];
            default:
                return null;
        }
    }

    setConnectionPointState(type, id, pointType, connected) {
        const point = this.getConnectionPoint(type, id, pointType);
        if (point) {
            if (connected) {
                point.classList.add('connected');
                point.classList.remove('highlighted');
                point.style.background = '';
            } else {
                point.classList.remove('connected');
                point.classList.remove('highlighted');
                point.style.background = '';
                point.style.backgroundColor = '';
                point.style.borderColor = '';
            }
        }
    }

    highlightConnectionPoint(type, id, pointType, highlight = true) {
        const point = this.getConnectionPoint(type, id, pointType);
        if (point) {
            if (highlight) {
                point.classList.add('highlighted');
                point.style.background = '#ffff00';
            } else {
                point.classList.remove('highlighted');
                point.style.background = '';

                if (point.classList.contains('connected')) {
                    // keep connected style
                } else {
                    point.classList.remove('connected');
                    point.style.backgroundColor = '';
                    point.style.borderColor = '';
                }
            }
        }
    }

    showToast(message, type = 'info') {
        if (window.uiManager) {
            window.uiManager.showToast(message, type);
        }
    }
}
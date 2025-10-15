class ConnectionManager {
    constructor(stateManager, componentFactory, wireManager) {
        this.state = stateManager;
        this.factory = componentFactory;
        this.wireManager = wireManager;
        this.tempWire = null;
        this.SNAP_RADIUS = 14;
        this.WIRE_CLICK_RADIUS = 6;

        // RAF throttle for mousemove
        this._rafPending = false;
        this._lastMouse = { x: 0, y: 0 };

        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('click', (e) => this.handleDocumentClick(e));

        // Throttled mousemove to one update per animation frame
        document.addEventListener('mousemove', (e) => {
            this._lastMouse.x = e.clientX;
            this._lastMouse.y = e.clientY;
            if (!this._rafPending) {
                this._rafPending = true;
                requestAnimationFrame(() => {
                    this._rafPending = false;
                    this.updateTempWireRaf();
                });
            }
        });
    }

    handleConnectionClick(event, type, id, outputType) {
        event.stopPropagation();

        if (this.state.currentConnection === null) {
            this.startConnection(type, id, outputType, event);
        } else {
            this.completeConnection(type, id, outputType);
        }
    }

    findClosestConnectionPoint(clickX, clickY) {
        let closest = null;
        let minDistance = Infinity;

        // Temporarily disable pointer events on wires to avoid interference
        const allWires = document.querySelectorAll('.wire-line');
        allWires.forEach(wire => {
            wire.style.pointerEvents = 'none';
        });

        const allPoints = document.querySelectorAll('.connection-point');

        allPoints.forEach(pointEl => {
            const rect = pointEl.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const distance = Math.hypot(centerX - clickX, centerY - clickY);

            if (distance < minDistance) {
                const pointDetails = this.getPointDetailsFromElement(pointEl);
                if (pointDetails) {
                    minDistance = distance;
                    closest = { ...pointDetails, distance };
                }
            }
        });

        // Restore pointer events
        allWires.forEach(wire => {
            wire.style.pointerEvents = 'all';
        });

        return closest;
    }

    findClosestWire(clickX, clickY) {
        let closest = null;
        let minDistance = Infinity;

        const allWires = document.querySelectorAll('.wire-line');

        allWires.forEach(wireEl => {
            const distance = this.calculateDistanceToWire(wireEl, clickX, clickY);

            if (distance < minDistance && distance <= this.WIRE_CLICK_RADIUS) {
                minDistance = distance;
                closest = { element: wireEl, distance };
            }
        });

        return closest;
    }

    calculateDistanceToWire(wireElement, clickX, clickY) {
        const x1 = parseFloat(wireElement.getAttribute('x1'));
        const y1 = parseFloat(wireElement.getAttribute('y1'));
        const x2 = parseFloat(wireElement.getAttribute('x2'));
        const y2 = parseFloat(wireElement.getAttribute('y2'));

        const boardRect = document.getElementById(CONFIG.ELEMENTS.BOARD).getBoundingClientRect();
        const svgX = clickX - boardRect.left;
        const svgY = clickY - boardRect.top;

        const A = svgX - x1;
        const B = svgY - y1;
        const C = x2 - x1;
        const D = y2 - y1;

        const lenSq = C * C + D * D;
        if (lenSq === 0) return Math.hypot(A, B);

        const dot = A * C + B * D;
        const param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
            xx = x1; yy = y1;
        } else if (param > 1) {
            xx = x2; yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }

        return Math.hypot(svgX - xx, svgY - yy);
    }

    getPointDetailsFromElement(pointElement) {
        const parentElement = pointElement.closest('.input-row, .pulse-row, .gate-wrapper, .led-row, .bin-7seg-wrapper');
        if (!parentElement) return null;

        let type, id, pointType;

        if (parentElement.classList.contains('input-row')) {
            type = 'input';
            id = Array.from(parentElement.parentElement.children).indexOf(parentElement);

            const pointContainer = pointElement.closest('.connection-wrapper');
            if (pointContainer) {
                const label = pointContainer.querySelector('.connection-point-label');
                if (label) {
                    const labelText = label.textContent.trim();
                    pointType = labelText === 'Q' ? 'q' : 'q_not';
                } else {
                    const allContainers = parentElement.querySelectorAll('.connection-wrapper');
                    const containerIndex = Array.from(allContainers).indexOf(pointContainer);
                    pointType = containerIndex === 0 ? 'q' : 'q_not';
                }
            } else {
                const allPointsInRow = parentElement.querySelectorAll('.connection-point');
                const pointIndex = Array.from(allPointsInRow).indexOf(pointElement);
                pointType = pointIndex === 0 ? 'q' : 'q_not';
            }

        } else if (parentElement.classList.contains('pulse-row')) {
            type = 'pulse';
            id = 0; // مولد النبضات له معرف ثابت 0
            
            const pointContainer = pointElement.closest('.connection-wrapper');
            if (pointContainer) {
                const label = pointContainer.querySelector('.connection-point-label');
                if (label) {
                    const labelText = label.textContent.trim();
                    pointType = labelText === 'Q' ? 'q' : 'q_not';
                } else {
                    const allContainers = parentElement.querySelectorAll('.connection-wrapper');
                    const containerIndex = Array.from(allContainers).indexOf(pointContainer);
                    pointType = containerIndex === 0 ? 'q' : 'q_not';
                }
            } else {
                const allPointsInRow = parentElement.querySelectorAll('.connection-point');
                const pointIndex = Array.from(allPointsInRow).indexOf(pointElement);
                pointType = pointIndex === 0 ? 'q' : 'q_not';
            }

        } else if (parentElement.classList.contains('gate-wrapper')) {
            // حساب معرف البوابة بناءً على العمود والموقع داخل العمود
            const column = parentElement.closest('.gates-column');
            if (!column) return null;
            
            const gatesInColumn = Array.from(column.querySelectorAll('.gate-wrapper'));
            const indexInColumn = gatesInColumn.indexOf(parentElement);
            if (indexInColumn === -1) return null;
            
            // حساب المعرف بناءً على العمود
            if (column.classList.contains('left-column')) {
                id = indexInColumn; // AND gates: 0-6
            } else if (column.classList.contains('middle-left-column')) {
                id = CONFIG.GATES.AND_COUNT + indexInColumn; // OR gates
            } else if (column.classList.contains('middle-right-column')) {
                id = CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT + indexInColumn; // Special/NOT gates
            } else if (column.classList.contains('right-column')) {
                id = CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT + CONFIG.GATES.SPECIAL_COUNT + CONFIG.GATES.NOT_COUNT + indexInColumn; // Adders/COMP/Power
            } else if (column.classList.contains('flip-flop-column')) {
                id = CONFIG.GATES.AND_COUNT + CONFIG.GATES.OR_COUNT + CONFIG.GATES.SPECIAL_COUNT + CONFIG.GATES.NOT_COUNT + CONFIG.GATES.ADDER_COUNT + CONFIG.GATES.COMP_4BIT_COUNT + CONFIG.GATES.COMP_BASIC_COUNT + CONFIG.GATES.POWER_COUNT + indexInColumn; // Flip-flops
            } else {
                return null;
            }

            if (pointElement.closest('.gate-inputs')) {
                type = 'gate-input';
                pointType = pointElement.parentElement.querySelector('.input-label')?.textContent;
            } else if (pointElement.closest('.gate-outputs')) {
                type = 'gate-output';

                const outputWrapper = pointElement.closest('.output-wrapper');
                if (outputWrapper) {
                    const label = outputWrapper.querySelector('.output-label');
                    if (label) {
                        const labelText = label.textContent.trim();

                        if (labelText === 'Q') {
                            pointType = 'q';
                        } else if (labelText === 'Q̅' || labelText.includes('̅')) {
                            pointType = 'q_not';
                        } else {
                            pointType = labelText;
                        }
                    } else {
                        const allOutputWrappers = parentElement.querySelectorAll('.gate-outputs .output-wrapper');
                        const wrapperIndex = Array.from(allOutputWrappers).indexOf(outputWrapper);
                        pointType = wrapperIndex === 0 ? 'q' : 'q_not';
                    }
                }
            } else if (pointElement.closest('.power-rail-points')) {
                type = 'gate-output';
                const pointIndex = Array.from(pointElement.parentElement.parentElement.children).indexOf(pointElement.parentElement);
                pointType = pointIndex.toString();
            }
        } else if (parentElement.classList.contains('led-row')) {
            type = 'led';
            id = Array.from(parentElement.parentElement.children).indexOf(parentElement);
            pointType = null;
        } else if (parentElement.classList.contains('bin-7seg-wrapper')) {
            type = 'bin-7seg';
            id = 0;
            const labelEl = pointElement.parentElement.querySelector('.input-label');
            if (labelEl) {
                const label = labelEl.textContent;
                const bcdGroup = pointElement.closest('.bcd-group');
                if (bcdGroup) {
                    const groupLabel = bcdGroup.querySelector('.bcd-group-label')?.textContent.toLowerCase();
                    pointType = `${groupLabel}_${label}`;
                } else {
                    pointType = `segment_${label}`;
                }
            }
        }

        if (type !== undefined && id !== undefined && pointType !== undefined) {
            return { type, id, pointType };
        }
        return null;
    }

    startConnection(type, id, outputType, event) {
        this.resetCurrentConnection();

        this.state.currentConnection = { type, id, outputType };

        this.factory.highlightConnectionPoint(type, id, outputType, true);

        this.startTempWireFromPoint(type, id, outputType);

        this.state.emit(CONFIG.EVENTS.CONNECTION_START, {
            type, id, outputType
        });
    }

    startTempWireFromPoint(type, id, outputType) {
        const point = this.factory.getConnectionPoint(type, id, outputType);
        if (!point) return;

        const rect = point.getBoundingClientRect();
        const boardRect = document.getElementById(CONFIG.ELEMENTS.BOARD).getBoundingClientRect();

        const startX = (rect.left + rect.width / 2) - boardRect.left;
        const startY = (rect.top + rect.height / 2) - boardRect.top;

        this.tempWire = { startX, startY };
    }

    completeConnection(type, id, outputType) {
        const from = {
            type: this.state.currentConnection.type,
            id: this.state.currentConnection.id,
            outputType: this.state.currentConnection.outputType
        };

        const to = {
            type,
            id,
            inputType: outputType
        };

        if (from.type === to.type && from.id === to.id && from.outputType === to.inputType) {
            this.resetCurrentConnection();
            this.clearTempWire();
            this.factory.showToast('لا يمكن ربط النقطة بنفسها', 'error');
            return;
        }

        // ⭐ السماح بالاتصالات داخل نفس العنصر لإنشاء signal bridges
        if (from.type === to.type && from.id === to.id) {
            console.log(`🔗 DEBUG: Internal connection within same element: ${from.type}${from.id}[${from.outputType}] → ${to.type}${to.id}[${to.inputType}]`);
            
            // منع فقط الاتصال من نقطة لنفسها تماماً
            if (from.outputType === to.inputType) {
                this.resetCurrentConnection();
                this.clearTempWire();
                this.factory.showToast('لا يمكن ربط النقطة بنفسها', 'error');
                return;
            }
            
            // السماح بجميع الاتصالات الأخرى داخل نفس العنصر
            console.log(`✅ DEBUG: Allowing internal bridge connection`);
            this.factory.showToast(`جسر داخلي: ${from.outputType} ⟷ ${to.inputType}`, 'success');
        }

        if (this.state.connectionExists(from, to) || this.state.connectionExists(to, from)) {
            this.resetCurrentConnection();
            this.clearTempWire();
            return;
        }

        const validConnection = this.validateAndNormalizeConnection(from, to);

        if (validConnection) {
            this.state.addConnection(validConnection.from, validConnection.to);

            this.wireManager.drawWire(validConnection.from, validConnection.to);

            this.factory.setConnectionPointState(validConnection.from.type, validConnection.from.id, validConnection.from.outputType, true);
            this.factory.setConnectionPointState(validConnection.to.type, validConnection.to.id, validConnection.to.inputType, true);

            this.propagateInitialState(validConnection.from);
            
            // ⭐ إذا كان اتصال مباشر بين مصدرين، انشر من الطرف الآخر أيضاً
            const sourceTypes = ['input', 'pulse', 'gate-output'];
            if (sourceTypes.includes(validConnection.to.type)) {
                console.log(`🌉 DEBUG: Creating bidirectional bridge: ${validConnection.from.type}${validConnection.from.id} ⟷ ${validConnection.to.type}${validConnection.to.id}`);
                setTimeout(() => {
                    this.propagateInitialState(validConnection.to);
                }, 20);
                this.factory.showToast('تم إنشاء جسر إشارة ثنائي الاتجاه', 'success');
            } else {
                console.log(`📡 DEBUG: Regular connection: ${validConnection.from.type}${validConnection.from.id} → ${validConnection.to.type}${validConnection.to.id}`);
            }
        }

        this.resetCurrentConnection();
        this.clearTempWire();
    }

    validateAndNormalizeConnection(from, to) {
        console.log(`🔍 DEBUG: Validating connection: ${from.type}${from.id}[${from.outputType}] → ${to.type}${to.id}[${to.inputType}]`);
        
        const sourceTypes = ['input', 'pulse', 'gate-output'];
        const sinkTypes = ['led', 'gate-input', 'bin-7seg'];

        const fromIsSource = sourceTypes.includes(from.type);
        const fromIsSink = sinkTypes.includes(from.type);
        const toIsSource = sourceTypes.includes(to.type);
        const toIsSink = sinkTypes.includes(to.type);

        console.log(`🔍 DEBUG: from=${from.type} (source:${fromIsSource}, sink:${fromIsSink}), to=${to.type} (source:${toIsSource}, sink:${toIsSink})`);

        // منع الاتصال من نقطة لنفسها
        if (from.type === to.type && from.id === to.id && from.outputType === to.inputType) {
            console.log(`❌ DEBUG: Self-connection detected, rejecting`);
            this.factory.showToast('لا يمكن ربط النقطة بنفسها', 'error');
            return null;
        }

        if (fromIsSource && toIsSink) {
            console.log(`✅ DEBUG: Valid source→sink connection`);
            return { from, to };
        }

        if (fromIsSink && toIsSource) {
            console.log(`✅ DEBUG: Valid sink→source connection (normalized)`);
            return {
                from: {
                    type: to.type,
                    id: to.id,
                    outputType: to.inputType
                },
                to: {
                    type: from.type,
                    id: from.id,
                    inputType: from.outputType
                }
            };
        }

        if (fromIsSource && toIsSource) {
            console.log(`✅ DEBUG: Valid source→source bridged connection`);
            return { from, to };
        }

        if (fromIsSink && toIsSink) {
            console.log(`⚠️ DEBUG: Sink→sink connection (unusual but allowed)`);
            return { from, to };
        }

        console.log(`❌ DEBUG: Invalid connection type`);
        this.factory.showToast('اتصال غير صالح', 'error');
        return null;
    }

    propagateInitialState(from) {
        const sourceState = this.state.getSourceState(from);
        this.state.updateConnectedElements(from.id, from.type);
        
        // ⭐ تطبيق الانتشار ثنائي الاتجاه عند إنشاء اتصال جديد
        console.log(`🚀 DEBUG: propagateInitialState for ${from.type}${from.id} with state ${sourceState}`);
        setTimeout(() => {
            this.state.propagateBidirectionalSignal(from, sourceState);
        }, 10);
    }

    resetCurrentConnection() {
        if (this.state.currentConnection) {
            const { type, id, outputType } = this.state.currentConnection;

            this.factory.highlightConnectionPoint(type, id, outputType, false);

            const point = this.factory.getConnectionPoint(type, id, outputType);
            if (point) {
                point.style.background = '';
                point.style.backgroundColor = '';
                point.style.borderColor = '';

                if (this.isPointConnected(type, id, outputType)) {
                    point.classList.add('connected');
                } else {
                    point.classList.remove('connected');
                }
            }

            this.state.currentConnection = null;
        }
    }

    isPointConnected(type, id, pointType) {
        return this.state.connections.some(conn => {
            if (conn.from.type === type && conn.from.id === id) {
                if (pointType === null || pointType === undefined) {
                    return conn.from.outputType === null || conn.from.outputType === undefined || conn.from.outputType === '';
                } else {
                    return conn.from.outputType === pointType;
                }
            }
            if (conn.to.type === type && conn.to.id === id) {
                if (pointType === null || pointType === undefined) {
                    return conn.to.inputType === null || conn.to.inputType === undefined || conn.to.inputType === '';
                } else {
                    return conn.to.inputType === pointType;
                }
            }
            return false;
        });
    }

    // RAF-driven updater for temp wire
    updateTempWireRaf() {
        if (!this.tempWire) return;

        const rect = document.getElementById(CONFIG.ELEMENTS.BOARD).getBoundingClientRect();
        const endX = this._lastMouse.x - rect.left;
        const endY = this._lastMouse.y - rect.top;

        this.wireManager.drawTempWire(
            this.tempWire.startX,
            this.tempWire.startY,
            endX,
            endY
        );
    }

    clearTempWire() {
        this.wireManager.clearTempWire();
        this.tempWire = null;
    }

    handleDocumentClick(event) {
        if (event.target.closest('.toggle-switch') || 
            event.target.classList.contains('delete-button') ||
            event.target.closest('.pulse-button')) {
            return;
        }

        if (event.target.classList.contains('connection-point')) {
            return;
        }

        const closestPoint = this.findClosestConnectionPoint(event.clientX, event.clientY);
        const closestWire = this.findClosestWire(event.clientX, event.clientY);

        if (this.state.currentConnection !== null) {
            if (closestPoint && closestPoint.distance <= this.SNAP_RADIUS) {
                const current = this.state.currentConnection;
                if (closestPoint.type === current.type &&
                    closestPoint.id === current.id &&
                    closestPoint.pointType === current.outputType) {
                    this.resetCurrentConnection();
                    this.clearTempWire();
                    this.factory.showToast('لا يمكن ربط النقطة بنفسها', 'error');
                    return;
                } else {
                    this.completeConnection(closestPoint.type, closestPoint.id, closestPoint.pointType);
                    return;
                }
            }

            this.resetCurrentConnection();
            this.clearTempWire();
            this.wireManager.hideDeleteButton();
        }
        else {
            if (closestPoint && closestPoint.distance <= this.SNAP_RADIUS) {
                if (!closestWire || closestPoint.distance < closestWire.distance) {
                    this.startConnection(closestPoint.type, closestPoint.id, closestPoint.pointType, event);
                    return;
                }
            }

            if (closestWire && closestWire.distance <= this.WIRE_CLICK_RADIUS) {
                this.handleWireClick(event, closestWire.element);
                return;
            }

            this.wireManager.hideDeleteButton();
        }
    }

    handleWireClick(event, wireElement) {
        const from = {
            type: wireElement.dataset.fromType,
            id: parseInt(wireElement.dataset.fromId),
            outputType: wireElement.dataset.fromOutputType || null
        };
        const to = {
            type: wireElement.dataset.toType,
            id: parseInt(wireElement.dataset.toId),
            inputType: wireElement.dataset.toInputType || null
        };

        this.wireManager.showDeleteButton(event, wireElement, from, to);
    }

    // إصلاح دالة حذف الاتصال - التأكد من حذف الخط المرئي
    deleteConnection(from, to) {
        // العثور على الخط المرئي قبل حذف الاتصال من الحالة
        const wireElement = this.wireManager.getWireElement(from, to);

        // حذف الاتصال من الحالة
        const removed = this.state.removeConnection({ from, to });

        if (removed) {
            // حذف الخط المرئي إذا وُجد
            if (wireElement) {
                wireElement.remove();
                const connectionKey = this.wireManager.generateConnectionKey(from, to);
                this.wireManager.wireElements.delete(connectionKey);
            }

            // تحديث حالة النقاط
            if (!this.isPointConnected(from.type, from.id, from.outputType)) {
                this.factory.setConnectionPointState(from.type, from.id, from.outputType, false);
            }

            if (!this.isPointConnected(to.type, to.id, to.inputType)) {
                this.factory.setConnectionPointState(to.type, to.id, to.inputType, false);
            }

            this.resetDisconnectedTargets(to);

            this.reevaluateAllConnections();
            
            // ⭐ إعادة تقييم فورية للجسور الداخلية عند الحذف
            setTimeout(() => {
                this.reevaluateInternalBridges();
            }, 50);

            return true;
        }

        return false;
    }

    resetDisconnectedTargets(target) {
        if (!this.isPointConnected(target.type, target.id, target.inputType)) {
            if (target.type === 'led') {
                this.state.updateLED(target.id, false);
                this.factory.updateLEDVisual(target.id);
            } else if (target.type === 'gate-input') {
                this.state.disconnectGateInput(target.id, target.inputType);
                this.factory.updateGateVisual(target.id);
            } else if (target.type === 'bin-7seg') {
                this.state.updateBin7Seg(target.id, target.inputType, false);
                this.factory.updateBin7SegDisplay(target.id);
            }
        }
    }

    reevaluateAllConnections() {
        this.state.leds.forEach((led, id) => {
            led.state = false;
            this.factory.updateLEDVisual(id);
        });

        this.state.gates.forEach((gate, id) => {
            const inputCount = gate.inputCount || 4;
            gate.inputs = new Array(inputCount).fill(false);
            gate.connected = new Array(inputCount).fill(false);
            if (gate.type !== 'POWER_HIGH' && gate.type !== 'POWER_LOW') {
                gate.output = false;
            }
            this.factory.updateGateVisual(id);
        });

        this.state.bin7segs.forEach((bin7seg, id) => {
            bin7seg.displays.forEach(display => {
                display.value = 0;
                Object.keys(display.segments).forEach(seg => {
                    if (display.segments[seg]) {
                        display.segments[seg].directControl = false;
                    }
                });
            });
            this.factory.updateBin7SegDisplay(id);
        });

        this.updateAllConnectionPointStates();

        this.state.inputs.forEach((input, id) => {
            this.state.updateConnectedElements(id, 'input');
        });

        this.state.gates.forEach((gate, id) => {
            this.state.updateConnectedElements(id, 'gate-output');
        });

        // ⭐ إضافة إعادة تقييم الجسور الداخلية بعد إعادة التقييم
        setTimeout(() => {
            this.state.inputs.forEach((input, id) => {
                this.state.updateConnectedElements(id, 'input');
            });
            
            // ⭐ إعادة تقييم جميع الجسور الداخلية
            this.reevaluateInternalBridges();
        }, 10);
    }

    updateAllConnectionPointStates() {
        this.state.inputs.forEach((input, id) => {
            this.factory.setConnectionPointState('input', id, 'q',
                this.isPointConnected('input', id, 'q'));
            this.factory.setConnectionPointState('input', id, 'q_not',
                this.isPointConnected('input', id, 'q_not'));
        });

        // Update pulse generator connection points
        if (this.state.pulses) {
            this.state.pulses.forEach((pulse, id) => {
                this.factory.setConnectionPointState('pulse', id, 'q',
                    this.isPointConnected('pulse', id, 'q'));
                this.factory.setConnectionPointState('pulse', id, 'q_not',
                    this.isPointConnected('pulse', id, 'q_not'));
            });
        }

        this.state.gates.forEach((gate, id) => {
            let inputTypes = [];
            if (gate.type === 'ADDER_4BIT') {
                inputTypes = ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', 'Cin'];
            } else if (gate.type === 'COMP_4BIT') {
                inputTypes = ['A0', 'A1', 'A2', 'A3', 'B0', 'B1', 'B2', 'B3', '>', '<', '='];
            } else if (gate.type === 'COMP_BASIC') {
                inputTypes = ['P', 'Q'];
            } else if (gate.type === 'JK_FF') {
                inputTypes = ['S', 'J', 'C', 'K', 'R'];
            } else if (gate.type === 'D_FF') {
                inputTypes = ['D', 'C'];
            } else if (gate.type === 'POWER_HIGH' || gate.type === 'POWER_LOW') {
                inputTypes = [];
            } else if (gate.inputCount === 1) {
                inputTypes = ['A'];
            } else if (gate.inputCount === 2) {
                inputTypes = ['A', 'B'];
            } else {
                inputTypes = ['A', 'B', 'C', 'D'];
            }

            inputTypes.forEach(inputType => {
                this.factory.setConnectionPointState('gate-input', id, inputType,
                    this.isPointConnected('gate-input', id, inputType));
            });

            if (gate.type === 'ADDER_4BIT') {
                ['S0', 'S1', 'S2', 'S3', 'CO'].forEach(outputType => {
                    this.factory.setConnectionPointState('gate-output', id, outputType,
                        this.isPointConnected('gate-output', id, outputType));
                });
            } else if (gate.type === 'COMP_4BIT' || gate.type === 'COMP_BASIC') {
                ['P>Q', 'P=Q', 'P<Q'].forEach(outputType => {
                    this.factory.setConnectionPointState('gate-output', id, outputType,
                        this.isPointConnected('gate-output', id, outputType));
                });
            } else if (gate.type === 'POWER_HIGH' || gate.type === 'POWER_LOW') {
                for (let i = 0; i < 8; i++) {
                    this.factory.setConnectionPointState('gate-output', id, i.toString(),
                        this.isPointConnected('gate-output', id, i.toString()));
                }
            } else {
                this.factory.setConnectionPointState('gate-output', id, 'q',
                    this.isPointConnected('gate-output', id, 'q'));
                this.factory.setConnectionPointState('gate-output', id, 'q_not',
                    this.isPointConnected('gate-output', id, 'q_not'));
            }
        });

        this.state.leds.forEach((led, id) => {
            this.factory.setConnectionPointState('led', id, null,
                this.isPointConnected('led', id, null));
        });

        this.state.bin7segs.forEach((bin7seg, id) => {
            ['bcd1_1', 'bcd1_2', 'bcd1_4', 'bcd1_8',
                'bcd2_1', 'bcd2_2', 'bcd2_4', 'bcd2_8',
                'segment_a', 'segment_b', 'segment_c', 'segment_d',
                'segment_e', 'segment_f', 'segment_g'].forEach(inputType => {
                    this.factory.setConnectionPointState('bin-7seg', id, inputType,
                        this.isPointConnected('bin-7seg', id, inputType));
                });
        });
    }

    clearAllConnections() {
        this.state.connections = [];
        this.state.currentConnection = null;

        this.wireManager.clearAllWires();

        this.reevaluateAllConnections();

        this.clearTempWire();
    }

    // دالة إضافية لتنظيف الخطوط اليتيمة بعد استعادة الحفظ التلقائي
    cleanupOrphanedWires() {
        const allWireElements = document.querySelectorAll('.wire-line');
        const validConnectionKeys = new Set(
            this.state.connections.map(conn =>
                this.wireManager.generateConnectionKey(conn.from, conn.to)
            )
        );

        allWireElements.forEach(wireEl => {
            const from = {
                type: wireEl.dataset.fromType,
                id: parseInt(wireEl.dataset.fromId),
                outputType: wireEl.dataset.fromOutputType || null
            };
            const to = {
                type: wireEl.dataset.toType,
                id: parseInt(wireEl.dataset.toId),
                inputType: wireEl.dataset.toInputType || null
            };

            const connectionKey = this.wireManager.generateConnectionKey(from, to);

            if (!validConnectionKeys.has(connectionKey)) {
                wireEl.remove();
                this.wireManager.wireElements.delete(connectionKey);
            }
        });
    }

    // ⭐ دالة لإعادة تقييم جميع الجسور الداخلية بعد حذف الاتصالات
    reevaluateInternalBridges() {
        console.log('🔄 DEBUG: Reevaluating all internal bridges...');
        
        // ابحث عن جميع الجسور الداخلية المتبقية
        this.state.connections.forEach(conn => {
            if (conn.from.type === 'gate-input' && conn.to.type === 'gate-input' && 
                conn.from.id === conn.to.id) {
                
                const gateId = conn.from.id;
                const fromInput = conn.from.inputType;
                const toInput = conn.to.inputType;
                
                console.log(`🔗 DEBUG: Found internal bridge in gate ${gateId}: ${fromInput} ↔ ${toInput}`);
                
                // تحقق من حالة كلا المدخلين
                const gate = this.state.gates[gateId];
                if (gate) {
                    const fromIndex = this.state.getInputIndex(fromInput, gate.type);
                    const toIndex = this.state.getInputIndex(toInput, gate.type);
                    
                    if (fromIndex !== -1 && toIndex !== -1 && 
                        fromIndex < gate.inputs.length && toIndex < gate.inputs.length) {
                        
                        const fromState = gate.connected[fromIndex] && gate.inputs[fromIndex];
                        const toState = gate.connected[toIndex] && gate.inputs[toIndex];
                        
                        console.log(`📊 DEBUG: Bridge states - ${fromInput}=${fromState}, ${toInput}=${toState}`);
                        
                        // إذا كان أحد المدخلين HIGH، انقل الإشارة للآخر
                        if (fromState && !toState) {
                            console.log(`⚡ DEBUG: Propagating ${fromInput} HIGH to ${toInput}`);
                            this.state.updateGateInput(gateId, toInput, true);
                            this.state.updateInternalWireVisuals(gateId, toInput, true);
                        } else if (toState && !fromState) {
                            console.log(`⚡ DEBUG: Propagating ${toInput} HIGH to ${fromInput}`);
                            this.state.updateGateInput(gateId, fromInput, true);
                            this.state.updateInternalWireVisuals(gateId, fromInput, true);
                        } else if (fromState && toState) {
                            // كلاهما HIGH - تأكد من تحديث الأسلاك البصرية
                            this.state.updateInternalWireVisuals(gateId, fromInput, true);
                            this.state.updateInternalWireVisuals(gateId, toInput, true);
                        }
                    }
                }
            }
        });
        
        console.log('✅ DEBUG: Internal bridges reevaluation completed');
    }
}
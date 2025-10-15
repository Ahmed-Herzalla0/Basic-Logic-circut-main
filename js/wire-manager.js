class WireManager {
    constructor(stateManager, componentFactory) {
        this.state = stateManager;
        this.factory = componentFactory;
        this.wireElements = new Map();

        // Cache SVG elements and reuse temp line for performance
        this.svg = document.getElementById(CONFIG.ELEMENTS.WIRES_SVG);
        this.tempSvg = document.getElementById(CONFIG.ELEMENTS.TEMP_WIRE_SVG);
        this.tempLine = null;
        this.currentDeleteButton = null;
    }

    drawWire(from, to) {
        const fromPoint = this.factory.getConnectionPoint(from.type, from.id, from.outputType);
        const toPoint = this.factory.getConnectionPoint(to.type, to.id, to.inputType);

        if (!fromPoint || !toPoint) return null;

        const coordinates = this.calculateWireCoordinates(fromPoint, toPoint);
        const wireElement = this.createWireElement(coordinates, from, to);

        // ⭐ تحقق نوع الاتصال وإضافة التأثيرات المناسبة
        const sourceTypes = ['input', 'pulse', 'gate-output'];
        const isSourceToSource = sourceTypes.includes(from.type) && sourceTypes.includes(to.type);
        const isInternalBridge = from.type === to.type && from.id === to.id;
        
        if (isSourceToSource) {
            console.log(`🌉 DEBUG: Creating bridged wire visual: ${from.type}${from.id} ⟷ ${to.type}${to.id}`);
            wireElement.classList.add('bridged-connection');
        } else if (isInternalBridge) {
            console.log(`🔗 DEBUG: Creating internal bridge wire: ${from.type}${from.id}[${from.outputType}] ⟷ [${to.inputType}]`);
            wireElement.classList.add('bridged-connection');
            wireElement.classList.add('internal-bridge');
            
            // ⭐ إضافة تأثير خاص للـ T mode (J↔K bridge)
            if ((from.outputType === 'J' && to.inputType === 'K') || 
                (from.outputType === 'K' && to.inputType === 'J')) {
                wireElement.classList.add('t-mode-bridge');
                console.log(`⚡ DEBUG: T-mode bridge detected (J↔K)`);
            }
        } else {
            console.log(`📏 DEBUG: Creating regular wire: ${from.type}${from.id} → ${to.type}${to.id}`);
        }

        const connectionKey = this.generateConnectionKey(from, to);
        this.wireElements.set(connectionKey, wireElement);

        return wireElement;
    }

    calculateWireCoordinates(fromPoint, toPoint) {
        const fromRect = fromPoint.getBoundingClientRect();
        const toRect = toPoint.getBoundingClientRect();
        const boardRect = document.getElementById(CONFIG.ELEMENTS.BOARD).getBoundingClientRect();

        const fromCenterX = Math.floor(fromRect.left + fromRect.width / 2 - boardRect.left) + 0.5;
        const fromCenterY = Math.floor(fromRect.top + fromRect.height / 2 - boardRect.top) + 0.5;
        const toCenterX = Math.floor(toRect.left + toRect.width / 2 - boardRect.left) + 0.5;
        const toCenterY = Math.floor(toRect.top + toRect.height / 2 - boardRect.top) + 0.5;

        return {
            x1: fromCenterX,
            y1: fromCenterY,
            x2: toCenterX,
            y2: toCenterY
        };
    }

    createWireElement(coords, from, to) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

        line.setAttribute('x1', coords.x1.toFixed(1));
        line.setAttribute('y1', coords.y1.toFixed(1));
        line.setAttribute('x2', coords.x2.toFixed(1));
        line.setAttribute('y2', coords.y2.toFixed(1));
        line.setAttribute('opacity', '0.8');
        line.setAttribute('class', 'wire-line');

        line.setAttribute('shape-rendering', 'geometricPrecision');
        line.setAttribute('stroke-linecap', 'butt');
        line.setAttribute('stroke-linejoin', 'miter');
        line.setAttribute('vector-effect', 'non-scaling-stroke');

        line.style.pointerEvents = 'all';

        this.updateWireStateVisual(line, false);

        this.setWireData(line, from, to);

        this.setupWireEvents(line, from, to);

        this.svg.appendChild(line);
        return line;
    }

    updateWireStateVisual(wireElement, isHigh) {
        if (isHigh) {
            wireElement.setAttribute('stroke', CONFIG.STYLES.COLORS.WIRE_ACTIVE);
            wireElement.setAttribute('stroke-width', '4');
            wireElement.classList.add('high-state');
            wireElement.classList.remove('low-state');
        } else {
            wireElement.setAttribute('stroke', '#666');
            wireElement.setAttribute('stroke-width', '2');
            wireElement.classList.add('low-state');
            wireElement.classList.remove('high-state');
        }
    }

    updateWireState(from, to, active = false) {
        const wireElement = this.getWireElement(from, to);
        if (!wireElement) return;

        this.updateWireStateVisual(wireElement, active);
    }

    setWireData(line, from, to) {
        line.dataset.fromType = from.type;
        line.dataset.fromId = from.id;
        line.dataset.fromOutputType = from.outputType || '';
        line.dataset.toType = to.type;
        line.dataset.toId = to.id;
        line.dataset.toInputType = to.inputType || '';
    }

    setupWireEvents(line, from, to) {
        line.style.cursor = 'pointer';

        line.addEventListener('mouseenter', () => {
            line.setAttribute('stroke', CONFIG.STYLES.COLORS.WIRE_HOVER);
            line.setAttribute('stroke-width', (CONFIG.STYLES.WIRE_WIDTH + 1).toString());
        });

        line.addEventListener('mouseleave', () => {
            const isHigh = line.classList.contains('high-state');
            this.updateWireStateVisual(line, isHigh);
        });
    }

    showDeleteButton(event, wireElement, from, to) {
        this.hideDeleteButton();

        const rect = document.getElementById(CONFIG.ELEMENTS.BOARD).getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        const deleteButton = this.createDeleteButton(x, y, () => {
            this.deleteWire(wireElement, from, to);
        });

        document.getElementById(CONFIG.ELEMENTS.BOARD).appendChild(deleteButton);
        this.currentDeleteButton = deleteButton;
    }

    createDeleteButton(x, y, onDelete) {
        const button = document.createElement('div');
        button.className = 'delete-button';
        button.textContent = 'احذف الخط';
        button.style.left = `${x}px`;
        button.style.top = `${y}px`;

        button.onclick = (e) => {
            e.stopPropagation();
            onDelete();
            this.hideDeleteButton();
        };

        setTimeout(() => {
            if (this.currentDeleteButton === button) {
                this.hideDeleteButton();
            }
        }, 3000);

        return button;
    }

    hideDeleteButton() {
        if (this.currentDeleteButton) {
            this.currentDeleteButton.remove();
            this.currentDeleteButton = null;
        }
    }

    deleteWire(wireElement, from, to) {
        // استخدام ConnectionManager لحذف الاتصال مع التأكد من حذف الخط المرئي
        window.connectionManager.deleteConnection(from, to);

        // أمان إضافي
        if (wireElement && wireElement.parentNode) {
            wireElement.remove();
        }

        const connectionKey = this.generateConnectionKey(from, to);
        this.wireElements.delete(connectionKey);
    }

    // Reuse a single temp line for better performance
    drawTempWire(x1, y1, x2, y2) {
        const roundedX1 = Math.floor(x1) + 0.5;
        const roundedY1 = Math.floor(y1) + 0.5;
        const roundedX2 = Math.floor(x2) + 0.5;
        const roundedY2 = Math.floor(y2) + 0.5;

        if (!this.tempLine) {
            this.tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            this.tempLine.setAttribute('stroke', CONFIG.STYLES.COLORS.TEMP_WIRE);
            this.tempLine.setAttribute('stroke-width', CONFIG.STYLES.TEMP_WIRE_WIDTH.toString());
            this.tempLine.setAttribute('opacity', '0.6');
            this.tempLine.setAttribute('stroke-dasharray', '5,5');
            this.tempLine.setAttribute('shape-rendering', 'geometricPrecision');
            this.tempLine.setAttribute('stroke-linecap', 'butt');
            this.tempLine.setAttribute('vector-effect', 'non-scaling-stroke');
            this.tempLine.classList.add('temp-wire');
            this.tempSvg.appendChild(this.tempLine);
        }

        this.tempLine.setAttribute('x1', roundedX1.toFixed(1));
        this.tempLine.setAttribute('y1', roundedY1.toFixed(1));
        this.tempLine.setAttribute('x2', roundedX2.toFixed(1));
        this.tempLine.setAttribute('y2', roundedY2.toFixed(1));
        this.tempLine.style.display = '';
    }

    clearTempWire() {
        if (this.tempLine) {
            this.tempLine.style.display = 'none';
        } else if (this.tempSvg) {
            this.tempSvg.innerHTML = '';
        }
    }

    clearAllWires() {
        if (this.svg) this.svg.innerHTML = '';
        this.wireElements.clear();
        this.hideDeleteButton();
    }

    generateConnectionKey(from, to) {
        return `${from.type}-${from.id}-${from.outputType || 'null'}_to_${to.type}-${to.id}-${to.inputType || 'null'}`;
    }

    // إصلاح دالة إعادة رسم الخطوط مع تنظيف أفضل
    redrawAllWires() {
        const connections = [...this.state.connections];

        // مسح كل شيء
        this.clearAllWires();

        // إعادة رسم الاتصالات الصالحة فقط
        setTimeout(() => {
            connections.forEach(conn => {
                this.drawWire(conn.from, conn.to);
            });

            // تنظيف إضافي للخطوط اليتيمة
            if (window.connectionManager) {
                setTimeout(() => {
                    window.connectionManager.cleanupOrphanedWires();
                }, 100);
            }
        }, 50);
    }

    getWireElement(from, to) {
        const connectionKey = this.generateConnectionKey(from, to);
        return this.wireElements.get(connectionKey);
    }

    animateWire(from, to, duration = 1000) {
        const wireElement = this.getWireElement(from, to);
        if (!wireElement) return;

        wireElement.style.animation = `pulseWire ${duration}ms ease-in-out`;

        setTimeout(() => {
            wireElement.style.animation = '';
        }, duration);
    }

    // التأكد من مزامنة wireElements مع الاتصالات الفعلية
    syncWireElements() {
        const validKeys = new Set(
            this.state.connections.map(conn =>
                this.generateConnectionKey(conn.from, conn.to)
            )
        );

        // إزالة الخطوط غير الصالحة من Map
        for (const [key, element] of this.wireElements) {
            if (!validKeys.has(key)) {
                if (element && element.parentNode) {
                    element.remove();
                }
                this.wireElements.delete(key);
            }
        }
    }
}
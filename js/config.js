const CONFIG = {
    ELEMENTS: {
        BOARD: 'main-board',
        INPUTS_CONTAINER: 'inputs-container',
        GATES_CONTAINER: 'gates-container',
        LEDS_CONTAINER: 'leds-container',
        BIN_7SEG_CONTAINER: 'bin-7seg-container',
        WIRES_SVG: 'wires-svg',
        TEMP_WIRE_SVG: 'temp-wire-svg',
        CLEAR_BTN: 'clear-all-btn',
        SAVE_BTN: 'save-config-btn',
        LOAD_BTN: 'load-config-btn'
    },

    INPUTS: {
        COUNT: 8,
        LABELS: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
        PULSE_COUNT: 1,
        PULSE_LABELS: ['PULSE']
    },

    GATES: {
        AND_COUNT: 7,
        OR_COUNT: 5,
        SPECIAL_COUNT: 5,
        NOT_COUNT: 2,
        ADDER_COUNT: 2,
        COMP_4BIT_COUNT: 1,
        COMP_BASIC_COUNT: 1,
        POWER_COUNT: 2,
        JK_FF_COUNT: 4,  // Hybrid JK/SCR (S,J,C,K,R) - 5 inputs
        D_FF_COUNT: 4,
        
        get TOTAL_COUNT() {
            return this.AND_COUNT + this.OR_COUNT + this.SPECIAL_COUNT + 
                   this.NOT_COUNT + this.ADDER_COUNT + this.COMP_4BIT_COUNT + 
                   this.COMP_BASIC_COUNT + this.POWER_COUNT + this.JK_FF_COUNT + this.D_FF_COUNT;
        },

        AND_LABELS: ['AND1', 'AND2', 'AND3', 'AND4', 'AND5', 'AND6', 'AND7'],
        OR_LABELS: ['OR1', 'OR2', 'OR3', 'OR4', 'OR5'],
        NOT_LABELS: ['NOT1', 'NOT2'],
        ADDER_LABELS: ['ADD1', 'ADD2'],
        COMP_4BIT_LABELS: ['COMP4'],
        COMP_BASIC_LABELS: ['COMP'],
        POWER_LABELS: ['HIGH', 'LOW'],
        JK_FF_LABELS: ['JK1', 'JK2', 'JK3', 'JK4'],
        D_FF_LABELS: ['D1', 'D2', 'D3', 'D4']
    },

    LEDS: {
        COUNT: 12,
        LABELS: ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10', 'L11', 'L12']
    },

    BIN_7SEG: {
        COUNT: 1,
        LABELS: ['BIN/7SEG Display']
    },

    STYLES: {
        COLORS: {
            WIRE_ACTIVE: '#00ff41',
            WIRE_INACTIVE: '#666',
            WIRE_HOVER: '#ff6b6b',
            TEMP_WIRE: '#ffff00',
            CONNECTION_POINT_ACTIVE: '#00ff41',
            CONNECTION_POINT_HOVER: '#e94560'
        },
        WIRE_WIDTH: 3,
        TEMP_WIRE_WIDTH: 2
    },

    EVENTS: {
        INPUT_TOGGLE: 'input-toggle',
        STATE_UPDATE: 'state-update',
        CONNECTION_START: 'connection-start',
        CONNECTION_COMPLETE: 'connection-complete',
        CONNECTION_DELETE: 'connection-delete'
    }
};
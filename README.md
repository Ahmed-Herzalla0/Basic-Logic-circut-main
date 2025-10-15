# Basic Logic Circuit Simulator

A comprehensive digital logic circuit simulator built with HTML5, CSS3, and JavaScript. This interactive web application allows users to design, simulate, and test digital logic circuits with various components including basic gates, flip-flops, comparators, and display units.

## 🚀 Features

### Core Components
- **Logic Gates**: AND, OR, XOR, XNOR, NOT, AB+CD
- **Flip-Flops**: JK Flip-Flop with T-mode support, D Flip-Flop
- **Arithmetic**: 4-bit Adder, 4-bit Comparator, Basic Comparator
- **Power Sources**: HIGH and LOW constant sources
- **Input/Output**: Interactive inputs, LEDs, 7-segment displays
- **Signal Sources**: Pulse generators with normal and fast modes

### Advanced Features
- **Wire Bridging**: Connect multiple points to share signals
- **Internal Bridging**: Connect inputs within the same gate
- **T Flip-Flop Mode**: Automatic detection when J and K are bridged
- **Visual Feedback**: Color-coded wires (HIGH=green, LOW=gray)
- **Real-time Simulation**: Instant propagation of signal changes
- **Debug Tools**: Comprehensive debugging and testing functions

## 🎯 Getting Started

### Prerequisites
- Modern web browser (Chrome, Firefox, Safari, Edge)
- No additional software installation required

### Installation
1. Clone or download the repository
2. Open `index.html` in your web browser
3. Start building circuits immediately!

### Basic Usage
1. **Add Components**: Click on component buttons to add them to the canvas
2. **Make Connections**: Click on connection points and drag to create wires
3. **Toggle Inputs**: Click on input components to change their state
4. **Observe Outputs**: Watch LEDs and displays respond to circuit changes

## 🔧 Component Details

### Logic Gates
- **AND Gate**: Output HIGH when all inputs are HIGH
- **OR Gate**: Output HIGH when any input is HIGH
- **XOR Gate**: Output HIGH when odd number of inputs are HIGH
- **NOT Gate**: Inverts the input signal

### Flip-Flops
- **JK Flip-Flop**: 
  - Standard JK operation with Set, Reset, Clock inputs
  - **T-Mode**: Automatically detected when J and K are internally bridged
  - Edge-triggered on rising clock edge
- **D Flip-Flop**: Data is latched on rising clock edge

### Arithmetic Components
- **4-bit Adder**: Adds two 4-bit numbers with carry input/output
- **4-bit Comparator**: Compares two 4-bit numbers
  - **> input**: Requires LOW to enable P>Q output
  - **< input**: Requires LOW to enable P<Q output  
  - **= input**: Requires HIGH to enable P=Q output

## 🌉 Wire Bridging System

### External Bridging
Connect multiple sources (inputs, outputs) to share signals:
```
INPUT_A ←→ PULSE_1 ←→ GATE_OUTPUT
```

### Internal Bridging
Connect inputs within the same gate for special behaviors:
```
JK_FF: J ←→ K  (Creates T Flip-Flop mode)
AND_GATE: A ←→ B  (Both inputs share same signal)
```

### Visual Indicators
- **Normal Wire**: Solid line (green=HIGH, gray=LOW)
- **External Bridge**: Dashed line with pulse animation
- **Internal Bridge**: Orange dashed line with special animation
- **T-Mode Bridge**: Distinct orange color for J↔K connections

## 🧪 Debug & Testing

Open browser console (F12) and use these commands:

### Basic Debug
- `debugConnections()` - Show all connections and states
- `checkWireVisuals()` - Inspect wire colors and states
- `clearDebug()` - Clear console

### Feature Testing
- `testBridging()` - Test wire bridging functionality
- `testInternalBridge()` - Test internal gate bridging
- `testTFlipFlop()` - Test T Flip-Flop mode automatically
- `testCOMP4BIT()` - Test 4-bit comparator logic
- `testRecursionFix()` - Verify infinite recursion fix
- `testConnectionDeletion()` - Test bridge persistence

## 🏗️ Architecture

### Core Classes
- **StateManager**: Manages component states and signal propagation
- **ConnectionManager**: Handles wire creation and deletion
- **WireManager**: Manages visual wire rendering and updates
- **ComponentFactory**: Creates and manages circuit components
- **UIManager**: Handles user interface interactions

### Key Features Implementation
- **Recursion Protection**: Prevents infinite loops in signal propagation
- **Bidirectional Propagation**: Signals flow in both directions through bridges
- **Edge Detection**: Proper rising-edge triggering for flip-flops
- **State Persistence**: Maintains circuit state during operations

## 📁 Project Structure

```
Basic-Logic-Circuit/
├── index.html              # Main application page
├── README.md              # This file
├── js/
│   ├── config.js          # Configuration constants
│   ├── state-manager.js   # Core state management
│   ├── connection-manager.js # Wire connection handling
│   ├── wire-manager.js    # Visual wire management
│   ├── component-factory.js # Component creation
│   ├── ui-manager.js      # User interface
│   └── main.js           # Application initialization
├── styles/
│   ├── main.css          # Main styles
│   ├── components.css    # Component-specific styles
│   └── animations.css    # Animation definitions
└── assets/               # Images and other assets
```

## 🎨 Styling

The application uses modern CSS with:
- **Flexbox Layout**: Responsive component arrangement
- **CSS Grid**: Structured canvas layout
- **CSS Animations**: Wire state transitions and pulse effects
- **Custom Properties**: Consistent color scheme and spacing

## 🔄 Signal Propagation

### Standard Flow
1. User toggles input → State change detected
2. StateManager updates connected elements
3. Signal propagates through wires
4. Target components update their states
5. Visual feedback updates immediately

### Bridge Propagation
1. Signal applied to one bridge point
2. Bidirectional propagation to all connected points
3. Internal bridges update gate behavior
4. Special handling for T-mode flip-flops

## 🐛 Known Issues & Solutions

### Issue: Infinite Recursion
**Fixed**: Added recursion protection in `updateGateInput()` and `propagateGateInputBridge()`

### Issue: Bridge State Loss
**Fixed**: Implemented `reevaluateInternalBridges()` to maintain state after deletions

### Issue: Visual Sync Problems
**Fixed**: Enhanced wire visual update system with explicit state management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly using debug functions
5. Submit a pull request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 🎓 Educational Use

This simulator is perfect for:
- **Digital Logic Courses**: Hands-on circuit design
- **Computer Engineering**: Understanding flip-flops and counters  
- **Self-Learning**: Interactive exploration of digital concepts
- **Prototyping**: Quick testing of logic designs

## 🔮 Future Enhancements

- [ ] Circuit save/load functionality
- [ ] More complex components (multiplexers, decoders)
- [ ] Timing diagram visualization
- [ ] Circuit optimization suggestions
- [ ] Mobile device support
- [ ] Collaborative editing features

## 📞 Support

For questions, issues, or contributions, please:
1. Check existing issues in the repository
2. Use debug functions to diagnose problems
3. Create detailed issue reports with steps to reproduce
4. Include browser and version information

---

**Happy Circuit Building!** 🔌⚡
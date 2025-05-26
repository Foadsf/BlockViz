# BlockViz - OpenFOAM blockMeshDict Visualizer

![BlockViz Banner](https://img.shields.io/badge/BlockViz-v1.0-blue?style=for-the-badge&logo=openfoam)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)
![OpenFOAM](https://img.shields.io/badge/OpenFOAM-Compatible-orange?style=for-the-badge)

BlockViz is a comprehensive web-based visualization tool for OpenFOAM `blockMeshDict` files. It provides real-time 3D visualization, validation, and debugging capabilities for structured mesh geometries, making it easier to design, validate, and understand complex blockMesh configurations.

## 🚀 Features

### 📊 Complete Geometry Visualization
- **3D Interactive Viewport** with intuitive mouse controls
- **Vertex Visualization** with numerical labels (0-indexed OpenFOAM convention)
- **Edge Rendering** including straight and curved edges (arcs, splines)
- **Face Display** with transparent surfaces and normal vectors
- **Block Wireframes** with local coordinate system indicators
- **Boundary Patch Highlighting** with patch-specific coloring

### ✅ Validation & Error Checking
- **Real-time Parsing** with comprehensive error reporting
- **Right-handed Coordinate System** validation for all blocks
- **Vertex Reference Checking** to prevent out-of-bounds errors
- **Block Topology Validation** ensuring proper hexahedral structure
- **Error Messages** identical to OpenFOAM's `blockMesh` utility

### 🎛️ Advanced Controls
- **Selective Element Display** - toggle vertices, edges, faces, blocks independently
- **Mesh Preview Generation** with adjustable density settings
- **Camera Controls** - orbit, zoom, pan with reset and fit-to-view options
- **Real-time Information Panel** showing geometry statistics
- **GMSH-inspired UI** for familiar workflow

### 🔧 Technical Capabilities
- **Curved Edge Support** for arcs and splines with interpolation points
- **Grading Visualization** showing cell expansion ratios
- **Coordinate System Display** with x₁, x₂, x₃ axes for each block
- **Scale Factor Application** automatic coordinate scaling
- **Boundary Condition Parsing** with patch type recognition

## 🖼️ Screenshots

### Main Interface
```
┌─────────────────────────────────────────────────────────────┐
│ Sidebar Controls          │  3D Viewport                    │
│ ┌─────────────────────┐   │  ┌───────────────────────────┐  │
│ │ File Input          │   │  │                           │  │
│ │ ☑ Show Vertices     │   │  │     🔴 Vertices           │  │
│ │ ☑ Show Edges        │   │  │     ── Edges              │  │
│ │ ☑ Show Faces        │   │  │     ▭ Faces               │  │
│ │ ☑ Face Normals      │   │  │     → Normal Vectors      │  │
│ │ ☑ Show Blocks       │   │  │     ⬜ Block Wireframes   │  │
│ │ ☐ Generate Mesh     │   │  │     ⚫ Mesh Points         │  │
│ │                     │   │  │                           │  │
│ │ Camera Controls     │   │  │                           │  │
│ │ Information Panel   │   │  │                           │  │
│ │ Error Log          │   │  │                           │  │
│ └─────────────────────┘   │  └───────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## 🏃‍♂️ Quick Start

### Option 1: Direct Use (Recommended)
1. Download the `blockviz.html` file
2. Open it in any modern web browser (Chrome, Firefox, Safari, Edge)
3. Click "Load Example" to see a demonstration
4. Use "Choose File" to load your own `blockMeshDict` files

### Option 2: Local Web Server
```bash
# If you need to serve from a local server
python -m http.server 8000
# Then navigate to http://localhost:8000/blockviz.html
```

### Requirements
- Modern web browser with WebGL support
- No additional dependencies or installations required
- Works offline after initial load

## 📖 Usage Guide

### Loading Files
BlockViz accepts standard OpenFOAM `blockMeshDict` files:

```cpp
// Example blockMeshDict structure
scale   0.001;

vertices
(
    ( 0   0   0  )  // vertex 0
    ( 1   0   0.1)  // vertex 1
    // ... more vertices
);

edges
(
    arc 1 5 (1.1 0.0 0.5)  // curved edge
);

blocks
(
    hex (0 1 2 3 4 5 6 7)  // vertex indices
    (10 10 10)             // cell counts
    simpleGrading (1 2 3)  // expansion ratios
);

boundary
(
    inlet  { type patch; faces ((0 4 7 3)); }
    outlet { type patch; faces ((1 2 6 5)); }
    walls  { type wall;  faces ((0 1 5 4) (0 3 2 1)); }
);
```

### Navigation Controls
- **Orbit**: Left mouse drag to rotate view
- **Zoom**: Mouse wheel to zoom in/out
- **Reset**: Click "Reset View" to return to default position
- **Fit**: Click "Fit to View" to frame entire geometry

### Visualization Options

| Control | Description |
|---------|-------------|
| Show Vertices | Display vertex points with numerical labels |
| Vertex Labels | Toggle vertex number annotations |
| Show Edges | Render block edges (straight and curved) |
| Show Faces | Display face surfaces with transparency |
| Face Normals | Show direction arrows for face orientation |
| Show Blocks | Display block wireframes and coordinate systems |
| Generate Mesh | Preview mesh points based on cell counts |
| Mesh Density | Adjust preview mesh resolution (0.1-1.0) |

### Error Detection
BlockViz validates your geometry and reports errors similar to OpenFOAM's `blockMesh`:

- ✅ **Vertex Range Checking**: "Block 0: Vertex index 8 out of range"
- ✅ **Block Handedness**: "Warning: Block 1 may not follow right-handed convention"
- ✅ **Cell Count Validation**: "Block 2: Must have exactly 8 vertices"
- ✅ **Boundary Face Validation**: "Face references non-existent vertex"

## 🎯 Use Cases

### Mesh Design & Development
- **Rapid Prototyping**: Quickly visualize geometry changes
- **Design Validation**: Check block topology before running blockMesh
- **Educational Tool**: Understand blockMesh concepts visually

### Debugging & Troubleshooting
- **Error Diagnosis**: Identify problematic vertices or blocks
- **Topology Checking**: Verify right-handed coordinate systems
- **Boundary Validation**: Ensure proper patch definitions

### Documentation & Presentation
- **Geometry Documentation**: Generate visual representations
- **Training Materials**: Demonstrate blockMesh concepts
- **Publication Figures**: Export geometry visualizations

## 🛠️ Technical Details

### Architecture
- **Frontend Only**: Pure HTML/CSS/JavaScript implementation
- **Three.js Rendering**: Hardware-accelerated 3D graphics
- **Real-time Parsing**: Custom blockMeshDict parser
- **Responsive Design**: Adapts to different screen sizes

### Supported Features
| OpenFOAM Feature | Support Level | Notes |
|------------------|---------------|-------|
| Basic Blocks | ✅ Full | All hexahedral block types |
| Curved Edges | ✅ Full | arcs, splines, polyLine |
| Grading | ✅ Visual | simpleGrading, edgeGrading |
| Boundary Patches | ✅ Full | All patch types supported |
| mergePatchPairs | ⚠️ Parsing | Visualization planned |
| Scale Factor | ✅ Full | Automatic coordinate scaling |
| Comments | ✅ Full | C++ and C-style comments |

### File Format Support
- **Standard blockMeshDict** files
- **File extensions**: `.dict`, `.txt`, or any text file
- **Encoding**: UTF-8 text files
- **Size limit**: Browser-dependent (typically several MB)

## 🔧 Advanced Features

### Coordinate System Validation
BlockViz validates that each block follows OpenFOAM's right-handed coordinate system convention:

```
x₁ direction: vertex 0 → vertex 1
x₂ direction: vertex 1 → vertex 2  
x₃ direction: vertex 0 → vertex 4
```

### Mesh Preview Generation
The mesh preview feature generates visualization points based on:
- Block cell counts (nx, ny, nz)
- Density factor (0.1-1.0)
- Trilinear interpolation within blocks
- Grading factor consideration (future enhancement)

### Color Coding
- 🔴 **Vertices**: Red points with white labels
- 🔵 **Edges**: Teal lines (straight and curved)
- 🟢 **Faces**: Semi-transparent green surfaces
- 🟡 **Face Normals**: Yellow arrows showing orientation
- 🟦 **Blocks**: Light blue wireframes
- ⚫ **Mesh Points**: Dark gray preview points
- 🔴🟢🔵 **Coordinate Axes**: RGB (XYZ) for block systems

## 🐛 Troubleshooting

### Common Issues

**File Won't Load**
- Ensure file is valid UTF-8 text
- Check for syntax errors in blockMeshDict
- Verify all required sections are present (vertices, blocks)

**Geometry Appears Distorted**
- Check scale factor in blockMeshDict
- Verify vertex coordinates are reasonable
- Use "Fit to View" to frame geometry properly

**Missing Elements**
- Enable relevant checkboxes in sidebar
- Check if geometry is outside viewing area
- Verify blockMeshDict contains expected data

**Performance Issues**
- Reduce mesh density for large geometries
- Disable mesh preview for complex cases
- Use latest browser with WebGL support

### Browser Compatibility
| Browser | Version | Support |
|---------|---------|---------|
| Chrome | 90+ | ✅ Excellent |
| Firefox | 88+ | ✅ Excellent |
| Safari | 14+ | ✅ Good |
| Edge | 90+ | ✅ Excellent |

## 📝 File Structure

```
blockviz.html                 # Complete standalone application
├── HTML Structure            # Page layout and controls
├── CSS Styling              # Dark theme, responsive design
├── JavaScript Core          # Application logic
│   ├── Three.js Integration # 3D rendering engine
│   ├── BlockMeshParser      # Dictionary parsing
│   ├── Geometry Renderer    # 3D visualization
│   ├── Validation Engine    # Error checking
│   └── UI Controllers       # Interactive controls
└── Example Data             # Built-in demonstration
```

## 🤝 Contributing

BlockViz is open for contributions! Areas for enhancement:

### Planned Features
- [ ] **Export Capabilities**: STL, OBJ geometry export
- [ ] **Grading Visualization**: Show cell size variation
- [ ] **Patch Merging**: Visual representation of mergePatchPairs
- [ ] **Animation**: Mesh generation process visualization
- [ ] **Statistics**: Detailed mesh quality metrics

### How to Contribute
1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Make changes to the single HTML file
4. Test with various blockMeshDict files
5. Submit pull request with description

### Development Guidelines
- Maintain single-file architecture
- Follow existing code style
- Add validation for new features
- Update documentation for changes
- Test with OpenFOAM tutorials

## 📄 License

MIT License - see LICENSE file for details

## 🙏 Acknowledgments

- **OpenFOAM Foundation** for the excellent CFD toolkit
- **Three.js Team** for the outstanding 3D graphics library
- **OpenFOAM Community** for extensive documentation and examples
- **GMSH Project** for UI/UX inspiration

## 📞 Support

For issues, questions, or suggestions:
- Create GitHub issues for bugs/features
- Check troubleshooting section first
- Include sample blockMeshDict files when reporting problems
- Specify browser and version for compatibility issues

---

**BlockViz** - Making OpenFOAM blockMesh visualization simple and interactive!

*Last updated: 2025*
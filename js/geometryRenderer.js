// js/geometryRenderer.js
// import * as THREE from './lib/three.module.min.js';
// import { OrbitControls } from './lib/OrbitControls.js'; // JSM version from three/examples/jsm/controls/

class GeometryRenderer {
    constructor(viewportElement) {
        if (typeof window.THREE === 'undefined') {
            const msg =
                'FATAL: THREE.js library not loaded before GeometryRenderer initialization!';
            console.error(msg);
            throw new Error(msg);
        }
        if (typeof window.OrbitControls === 'undefined') {
            const msg = 'FATAL: OrbitControls not loaded before GeometryRenderer initialization!';
            console.error(msg);
            throw new Error(msg);
        }

        const THREE = window.THREE;
        const OrbitControls = window.OrbitControls;

        this.viewportElement = viewportElement;
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(
            75,
            viewportElement.clientWidth / viewportElement.clientHeight,
            0.01,
            2000
        ); // Adjusted near/far
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // alpha for potentially transparent bg
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
        viewportElement.appendChild(this.renderer.domElement);

        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05; // Softer damping
        this.controls.screenSpacePanning = true; // Allows panning with right-click more intuitively
        this.controls.minDistance = 0.01;
        this.controls.maxDistance = 1000;
        this.controls.target.set(0, 0, 0); // Ensure target is at origin initially

        this.camera.position.set(1, 1, 2); // Default camera position
        this.camera.lookAt(this.controls.target);

        this.vertexGroup = new THREE.Group();
        this.edgeGroup = new THREE.Group();
        this.faceGroup = new THREE.Group();
        this.blockGroup = new THREE.Group(); // For block wireframes & local axes
        this.meshPreviewGroup = new THREE.Group();
        this.vertexLabelGroup = new THREE.Group(); // For sprite-based labels

        this.scene.add(
            this.vertexGroup,
            this.edgeGroup,
            this.faceGroup,
            this.blockGroup,
            this.meshPreviewGroup,
            this.vertexLabelGroup
        );

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Slightly brighter ambient
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9); // Brighter directional
        directionalLight.position.set(5, 10, 7.5).normalize();
        this.scene.add(directionalLight);
        const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.4);
        directionalLight2.position.set(-5, -10, -7.5).normalize();
        this.scene.add(directionalLight2);

        this.animate = this.animate.bind(this); // Bind animate to the class instance
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize(), false);
        // console.log("GeometryRenderer constructed and OrbitControls initialized.");
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.controls.update(); // Required if enableDamping is true
        this.renderer.render(this.scene, this.camera);
    }

    onWindowResize() {
        if (!this.viewportElement) return;
        const width = this.viewportElement.clientWidth;
        const height = this.viewportElement.clientHeight;
        if (width === 0 || height === 0) return; // Avoid issues if element is hidden

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    disposeChildren(group) {
        if (!group) return;
        while (group.children.length > 0) {
            const child = group.children[0];
            group.remove(child); // Remove from group first

            if (child.geometry) child.geometry.dispose();
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach((m) => {
                        if (m && m.dispose) m.dispose();
                    });
                } else {
                    if (child.material && child.material.dispose) child.material.dispose();
                }
            }
            if (child.texture && child.texture.dispose) child.texture.dispose(); // For sprite labels

            // If child is a group itself, recursively dispose its children
            if (child.isGroup) {
                this.disposeChildren(child);
            }
        }
    }

    clearScene() {
        this.disposeChildren(this.vertexGroup);
        this.disposeChildren(this.edgeGroup);
        this.disposeChildren(this.faceGroup);
        this.disposeChildren(this.blockGroup);
        this.disposeChildren(this.meshPreviewGroup);
        this.disposeChildren(this.vertexLabelGroup);
        // console.log("Scene cleared.");
    }

    createTextLabel(message, parameters = {}) {
        const fontface = parameters.fontface || 'Arial';
        const fontsize = parameters.fontsize || 4; // Increased for better visibility
        const borderThickness = parameters.borderThickness || 0;
        const textColor = parameters.textColor || { r: 255, g: 255, b: 255, a: 1.0 }; // White text
        const scaleFactor = parameters.scaleFactor || 0.02; // Adjust this to control label size in scene

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `Bold ${fontsize}px ${fontface}`;
        const metrics = context.measureText(message);
        const textWidth = metrics.width;

        // Add some padding
        const padding = fontsize * 0.2;
        canvas.width = textWidth + borderThickness * 2 + padding * 2;
        canvas.height = fontsize + borderThickness * 2 + padding * 2;

        // Re-set font after canvas resize
        context.font = `Bold ${fontsize}px ${fontface}`;
        context.textAlign = 'left';
        context.textBaseline = 'top';

        // Background (optional, for better readability against complex scenes)
        // context.fillStyle = "rgba(0, 0, 0, 0.5)"; // Semi-transparent black background
        // context.fillRect(0, 0, canvas.width, canvas.height);

        if (borderThickness > 0) {
            context.strokeStyle = `rgba(${parameters.borderColor?.r || 0}, ${
                parameters.borderColor?.g || 0
            }, ${parameters.borderColor?.b || 0}, ${parameters.borderColor?.a || 1.0})`;
            context.lineWidth = borderThickness;
            context.strokeRect(
                borderThickness / 2,
                borderThickness / 2,
                canvas.width - borderThickness,
                canvas.height - borderThickness
            );
        }

        context.fillStyle = `rgba(${textColor.r}, ${textColor.g}, ${textColor.b}, ${textColor.a})`;
        context.fillText(message, borderThickness + padding, borderThickness + padding);

        const texture = new THREE.CanvasTexture(canvas);
        texture.minFilter = THREE.LinearFilter;
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            depthWrite: false,
            sizeAttenuation: true,
        });
        const sprite = new THREE.Sprite(spriteMaterial);

        // Scale sprite to be somewhat consistent regardless of canvas size
        sprite.scale.set(canvas.width * scaleFactor, canvas.height * scaleFactor, 1.0);
        return sprite;
    }

    renderVertices(verticesData, showLabels) {
        if (!verticesData || verticesData.length === 0) return;
        this.disposeChildren(this.vertexGroup); // Clear previous vertices
        this.disposeChildren(this.vertexLabelGroup); // Clear previous labels

        const vertexMaterial = new THREE.PointsMaterial({
            color: 0xff3333,
            size: 0.03,
            sizeAttenuation: true,
        }); // Red, smaller
        const points = verticesData.map((v) => new THREE.Vector3(v.x, v.y, v.z));

        if (points.length > 0) {
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const pointsMesh = new THREE.Points(geometry, vertexMaterial);
            this.vertexGroup.add(pointsMesh);
        }

        if (showLabels) {
            verticesData.forEach((v, index) => {
                const label = this.createTextLabel(index.toString());
                label.position.set(v.x, v.y, v.z);
                // Offset slightly to avoid z-fighting with vertex point itself
                label.position.add(new THREE.Vector3(0.01, 0.01, 0.01));
                this.vertexLabelGroup.add(label);
            });
        }
    }

    renderEdges(edgesData, verticesData) {
        if (!edgesData || edgesData.length === 0 || !verticesData || verticesData.length === 0)
            return;
        this.disposeChildren(this.edgeGroup);

        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 1 }); // Teal

        edgesData.forEach((edge) => {
            const p1 = verticesData[edge.v1];
            const p2 = verticesData[edge.v2];
            if (!p1 || !p2) {
                console.warn(`Invalid vertex index for edge: v1=${edge.v1}, v2=${edge.v2}`);
                return;
            }

            const startVec = new THREE.Vector3(p1.x, p1.y, p1.z);
            const endVec = new THREE.Vector3(p2.x, p2.y, p2.z);
            let points = [];

            if (edge.type === 'arc' && edge.points && edge.points.length > 0) {
                const midControlPoint = new THREE.Vector3(
                    edge.points[0].x,
                    edge.points[0].y,
                    edge.points[0].z
                );
                // For a true circular arc, we need more info or a different curve type.
                // A QuadraticBezierCurve3 can approximate it if midControlPoint is chosen well.
                // For simplicity, we'll use a CatmullRomCurve3 if it's meant to pass through intermediate points.
                // If it's an OpenFOAM arc (center + 2 points), this needs a specific arc helper.
                // Let's assume the point is an interpolation point for a Bezier for now.
                const curve = new THREE.QuadraticBezierCurve3(startVec, midControlPoint, endVec);
                points = curve.getPoints(20); // 20 segments
            } else if (
                (edge.type === 'spline' || edge.type === 'polyLine') &&
                edge.points &&
                edge.points.length > 0
            ) {
                const controlPoints = [startVec];
                edge.points.forEach((pt) =>
                    controlPoints.push(new THREE.Vector3(pt.x, pt.y, pt.z))
                );
                controlPoints.push(endVec);

                if (edge.type === 'spline' && controlPoints.length >= 2) {
                    // CatmullRom needs at least 2 points
                    const curve = new THREE.CatmullRomCurve3(controlPoints);
                    points = curve.getPoints(controlPoints.length * 10); // More segments for splines
                } else {
                    // polyLine or spline with too few points for CatmullRom
                    points = controlPoints;
                }
            } else {
                // Straight line
                points = [startVec, endVec];
            }

            if (points.length >= 2) {
                const geometry = new THREE.BufferGeometry().setFromPoints(points);
                const line = new THREE.Line(geometry, lineMaterial);
                this.edgeGroup.add(line);
            }
        });
    }

    renderBlocks(blocksData, verticesData, showBlockFaces, showNormals) {
        if (!blocksData || blocksData.length === 0 || !verticesData || verticesData.length === 0)
            return;
        this.disposeChildren(this.blockGroup);
        if (showBlockFaces) this.disposeChildren(this.faceGroup); // Clear faces if we are re-rendering block faces

        const blockWireframeMaterial = new THREE.LineBasicMaterial({
            color: 0xadd8e6,
            linewidth: 1.5,
        }); // Light blue
        const blockFaceMaterial = new THREE.MeshStandardMaterial({
            color: 0x66cc66, // Greenish
            transparent: true,
            opacity: 0.25,
            side: THREE.DoubleSide,
            depthWrite: false, // Helps with transparency layering
        });

        blocksData.forEach((block, blockIndex) => {
            if (!block.vertices || block.vertices.length !== 8) {
                console.warn(`Block ${blockIndex} does not have 8 vertices.`);
                return;
            }
            const p = block.vertices.map((index) => {
                const v = verticesData[index];
                if (!v) console.warn(`Invalid vertex index ${index} in block ${blockIndex}`);
                return v ? new THREE.Vector3(v.x, v.y, v.z) : new THREE.Vector3(); // Default if invalid
            });

            // Define edges for wireframe
            const edgesIndices = [
                0,
                1,
                1,
                2,
                2,
                3,
                3,
                0, // bottom face
                4,
                5,
                5,
                6,
                6,
                7,
                7,
                4, // top face
                0,
                4,
                1,
                5,
                2,
                6,
                3,
                7, // connecting edges
            ];
            const wireframePositions = [];
            edgesIndices.forEach((idx) => wireframePositions.push(p[idx].x, p[idx].y, p[idx].z));

            if (wireframePositions.length > 0) {
                const wireframeGeometry = new THREE.BufferGeometry();
                wireframeGeometry.setAttribute(
                    'position',
                    new THREE.Float32BufferAttribute(wireframePositions, 3)
                );
                const wireframe = new THREE.LineSegments(wireframeGeometry, blockWireframeMaterial);
                this.blockGroup.add(wireframe);
            }

            // Render block faces if requested
            if (showBlockFaces) {
                const facesDef = [
                    // Standard OpenFOAM face definitions (vertex order for outward normal)
                    [0, 3, 2, 1], // bottom (z_min) local vertices: 0-1-2-3
                    [4, 5, 6, 7], // top    (z_max) local vertices: 4-5-6-7
                    [0, 1, 5, 4], // front  (y_min) local vertices: 0-1-5-4
                    [2, 3, 7, 6], // back   (y_max) local vertices: 3-2-6-7 No, this should be 2-3-7-6 for std view (OpenFOAM is 3->2)
                    [1, 2, 6, 5], // right  (x_max) local vertices: 1-2-6-5
                    [3, 0, 4, 7], // left   (x_min) local vertices: 0-3-7-4 No, this should be 0-4-7-3 (OpenFOAM is 0->3)
                ];
                // Corrected for typical rendering (counter-clockwise when looking from outside)
                const facesRenderOrder = [
                    [p[0], p[1], p[2], p[3]], // Bottom: 0-1-2-3 (assuming this is wound correctly for THREE from OF data)
                    [p[4], p[7], p[6], p[5]], // Top:    4-7-6-5
                    [p[0], p[4], p[5], p[1]], // Front:  0-4-5-1
                    [p[3], p[2], p[6], p[7]], // Back:   3-2-6-7
                    [p[1], p[5], p[6], p[2]], // Right:  1-5-6-2
                    [p[0], p[3], p[7], p[4]], // Left:   0-3-7-4
                ];

                facesRenderOrder.forEach((facePoints) => {
                    if (facePoints.some((pt) => !pt)) return; // Skip if any vertex was invalid
                    const faceGeometry = new THREE.BufferGeometry();
                    // Triangulate quad: (v0,v1,v2), (v0,v2,v3)
                    const verticesForFace = [
                        facePoints[0].x,
                        facePoints[0].y,
                        facePoints[0].z,
                        facePoints[1].x,
                        facePoints[1].y,
                        facePoints[1].z,
                        facePoints[2].x,
                        facePoints[2].y,
                        facePoints[2].z,
                        facePoints[0].x,
                        facePoints[0].y,
                        facePoints[0].z,
                        facePoints[2].x,
                        facePoints[2].y,
                        facePoints[2].z,
                        facePoints[3].x,
                        facePoints[3].y,
                        facePoints[3].z,
                    ];
                    faceGeometry.setAttribute(
                        'position',
                        new THREE.Float32BufferAttribute(verticesForFace, 3)
                    );
                    faceGeometry.computeVertexNormals();
                    const meshFace = new THREE.Mesh(faceGeometry, blockFaceMaterial);
                    this.faceGroup.add(meshFace);

                    if (showNormals) {
                        try {
                            // Calculate face centroid for normal helper origin
                            const centroid = new THREE.Vector3()
                                .add(facePoints[0])
                                .add(facePoints[1])
                                .add(facePoints[2])
                                .add(facePoints[3])
                                .multiplyScalar(0.25);

                            // Calculate face normal (average of two triangle normals)
                            const tri1Normal = new THREE.Triangle(
                                facePoints[0],
                                facePoints[1],
                                facePoints[2]
                            ).getNormal(new THREE.Vector3());
                            const tri2Normal = new THREE.Triangle(
                                facePoints[0],
                                facePoints[2],
                                facePoints[3]
                            ).getNormal(new THREE.Vector3());
                            const faceNormal = new THREE.Vector3()
                                .addVectors(tri1Normal, tri2Normal)
                                .normalize();

                            const normalHelper = new THREE.ArrowHelper(
                                faceNormal,
                                centroid,
                                0.2,
                                0xffff00,
                                0.05,
                                0.03
                            ); // Yellow
                            this.blockGroup.add(normalHelper); // Add to blockGroup to associate with block wireframe
                        } catch (e) {
                            console.warn('Error creating normal helper for block face', e);
                        }
                    }
                });
            }

            // Local coordinate system axes for the block
            if (p[0] && p[1] && p[3] && p[4]) {
                // Check vertices used for axes exist
                const origin = p[0].clone();
                const x1Dir = new THREE.Vector3().subVectors(p[1], p[0]);
                const x2Dir = new THREE.Vector3().subVectors(p[3], p[0]); // OF: V0->V3 (local y in bottom plane)
                const x3Dir = new THREE.Vector3().subVectors(p[4], p[0]); // OF: V0->V4 (local z)
                const axisLength =
                    Math.min(x1Dir.length(), x2Dir.length(), x3Dir.length()) * 0.3 || 0.2; // Scale axes to block size

                this.blockGroup.add(
                    new THREE.ArrowHelper(
                        x1Dir.normalize(),
                        origin,
                        axisLength,
                        0xff0000,
                        axisLength * 0.2,
                        axisLength * 0.1
                    )
                ); // X1 red
                this.blockGroup.add(
                    new THREE.ArrowHelper(
                        x2Dir.normalize(),
                        origin,
                        axisLength,
                        0x00ff00,
                        axisLength * 0.2,
                        axisLength * 0.1
                    )
                ); // X2 green
                this.blockGroup.add(
                    new THREE.ArrowHelper(
                        x3Dir.normalize(),
                        origin,
                        axisLength,
                        0x0000ff,
                        axisLength * 0.2,
                        axisLength * 0.1
                    )
                ); // X3 blue
            }
        });
    }

    renderBoundaryFaces(boundaryData, verticesData, showNormals) {
        /* ... same as before ... */
    }
    renderMeshPreview(blocksData, verticesData, densityFactor) {
        /* ... same as before ... */
    }

    fitToView(geometryElements) {
        // Can accept vertices array or a group of meshes
        if (
            !geometryElements ||
            (Array.isArray(geometryElements) && geometryElements.length === 0)
        ) {
            // console.log("FitToView: No elements to fit.");
            this.resetView(); // Fallback to default view
            return;
        }

        const boundingBox = new THREE.Box3();

        if (Array.isArray(geometryElements)) {
            // Assuming array of vertex data {x,y,z}
            geometryElements.forEach((v) => {
                if (v && typeof v.x === 'number')
                    boundingBox.expandByPoint(new THREE.Vector3(v.x, v.y, v.z));
            });
        } else if (
            geometryElements.isGroup ||
            geometryElements.isMesh ||
            geometryElements.isLine ||
            geometryElements.isPoints
        ) {
            // If a single Three.js object or group is passed
            boundingBox.setFromObject(geometryElements, true); // true to traverse children
        } else {
            // console.log("FitToView: Unrecognized geometryElements type.");
            return;
        }

        if (boundingBox.isEmpty()) {
            // console.log("FitToView: Bounding box is empty.");
            this.resetView();
            return;
        }

        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim === 0) {
            // Handle single point or flat geometry
            this.camera.position.copy(center).add(new THREE.Vector3(0, 0, 1)); // Look from 1 unit away
            this.controls.target.copy(center);
            this.controls.update();
            return;
        }

        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = maxDim / 2 / Math.tan(fov / 2);
        cameraZ *= 1.5; // Zoom out a bit for padding

        // Position camera along an offset vector from the center, looking at the center
        const direction = new THREE.Vector3(1, 0.5, 1).normalize(); // Angled view
        this.camera.position.copy(center).addScaledVector(direction, cameraZ);
        this.camera.lookAt(center);

        this.controls.target.copy(center);
        // Adjust min/max distance based on object size for better interaction
        this.controls.minDistance = maxDim * 0.01;
        this.controls.maxDistance = maxDim * 10;
        this.controls.update();
        // console.log("View fitted to geometry.");
    }

    resetView() {
        this.controls.reset(); // OrbitControls reset handles position, target, zoom
        this.camera.position.set(1, 1, 2); // Re-apply a sensible default after controls reset
        this.controls.target.set(0, 0, 0);
        this.camera.lookAt(this.controls.target);
        this.controls.minDistance = 0.01; // Reset min/max distances
        this.controls.maxDistance = 1000;
        this.controls.update();
        // console.log("View reset.");
    }
}

// export { GeometryRenderer };

// Make GeometryRenderer available globally
window.GeometryRenderer = GeometryRenderer;

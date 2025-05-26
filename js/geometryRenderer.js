// geometryRenderer.js

class GeometryRenderer {
    constructor(viewportElement) {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, viewportElement.clientWidth / viewportElement.clientHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.controls = null; // Will be OrbitControls

        this.renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
        viewportElement.appendChild(this.renderer.domElement);

        this.camera.position.z = 5;
        this.camera.position.y = 2;
        this.camera.lookAt(0,0,0);

        this.vertexGroup = new THREE.Group();
        this.edgeGroup = new THREE.Group();
        this.faceGroup = new THREE.Group();
        this.blockGroup = new THREE.Group();
        this.meshPreviewGroup = new THREE.Group();
        this.vertexLabelGroup = new THREE.Group(); // For sprite-based labels

        this.scene.add(this.vertexGroup, this.edgeGroup, this.faceGroup, this.blockGroup, this.meshPreviewGroup, this.vertexLabelGroup);
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(1, 1, 1);
        this.scene.add(directionalLight);

        this.initControls();
        this.animate();

        window.addEventListener('resize', () => this.onWindowResize(viewportElement), false);
    }

    initControls() {
        // Assuming OrbitControls is loaded globally or via import if using modules
        if (typeof THREE.OrbitControls === 'function') {
            this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
            this.controls.enableDamping = true;
            this.controls.dampingFactor = 0.05;
            this.controls.screenSpacePanning = false;
            this.controls.minDistance = 0.1;
            this.controls.maxDistance = 500;
        } else {
            console.error("THREE.OrbitControls not found. Make sure it's loaded.");
        }
    }
    
    onWindowResize(viewportElement) {
        this.camera.aspect = viewportElement.clientWidth / viewportElement.clientHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(viewportElement.clientWidth, viewportElement.clientHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.controls) this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    clearScene() {
        const clearGroup = (group) => {
            while (group.children.length > 0) {
                const child = group.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
                if (child.texture) child.texture.dispose(); // For sprite labels
                group.remove(child);
            }
        };
        clearGroup(this.vertexGroup);
        clearGroup(this.edgeGroup);
        clearGroup(this.faceGroup);
        clearGroup(this.blockGroup);
        clearGroup(this.meshPreviewGroup);
        clearGroup(this.vertexLabelGroup);
    }

    renderData(parsedData, options = {}) {
        this.clearScene();
        if (!parsedData) return;

        const { vertices, edges, blocks, boundary } = parsedData;

        if (options.showVertices && vertices) this.renderVertices(vertices, options.showVertexLabels);
        if (options.showEdges && edges && vertices) this.renderEdges(edges, vertices);
        if (options.showBlocks && blocks && vertices) this.renderBlocks(blocks, vertices, options.showFaceNormals); // Faces can be part of blocks or separate
        // if (options.showFaces && boundary && vertices) this.renderBoundaryFaces(boundary, vertices, options.showFaceNormals);
        if (options.generateMesh && blocks && vertices) this.renderMeshPreview(blocks, vertices, options.meshDensity);
        
        this.fitToView(vertices);
    }

    renderVertices(verticesData, showLabels) {
        const vertexMaterial = new THREE.PointsMaterial({ color: 0xff0000, size: 0.1 });
        const points = [];
        verticesData.forEach((v, index) => {
            points.push(new THREE.Vector3(v.x, v.y, v.z));
            if (showLabels) {
                const label = this.createTextLabel(index.toString(), { fontsize: 18, fontface: "Arial", textColor: { r:255, g:255, b:255, a:1.0 } });
                label.position.set(v.x, v.y, v.z);
                this.vertexLabelGroup.add(label);
            }
        });
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const pointsMesh = new THREE.Points(geometry, vertexMaterial);
        this.vertexGroup.add(pointsMesh);
    }
    
    createTextLabel(message, parameters) {
        const fontface = parameters.hasOwnProperty("fontface") ? parameters.fontface : "Arial";
        const fontsize = parameters.hasOwnProperty("fontsize") ? parameters.fontsize : 18;
        const borderThickness = parameters.hasOwnProperty("borderThickness") ? parameters.borderThickness : 0; // No border
        const borderColor = parameters.hasOwnProperty("borderColor") ?parameters.borderColor : { r:0, g:0, b:0, a:1.0 };
        const backgroundColor = parameters.hasOwnProperty("backgroundColor") ?parameters.backgroundColor : { r:0, g:0, b:0, a:0.0 }; // Transparent background
        const textColor = parameters.hasOwnProperty("textColor") ?parameters.textColor : { r:255, g:255, b:255, a:1.0 };

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = "Bold " + fontsize + "px " + fontface;
        const metrics = context.measureText( message );
        const textWidth = metrics.width;

        canvas.width = textWidth + borderThickness * 2;
        canvas.height = fontsize + borderThickness * 2;
        context.font = "Bold " + fontsize + "px " + fontface; // Re-set font after canvas resize

        if (backgroundColor.a > 0) {
            context.fillStyle   = "rgba(" + backgroundColor.r + "," + backgroundColor.g + "," + backgroundColor.b + "," + backgroundColor.a + ")";
            context.fillRect(0, 0, canvas.width, canvas.height);
        }

        if (borderThickness > 0) {
            context.strokeStyle = "rgba(" + borderColor.r + "," + borderColor.g + "," + borderColor.b + "," + borderColor.a + ")";
            context.lineWidth = borderThickness;
            context.strokeRect(0, 0, canvas.width, canvas.height);
        }
        
        context.fillStyle = "rgba("+textColor.r+", "+textColor.g+", "+textColor.b+", 1.0)";
        context.fillText( message, borderThickness, fontsize + borderThickness - (fontsize * 0.2)); // Adjust baseline

        const texture = new THREE.Texture(canvas);
        texture.needsUpdate = true;

        const spriteMaterial = new THREE.SpriteMaterial( { map: texture } );
        const sprite = new THREE.Sprite( spriteMaterial );
        sprite.scale.set(0.5 * fontsize, 0.25 * fontsize, 0.75 * fontsize); // Adjust scale as needed
        return sprite;  
    }


    renderEdges(edgesData, verticesData) {
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00FFFF }); // Teal
        edgesData.forEach(edge => {
            const p1 = verticesData[edge.v1];
            const p2 = verticesData[edge.v2];
            if (!p1 || !p2) { console.error("Invalid vertex index for edge"); return; }

            let points = [];
            const startVec = new THREE.Vector3(p1.x, p1.y, p1.z);
            const endVec = new THREE.Vector3(p2.x, p2.y, p2.z);

            if (edge.type === "arc" && edge.points && edge.points.length > 0) {
                const midVec = new THREE.Vector3(edge.points[0].x, edge.points[0].y, edge.points[0].z);
                const curve = new THREE.QuadraticBezierCurve3(startVec, midVec, endVec); // Simplified arc as Bezier
                points = curve.getPoints(20);
            } else if ((edge.type === "spline" || edge.type === "polyLine") && edge.points && edge.points.length > 0) {
                points.push(startVec);
                edge.points.forEach(pt => points.push(new THREE.Vector3(pt.x, pt.y, pt.z)));
                points.push(endVec);
                // For spline, CatmullRomCurve3 might be better if enough points
            } else { // Straight line
                points = [startVec, endVec];
            }
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, lineMaterial);
            this.edgeGroup.add(line);
        });
    }

    renderBlocks(blocksData, verticesData, showNormals) {
        const blockMaterial = new THREE.LineBasicMaterial({ color: 0xADD8E6, linewidth: 2 }); // Light blue for wireframe
        const faceMaterial = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide // Show both sides for normals
        });

        blocksData.forEach(block => {
            const blockVertices = block.vertices.map(index => verticesData[index]);
            if (blockVertices.some(v => !v)) { console.error("Invalid vertex in block"); return; }
            
            const p = blockVertices.map(v => new THREE.Vector3(v.x, v.y, v.z));

            // Define faces for a hex block
            const facesIndices = [
                [0, 3, 2, 1], // bottom
                [4, 5, 6, 7], // top
                [0, 1, 5, 4], // front
                [2, 3, 7, 6], // back
                [1, 2, 6, 5], // right
                [3, 0, 4, 7]  // left
            ];

            // Wireframe
            const edges = [
                0,1, 1,2, 2,3, 3,0, // bottom
                4,5, 5,6, 6,7, 7,4, // top
                0,4, 1,5, 2,6, 3,7  // sides
            ];
            const wireframeGeometry = new THREE.BufferGeometry();
            const wireframePositions = [];
            edges.forEach(idx => wireframePositions.push(p[idx].x, p[idx].y, p[idx].z));
            wireframeGeometry.setAttribute('position', new THREE.Float32BufferAttribute(wireframePositions, 3));
            const wireframe = new THREE.LineSegments(wireframeGeometry, blockMaterial);
            this.blockGroup.add(wireframe);

            // Transparent Faces & Normals
            facesIndices.forEach(faceIdx => {
                const facePoints = faceIdx.map(i => p[i]);
                const faceGeometry = new THREE.BufferGeometry().setFromPoints([
                    facePoints[0], facePoints[1], facePoints[2],
                    facePoints[0], facePoints[2], facePoints[3]
                ]);
                faceGeometry.computeVertexNormals(); // Important for lighting and normal calculation
                const meshFace = new THREE.Mesh(faceGeometry, faceMaterial);
                this.faceGroup.add(meshFace);

                if (showNormals) {
                    const normalHelper = new THREE.FaceNormalsHelper(meshFace, 0.3, 0xffff00, 1); // Yellow normals
                    this.faceGroup.add(normalHelper);
                }
            });

            // Local coordinate system (simplified: origin at p[0])
            const origin = p[0];
            const x1Dir = new THREE.Vector3().subVectors(p[1], p[0]).normalize().multiplyScalar(0.5);
            const x2Dir = new THREE.Vector3().subVectors(p[3], p[0]).normalize().multiplyScalar(0.5); // Assuming 0-3 is a face
            const x3Dir = new THREE.Vector3().subVectors(p[4], p[0]).normalize().multiplyScalar(0.5);

            this.blockGroup.add(new THREE.ArrowHelper(x1Dir.clone().normalize(), origin, x1Dir.length(), 0xff0000)); // X red
            this.blockGroup.add(new THREE.ArrowHelper(x2Dir.clone().normalize(), origin, x2Dir.length(), 0x00ff00)); // Y green
            this.blockGroup.add(new THREE.ArrowHelper(x3Dir.clone().normalize(), origin, x3Dir.length(), 0x0000ff)); // Z blue
        });
    }
    
    // renderBoundaryFaces(boundaryData, verticesData, showNormals) { /* ... */ }
    renderMeshPreview(blocksData, verticesData, density) { /* ... */ }


    fitToView(verticesData) {
        if (!verticesData || verticesData.length === 0) return;

        const boundingBox = new THREE.Box3();
        verticesData.forEach(v => {
            boundingBox.expandByPoint(new THREE.Vector3(v.x, v.y, v.z));
        });

        if (boundingBox.isEmpty()) return;

        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        
        const size = new THREE.Vector3();
        boundingBox.getSize(size);

        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = this.camera.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 * Math.tan(fov * 2)); // Rough estimate
        cameraZ *= 1.5; // Add some padding

        this.camera.position.set(center.x, center.y, center.z + cameraZ);
        this.camera.lookAt(center);
        if (this.controls) {
            this.controls.target.copy(center);
            this.controls.update();
        }
    }

    resetView() {
        this.camera.position.set(0, 2, 5); // Default position
        this.camera.lookAt(0,0,0);
        if (this.controls) {
            this.controls.target.set(0,0,0);
            this.controls.reset();
            this.controls.update();
        }
    }
}
// main.js
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const loadExampleBtn = document.getElementById('loadExampleBtn');
    
    const showVerticesCheck = document.getElementById('showVertices');
    const showVertexLabelsCheck = document.getElementById('showVertexLabels');
    const showEdgesCheck = document.getElementById('showEdges');
    const showFacesCheck = document.getElementById('showFaces');
    const showFaceNormalsCheck = document.getElementById('showFaceNormals');
    const showBlocksCheck = document.getElementById('showBlocks');
    const generateMeshCheck = document.getElementById('generateMesh');
    const meshDensitySlider = document.getElementById('meshDensity');

    const resetViewBtn = document.getElementById('resetViewBtn');
    const fitToViewBtn = document.getElementById('fitToViewBtn');

    const statVerticesEl = document.getElementById('statVertices');
    const statEdgesEl = document.getElementById('statEdges');
    const statFacesEl = document.getElementById('statFaces');
    const statBlocksEl = document.getElementById('statBlocks');
    const errorMessagesEl = document.getElementById('errorMessages');

    const viewportElement = document.getElementById('viewport');

    const parser = new BlockMeshParser();
    const validator = new ValidationEngine();
    let renderer = null; // Initialize later to ensure DOM is ready for viewport

    let currentParsedData = null;

    function initializeRenderer() {
        if (!renderer) {
            renderer = new GeometryRenderer(viewportElement);
        }
    }

    function displayMessageInErrorLog(message, type = "info") {
        const p = document.createElement('p');
        p.textContent = message;
        if (type === "error") p.style.color = "#ff6666";
        else if (type === "warning") p.style.color = "orange";
        else p.style.color = "#d4d4d4"; // Default info color
        errorMessagesEl.appendChild(p);
    }

    function loadFile(fileContent, fileName = "uploaded file") {
        initializeRenderer(); // Ensure renderer is ready
        errorMessagesEl.innerHTML = ''; // Clear previous messages
        displayMessageInErrorLog(`Loading ${fileName}...`, "info");
        console.log(`Attempting to parse: ${fileName}`);

        currentParsedData = parser.parse(fileContent);
        
        let hasCriticalParserErrors = false;
        if (currentParsedData.errors && currentParsedData.errors.length > 0) {
            displayMessageInErrorLog("Parser Issues:", "error");
            currentParsedData.errors.forEach(err => {
                displayMessageInErrorLog(`- ${err}`, "error");
                if (err.toLowerCase().includes("invalid") || err.toLowerCase().includes("malformed") || err.toLowerCase().includes("missing")) {
                    hasCriticalParserErrors = true;
                }
            });
        }

        if (hasCriticalParserErrors || !currentParsedData.vertices || currentParsedData.vertices.length === 0) {
            displayMessageInErrorLog("Critical parsing errors or no vertices found. Cannot proceed with validation or rendering.", "error");
            updateStats(currentParsedData); // Update stats even if empty
            renderer.clearScene(); // Clear any previous geometry
            return;
        }
        
        const validationErrors = validator.validate(currentParsedData);
        if (validationErrors.length > 0) {
            displayMessageInErrorLog("Validation Errors:", "error");
            validationErrors.forEach(err => displayMessageInErrorLog(`- ${err}`, "error"));
        }
        
        if (errorMessagesEl.childElementCount === 1 && errorMessagesEl.firstChild.textContent.startsWith("Loading")) { // Only loading message present
             errorMessagesEl.innerHTML = ''; // Clear "Loading..."
             displayMessageInErrorLog("File processed. No errors detected.", "info");
        } else if (errorMessagesEl.childElementCount > 0 && currentParsedData.errors.length === 0 && validationErrors.length === 0) {
            // If there was a loading message and other info messages, but no errors
             displayMessageInErrorLog("File processed. No errors detected.", "info");
        }


        updateStats(currentParsedData);
        renderCurrentGeometry();
        if (currentParsedData.vertices.length > 0) {
            renderer.fitToView(currentParsedData.vertices);
        } else {
            displayMessageInErrorLog("No vertices parsed, cannot fit to view.", "warning");
        }
    }

    function renderCurrentGeometry() {
        if (!renderer) initializeRenderer();
        if (!currentParsedData || !currentParsedData.vertices || currentParsedData.vertices.length === 0) {
            console.warn("No valid data to render.");
            renderer.clearScene(); // Make sure viewport is empty
            return;
        }
        const options = {
            showVertices: showVerticesCheck.checked,
            showVertexLabels: showVertexLabelsCheck.checked,
            showEdges: showEdgesCheck.checked,
            showFaces: showFacesCheck.checked,
            showFaceNormals: showFaceNormalsCheck.checked,
            showBlocks: showBlocksCheck.checked,
            generateMesh: generateMeshCheck.checked,
            meshDensity: parseFloat(meshDensitySlider.value)
        };
        renderer.renderData(currentParsedData, options);
    }

    function updateStats(data) {
        statVerticesEl.textContent = data.vertices?.length || 0;
        statEdgesEl.textContent = data.edges?.length || 0;
        let faceCount = 0;
        if (data.boundary) {
            data.boundary.forEach(patch => faceCount += patch.faces?.length || 0);
        }
        statFacesEl.textContent = faceCount;
        statBlocksEl.textContent = data.blocks?.length || 0;
    }

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                loadFile(e.target.result, file.name);
            };
            reader.readAsText(file);
        }
    });

    loadExampleBtn.addEventListener('click', () => {
        const examplePath = 'examples/cavity.blockMeshDict';
        fetch(examplePath)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status} for ${examplePath}`);
                }
                return response.text();
            })
            .then(text => {
                loadFile(text, "cavity.blockMeshDict (example)");
            })
            .catch(err => {
                console.error("Failed to load example file:", err);
                errorMessagesEl.innerHTML = ''; // Clear previous
                displayMessageInErrorLog("Failed to load example: " + err.message, "error");
            });
    });

    [showVerticesCheck, showVertexLabelsCheck, showEdgesCheck, showFacesCheck, showFaceNormalsCheck, showBlocksCheck, generateMeshCheck, meshDensitySlider].forEach(el => {
        el.addEventListener('change', renderCurrentGeometry);
    });

    resetViewBtn.addEventListener('click', () => renderer?.resetView());
    fitToViewBtn.addEventListener('click', () => {
        if (renderer && currentParsedData && currentParsedData.vertices && currentParsedData.vertices.length > 0) {
            renderer.fitToView(currentParsedData.vertices);
        } else {
             displayMessageInErrorLog("No geometry to fit view to.", "warning");
        }
    });
    
    // Initial message
    errorMessagesEl.innerHTML = '';
    displayMessageInErrorLog("Load a blockMeshDict file or click 'Load Example'.", "info");
});
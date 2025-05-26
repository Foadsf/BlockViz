// js/main.js
import * as THREE from './lib/three.module.min.js';
import { OrbitControls } from './lib/OrbitControls.js';

// Make THREE and OrbitControls available globally for other modules
window.THREE = THREE;
window.OrbitControls = OrbitControls;

// Import our application modules
import './blockMeshParser.js';
import './validationEngine.js';
import './geometryRenderer.js';

// This script is loaded as type="module", so it executes after the HTML is parsed.
// It also means 'use strict' is enabled by default for modules.

// --- DOM Element References ---
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

// --- Application Component Instances ---
let parser;
let validator;
let renderer; // Will be initialized
let currentParsedData = null;

// --- UI Helper Functions ---
function displayMessageInErrorLog(message, type = 'info', clearPrevious = false) {
    if (!errorMessagesEl) return;
    if (clearPrevious) {
        errorMessagesEl.innerHTML = '';
    }
    const p = document.createElement('p');
    p.textContent = message;

    switch (type) {
        case 'error':
            p.style.color = '#ff6666';
            break;
        case 'warning':
            p.style.color = 'orange';
            break;
        case 'success':
            p.style.color = '#90ee90';
            break;
        default:
            p.style.color = '#d4d4d4'; // Default info color for sidebar
    }
    errorMessagesEl.appendChild(p);
    errorMessagesEl.scrollTop = errorMessagesEl.scrollHeight;
}

function updateStats(data) {
    if (!statVerticesEl) return; // Guard if elements not found
    if (!data) {
        statVerticesEl.textContent = '0';
        statEdgesEl.textContent = '0';
        statFacesEl.textContent = '0';
        statBlocksEl.textContent = '0';
        return;
    }
    statVerticesEl.textContent = data.vertices?.length || 0;
    statEdgesEl.textContent = data.edges?.length || 0;
    let faceCount = 0;
    if (data.boundary) {
        data.boundary.forEach((patch) => (faceCount += patch.faces?.length || 0));
    }
    statFacesEl.textContent = faceCount;
    statBlocksEl.textContent = data.blocks?.length || 0;
}

// --- Core Application Logic ---
function renderCurrentGeometry() {
    if (!renderer) {
        console.warn('renderCurrentGeometry called but renderer not initialized.');
        return;
    }
    if (!currentParsedData) {
        // console.warn("renderCurrentGeometry called but no currentParsedData.");
        renderer.clearScene();
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
        meshDensity: parseFloat(meshDensitySlider.value),
        labelFontSize: parseInt(document.getElementById('labelFontSize').value),
    };
    try {
        renderer.clearScene();

        if (options.showVertices) {
            renderer.renderVertices(currentParsedData.vertices, options.showVertexLabels);
        }

        if (options.showEdges) {
            renderer.renderEdges(currentParsedData.edges, currentParsedData.vertices);
        }

        if (options.showBlocks) {
            renderer.renderBlocks(
                currentParsedData.blocks,
                currentParsedData.vertices,
                options.showFaces,
                options.showFaceNormals
            );
        }

        // Note: renderBoundaryFaces and renderMeshPreview methods would need to be implemented
        // if (options.showFaces && currentParsedData.boundary) {
        //     renderer.renderBoundaryFaces(currentParsedData.boundary, currentParsedData.vertices, options.showFaceNormals);
        // }

        // if (options.generateMesh) {
        //     renderer.renderMeshPreview(currentParsedData.blocks, currentParsedData.vertices, options.meshDensity);
        // }
    } catch (renderError) {
        console.error('Error during rendering in renderCurrentGeometry:', renderError);
        displayMessageInErrorLog(`Rendering error: ${renderError.message}`, 'error');
    }
}

function loadFile(fileContent, fileName = 'uploaded file') {
    if (!parser || !validator || !renderer) {
        displayMessageInErrorLog(
            'Core components not initialized. Cannot load file.',
            'error',
            true
        );
        return;
    }

    displayMessageInErrorLog(`Processing ${fileName}...`, 'info', true);
    console.log(`Attempting to parse: ${fileName}`);

    parser.reset();
    currentParsedData = parser.parse(fileContent);

    let hasCriticalParserErrors = false;
    if (currentParsedData.errors && currentParsedData.errors.length > 0) {
        displayMessageInErrorLog('Parser Issues:', 'error');
        currentParsedData.errors.forEach((err) => {
            displayMessageInErrorLog(`- ${err}`, 'error');
            if (
                err.toLowerCase().includes('invalid') ||
                err.toLowerCase().includes('malformed') ||
                err.toLowerCase().includes('missing') ||
                err.toLowerCase().includes('expected')
            ) {
                hasCriticalParserErrors = true;
            }
        });
    }

    if (
        hasCriticalParserErrors ||
        !currentParsedData.vertices ||
        currentParsedData.vertices.length === 0
    ) {
        const reason = hasCriticalParserErrors
            ? 'Critical parsing errors'
            : 'No vertices found in the file';
        displayMessageInErrorLog(
            `${reason}. Cannot proceed with validation or rendering.`,
            'error'
        );
        updateStats(currentParsedData);
        if (renderer) renderer.clearScene();
        return;
    }

    const validationErrors = validator.validate(currentParsedData);
    if (validationErrors.length > 0) {
        displayMessageInErrorLog('Validation Errors:', 'error');
        validationErrors.forEach((err) => displayMessageInErrorLog(`- ${err}`, 'error'));
    }

    const errorLogChildren = Array.from(errorMessagesEl.children);
    const processingMessageStillFirst =
        errorLogChildren.length > 0 && errorLogChildren[0].textContent.startsWith('Processing');

    if (
        processingMessageStillFirst &&
        currentParsedData.errors.length === 0 &&
        validationErrors.length === 0
    ) {
        displayMessageInErrorLog('File processed successfully. Rendering geometry.', 'success');
    } else if (currentParsedData.errors.length > 0 || validationErrors.length > 0) {
        displayMessageInErrorLog(
            'File processed with issues (see above). Attempting to render.',
            'warning'
        );
    }

    updateStats(currentParsedData);
    renderCurrentGeometry();

    if (renderer && currentParsedData.vertices && currentParsedData.vertices.length > 0) {
        renderer.fitToView(currentParsedData.vertices);
    } else {
        displayMessageInErrorLog('No geometry to fit view to.', 'warning');
    }
}

// --- Initialization Function ---
function initializeApp() {
    if (!viewportElement) {
        displayMessageInErrorLog(
            'CRITICAL: Viewport DOM element not found. Application cannot start.',
            'error',
            true
        );
        return;
    }

    try {
        parser = new window.BlockMeshParser();
        validator = new window.ValidationEngine();
        renderer = new window.GeometryRenderer(viewportElement);
    } catch (e) {
        console.error('Error during core component initialization:', e);
        displayMessageInErrorLog(`Initialization failed: ${e.message}`, 'error', true);
        return; // Stop if core components fail
    }

    // --- Event Listeners ---
    if (fileInput)
        fileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    loadFile(e.target.result, file.name);
                };
                reader.onerror = () => {
                    displayMessageInErrorLog(`Error reading file: ${file.name}`, 'error', true);
                };
                reader.readAsText(file);
            }
        });

    if (loadExampleBtn)
        loadExampleBtn.addEventListener('click', () => {
            const examplePath = 'examples/cavity.blockMeshDict'; // Use the file that actually exists
            displayMessageInErrorLog(`Fetching example: ${examplePath}...`, 'info', true);
            fetch(examplePath)
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(
                            `HTTP error! status: ${response.status} for ${examplePath}`
                        );
                    }
                    return response.text();
                })
                .then((text) => {
                    loadFile(text, examplePath.split('/').pop() + ' (example)');
                })
                .catch((err) => {
                    console.error('Failed to load example file:', err);
                    displayMessageInErrorLog(
                        `Failed to load example: ${err.message}`,
                        'error',
                        true
                    );
                });
        });

    const vizToggles = [
        showVerticesCheck,
        showVertexLabelsCheck,
        showEdgesCheck,
        showFacesCheck,
        showFaceNormalsCheck,
        showBlocksCheck,
        generateMeshCheck,
        meshDensitySlider,
        document.getElementById('labelFontSize'),
    ];
    vizToggles.forEach((el) => {
        if (el) el.addEventListener('change', renderCurrentGeometry);
    });

    if (resetViewBtn)
        resetViewBtn.addEventListener('click', () => {
            if (renderer) renderer.resetView();
            else displayMessageInErrorLog('Renderer not available for Reset View.', 'warning');
        });

    if (fitToViewBtn)
        fitToViewBtn.addEventListener('click', () => {
            if (
                renderer &&
                currentParsedData &&
                currentParsedData.vertices &&
                currentParsedData.vertices.length > 0
            ) {
                renderer.fitToView(currentParsedData.vertices);
            } else {
                displayMessageInErrorLog(
                    'No geometry to fit view to or renderer not available.',
                    'warning'
                );
            }
        });

    // --- Initial State ---
    displayMessageInErrorLog('BlockViz ready. Load a file or example.', 'success', true);
    updateStats(null); // Initialize stats to 0

    // Optionally, auto-load example if you want
    // loadExampleBtn.click();
}

// --- Start the Application ---
// Since this main.js is loaded as type="module", it executes after the DOM is parsed.
// We can directly call our initialization function.
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOMContentLoaded has already fired or not relevant for modules in this way
    initializeApp();
}

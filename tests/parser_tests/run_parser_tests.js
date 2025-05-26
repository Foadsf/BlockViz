// run_parser_tests.js
document.addEventListener('DOMContentLoaded', async () => {
    const parser = new BlockMeshParser();
    const resultsDiv = document.getElementById('results');
    let testsPassed = 0;
    let testsFailed = 0;

    async function runTest(filePath, testName, validationFn) {
        console.log(`--- Running Test: ${testName} (${filePath}) ---`);
        resultsDiv.innerHTML += `<p>Running: ${testName}...</p>`;
        try {
            const response = await fetch(filePath);
            if (!response.ok) throw new Error(`Failed to fetch ${filePath}: ${response.statusText}`);
            const fileContent = await response.text();
            
            parser.reset(); // Ensure parser is clean for each test
            const parsedData = parser.parse(fileContent);

            if (parsedData.errors && parsedData.errors.length > 0) {
                console.warn(`Parser errors for ${testName}:`, parsedData.errors);
                resultsDiv.innerHTML += `<p style="color: orange;">Parser warnings for ${testName}: ${parsedData.errors.join(', ')}</p>`;
            }

            const success = validationFn(parsedData);
            if (success) {
                console.log(`%cPASS: ${testName}`, "color: green;");
                resultsDiv.innerHTML += `<p style="color: green;">PASS: ${testName}</p>`;
                testsPassed++;
            } else {
                console.error(`%cFAIL: ${testName}`, "color: red;");
                resultsDiv.innerHTML += `<p style="color: red;">FAIL: ${testName}</p>`;
                testsFailed++;
            }
        } catch (e) {
            console.error(`%cERROR in test ${testName}: ${e.message}`, "color: red;");
            resultsDiv.innerHTML += `<p style="color: red;">ERROR in ${testName}: ${e.message}</p>`;
            testsFailed++;
        }
        console.log('--------------------------------------');
    }

    // Define tests
    await runTest('test_vertices.blockMeshDict', 'Parse Vertices', (data) => {
        console.log("Parsed Vertices Data:", data.vertices);
        return data.vertices && data.vertices.length === 8 && data.vertices[0].x === 0;
    });

    await runTest('test_edges.blockMeshDict', 'Parse Edges', (data) => {
        console.log("Parsed Edges Data:", data.edges);
        // Add specific checks for edge data
        return data.edges && data.edges.length > 0 && data.edges[0].type === 'arc';
    });
    
    await runTest('test_blocks.blockMeshDict', 'Parse Blocks', (data) => {
        console.log("Parsed Blocks Data:", data.blocks);
        return data.blocks && data.blocks.length === 1 && data.blocks[0].vertices.length === 8 && data.blocks[0].cells[0] === 10;
    });

    await runTest('test_boundary.blockMeshDict', 'Parse Boundary', (data) => {
        console.log("Parsed Boundary Data:", data.boundary);
        return data.boundary && data.boundary.length > 0 && data.boundary[0].name === 'inlet';
    });
    
    await runTest('test_comments_scale.blockMeshDict', 'Parse with Comments and Scale', (data) => {
        console.log("Parsed Comments/Scale Data:", data);
        return data.scale === 0.001 && data.vertices && data.vertices.length > 0;
    });


    // Summary
    resultsDiv.innerHTML += `<h3>Test Summary: ${testsPassed} Passed, ${testsFailed} Failed</h3>`;
    console.log(`%cTest Summary: ${testsPassed} Passed, ${testsFailed} Failed`, testsFailed > 0 ? "color: red;" : "color: green;");
});
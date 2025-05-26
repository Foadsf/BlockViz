// blockMeshParser.js

class BlockMeshParser {
    constructor() {
        this.reset();
    }

    reset() {
        this.scale = 1.0;
        this.vertices = [];
        this.edges = [];
        this.blocks = [];
        this.boundary = [];
        this.mergePatchPairs = [];
        this.macros = {}; // To store defined macros and eval results
        this.errors = [];
        this.rawLinesWithNumbers = []; // For error reporting
        this.currentLineNumber = 0; // For error reporting
    }

    _logError(message) {
        this.errors.push(`L${this.currentLineNumber}: ${message}`);
        console.error(`Parser Error (L${this.currentLineNumber}): ${message}`);
    }

    _removeCommentsAndStoreLines(fileContent) {
        const rawLines = fileContent.split(/\r?\n/);
        this.rawLinesWithNumbers = rawLines.map((line, index) => ({
            number: index + 1,
            text: line,
        }));

        let content = rawLines.join('\n');
        // Remove C-style /* ... */ comments first (multi-line)
        content = content.replace(/\/\*[\s\S]*?\*\//g, '');
        // Remove C++ style // comments (single-line)
        content = content.replace(/\/\/.*/g, '');
        const processedLines = content
            .split('\n')
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        console.log('Raw lines around boundary (35-45):');
        rawLines.slice(35, 45).forEach((line, i) => console.log(`Raw ${i + 35}: "${line}"`));
        console.log('Processed lines around boundary (25-35):');
        processedLines.slice(25, 35).forEach((line, i) => console.log(`Proc ${i + 25}: "${line}"`));

        return processedLines;
    }

    _resolveValue(token) {
        if (typeof token !== 'string') return token; // Already a number

        let value = token;
        if (token.startsWith('$')) {
            const macroName = token.substring(1);
            if (this.macros.hasOwnProperty(macroName)) {
                value = this.macros[macroName];
            } else {
                this._logError(`Undefined macro: ${token}`);
                return NaN; // Indicate error
            }
        }

        // Try to parse as float if it's still a string (could be a direct number or resolved macro value)
        if (typeof value === 'string') {
            const num = parseFloat(value);
            return !isNaN(num) ? num : value; // Return number if parseable, else original string (could be for patch names etc.)
        }
        return value; // Return resolved numeric macro value
    }

    _preprocessMacrosAndEvals(lines) {
        const processedLines = [];
        const macroRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s+(.*?);$/;
        const evalRegex = /^([a-zA-Z_][a-zA-Z0-9_]*)\s+#eval\s*\{\s*(.*?)\s*\};$/;

        for (const line of lines) {
            this.currentLineNumber =
                this.rawLinesWithNumbers.find((rl) => rl.text.includes(line.split(' ')[0]))
                    ?.number || this.currentLineNumber + 1; // Approximate line num

            let match = evalRegex.exec(line);
            if (match) {
                const key = match[1];
                let expression = match[2];

                // Substitute known macros in the expression
                for (const macroKey in this.macros) {
                    const regex = new RegExp(`\\${macroKey}`, 'g');
                    expression = expression.replace(regex, this.macros[macroKey]);
                }

                try {
                    // WARNING: eval() is a security risk if blockMeshDict content is untrusted.
                    // For a controlled environment or trusted files, it's a quick way.
                    // A safer math expression parser library would be better for untrusted input.
                    const result = eval(expression);
                    if (typeof result === 'number' && !isNaN(result)) {
                        this.macros[key] = result;
                        // console.log(`Evaluated macro: ${key} = ${result}`);
                    } else {
                        this._logError(
                            `Failed to evaluate #eval expression for ${key}: "${expression}" did not yield a number.`
                        );
                        this.macros[key] = NaN; // Mark as problematic
                    }
                } catch (e) {
                    this._logError(
                        `Error evaluating #eval for ${key}: ${e.message}. Expression: "${expression}"`
                    );
                    this.macros[key] = NaN; // Mark as problematic
                }
                // Don't add this line to processedLines, it's handled
                continue;
            }

            match = macroRegex.exec(line);
            // Only treat as macro if it's not a reserved OpenFOAM keyword
            if (
                match &&
                !['type', 'faces', 'blocks', 'vertices', 'edges', 'boundary', 'scale'].includes(
                    match[1]
                )
            ) {
                const key = match[1];
                const value = match[2].trim();
                // If value is a number, store it as number, otherwise as string
                const numValue = parseFloat(value);
                this.macros[key] = !isNaN(numValue) ? numValue : value;
                // console.log(`Defined macro: ${key} = ${this.macros[key]}`);
                // Don't add this line, it's handled
                continue;
            }
            processedLines.push(line); // Keep other lines for main parsing
        }
        // console.log("Final macros:", this.macros);
        return processedLines;
    }

    parse(fileContent) {
        this.reset();
        console.log('Starting parsing...');

        let lines = this._removeCommentsAndStoreLines(fileContent);
        console.log('Lines after comment removal:', lines.slice(20, 50)); // Show more lines around boundary section
        lines.slice(20, 50).forEach((line, i) => console.log(`Line ${i + 20}: "${line}"`));

        console.log('Before macro preprocessing, lines length:', lines.length);
        lines = this._preprocessMacrosAndEvals(lines); // Process macros and #eval first
        console.log('After macro preprocessing, lines length:', lines.length);
        console.log('Lines after macro preprocessing:');
        lines.slice(20, 50).forEach((line, i) => console.log(`MacroLine ${i + 20}: "${line}"`));

        let i = 0;
        while (i < lines.length) {
            // Update currentLineNumber based on the original content of lines[i]
            // This is an approximation; more robust line tracking would be better
            const firstToken = lines[i].split(' ')[0];
            const originalLineEntry = this.rawLinesWithNumbers.find((rl) =>
                rl.text.includes(firstToken)
            );
            this.currentLineNumber = originalLineEntry
                ? originalLineEntry.number
                : (this.currentLineNumber || 0) + 1;

            const line = lines[i].trim();
            if (line.startsWith('scale')) {
                i = this._parseScale(lines, i);
            } else if (line.startsWith('vertices')) {
                i = this._parseVertices(lines, i);
            } else if (line.startsWith('edges')) {
                i = this._parseEdges(lines, i);
            } else if (line.startsWith('blocks')) {
                i = this._parseBlocks(lines, i);
            } else if (line.startsWith('boundary')) {
                i = this._parseBoundary(lines, i);
            } else if (line.startsWith('mergePatchPairs')) {
                i = this._parseMergePatchPairs(lines, i);
            } else {
                // If we have lines here that are not keywords, they might be unhandled
                // or part of a multi-line definition not fully consumed by a parse function.
                // This could indicate an issue in the parser logic or the dict.
                // console.warn(`L${this.currentLineNumber}: Unhandled line: ${line}`);
                i++;
            }
        }

        console.log(
            'Parsing finished. Vertices:',
            this.vertices.length,
            'Blocks:',
            this.blocks.length
        );
        if (this.errors.length > 0) {
            console.warn('Parsing completed with errors:', this.errors);
        }

        return {
            scale: this.scale,
            vertices: this.vertices,
            edges: this.edges,
            blocks: this.blocks,
            boundary: this.boundary,
            mergePatchPairs: this.mergePatchPairs,
            errors: this.errors, // Ensure errors are returned
        };
    }

    _parseScale(lines, index) {
        const line = lines[index];
        const parts = line.replace(';', '').trim().split(/\s+/);
        if (parts.length >= 2) {
            const scaleVal = this._resolveValue(parts[1]);
            if (typeof scaleVal === 'number') {
                this.scale = scaleVal;
            } else {
                this._logError(`Invalid scale value: ${parts[1]}`);
            }
        } else {
            this._logError(`Malformed scale directive: ${line}`);
        }
        return index + 1;
    }

    _parseVertices(lines, index) {
        index++; // Move past "vertices"
        if (lines[index].trim() !== '(') {
            this._logError("Expected '(' after vertices keyword.");
            return index; // or try to recover
        }
        index++;

        while (index < lines.length && !lines[index].trim().startsWith(')')) {
            const line = lines[index].trim();
            // Matches ( val1 val2 val3 ) where val can be number or $macro
            const match = line.match(/\(\s*(\S+)\s+(\S+)\s+(\S+)\s*\)/);
            if (match) {
                const x = this._resolveValue(match[1]);
                const y = this._resolveValue(match[2]);
                const z = this._resolveValue(match[3]);

                if (typeof x === 'number' && typeof y === 'number' && typeof z === 'number') {
                    this.vertices.push({
                        x: x * this.scale,
                        y: y * this.scale,
                        z: z * this.scale,
                    });
                } else {
                    this._logError(
                        `Could not resolve all vertex coordinates to numbers: (${match[1]}, ${match[2]}, ${match[3]}) resolved to (${x}, ${y}, ${z})`
                    );
                }
            } else if (line !== '') {
                // Non-empty line that doesn't match
                this._logError(`Invalid vertex format: ${line}`);
            }
            index++;
        }
        if (index < lines.length && lines[index].trim().startsWith(')'))
            index++; // Consume closing ); or )
        else {
            this._logError("Missing closing ')' for vertices block.");
        }
        return index;
    }

    _parseEdges(lines, index) {
        // ... (similar enhancements needed for _resolveValue if edges use macros for points) ...
        // For now, assume edge points are direct numbers after macro resolution step
        index++; // Move past "edges"
        if (!lines[index] || lines[index].trim() !== '(') {
            this._logError("Expected '(' after edges keyword.");
            return index;
        }
        index++;

        while (index < lines.length && !lines[index].trim().startsWith(')')) {
            const line = lines[index].trim();
            const parts = line.split(/\s+/);
            // arc v1 v2 (px py pz)
            if (
                parts.length >= 4 &&
                (parts[0] === 'arc' ||
                    parts[0] === 'spline' ||
                    parts[0] === 'polyLine' ||
                    parts[0] === 'line')
            ) {
                const type = parts[0];
                const v1 = parseInt(parts[1]); // Vertices are always indices
                const v2 = parseInt(parts[2]);
                let points = [];

                const pointStringMatch = line.match(/\(([^)]+)\)/g); // Match all (...) groups for points
                if (pointStringMatch) {
                    // Example: for arc " (1.1 0.0 0.5)" -> one match
                    // for spline " ( (0 0 0) (1 1 1) )" -> one outer match
                    // This needs careful parsing for nested structures if spline points are "( (x y z) (x y z) )"
                    if (type === 'arc' && pointStringMatch.length > 0) {
                        const coords = pointStringMatch[0].replace(/[()]/g, '').trim().split(/\s+/);
                        if (coords.length === 3) {
                            points.push({
                                x: parseFloat(coords[0]) * this.scale,
                                y: parseFloat(coords[1]) * this.scale,
                                z: parseFloat(coords[2]) * this.scale,
                            });
                        } else {
                            this._logError(
                                `Arc edge expects 3 coordinates for point, got: ${pointStringMatch[0]}`
                            );
                        }
                    } else if (type === 'spline' || type === 'polyLine') {
                        // This part is still too simple for complex spline point lists like ( (p1x p1y p1z) (p2x p2y p2z) ... )
                        // Needs a recursive or more robust point list parser
                        this._logError(
                            `Parsing for '${type}' edge points is basic and may fail on complex structures. Line: ${line}`
                        );
                        // Attempt basic parsing for simple lists of points
                        const allPointsStr = line
                            .substring(line.indexOf(parts[2]) + parts[2].length)
                            .trim();
                        const pointGroups = allPointsStr.match(
                            /\(\s*[\d.-]+\s+[\d.-]+\s+[\d.-]+\s*\)/g
                        );
                        if (pointGroups) {
                            pointGroups.forEach((pg) => {
                                const coords = pg.replace(/[()]/g, '').trim().split(/\s+/);
                                if (coords.length === 3) {
                                    points.push({
                                        x: parseFloat(coords[0]) * this.scale,
                                        y: parseFloat(coords[1]) * this.scale,
                                        z: parseFloat(coords[2]) * this.scale,
                                    });
                                }
                            });
                        }
                    }
                }
                if (isNaN(v1) || isNaN(v2)) {
                    this._logError(`Invalid vertex indices for edge: ${parts[1]}, ${parts[2]}`);
                } else {
                    this.edges.push({ type, v1, v2, points });
                }
            } else if (line !== '' && line !== '(' && line !== ')') {
                // Check if not just parenthesis
                this._logError(`Invalid edge format: ${line}`);
            }
            index++;
        }
        if (index < lines.length && lines[index].trim().startsWith(')')) index++;
        else this._logError("Missing closing ')' for edges block.");
        return index;
    }

    _parseBlocks(lines, index) {
        index++; // Move past "blocks"
        if (!lines[index] || lines[index].trim() !== '(') {
            this._logError("Expected '(' after blocks keyword.");
            return index;
        }
        index++;

        while (index < lines.length && !lines[index].trim().startsWith(')')) {
            const line = lines[index].trim();
            if (line.startsWith('hex')) {
                // Expecting: hex (v0 v1 v2 v3 v4 v5 v6 v7) (nx ny nz) simpleGrading (gx gy gz)
                // Or: hex (v0 ... v7)
                // followed by (nx ny nz) on next line
                // followed by simpleGrading (gx gy gz) on next line
                const hexMatch = line.match(/hex\s*\(([^)]+)\)/);
                if (!hexMatch) {
                    this._logError(`Malformed hex definition: ${line}`);
                    index = this._skipToNextBlockOrClosingParen(lines, index);
                    continue;
                }
                const blockVertices = hexMatch[1].trim().split(/\s+/).map(Number);

                // Look for cell counts and grading on the same line or subsequent lines
                let cells = null,
                    gradingType = 'simpleGrading',
                    grading = [1, 1, 1]; // Defaults

                let remainingLinePart = line.substring(hexMatch[0].length).trim();

                // Check same line for cells and grading
                const sameLineParts = remainingLinePart.split(/\)\s*(?=\()/); // Split by ") (" to separate (...)(...)
                if (sameLineParts.length > 0) {
                    for (const part of sameLineParts) {
                        const trimmedPart = part.trim();
                        if (trimmedPart.startsWith('(')) {
                            // Cell counts
                            const cellMatch = trimmedPart.match(/^\(([^)]+)\)/);
                            if (cellMatch && !cells) {
                                cells = cellMatch[1]
                                    .trim()
                                    .split(/\s+/)
                                    .map((s) => this._resolveValue(s))
                                    .map(Number);
                            }
                        } else if (
                            trimmedPart.startsWith('simpleGrading') ||
                            trimmedPart.startsWith('edgeGrading')
                        ) {
                            gradingType = trimmedPart.startsWith('simpleGrading')
                                ? 'simpleGrading'
                                : 'edgeGrading';
                            const gradingMatch = trimmedPart.match(/\(([^)]+)\)/);
                            if (gradingMatch) {
                                grading = gradingMatch[1]
                                    .trim()
                                    .split(/\s+/)
                                    .map((s) => this._resolveValue(s))
                                    .map(Number);
                                // Note: edgeGrading is more complex, this is simplified
                            }
                        }
                    }
                }

                // If not found on same line, check next lines
                let lookAheadIndex = index + 1;
                if (
                    !cells &&
                    lookAheadIndex < lines.length &&
                    lines[lookAheadIndex].trim().startsWith('(')
                ) {
                    const cellLine = lines[lookAheadIndex].trim();
                    const cellMatch = cellLine.match(/\(([^)]+)\)/);
                    if (cellMatch) {
                        cells = cellMatch[1]
                            .trim()
                            .split(/\s+/)
                            .map((s) => this._resolveValue(s))
                            .map(Number);
                        lookAheadIndex++;
                    }
                }
                if (
                    lookAheadIndex < lines.length &&
                    (lines[lookAheadIndex].trim().startsWith('simpleGrading') ||
                        lines[lookAheadIndex].trim().startsWith('edgeGrading'))
                ) {
                    const gradingLine = lines[lookAheadIndex].trim();
                    gradingType = gradingLine.startsWith('simpleGrading')
                        ? 'simpleGrading'
                        : 'edgeGrading';
                    const gradingMatch = gradingLine.match(/\(([^)]+)\)/);
                    if (gradingMatch) {
                        grading = gradingMatch[1]
                            .trim()
                            .split(/\s+/)
                            .map((s) => this._resolveValue(s))
                            .map(Number);
                    }
                    lookAheadIndex++;
                }

                if (blockVertices.length !== 8) {
                    this._logError(
                        `Hex block definition requires 8 vertices, found ${blockVertices.length}: ${hexMatch[0]}`
                    );
                } else if (!cells || cells.length !== 3 || cells.some(isNaN)) {
                    this._logError(
                        `Hex block requires 3 cell count numbers (nx ny nz), found: ${cells}`
                    );
                } else if (
                    !grading ||
                    grading.some(isNaN) ||
                    (gradingType === 'simpleGrading' &&
                        grading.length !== 3) /* add more for edgeGrading */
                ) {
                    this._logError(
                        `Invalid grading for block: type=${gradingType}, values=${grading}`
                    );
                } else {
                    this.blocks.push({ vertices: blockVertices, cells, gradingType, grading });
                }
                index = cells && grading ? lookAheadIndex - 1 : index; // Adjust index based on how many lines were consumed
            } else if (line !== '' && line !== '(' && line !== ')') {
                this._logError(`Unexpected line in blocks definition: ${line}`);
            }
            index++;
        }
        if (index < lines.length && lines[index].trim().startsWith(')')) index++;
        else this._logError("Missing closing ')' for blocks block.");
        return index;
    }

    _skipToNextBlockOrClosingParen(lines, index) {
        while (index < lines.length) {
            const currentLine = lines[index].trim();
            if (currentLine.startsWith('hex') || currentLine.startsWith(')')) {
                return index;
            }
            index++;
        }
        return index; // End of lines
    }

    _parseBoundary(lines, index) {
        console.log(
            `Starting boundary parsing at index ${index}, line: "${lines[index]}", total lines: ${lines.length}`
        );
        console.log(
            `Lines around boundary: ${index - 2}: "${lines[index - 2]}", ${index - 1}: "${
                lines[index - 1]
            }", ${index}: "${lines[index]}", ${index + 1}: "${lines[index + 1]}", ${index + 2}: "${
                lines[index + 2]
            }"`
        );
        index++; // Move past "boundary"
        if (!lines[index] || lines[index].trim() !== '(') {
            this._logError("Expected '(' after boundary keyword.");
            return index;
        }
        console.log(
            `Found opening paren at index ${index}: "${lines[index]}", moving to index ${index + 1}`
        );
        index++; // Move into the list of patches

        while (index < lines.length && !lines[index].trim().startsWith(')')) {
            // Loop for each patch entry
            let patchNameLine = lines[index].trim();
            console.log(`Processing line ${index}: "${patchNameLine}"`);

            if (patchNameLine.startsWith(')') || patchNameLine === '') {
                index++;
                continue;
            }

            if (!patchNameLine.match(/^[a-zA-Z0-9_]+$/)) {
                this._logError(`Expected patch name, but found: ${patchNameLine}`);
                index = this._skipToNextPotentialPatchNameOrEnd(lines, index);
                continue;
            }

            let currentPatch = { name: patchNameLine, type: null, faces: [] };
            console.log(`Found patch: ${patchNameLine} at index ${index}`);
            index++;

            if (!lines[index] || lines[index].trim() !== '{') {
                this._logError(
                    `Patch '${currentPatch.name}': Expected '{' after patch name but found "${lines[index]}" at index ${index}.`
                );
                index = this._skipToNextPotentialPatchNameOrEnd(lines, index);
                continue;
            }
            console.log(
                `Found opening brace for patch ${currentPatch.name} at index ${index}: "${
                    lines[index]
                }", next line at ${index + 1} should be: "${lines[index + 1]}"`
            );
            index++; // Consumed '{', now inside patch definition

            // Loop within the patch definition { ... }
            while (index < lines.length && lines[index].trim() !== '}') {
                let patchDetailLine = lines[index].trim();
                console.log(`Processing patch detail line at index ${index}: "${patchDetailLine}"`);

                if (patchDetailLine.startsWith('type')) {
                    console.log(`Processing type line: "${patchDetailLine}"`);
                    const parts = patchDetailLine.split(/\s+/);
                    if (parts.length > 1) {
                        currentPatch.type = parts[1].replace(';', '');
                        console.log(`Set type to: ${currentPatch.type}`);
                    } else {
                        this._logError(
                            `Patch '${currentPatch.name}': Malformed type definition: ${patchDetailLine}`
                        );
                    }
                    index++; // Consumed type line
                } else if (patchDetailLine.startsWith('faces')) {
                    // Handle both "faces (" and "faces ((...))" formats
                    if (patchDetailLine.includes('((')) {
                        // Faces on same line: "faces ((0 3 7 4));"
                        const faceMatch = patchDetailLine.match(/faces\s+\(\(([^)]+)\)\)/);
                        if (faceMatch) {
                            const faceVertices = faceMatch[1].trim().split(/\s+/).map(Number);
                            if (faceVertices.some(isNaN) || faceVertices.length < 3) {
                                this._logError(
                                    `Patch '${currentPatch.name}': Invalid vertex numbers in face: ${patchDetailLine}`
                                );
                            } else {
                                currentPatch.faces.push(faceVertices);
                            }
                        } else {
                            this._logError(
                                `Patch '${currentPatch.name}': Malformed single-line face entry: ${patchDetailLine}`
                            );
                        }
                        index++; // Consumed the single-line faces definition
                    } else {
                        // Multi-line faces format: "faces" followed by "(" on next line
                        index++; // Consumed 'faces' keyword line, expect '('
                        if (!lines[index] || lines[index].trim() !== '(') {
                            this._logError(
                                `Patch '${currentPatch.name}': Expected '(' after 'faces' keyword.`
                            );
                            index = this._skipToClosingBraceOrNextPatch(lines, index); // Try to find '}'
                            break; // Break from inner patch detail loop
                        }
                        index++; // Consumed '(', now inside faces list

                        let faceList = [];
                        while (index < lines.length && !lines[index].trim().startsWith(')')) {
                            const faceLine = lines[index].trim();
                            const faceMatch = faceLine.match(/\(([^)]+)\)/);
                            if (faceMatch) {
                                const faceVertices = faceMatch[1].trim().split(/\s+/).map(Number);
                                if (faceVertices.some(isNaN) || faceVertices.length < 3) {
                                    this._logError(
                                        `Patch '${currentPatch.name}': Invalid vertex numbers in face: ${faceLine}`
                                    );
                                } else {
                                    faceList.push(faceVertices);
                                }
                            } else if (faceLine !== '') {
                                this._logError(
                                    `Patch '${currentPatch.name}': Malformed face entry: ${faceLine}`
                                );
                            }
                            index++; // Consumed a face line or an empty line within faces
                        }
                        currentPatch.faces = faceList;

                        if (index < lines.length && lines[index].trim().startsWith(')')) {
                            index++; // Consumed ')' for faces list
                            if (index < lines.length && lines[index].trim() === ';') {
                                index++; // Consumed optional semicolon for faces block
                            }
                        } else {
                            this._logError(
                                `Patch '${currentPatch.name}': Missing closing ')' for faces list.`
                            );
                            // Attempt to recover by finding the end of this patch block
                            index = this._skipToClosingBraceOrNextPatch(lines, index);
                            break; // Break from inner loop
                        }
                    }
                } else if (patchDetailLine === '') {
                    index++; // Skip empty lines
                } else {
                    this._logError(
                        `Patch '${currentPatch.name}': Unexpected line in patch definition: ${patchDetailLine}`
                    );
                    index++; // Consume the unexpected line
                }
            } // End of inner while for patch details (ends when '}' is found or end of lines)

            if (!lines[index] || lines[index].trim() !== '}') {
                this._logError(
                    `Patch '${
                        currentPatch.name
                    }': Expected '}' to close patch definition but found '${
                        lines[index] ? lines[index].trim() : 'EOF'
                    }'`
                );
            } else {
                index++; // Consumed the closing '}' for the patch
            }

            // Finalize patch
            if (!currentPatch.type)
                this._logError(`Patch '${currentPatch.name}' missing 'type' definition.`);

            this.boundary.push(currentPatch);
        } // End of outer while for all patches

        if (index < lines.length && lines[index].trim().startsWith(')')) {
            index++; // Consume the final ')' for the boundary block
            if (index < lines.length && lines[index].trim() === ';') index++; // Consume optional semicolon
        } else {
            this._logError("Missing or unexpected content at end of 'boundary' block.");
        }
        return index;
    }

    // Helper utility to skip lines until a potential recovery point
    _skipToNextPotentialPatchNameOrEnd(lines, index) {
        while (
            index < lines.length &&
            !lines[index].trim().startsWith(')') &&
            !lines[index + 1]?.trim().match(/^[a-zA-Z0-9_]+$/)
        ) {
            index++;
        }
        return index; // Return current index, outer loop will increment or check condition
    }
    _skipToClosingBraceOrNextPatch(lines, index) {
        while (index < lines.length) {
            const line = lines[index].trim();
            if (line === '}') return index; // Found closing brace for current patch
            if (line.match(/^[a-zA-Z0-9_]+$/) && lines[index + 1]?.trim() === '{') return index; // Found start of next patch
            if (line.startsWith(')')) return index; // Found end of boundary list
            index++;
        }
        return index; // EOF
    }

    _skipToPatchEnd(lines, index) {
        let braceLevel = 0;
        if (lines[index - 1] && lines[index - 1].includes('{')) braceLevel = 1; // If previous line opened a brace

        while (index < lines.length) {
            const currentLine = lines[index].trim();
            if (currentLine.includes('{')) braceLevel++;
            if (currentLine.includes('}')) braceLevel--;
            if (braceLevel <= 0 && currentLine.includes('}')) return index + 1; // End of patch
            if (
                braceLevel === 0 &&
                currentLine.match(/^[a-zA-Z0-9_]+$/) &&
                !lines[index + 1].trim().startsWith('{')
            ) {
                // Next patch name
                return index;
            }
            if (currentLine.startsWith(')')) return index; // End of boundary list
            index++;
        }
        return index;
    }

    _parseMergePatchPairs(lines, index) {
        // ... (similar logic to _parseBoundary but for pairs) ...
        index++; // Past "mergePatchPairs"
        if (!lines[index] || lines[index].trim() !== '(') {
            // It's optional, so not an error if it's missing, but if keyword present, ( is expected
            if (lines[index - 1].trim().startsWith('mergePatchPairs'))
                this._logError("Expected '(' after mergePatchPairs keyword.");
            return index;
        }
        index++;
        while (index < lines.length && !lines[index].trim().startsWith(')')) {
            const line = lines[index].trim();
            const match = line.match(/\(\s*(\S+)\s+(\S+)\s*\)/);
            if (match) {
                this.mergePatchPairs.push({ master: match[1], slave: match[2] });
            } else if (line !== '') {
                this._logError(`Invalid mergePatchPair format: ${line}`);
            }
            index++;
        }
        if (index < lines.length && lines[index].trim().startsWith(')')) index++;
        else if (lines[index - 1].trim().startsWith('mergePatchPairs'))
            this._logError("Missing closing ')' for mergePatchPairs block.");
        return index;
    }
}

// Make BlockMeshParser available globally
window.BlockMeshParser = BlockMeshParser;

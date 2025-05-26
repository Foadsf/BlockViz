# BlockViz Tests

This directory contains files for testing BlockViz components, primarily the parser and validation engine.

## Parser Tests (`parser_tests/`)
- Contains small, focused `blockMeshDict` snippets.
- `run_parser_tests.html`: Open this in a browser. It will load `run_parser_tests.js` which attempts to parse the test dictionaries and logs results/errors to the console.

## Validation Tests (`validation_tests/`)
- Contains `blockMeshDict` files with known issues.
- `run_validation_tests.html`: Open this in a browser. It will load `run_validation_tests.js` which parses the dictionaries and then runs them through the validation engine, logging expected vs. actual errors to the console.

## Running Tests
1. Open the respective `run_*.html` file in a modern web browser.
2. Open the browser's developer console (usually F12) to see test output.

These are basic, console-based tests. For more rigorous testing, a JavaScript testing framework (like Jest, Mocha, Jasmine) could be integrated.
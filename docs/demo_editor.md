### JSON Editor - External resources are required ###

* Some external files (javascript, css, template) are required in this demo.
* We include css before the contents get rendered at 'getData'.
* Then include js/tmpl at 'afterRender' and initialize the editor.
* FractalJS gets .js and .css by adding 'script' or 'style' tag into DOM.
* FractalJS gets other type of resources (e.g. template, json API, ...) by making ajax requests.

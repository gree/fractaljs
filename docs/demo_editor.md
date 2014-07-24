### JSON editor - importing external files ###

* This demo imports some external resource files (javascript, css, template).
* We include a css before the contents get rendered at 'getData'.
* Then include js/tmpl at 'afterRender' and initialize the editor.
* FractalJS gets .js and .css resources by dynamically adding 'script' or 'style' tags into the DOM.
* FractalJS gets other type of resources (e.g. template, json API, ...) with ajax requests.

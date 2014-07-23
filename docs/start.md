# Getting Started #

Let's first make something working.

## A Very Basic Example ##

Below is the file structure used in this tutorial:

```
index.html
fractal.js
components/main.js
components/head.js
components/body.js
templates/main.tmpl
templates/head.tmpl
templates/body.tmpl
```

* **fractal.js** is from our repository.

### index.html ###

```html
<!DOCTYPE html>
<html>
<head>
  <title>First App</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>

<div data-role="component" data-name="main"></div>

<script type="text/javascript" src="fractal.js"></script>
<script>
  // 'F' is the alias of 'Fractal'
  F(function(){
    // configuration: tell FractalJS where to get the components
    F.PREFIX.component = "components/";
    F.PREFIX.template = "templates/";
    // build the page
    F.construct();
  });
</script>
</body>
</html>
```

* **F.construct()** finds all **data-role="component"** elements in current DOM (by default it is document.body).
* Then it try to load each component by its **data-name**
  * Here, FractalJS will request components/**main**.js and templates/**main**.tmpl

### Define *main* component ###

components/main.js
```javascript
F("main", F.Component.extend({}));
```
* A component can be defined by extending F.Component base class.

templates/main.tmpl
```html
<div data-role="component" data-name="head"></div>
<div data-role="component" data-name="body"></div>
```
* Wrtie *.tmpl in [mustache](http://mustache.github.io/).
* FractalJS by default uses [Hogan](http://twitter.github.io/hogan.js/) to render the template and put the rendered DOM into:
    ```
    <div data-role="component" data-name="main">
    ```
* **head** and **body** are nested components. They will be loaded recursively, so we will define them as well.


### Define *head* component ###

components/head.js

```javascript
F("head", F.Component.extend({
  getData: function(cb){
    this.data = { text: "world" };
    cb();
  }
}));
```
* FractalJS will pass **this.data** as parameter of **header.tmpl** to rendering engine.

templates/head.tmpl

```html
<h1>Hello {{text}}!</h1>
```

### Define *body* component ###

components/body.js

```javascript
F("body", F.Component.extend({
  afterRender: function(cb) {
    this.$("#btn").click(function(){
      alert("clicked!");
    });
    cb();
  },
  getData: function(cb){
    this.data = { text: "click" };
    cb();
  }
}));
```
* FractalJS will pass **this.data** as parameter of **header.tmpl** to rendering engine.

templates/body.tmpl

```html
<button id="btn">{{text}}</button>
```




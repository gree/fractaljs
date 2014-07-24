# Getting Started #

## A very basic example ##

File structure for this tutorial project:

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
    // configuration: tell FractalJS where to get components from
    F.PREFIX.component = "components/";
    F.PREFIX.template = "templates/";
    // build the page
    F.construct();
  });
</script>
</body>
</html>
```

* **F.construct()** finds all **data-role="component"** elements in the current DOM (document.body by default).
* Then it tries to load each component by its **data-name**
  * In this example, FractalJS will import components/**main**.js and templates/**main**.tmpl

### Define the *main* component ###

components/main.js
```javascript
F("main", F.Component.extend({}));
```
* Define a component by extending from the F.Component base class.

templates/main.tmpl
```html
<div data-role="component" data-name="head"></div>
<div data-role="component" data-name="body"></div>
```
* Write *.tmpl in [mustache](http://mustache.github.io/).
* By default, FractalJS uses [Hogan](http://twitter.github.io/hogan.js/) to render the template, and places the rendered DOM under:
    ```
    <div data-role="component" data-name="main">
    ```
* **head** and **body** are nested components. They will be loaded recursively.


### Define the *head* component ###

components/head.js

```javascript
F("head", F.Component.extend({
  getData: function(cb){
    this.data = { text: "world" };
    cb();
  }
}));
```
* FractalJS will pass **this.data** as parameters when rendering **header.tmpl**.

templates/head.tmpl

```html
<h1>Hello {{text}}!</h1>
```

### Define the *body* component ###

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
* FractalJS will pass **this.data** as parameters when rendering **body.tmpl**.

templates/body.tmpl

```html
<button id="btn">{{text}}</button>
```




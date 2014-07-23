### Counter - A Component can refresh itself ###

* **afterRender** is called after the contents is inserted into DOM.
* Ususally you will set DOM event handlers in **afterRender**.
* **this.$** only find elements inside the components.
* It is always better (or must) to use **this.$** instead of just **$**.
* **this.load** renders the component again.

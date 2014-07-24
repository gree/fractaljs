### Counter - a component can refresh itself ###

* **afterRender** is called after the contents are inserted into DOM.
* Usually you would set DOM event handlers in **afterRender**.
* **this.$** will only search for elements inside the components.
* It is always better to use **this.$** instead of just **$**.
* **this.load** re-renders the component.

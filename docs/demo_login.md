### Login - Load other components on the fly ###

* **form** and **hello2** are children components of **login**.
* Which one should be loaded will depend on the value of **componentName**.
* Multiple components/templates can be put together in 1 file.
* FractalJS provides a simple Pub/Sub messaging function to let components communicate with each other.
* **param** is available during the loading of the component including its childrens.
* **hello**(in the first example), is reused here as a child of **hello2**.

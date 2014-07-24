### Login - load other components on the fly ###

* **form** and **hello2** are children components of **login**.
* **componentName** will determine what components will be loaded.
* Multiple components/templates can be put together in 1 file.
* FractalJS provides a simple Pub/Sub messaging function to allow components to communicate with each other.
* **param** of the component and its children can be accessed during loading.
* **hello** (in the first example), is reused here as a child of **hello2**.

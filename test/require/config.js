var envs = {};
for (var i=0; i<10; ++i) {
  envs["require_ns" + i] = "__generated__/" + i + "/ns.js";
}
F({
  Envs: envs
});


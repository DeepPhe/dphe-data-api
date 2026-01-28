const app = require("./src/app");

// List all registered routes
function listRoutes(stack, prefix = "") {
  stack.forEach((middleware) => {
    if (middleware.route) {
      // Routes registered directly
      const methods = Object.keys(middleware.route.methods)
        .join(", ")
        .toUpperCase();
      console.log(`${methods.padEnd(10)} ${prefix}${middleware.route.path}`);
    } else if (middleware.name === "router") {
      // Router middleware
      const newPrefix =
        prefix +
        (middleware.regexp.source
          .replace("^\\/(?=\\/|$)", "")
          .replace(/\\\//g, "/")
          .replace("(?:\\/(?=$))?", "")
          .replace("(?=\\/|$)", "")
          .replace(/\(\?:\(\?=\\\/\|\\\/\$\)\)\?/g, "")
          .replace(/\(\?\:\(\?\=[\\\/]\|\$\)\)\?/g, "")
          .replace(/\^\(.*\)\$/, "$1")
          .split("?")[0] || "");

      if (middleware.handle.stack) {
        listRoutes(middleware.handle.stack, newPrefix);
      }
    }
  });
}

console.log("Registered Routes:");
console.log("==================");
listRoutes(app._router.stack);

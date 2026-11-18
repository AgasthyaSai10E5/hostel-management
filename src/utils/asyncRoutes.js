// Wraps every route handler so that errors inside async code are
// passed to the global error handler instead of crashing the request.
const METHODS = ["get", "post", "put", "patch", "delete"];
module.exports = function asyncRoutes(router) {
  METHODS.forEach(m => {
    const original = router[m].bind(router);
    router[m] = (path, ...handlers) =>
      original(path, ...handlers.map(h => (h.length > 3 || typeof h !== "function") ? h :
        (req, res, next) => Promise.resolve(h(req, res, next)).catch(next)));
  });
  return router;
};

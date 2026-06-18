async function invokeController(controller, req) {
  let body;
  let status = 200;

  const res = {
    status(code) {
      status = code;
      return res;
    },
    json(data) {
      body = data;
      return res;
    },
  };

  await controller(req, res);
  return { body, status };
}

module.exports = { invokeController };

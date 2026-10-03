export function sendData(res, data, { status = 200, meta } = {}) {
  const body = meta === undefined ? { data } : { data, meta };
  return res.status(status).json(body);
}

export function errorBody(code, message, details = []) {
  return { error: { code, message, details } };
}

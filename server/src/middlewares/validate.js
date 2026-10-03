const SOURCES = ['body', 'query', 'params'];

export function validate(schema, source = 'body') {
  if (!SOURCES.includes(source)) {
    throw new Error(`Sumber validasi tidak dikenal: ${source}`);
  }

  return async function validateRequest(req, res, next) {
    const parsed = await schema.parseAsync(req[source] ?? {});
    req.validated = { ...req.validated, [source]: parsed };
    if (source === 'body') req.body = parsed;
    next();
  };
}

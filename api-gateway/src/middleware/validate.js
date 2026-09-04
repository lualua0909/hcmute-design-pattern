import { HttpError } from './error.js';

/** Validates req[source] with a zod schema and replaces it with parsed output. */
export const validate = (schema, source = 'body') => (req, res, next) => {
  const result = schema.safeParse(req[source]);
  if (!result.success) {
    return next(new HttpError(422, 'validation failed', result.error.flatten()));
  }
  req[source] = result.data;
  next();
};

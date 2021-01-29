const errorCreator = (err, code = 400) => {
  const error = new Error(err);
  error.httpStatusCode = code;
  return error;
};

exports.errorCreator = errorCreator;

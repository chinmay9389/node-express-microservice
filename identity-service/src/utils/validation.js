const joi = require("joi");

const validateUserRegistration = (data) => {
  const schema = joi.object({
    username: joi.string().min(3).max(30).required(),
    password: joi.string().min(6).required(),
    email: joi.string().email().required(),
  });

  return schema.validate(data);
};

const validatelogin = (data) => {
  const schema = joi.object({
    email: joi.string().email().required(),
    password: joi.string().min(6).required(),
  });

  return schema.validate(data);
};
module.exports = { validateUserRegistration, validatelogin };

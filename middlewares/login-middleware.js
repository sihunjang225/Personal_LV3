const jwt = require("jsonwebtoken");
const { Users } = require("../models");

module.exports = async (req, res, next) => {
  const { authorization } = req.cookies;

  const [authType, authToken] = (authorization ?? "").split(" ");

  if (!authorization) {
    return res.status(403).json({ errorMessage: "토큰이 존재하지 않습니다." });
  }

  if (authType !== "Bearer" || !authToken) {
    return res.status(400).json({ errorMessage: "로그인이 필요한 기능입니다" });
  }

  try {
    const { userId } = jwt.verify(authToken, "costomized-secret-key");

    const user = await Users.findById(userId);
    res.locals.user = user;
    next();
  } catch (error) {
    console.log(error);
    res
      .status(400)
      .json({ errorMessage: "로그인 후에 이용할 수 있는 기능입니다." });
  }
};

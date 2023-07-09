const express = require("express");
const { Posts } = require("../models");
const { Users } = require("../models");
const { Comments } = require("../models");
const { Likes } = require("../models");
const { Op } = require("sequelize");
const likeMiddleware = require("../middlewares/like-middleware.js");
const loginMiddleware = require("../middlewares/login-middleware.js");
const router = express.Router();

router.post("/", loginMiddleware, async (req, res) => {
  const user = res.locals.user;
  const { title, content } = req.body;

  const post = await Posts.create({
    UsersId: user.usersId,
    nickname: user.nickname,
    title,
    content,
  });

  return res.status(201).json({ data: post });
});

router.get("/", likeMiddleware, async (req, res) => {
  const { usersId } = res.locals.user;
  if (!usersId) {
    try {
      const posts = await Posts.findAll({
        attributes: [
          "postId",
          "title",
          "createdAt",
          "nickname",
          "likes",
          "updatedAt",
        ],
        order: [["createdAt", "DESC"]],
        include: [{ model: Likes, attributes: ["UsersId", "PostId"] }],
      });

      return res.status(200).json({ data: data });
    } catch (error) {
      console.error(error);
      return res
        .status(400)
        .json({ errorMessage: "좋아요 게시글 조회에 실패하였습니다." });
    }
  }

  try {
    const posts = await Posts.findAll({
      attributes: [
        "postId",
        "title",
        "createdAt",
        "nickname",
        "likes",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Likes,
          attributes: ["UsersId", "PostId"],
        },
      ],
    });
    return res.status(200).json(responseData);
  } catch (error) {
    console.log(error);
  }
});

router.get("/:postId", likeMiddleware, async (req, res) => {
  const { postId } = req.params;
  const { usersId } = res.locals.user;

  if (!usersId) {
    try {
      const post = await Posts.findOne({
        attributes: [
          "postId",
          "title",
          "nickname",
          "likes",
          "content",
          "createdAt",
          "updatedAt",
        ],
        where: { postId },
      });

      return res.status(200).json({ data: post });
    } catch (error) {
      console.error(error);
    }
  }

  try {
    const posts = await Posts.findOne({
      where: { postId },
      attributes: [
        "postId",
        "title",
        "createdAt",
        "nickname",
        "likes",
        "updatedAt",
      ],
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: Likes,
          attributes: ["UsersId", "PostId"],
        },
      ],
    });

    const responseData = { data: posts, userId: usersId };

    return res.status(200).json(responseData);
  } catch (error) {
    console.log(error);
  }
});

router.put("/:postId", loginMiddleware, async (req, res) => {
  const { usersId } = res.locals.user;
  const { postId } = req.params;
  const { title, content } = req.body;

  const post = await Posts.findOne({
    where: { [Op.and]: [{ postId }, { usersId }] },
  });

  if (!post) {
    return res
      .status(401)
      .json({ errorMessage: "게시글이 정상적으로 수정되지 않았습니다." });
  }

  await Posts.update(
    { title, content },
    {
      where: {
        [Op.and]: [{ postId }, { usersId }],
      },
    }
  );

  res.status(201).json({ message: "게시글을 수정하였습니다." });
});

router.delete("/:postId", loginMiddleware, async (req, res) => {
  const { postId } = req.params;
  const post = await Posts.findOne({ where: { postId } });

  if (!post) {
    return res.status(401).json({
      sucess: false,
      errorMessage: "게시글이 정상적으로 삭제되지 않았습니다.",
    });
  }
  await Posts.destroy({ where: { postId } });

  res.status(200).json({ message: "게시글을 삭제하였습니다." });
});

router.post("/:postId/comments", loginMiddleware, async (req, res) => {
  const { postId } = req.params;
  const user = res.locals.user;
  const { comment } = req.body;
  try {
    await Comments.create({
      UsersId: user.usersId,
      Nickname: user.nickname,
      PostId: postId,
      comment,
    });
    return res.status(201).json({ message: "댓글을 작성하였습니다." });
  } catch (error) {
    return res.status(401).json({ errorMesage: "댓글 작성에 실패하였습니다." });
  }
});

router.get("/:postId/comments", async (req, res) => {
  const { postId } = req.params;

  try {
    const comments = await Comments.findAll({
      where: { PostId: postId },
    });

    res.status(200).json({ comments: comments });
  } catch (error) {
    return res.status(404).json({ errorMessage: "댓글이 존재하지 않습니다." });
  }
});

router.patch(
  "/:postId/comments/:commentId",
  loginMiddleware,
  async (req, res) => {
    const { usersId } = res.locals.user;
    const { comment } = req.body;
    const { postId, commentId } = req.params;

    const nowComment = await Comments.findOne({
      where: {
        [Op.and]: [{ PostId: postId }, { UsersId: usersId }, { commentId }],
      },
    });

    if (!nowComment) {
      return res
        .status(401)
        .json({ errorMessage: "댓글을 수정할 수 없습니다." });
    }

    await nowComment.update({
      comment,
    });

    return res.status(201).json({ message: "댓글을 수정했습니다." });
  }
);

router.put("/:postId/like", loginMiddleware, async (req, res) => {
  const user = res.locals.user;
  const { postId } = req.params;

  const post = await Posts.findOne({
    where: { postId },
  });

  const myLike = await Likes.findOne({
    where: {
      [Op.and]: [{ PostId: postId }, { UsersId: user.usersId }],
    },
  });

  const t = await sequelize.transaction({
    isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED,
  });

  try {
    if (myLike) {
      await myLike.destroy();
      await post.update({ likes: post.likes - 1 }, { transaction: t });
      await t.commit();
      return res
        .status(201)
        .json({ Message: "게시글의 좋아요를 취소하였습니다." });
    } else {
      await Likes.create(
        {
          PostId: postId,
          UsersId: user.usersId,
        },
        { transaction: t }
      );
      await post.update({ likes: post.likes + 1 }, { transaction: t });
      await t.commit();
      return res
        .status(201)
        .json({ Message: "게시글의 좋아요를 등록하였습니다." });
    }
  } catch (error) {
    console.error(error);
    await t.rollback();
    return res
      .status(400)
      .json({ errorMessage: "게시글 좋아요에 실패하였습니다." });
  }
});

router.delete(
  "/:postId/comments/:commentId",
  loginMiddleware,
  async (req, res) => {
    const { usersId } = res.locals.user;
    const { postId, commentId } = req.params;
    console.log(usersId);

    const comment = await Comments.findOne({
      where: { [Op.and]: [{ postId }, { commentId }, { usersId }] },
    });

    if (!comment) {
      return res
        .status(401)
        .json({ errorMessage: "댓글을 삭제할 수 없습니다." });
    }

    await comment.destroy();

    return res.status(201).json({ message: "댓글을 삭제했습니다." });
  }
);

module.exports = router;

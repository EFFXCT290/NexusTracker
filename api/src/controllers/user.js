import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import User from "../schema/user";
import Invite from "../schema/invite";
import Progress from "../schema/progress";
import { getTorrentsPage } from "./torrent";
import { getUserRatio } from "../utils/ratio";
import { getUserHitNRuns } from "../utils/hitnrun";
import { BYTES_GB } from "../tracker/announce";
import express from "express";

const router = express.Router();

export default (tracker) => {
  router.get("/", fetchAllUsers); // New endpoint to list all users
  router.get("/:username", fetchUser(tracker));
  router.post("/ban/:username", banUser);
  router.post("/unban/:username", unbanUser);
  return router;
};

export const sendVerificationEmail = async (mail, address, token) => {
  await mail.sendMail({
    from: `"${process.env.SQ_SITE_NAME}" <${process.env.SQ_MAIL_FROM_ADDRESS}>`,
    to: address,
    subject: "Verify your email address",
    text: `Thank you for joining ${process.env.SQ_SITE_NAME}. Please follow the link below to verify your email address.
        
${process.env.SQ_BASE_URL}/verify-email?token=${token}`,
  });
};

export const register = (mail) => async (req, res, next) => {
  if (
    process.env.SQ_ALLOW_REGISTER !== "open" &&
    process.env.SQ_ALLOW_REGISTER !== "invite"
  ) {
    res.status(403).send("Registration is currently closed");
    return;
  }

  if (req.body.username && req.body.email && req.body.password) {
    let invite;

    if (process.env.SQ_ALLOW_REGISTER === "invite") {
      if (!req.body.invite) {
        res
          .status(403)
          .send(
            "Registration is currently invite only. Please provide a valid invitation token"
          );
        return;
      }
    }

    if (req.body.invite) {
      try {
        const decoded = jwt.verify(req.body.invite, process.env.SQ_JWT_SECRET);
        const { id } = decoded;

        invite = await Invite.findOne({ _id: id }).lean();
        const { claimed, validUntil, invitingUser, email } = invite;

        if (claimed) {
          res.status(403).send("Invitation has already been claimed");
          return;
        }

        if (validUntil < Date.now()) {
          res.status(403).send("Invitation has expired");
          return;
        }

        if (email !== req.body.email) {
          res
            .status(403)
            .send("Email address does not match invited email address");
          return;
        }

        const inviter = User.findOne({ _id: invitingUser }).lean();
        if (!inviter || inviter.banned) {
          res
            .status(403)
            .send("Inviting user doesn't exist or has been banned");
          return;
        }
      } catch (err) {
        res.status(500).send(`Error verifying invitation: ${err.message}`);
        return;
      }
    }

    const created = Date.now();

    try {
      const { username, email, password } = req.body;
      
      // Convert username and email to lowercase before checking
      const lowercaseUsername = username.toLowerCase();
      const lowercaseEmail = email.toLowerCase();
      
      // Check for existing user with case-insensitive email
      const existingUserEmail = await User.findOne({
        email: { $regex: new RegExp(`^${lowercaseEmail}$`, 'i') }
      });

      if (existingUserEmail) {
        res.status(409).send("Email already registered");
        return;
      }

      const existingUser = await User.findOne({
        username: { $regex: new RegExp(`^${lowercaseUsername}$`, 'i') }
      });

      if (existingUser) {
        res.status(409).send("An account with that email address or username already exists");
        return;
      }

      const hash = await bcrypt.hash(password, 10);
      const role = invite?.role || "user";

      const newUser = new User({
        username: lowercaseUsername,
        email: lowercaseEmail,
        password: hash,
        torrents: {},
        created,
        role,
        invitedBy: invite?.invitingUser,
        remainingInvites: 0,
        emailVerified: process.env.SQ_DISABLE_EMAIL,
        bonusPoints: 0,
        totp: {
          enabled: false,
        },
      });

      newUser.uid = crypto
        .createHash("sha256")
        .update(newUser._id.toString())
        .digest("hex")
        .slice(0, 10);

      const createdUser = await newUser.save();

      if (!process.env.SQ_DISABLE_EMAIL) {
        const emailVerificationValidUntil = created + 48 * 60 * 60 * 1000;
        const emailVerificationToken = jwt.sign(
          {
            user: req.body.email,
            validUntil: emailVerificationValidUntil,
          },
          process.env.SQ_JWT_SECRET
        );
        await sendVerificationEmail(
          mail,
          req.body.email,
          emailVerificationToken
        );
      }

      if (createdUser) {
        if (req.body.invite) {
          const decoded = jwt.verify(
            req.body.invite,
            process.env.SQ_JWT_SECRET
          );
          const { id } = decoded;
          await Invite.findOneAndUpdate(
            { _id: id },
            { $set: { claimed: true } }
          );
          await User.findOneAndUpdate(
            { _id: invite.invitingUser },
            { $inc: { remainingInvites: -1 } }
          );
        }

        res.send({
          token: jwt.sign(
            {
              id: newUser._id,
              username: newUser.username,
              created,
              role,
            },
            process.env.SQ_JWT_SECRET
          ),
          id: createdUser._id,
          uid: createdUser.uid,
          username: createdUser.username,
        });
      } else {
        res.status(500).send("User could not be created");
      }
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include email, username and password");
  }
};

export const login = async (req, res, next) => {
  if (req.body.username && req.body.password) {
    try {
      const lowercaseUsername = req.body.username.toLowerCase();
      const user = await User.findOne({ username: lowercaseUsername }).lean();

      if (user) {
        if (user.banned) {
          res.status(403).send("User is banned");
          return;
        }

        if (user.totp.enabled && !req.body.totp) {
          res.status(401).send("One-time code required");
          return;
        }

        const matches = await bcrypt.compare(req.body.password, user.password);

        if (user.totp.enabled) {
          const validToken = speakeasy.totp.verify({
            secret: user.totp.secret,
            encoding: "base32",
            token: req.body.totp,
            window: 1,
          });

          if (!validToken) {
            if (!user.totp.backup.includes(req.body.totp)) {
              res.status(401).send("Invalid one-time code");
              return;
            } else {
              await User.findOneAndUpdate(
                { username: lowercaseUsername },
                { $pull: { "totp.backup": req.body.totp } }
              );
            }
          }
        }

        if (matches) {
          res.send({
            token: jwt.sign(
              {
                id: user._id,
                username: user.username,
                created: user.created,
                role: user.role,
              },
              process.env.SQ_JWT_SECRET
            ),
            id: user._id,
            uid: user.uid,
            username: user.username,
          });
        } else {
          res.status(401).send("Incorrect login details");
        }
      } else {
        res.status(404).send("Incorrect login details");
      }
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include username and password");
  }
};

export const generateInvite = (mail) => async (req, res, next) => {
  if (process.env.SQ_ALLOW_REGISTER !== "invite" && req.userRole !== "admin") {
    res
      .status(403)
      .send("Can only send invites when tracker is in invite only mode");
    return;
  }

  if (req.body.email && req.body.role) {
    const user = await User.findOne({ _id: req.userId }).lean();

    if (user.remainingInvites < 1) {
      res.status(403).send("You do not have any remaining invites");
    }

    const created = Date.now();
    const validUntil = created + 48 * 60 * 60 * 1000;

    const { email, role } = req.body;

    const invite = new Invite({
      invitingUser: req.userId,
      created,
      validUntil,
      claimed: false,
      email,
      role: role || "user",
    });

    invite.token = jwt.sign(
      { id: invite._id, validUntil },
      process.env.SQ_JWT_SECRET
    );

    const createdInvite = await invite.save();

    if (createdInvite) {
      if (!process.env.SQ_DISABLE_EMAIL) {
        await mail.sendMail({
          from: `"${process.env.SQ_SITE_NAME}" <${process.env.SQ_MAIL_FROM_ADDRESS}>`,
          to: email,
          subject: "Invite",
          text: `You have been invited to join ${process.env.SQ_SITE_NAME}. Please follow the link below to register.
        
${process.env.SQ_BASE_URL}/register?token=${createdInvite.token}`,
        });
      }
      res.send(createdInvite);
    }
  } else {
    res.status(400).send("Request must include email, role");
  }
};

export const fetchInvites = async (req, res, next) => {
  try {
    const invites = await Invite.find({ invitingUser: req.userId }, null, {
      sort: { created: -1 },
    }).lean();
    res.json(invites);
  } catch (e) {
    next(e);
  }
};

export const changePassword = (mail) => async (req, res, next) => {
  if (req.body.password && req.body.newPassword) {
    try {
      const user = await User.findOne({ _id: req.userId }).lean();

      if (!user) {
        res.status(404).send("User does not exist");
        return;
      }

      const matches = await bcrypt.compare(req.body.password, user.password);

      if (!matches) {
        res.status(401).send("Incorrect password");
        return;
      }

      const hash = await bcrypt.hash(req.body.newPassword, 10);

      await User.findOneAndUpdate(
        { _id: req.userId },
        { $set: { password: hash } }
      );

      if (!process.env.SQ_DISABLE_EMAIL) {
        await mail.sendMail({
          from: `"${process.env.SQ_SITE_NAME}" <${process.env.SQ_MAIL_FROM_ADDRESS}>`,
          to: user.email,
          subject: "Your password was changed",
          text: `Your password was updated successfully at ${new Date().toISOString()} from ${
            req.ip
          }.
        
If you did not perform this action, follow the link below immediately to reset your password. If this was you, no action is required. 
        
${process.env.SQ_BASE_URL}/reset-password/initiate`,
        });
      }

      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include password and newPassword");
  }
};

export const initiatePasswordReset = (mail) => async (req, res, next) => {
  if (req.body.email) {
    try {
      const { email } = req.body;
      
      // Convert email to lowercase for lookup
      const lowercaseEmail = email.toLowerCase();
      
      const user = await User.findOne({ 
        email: { $regex: new RegExp(`^${lowercaseEmail}$`, 'i') }
      });

      if (!user) {
        res.status(404).send("User does not exist");
        return;
      }

      const token = jwt.sign(
        {
          user: req.body.email,
          validUntil: Date.now() + 24 * 60 * 60 * 1000,
          key: crypto
            .createHash("sha256")
            .update(user.password)
            .digest("hex")
            .substr(0, 6),
        },
        process.env.SQ_JWT_SECRET
      );

      if (!process.env.SQ_DISABLE_EMAIL) {
        await mail.sendMail({
          from: `"${process.env.SQ_SITE_NAME}" <${process.env.SQ_MAIL_FROM_ADDRESS}>`,
          to: user.email,
          subject: "Password reset",
          text: `Please follow the link below to reset your password.
        
${process.env.SQ_BASE_URL}/reset-password/finalise?token=${token}`,
        });
      }

      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include email");
  }
};

export const finalisePasswordReset = async (req, res, next) => {
  if (req.body.email && req.body.newPassword && req.body.token) {
    try {
      const user = await User.findOne({ email: req.body.email }).lean();

      if (!user) {
        res.status(404).send("User does not exist");
        return;
      }

      const {
        user: email,
        validUntil,
        key,
      } = jwt.verify(req.body.token, process.env.SQ_JWT_SECRET);

      if (email !== req.body.email) {
        res.status(403).send("Token is invalid");
        return;
      }

      const calculatedKey = crypto
        .createHash("sha256")
        .update(user.password)
        .digest("hex")
        .substr(0, 6);

      if (key !== calculatedKey) {
        res.status(403).send("Token has already been used");
        return;
      }

      if (validUntil < Date.now()) {
        res.status(403).send("Token has expired");
        return;
      }

      const newHash = await bcrypt.hash(req.body.newPassword, 10);

      await User.findOneAndUpdate(
        { _id: user._id },
        { $set: { password: newHash } }
      );

      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include email, newPassword and token");
  }
};

export const fetchUser = (tracker) => async (req, res, next) => {
  try {
    const { username } = req.params;

    const [user] = await User.aggregate([
      {
        $match: { username },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          created: 1,
          role: 1,
          ...(req.userRole === "admin"
            ? { email: 1, emailVerified: 1, invitedBy: 1 }
            : {}),
          remainingInvites: 1,
          banned: 1,
          bonusPoints: 1,
          "totp.enabled": 1,
          // ADD LAST SEEN FEATURE
          lastSeen: 1,
          timezone: 1,
          // End of Last Seen Feature
        },
      },
      {
        $lookup: {
          from: "comments",
          as: "comments",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] },
              },
            },
            {
              $facet: {
                torrent: [
                  {
                    $match: {
                      type: "torrent",
                    },
                  },
                  {
                    $lookup: {
                      from: "torrents",
                      as: "torrent",
                      let: { torrentId: "$parentId" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { $eq: ["$_id", "$$torrentId"] },
                          },
                        },
                        { $project: { name: 1, infoHash: 1 } },
                      ],
                    },
                  },
                  {
                    $unwind: {
                      path: "$torrent",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                ],
                announcement: [
                  {
                    $match: {
                      type: "announcement",
                    },
                  },
                  {
                    $lookup: {
                      from: "announcements",
                      as: "announcement",
                      let: { announcementId: "$parentId" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { $eq: ["$_id", "$$announcementId"] },
                          },
                        },
                        { $project: { title: 1, slug: 1 } },
                      ],
                    },
                  },
                  {
                    $unwind: {
                      path: "$announcement",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                ],
                request: [
                  {
                    $match: {
                      type: "request",
                    },
                  },
                  {
                    $lookup: {
                      from: "requests",
                      as: "request",
                      let: { requestId: "$parentId" },
                      pipeline: [
                        {
                          $match: {
                            $expr: { $eq: ["$_id", "$$requestId"] },
                          },
                        },
                        { $project: { title: 1, index: 1 } },
                      ],
                    },
                  },
                  {
                    $unwind: {
                      path: "$request",
                      preserveNullAndEmptyArrays: true,
                    },
                  },
                ],
              },
            },
          ],
        },
      },
      {
        $unwind: {
          path: "$comments",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          comments: {
            $concatArrays: [
              "$comments.torrent",
              "$comments.announcement",
              "$comments.request",
            ],
          },
        },
      },
      {
        $addFields: {
          comments: {
            $sortArray: { input: "$comments", sortBy: { created: -1 } },
          },
        },
      },
      {
        $lookup: {
          from: "progresses",
          as: "downloaded",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] },
                "downloaded.total": { $gt: 0 },
              },
            },
            {
              $group: {
                _id: "downloaded",
                bytes: { $sum: "$downloaded.total" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "progresses",
          as: "uploaded",
          let: { userId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$userId", "$$userId"] },
                "uploaded.total": { $gt: 0 },
              },
            },
            {
              $group: {
                _id: "uploaded",
                bytes: { $sum: "$uploaded.total" },
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "users",
          as: "invitedBy",
          let: { invitingUserId: "$invitedBy" },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$_id", "$$invitingUserId"] },
              },
            },
            {
              $project: {
                username: 1,
              },
            },
          ],
        },
      },
      { $unwind: { path: "$downloaded", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$uploaded", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$invitedBy", preserveNullAndEmptyArrays: true } },
    ]);

    if (!user) {
      res.status(404).send("User does not exist");
      return;
    }

    const { ratio } = await getUserRatio(user._id);
    user.ratio = ratio;

    user.hitnruns = await getUserHitNRuns(user._id);

    const { torrents } = await getTorrentsPage({
      uploadedBy: user._id,
      userId: req.userId,
      tracker,
    });
    user.torrents = torrents;

    res.json(user);
  } catch (e) {
    next(e);
  }
};

export const getUserStats = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId }).lean();

    if (!user) {
      res.status(404).send("User does not exist");
      return;
    }

    const ratioStats = await getUserRatio(user._id);
    const hitnruns = await getUserHitNRuns(user._id);

    res.json({ ...ratioStats, bp: user.bonusPoints, hitnruns });
  } catch (e) {
    next(e);
  }
};

export const getUserRole = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId }).lean();
    res.send(user.role);
  } catch (e) {
    next(e);
  }
};

export const getUserVerifiedEmailStatus = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId }).lean();
    res.send(!!user.emailVerified);
  } catch (e) {
    next(e);
  }
};

export const verifyUserEmail = async (req, res, next) => {
  if (req.body.token) {
    try {
      const { user: email, validUntil } = jwt.verify(
        req.body.token,
        process.env.SQ_JWT_SECRET
      );

      if (validUntil < Date.now()) {
        res.status(403).send("Token has expired");
        return;
      }

      const user = await User.findOne({ email }).lean();

      if (!user) {
        res.status(404).send("User does not exist");
        return;
      }

      if (user.emailVerified) {
        res.status(400).send("Email address is already verified");
        return;
      }

      await User.findOneAndUpdate({ email }, { $set: { emailVerified: true } });

      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include token");
  }
};

export const banUser = async (req, res, next) => {
  try {
    if (req.userRole !== "admin") {
      res.status(401).send("You do not have permission to ban a user");
      return;
    }

    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      res.status(404).send("User does not exist");
      return;
    }

    await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { banned: true } }
    );

    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const buyItems = async (req, res, next) => {
  if (req.body.type && req.body.amount) {
    try {
      const amount = parseInt(req.body.amount);

      if (amount < 1) {
        res.status(400).send("Amount must be a number >=1");
        return;
      }

      const user = await User.findOne({ _id: req.userId }).lean();

      if (req.body.type === "invite") {
        if (process.env.SQ_BP_COST_PER_INVITE === 0) {
          res.status(403).send("Not available to buy");
          return;
        }

        const cost = amount * process.env.SQ_BP_COST_PER_INVITE;
        if (cost > user.bonusPoints) {
          res.status(403).send("Not enough points for transaction");
          return;
        }

        await User.findOneAndUpdate(
          { _id: req.userId },
          {
            $inc: {
              remainingInvites: amount,
              bonusPoints: cost * -1,
            },
          }
        );

        res.status(200).send((user.bonusPoints - cost).toString());
      } else if (req.body.type === "upload") {
        if (process.env.SQ_BP_COST_PER_GB === 0) {
          res.status(403).send("Not available to buy");
          return;
        }

        const cost = amount * process.env.SQ_BP_COST_PER_GB;
        if (cost > user.bonusPoints) {
          res.status(403).send("Not enough points for transaction");
          return;
        }

        await User.findOneAndUpdate(
          { _id: req.userId },
          {
            $inc: {
              bonusPoints: cost * -1,
            },
          }
        );

        const progressRecord = new Progress({
          infoHash: `purchase-${Date.now()}`,
          peerId: `purchase-${Date.now()}`,
          userId: req.userId,
          uploaded: {
            session: BYTES_GB * amount,
            total: BYTES_GB * amount,
          },
          downloaded: {
            session: 0,
            total: 0,
          },
          left: 0,
        });

        await progressRecord.save();

        res.status(200).send((user.bonusPoints - cost).toString());
      } else {
        res.status(400).send("Type must be one of invite, upload");
        return;
      }
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include type, amount");
  }
};

export const unbanUser = async (req, res, next) => {
  try {
    if (req.userRole !== "admin") {
      res.status(401).send("You do not have permission to unban a user");
      return;
    }

    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      res.status(404).send("User does not exist");
      return;
    }

    await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: { banned: false } }
    );

    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const generateTotpSecret = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId }).lean();
    if (user.totp.enabled) {
      res.status(409).send("TOTP already enabled");
      return;
    }

    const secret = speakeasy.generateSecret({ length: 20 });
    const url = speakeasy.otpauthURL({
      secret: secret.ascii,
      label: `${process.env.SQ_SITE_NAME}: ${user.username}`,
    });
    const imageDataUrl = await qrcode.toDataURL(url);

    await User.findOneAndUpdate(
      { _id: req.userId },
      {
        $set: {
          "totp.secret": secret.base32,
          "totp.qr": imageDataUrl,
        },
      }
    );

    res.json({ qr: imageDataUrl, secret: secret.base32 });
  } catch (e) {
    next(e);
  }
};

export const enableTotp = async (req, res, next) => {
  if (req.body.token) {
    try {
      const user = await User.findOne({ _id: req.userId }).lean();
      if (user.totp.enabled) {
        res.status(409).send("TOTP already enabled");
        return;
      }

      const validToken = speakeasy.totp.verify({
        secret: user.totp.secret,
        encoding: "base32",
        token: req.body.token,
        window: 1,
      });

      if (!validToken) {
        res.status(400).send("Invalid TOTP code");
        return;
      }

      const backupCodes = [...Array(10)].map(() =>
        crypto.randomBytes(32).toString("hex").slice(0, 10)
      );

      await User.findOneAndUpdate(
        { _id: req.userId },
        {
          $set: {
            "totp.enabled": true,
            "totp.backup": backupCodes,
          },
        }
      );

      res.send(backupCodes.join(","));
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include token");
  }
};

export const disableTotp = async (req, res, next) => {
  if (req.body.token) {
    try {
      const user = await User.findOne({ _id: req.userId }).lean();

      const validToken = speakeasy.totp.verify({
        secret: user.totp.secret,
        encoding: "base32",
        token: req.body.token,
        window: 1,
      });

      if (!validToken) {
        res.status(400).send("Invalid TOTP code");
        return;
      }

      await User.findOneAndUpdate(
        { _id: req.userId },
        {
          $set: {
            "totp.enabled": false,
            "totp.secret": "",
            "totp.qr": "",
            "totp.backup": [],
          },
        }
      );

      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include token");
  }
};

export const deleteAccount = async (req, res, next) => {
  if (req.body.password) {
    try {
      const user = await User.findOne({ _id: req.userId }).lean();

      if (!user) {
        res.status(404).send("User does not exist");
        return;
      }

      if (user.username === "admin") {
        res.status(403).send("Primary admin account cannot be deleted");
        return;
      }

      const matches = await bcrypt.compare(req.body.password, user.password);

      if (!matches) {
        res.status(401).send("Incorrect password");
        return;
      }

      await User.deleteOne({ _id: req.userId });

      res.sendStatus(200);
    } catch (e) {
      next(e);
    }
  } else {
    res.status(400).send("Request must include password");
  }
};

export const getUserBookmarks = (tracker) => async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId }).lean();
    const bookmarks = await getTorrentsPage({
      ids: user.bookmarks,
      userId: req.userId,
      tracker,
    });
    res.json(bookmarks);
  } catch (e) {
    next(e);
  }
};

const checkForDuplicateUsernames = async () => {
  const users = await User.find({}, 'username');
  const userMap = new Map();
  const duplicates = [];

  users.forEach(user => {
    const lowerUsername = user.username.toLowerCase();
    if (userMap.has(lowerUsername)) {
      duplicates.push({
        original: userMap.get(lowerUsername),
        duplicate: user.username
      });
    } else {
      userMap.set(lowerUsername, user.username);
    }
  });

  return duplicates;
};

const convertUsernamesToLowercase = async () => {
  const users = await User.find({});
  for (const user of users) {
    await User.findByIdAndUpdate(user._id, {
      username: user.username.toLowerCase()
    });
  }
};

export const resendVerificationEmail = (mail) => async (req, res, next) => {
  try {
    const user = await User.findById(req.userId);
    
    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    if (user.emailVerified) {
      res.status(400).send("Email already verified");
      return;
    }

    const emailVerificationValidUntil = Date.now() + 48 * 60 * 60 * 1000; // 48 hours
    const emailVerificationToken = jwt.sign(
      {
        user: user.email,
        validUntil: emailVerificationValidUntil,
      },
      process.env.SQ_JWT_SECRET
    );

    if (mail) {
      await sendVerificationEmail(mail, user.email, emailVerificationToken);
    }

    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};

export const fetchAllUsers = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const searchQuery = req.query.search || '';
    const sortBy = req.query.sortBy || 'created';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    // Build the search filter
    const filter = {};
    if (searchQuery) {
      filter.$or = [
        { username: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ];
    }

    // Determine sort field
    let sortField;
    switch (sortBy) {
      case 'username':
        sortField = 'username';
        break;
      case 'role':
        sortField = 'role';
        break;
      case 'lastSeen':
        sortField = 'lastSeen';
        break;
      case 'created':
      default:
        sortField = 'created';
        break;
    }
    const sortObj = {};
    sortObj[sortField] = sortOrder;

    // Count total documents for pagination info
    const total = await User.countDocuments(filter);

    // Fetch users with pagination and sorting
    const users = await User.find(filter)
      .sort(sortObj)
      .skip(page * limit)
      .limit(limit)
      // ADD LAST SEEN FEATURE
      .select("username email role created banned lastSeen timezone");
      // End of Last Seen Feature

    res.json({
      users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (e) {
    next(e);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    // Only admins can delete users
    if (req.userRole !== "admin") {
      return res.status(403).send("Only administrators can delete users");
    }

    const { username } = req.params;
    
    // Don't allow deleting the admin user
    if (username === "admin") {
      return res.status(403).send("Cannot delete the admin user");
    }

    // Find the user
    const user = await User.findOne({ username });
    
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Delete the user
    await User.deleteOne({ username });
    
    // You might want to also delete related data like comments, torrents, etc.
    // For example:
    // await Comment.deleteMany({ userId: user._id });
    // await Torrent.deleteMany({ uploadedBy: user._id });

    res.status(200).send("User deleted successfully");
  } catch (e) {
    next(e);
  }
};

// ADD LAST SEEN FEATURE
export const updateTimezone = async (req, res, next) => {
  if (!req.body.timezone) {
    return res.status(400).send("Timezone is required");
  }
  try {
    await User.findOneAndUpdate(
      { _id: req.userId },
      { $set: { timezone: req.body.timezone } }
    );
    res.sendStatus(200);
  } catch (e) {
    next(e);
  }
};
// End of Last Seen Feature

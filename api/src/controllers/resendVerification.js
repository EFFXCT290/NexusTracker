import jwt from "jsonwebtoken";
import User from "../schema/user";
import { sendVerificationEmail } from "./user";

export const resendVerification = (mail) => async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.userId }).lean();

    if (!user) {
      res.status(404).send("User not found");
      return;
    }

    if (user.emailVerified) {
      res.status(400).send("Email is already verified");
      return;
    }

    // Create token payload
    const payload = {
      user: user.email,
      validUntil: Date.now() + 48 * 60 * 60 * 1000 // 48 hours
    };

    // Sign token with explicit algorithm
    const emailVerificationToken = jwt.sign(
      payload,
      process.env.SQ_JWT_SECRET,
      { algorithm: 'HS256' }
    );

    // Log token format for debugging (remove in production)
    console.log('Generated token:', emailVerificationToken);

    await sendVerificationEmail(mail, user.email, emailVerificationToken);

    res.sendStatus(200);
  } catch (e) {
    console.error('Token generation error:', e);
    next(e);
  }
}; 

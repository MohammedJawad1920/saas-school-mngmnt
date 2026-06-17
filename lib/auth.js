import { jwtVerify } from "jose";

const textEncoder = new TextEncoder();
const secretKey = textEncoder.encode(process.env.JWT_SECRET);

export const verifyToken = async (token) => {
  if (!token) return null;

  try {
    const jwt = await jwtVerify(token, secretKey);
    return jwt;
  } catch (error) {
    return null;
  }
};

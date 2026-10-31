import bcrypt from "bcryptjs";

const BCRYPT_ROUNDS = 12;

export const hashPassword = password => bcrypt.hash(password, BCRYPT_ROUNDS);

export const verifyPassword = (password, passwordHash) => bcrypt.compare(password, passwordHash);

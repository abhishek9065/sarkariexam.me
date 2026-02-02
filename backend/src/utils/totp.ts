import { authenticator } from 'otplib';
import qrcode from 'qrcode';

import { config } from '../config.js';

authenticator.options = {
  window: 1,
};

export const generateTotpSecret = async (email: string) => {
  const secret = authenticator.generateSecret();
  const issuer = config.totpIssuer || 'SarkariExams Admin';
  const otpauth = authenticator.keyuri(email, issuer, secret);
  const qrCode = await qrcode.toDataURL(otpauth);
  return { secret, otpauth, qrCode };
};

export const verifyTotpCode = (secret: string, code: string): boolean => {
  return authenticator.check(code, secret);
};

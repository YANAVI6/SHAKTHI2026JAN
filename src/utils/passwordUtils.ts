import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export const hashPassword = async (password: string): Promise<string> => {
  console.log('🔐 Hashing password for storage...');
  return bcrypt.hash(password, SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  try {
    console.log('🔐 Verifying password...');
    const result = await bcrypt.compare(password, hash);
    console.log('🔐 Password verification result:', result);
    return result;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

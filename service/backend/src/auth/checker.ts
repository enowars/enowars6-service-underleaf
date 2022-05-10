import User from "./userSchema";
import { compare } from "bcrypt";

export async function checkLogin(
  username: string,
  password: string
): Promise<boolean> {
  const user = await User.findOne({ username });

  if (!user) {
    return false;
  }

  return await compare(password, user.password);
}

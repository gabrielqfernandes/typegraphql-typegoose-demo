import {
  CreateUserInput,
  UserModel,
  UpdateUserInput,
  User,
  CreateUserResult,
  LoginResult,
} from '../schemas/user.schema';
import { ObjectId } from 'mongoose';
import { ApolloError } from 'apollo-server-errors';
import bcrypt from 'bcrypt';

import Context from '../types/context';
import { LoginInput } from '../schemas/user.schema';
import jwt from 'jsonwebtoken';

export class UserService {
  async findAllUsers(): Promise<User[]> {
    return await UserModel.find();
  }

  async findById(id: ObjectId): Promise<User | null> {
    return await UserModel.findById(id);
  }

  async createUser(input: CreateUserInput): Promise<CreateUserResult> {
    const secret = process.env.JWT_ACCESS_SECRET as string;
    const expiresIn = '15min';

    const user = await UserModel.create(input);

    const accessToken = jwt.sign({ userId: user?._id }, secret, { expiresIn });

    return {
      user,
      accessToken,
      expiresIn,
    };
  }

  async login(input: LoginInput): Promise<LoginResult> {
    const result = new LoginResult();
    
    result.expiresIn = '15min';
    
    const accessSecret = process.env.JWT_ACCESS_SECRET || '';

    const user = await UserModel.find().findByEmail(input.email);

    if (!user) throw new ApolloError('Invalid username');

    const isPasswordValid = await bcrypt.compare(input.password, user.password);

    if (!isPasswordValid) throw new ApolloError('Invalid password');

    result.accessToken = jwt.sign({ userId: user._id }, accessSecret, {
      expiresIn: result.expiresIn,
    });

    return result;
  }

  async updateUser(input: UpdateUserInput): Promise<User | null> {
    return await UserModel.findByIdAndUpdate(
      input._id,
      { $set: { ...input } },
      { new: true }
    );
  }

  async deleteUser(id: ObjectId, ctx: Context) {
    let deleted = true;
    return await UserModel.findByIdAndDelete(id).exec((err, item) => {
      if (err) throw new ApolloError('Err tryng to delete user');
      if (!item) {
        ctx.res.statusCode = 404;
        deleted = false;
        return deleted;
      }
      return deleted;
    });
  }
}
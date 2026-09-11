import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Model } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from '../schemas/user.schema.js';
import { SignupDto } from './dto/signup.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async signup(signupDto: SignupDto) {
    const { name, email, password } = signupDto;

    const existingUser = await this.userModel.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new ConflictException('An account with this email already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await this.userModel.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      provider: 'local',
    });

    return this.generateToken(user);
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.generateToken(user);
  }

  async validateGoogleUser(googleUser: { googleId: string; email: string; name: string; avatarUrl?: string }) {
    let user = await this.userModel.findOne({
      $or: [{ googleId: googleUser.googleId }, { email: googleUser.email.toLowerCase() }],
    });

    if (!user) {
      user = await this.userModel.create({
        name: googleUser.name,
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.googleId,
        avatarUrl: googleUser.avatarUrl,
        provider: 'google',
      });
    } else if (!user.googleId) {
      user.googleId = googleUser.googleId;
      if (googleUser.avatarUrl && !user.avatarUrl) {
        user.avatarUrl = googleUser.avatarUrl;
      }
      await user.save();
    }

    return this.generateToken(user);
  }

  private generateToken(user: UserDocument) {
    const payload = { sub: user._id.toString(), email: user.email };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        provider: user.provider,
      },
    };
  }
}

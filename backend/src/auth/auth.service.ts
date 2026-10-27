import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';
import { compare, hashSync } from 'bcryptjs';
import { JwtPayload } from '../common/types/auth-user.types';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { BCRYPT_ROUNDS, toUserResponse, UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

// hash de una clave cualquiera, para comparar aunque el usuario no exista
const DUMMY_HASH = hashSync('usuario-inexistente', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmail(dto.email);
    // se compara igual para no revelar por tiempo de respuesta si el email existe
    const valid = await compare(dto.password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !valid) throw new UnauthorizedException('Credenciales inválidas');
    return this.buildResponse(toUserResponse(user));
  }

  async register(dto: RegisterDto): Promise<AuthResponseDto> {
    const user = await this.usersService.create({ ...dto, role: Role.USER });
    return this.buildResponse(user);
  }

  me(userId: string): Promise<UserResponseDto> {
    return this.usersService.findById(userId);
  }

  private async buildResponse(user: UserResponseDto): Promise<AuthResponseDto> {
    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get<number>('JWT_EXPIRES_IN', 3600),
      user,
    };
  }
}

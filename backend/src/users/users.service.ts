import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Role, User } from '@prisma/client';
import { hash } from 'bcryptjs';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { Paginated } from '../common/utils/paginated';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

export const BCRYPT_ROUNDS = 10;

export function toUserResponse(user: User): UserResponseDto {
  const { id, email, name, role, createdAt } = user;
  return { id, email, name, role, createdAt };
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findById(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return toUserResponse(user);
  }

  async findAll(query: PaginationQueryDto): Promise<Paginated<UserResponseDto>> {
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.user.count(),
    ]);
    return Paginated.of(users.map(toUserResponse), total, query.page, query.limit);
  }

  async create(dto: CreateUserDto): Promise<UserResponseDto> {
    const exists = await this.findByEmail(dto.email);
    if (exists) throw new ConflictException('Ya existe un usuario con ese email');

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        name: dto.name,
        role: dto.role ?? Role.USER,
        passwordHash: await hash(dto.password, BCRYPT_ROUNDS),
      },
    });
    return toUserResponse(user);
  }
}

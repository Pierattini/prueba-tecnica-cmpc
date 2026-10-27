import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from '../../users/dto/create-user.dto';

// el registro publico siempre crea usuarios con rol USER
export class RegisterDto extends OmitType(CreateUserDto, ['role'] as const) {}

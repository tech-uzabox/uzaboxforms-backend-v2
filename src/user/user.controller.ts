import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChangeUserPasswordDto } from './dto/change-password.dto';
import { AuthService } from '../auth/auth.service';

@ApiTags('Users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch(':id/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  changePassword(
    @Param('id') id: string,
    @Body() changePasswordDto: ChangeUserPasswordDto,
    @Request() req,
  ) {
    if (req.user.sub !== id) {
      // Ensure the user is changing their own password
      // Or implement role-based access control for admins
      throw new UnauthorizedException();
    }
    return this.userService.changePassword(
      id,
      changePasswordDto.oldPassword,
      changePasswordDto.newPassword,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Patch(':id/unlock')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  unlockAccount(@Param('id') id: string, @Request() req) {
    return this.authService.unlockAccount(id, req.user.sub);
  }
}

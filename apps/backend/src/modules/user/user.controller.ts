import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { z } from 'zod';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../common/guards/roles.guard';
import { UserRole, createUserSchema, updateUserSchema, PaginationQuery } from '@secure-cbt/shared';

type CreateUserDto = z.infer<typeof createUserSchema>;
type UpdateUserDto = z.infer<typeof updateUserSchema>;

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'List all users' })
  async findAll(@Query() query: PaginationQuery) {
    const data = await this.userService.findAll(query);
    return { success: true, message: 'Users retrieved', ...data };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Get user by ID' })
  async findOne(@Param('id') id: string) {
    const data = await this.userService.findById(id);
    return { success: true, message: 'User retrieved', data };
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create new user' })
  async create(@Body() body: CreateUserDto) {
    const data = await this.userService.create(body);
    return { success: true, message: 'User created', data };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update user' })
  async update(@Param('id') id: string, @Body() body: UpdateUserDto) {
    const data = await this.userService.update(id, body);
    return { success: true, message: 'User updated', data };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Soft delete user' })
  async remove(@Param('id') id: string) {
    const data = await this.userService.remove(id);
    return { success: true, message: 'User deleted', data };
  }
}

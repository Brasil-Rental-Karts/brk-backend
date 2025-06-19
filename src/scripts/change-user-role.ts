import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../models/user.entity';
import { UserService } from '../services/user.service';
import { UserRepository } from '../repositories/user.repository';
import { MemberProfile } from '../models/member-profile.entity';
import { MemberProfileRepository } from '../repositories/member-profile.repository';
import * as path from 'path';

// Função para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Função para validar role
const isValidRole = (role: string): boolean => {
  return Object.values(UserRole).includes(role as UserRole);
};

// This script changes the role of a user
// Usage: npx ts-node src/scripts/change-user-role.ts <user-email> <new-role>
// Example: npx ts-node src/scripts/change-user-role.ts 'test@test.com' 'admin'

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'brk-app',
  synchronize: false,
  logging: ['query', 'error'],
  entities: [path.join(__dirname, '/../models/**/*.entity{.ts,.js}')],
  migrations: [path.join(__dirname, '/../migrations/*{.ts,.js}')],
  subscribers: [],
  migrationsTableName: 'migrations',
});

async function changeUserRole() {
  const email = process.argv[2];
  const newRole = process.argv[3] as UserRole;

  if (!email || !newRole) {
    console.error('Usage: npx ts-node src/scripts/change-user-role.ts <user-email> <new-role>');
    process.exit(1);
  }

  const validRoles = Object.values(UserRole);
  if (!validRoles.includes(newRole)) {
    console.error(`Invalid role: ${newRole}. Valid roles are: ${validRoles.join(', ')}`);
    process.exit(1);
  }

  try {
    // Initialize datasource
    await AppDataSource.initialize();
    
    // Get user repository
    const userRepository = new UserRepository(AppDataSource.getRepository(User));
    const memberProfileRepository = new MemberProfileRepository(AppDataSource.getRepository(MemberProfile));
    
    // Create user service
    const userService = new UserService(userRepository, memberProfileRepository);
    
    // Find user by email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      console.error(`User with email ${email} not found`);
      process.exit(1);
    }

    // Exibir informações atuais
    console.log('Usuário encontrado:');
    console.log(`ID: ${user.id}`);
    console.log(`Nome: ${user.name}`);
    console.log(`Email: ${user.email}`);
    console.log(`Role atual: ${user.role}`);

    // Alterar a role
    if (user.role === newRole) {
      console.log(`O usuário já possui a role ${newRole}`);
      process.exit(0);
    }

    // Confirmar alteração
    console.log(`Alterando role de ${user.role} para ${newRole}...`);
    
    // Use the UserService method to update the role safely
    await userService.changeUserRole(user.id, newRole);
    
    console.log('Role alterada com sucesso!');
    
    // Buscar o usuário atualizado para mostrar as informações corretas
    const refreshedUser = await userService.findById(user.id);
    console.log(`Usuário ${refreshedUser?.name} agora tem a role: ${refreshedUser?.role}`);

  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  } finally {
    // Fechar conexão com o banco de dados
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
      console.log('Conexão com o banco de dados fechada');
    }
  }
}

// Executar o script
changeUserRole(); 
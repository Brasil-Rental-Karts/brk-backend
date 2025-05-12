import 'reflect-metadata';
import { AppDataSource } from '../config/database.config';
import { User, UserRole } from '../models/user.entity';
import { UserRepository } from '../repositories/user.repository';
import { UserService } from '../services/user.service';

// Função para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Função para validar role
const isValidRole = (role: string): boolean => {
  return Object.values(UserRole).includes(role as UserRole);
};

async function changeUserRole() {
  // Obter argumentos da linha de comando
  const args = process.argv.slice(2);
  const email = args[0];
  const newRole = args[1] as UserRole;

  // Validar argumentos
  if (!email || !newRole) {
    console.error('Uso: npm run change-role <email> <role>');
    console.error('Roles disponíveis:', Object.values(UserRole).join(', '));
    process.exit(1);
  }

  if (!isValidEmail(email)) {
    console.error('Email inválido');
    process.exit(1);
  }

  if (!isValidRole(newRole)) {
    console.error('Role inválida. Roles disponíveis:', Object.values(UserRole).join(', '));
    process.exit(1);
  }

  try {
    // Inicializar conexão com o banco de dados
    await AppDataSource.initialize();
    console.log('Conexão com o banco de dados estabelecida');

    // Inicializar repositório e serviço
    const userRepository = new UserRepository(AppDataSource.getRepository(User));
    const userService = new UserService(userRepository);

    // Buscar usuário pelo email
    const user = await userService.findByEmail(email);
    if (!user) {
      console.error(`Usuário com email ${email} não encontrado`);
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
    
    // Atualizar apenas o campo role, sem afetar os outros campos
    const updatedUser = await userRepository.update(user.id, { role: newRole });
    
    console.log('Role alterada com sucesso!');
    
    // Buscar o usuário atualizado para mostrar as informações corretas
    const refreshedUser = await userService.findById(user.id);
    console.log(`Usuário ${refreshedUser?.name} agora tem a role: ${refreshedUser?.role}`);

  } catch (error) {
    console.error('Erro ao alterar a role do usuário:', error);
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
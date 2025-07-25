import 'reflect-metadata';

import bcrypt from 'bcrypt';

import { AppDataSource } from '../config/database.config';
import { User } from '../models/user.entity';
import { UserRepository } from '../repositories/user.repository';

// Função para validar email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Função para validar senha
const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

async function resetPassword() {
  // Obter argumentos da linha de comando
  const args = process.argv.slice(2);
  const email = args[0];
  const newPassword = args[1];

  // Validar argumentos
  if (!email || !newPassword) {
    console.error('Uso: npm run reset-password <email> <nova-senha>');
    process.exit(1);
  }

  if (!isValidEmail(email)) {
    console.error('Email inválido');
    process.exit(1);
  }

  if (!isValidPassword(newPassword)) {
    console.error('Senha inválida: A senha deve ter pelo menos 6 caracteres');
    process.exit(1);
  }

  try {
    // Inicializar conexão com o banco de dados
    await AppDataSource.initialize();

    // Inicializar repositório
    const userRepository = new UserRepository(
      AppDataSource.getRepository(User)
    );

    // Buscar usuário pelo email
    const user = await userRepository.findByEmail(email);
    if (!user) {
      console.error(`Usuário com email ${email} não encontrado`);
      process.exit(1);
    }

    // Hash da nova senha
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Atualizar apenas o campo senha
    await userRepository.update(user.id, { password: hashedPassword });
  } catch (error) {
    console.error('Erro ao redefinir a senha:', error);
  } finally {
    // Fechar conexão com o banco de dados
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

// Executar o script
resetPassword();

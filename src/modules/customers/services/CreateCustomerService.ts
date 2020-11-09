import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import Customer from '../infra/typeorm/entities/Customer';
import ICustomersRepository from '../repositories/ICustomersRepository';

interface IRequest {
  name: string;
  email: string;
}

@injectable()
class CreateCustomerService {
  constructor(
    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ name, email }: IRequest): Promise<Customer> {
    const existingUser = await this.customersRepository.findByEmail(email);

    if (existingUser) {
      throw new AppError('User already existis');
    }

    const user = await this.customersRepository.create({
      name,
      email,
    });

    return user;
  }
}

export default CreateCustomerService;

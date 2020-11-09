import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not exists');
    }

    const existingProducts = await this.productsRepository.findAllById(
      products,
    );

    if (existingProducts.length !== products.length) {
      throw new AppError('All products must exists');
    }

    const productsWithNoQuantityAvaible = products.filter(product => {
      const existentProduct = existingProducts.find(p => p.id === product.id);
      if (!existentProduct) return true;

      return existentProduct.quantity < product.quantity;
    });

    if (productsWithNoQuantityAvaible.length) {
      throw new AppError('A product has no quantity enough');
    }

    const serializedProducts = products.map(product => {
      const existentProductIndex = existingProducts.findIndex(
        p => p.id === product.id,
      );
      const existentProduct = existingProducts[existentProductIndex];

      return {
        product_id: product.id,
        quantity: product.quantity,
        price: existentProduct.price,
      };
    });

    const order = await this.ordersRepository.create({
      customer,
      products: serializedProducts,
    });

    const updatedProductsQuantity = products.map(product => ({
      id: product.id,
      quantity:
        existingProducts.filter(p => p.id === product.id)[0].quantity -
        product.quantity,
    }));

    await this.productsRepository.updateQuantity(updatedProductsQuantity);

    return order;
  }
}

export default CreateOrderService;

import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { faker } from '@faker-js/faker';
import { StatusCodes } from 'http-status-codes';

describe('ServeRest API', () => {
  let token = '';
  let idUsuario = '';
  let idProduto = '';
  let emailUsuario = '';
  //const timeout = 60000;
  const p = pactum;
  const rep = SimpleReporter;
  const baseUrl = 'https://serverest.dev';

  p.request.setDefaultTimeout(60000);

  beforeAll(async () => {
    p.reporter.add(rep);

    idUsuario = await p
      .spec()
      .post(`${baseUrl}/usuarios`)
      .withHeaders('monitor', false)
      .withJson({
        nome: faker.internet.userName(),
        email: faker.internet.email(),
        password: '123456789',
        administrador: 'true'
      })
      .expectStatus(StatusCodes.CREATED)
      .returns('_id');

    emailUsuario = await p
      .spec()
      .get(`${baseUrl}/usuarios/${idUsuario}`)
      .withHeaders('monitor', false)
      .expectStatus(StatusCodes.OK)
      .returns('email');
  });

  beforeEach(async () => {
    token = await p
      .spec()
      .post(`${baseUrl}/login`)
      .withHeaders('monitor', false)
      .withJson({
        email: `${emailUsuario}`,
        password: '123456789'
      })
      .expectStatus(StatusCodes.OK)
      .expectBodyContains('Login realizado com sucesso')
      .expectJsonSchema({
        type: 'object'
      })
      .returns('authorization');
  });

  describe('Validações Login', () => {
    it('Login inválido', async () => {
      await p
        .spec()
        .post(`${baseUrl}/login`)
        .withHeaders('monitor', false)
        .withJson({
          email: faker.internet.email(),
          password: faker.random.numeric(5)
        })
        .expectStatus(StatusCodes.UNAUTHORIZED)
        .expectBodyContains('Email e/ou senha inválidos');
    });
  });

  describe('Produtos', () => {
    it('Cadastro um novo produto', async () => {
      idProduto = await p
        .spec()
        .post(`${baseUrl}/produtos`)
        .withHeaders('Authorization', token)
        .withHeaders('monitor', false)
        .withJson({
          nome: faker.commerce.productName(),
          preco: 500,
          descricao: faker.commerce.productDescription(),
          quantidade: 10
        })
        .expectStatus(StatusCodes.CREATED)
        .expectBodyContains('Cadastro realizado com sucesso')
        .expectJsonSchema({
          type: 'object',
          properties: {
            message: {
              type: 'string'
            },
            _id: {
              type: 'string'
            }
          },
          required: ['message', '_id']
        })
        .returns('_id');
    });
    it('Busca o novo produto cadastrado', async () => {
      await p
        .spec()
        .get(`${baseUrl}/produtos/${idProduto}`)
        .withHeaders('Authorization', token)
        .withHeaders('monitor', false)
        .expectStatus(StatusCodes.OK);
    });
    it('Produto sem token válido', async () => {
      await p
        .spec()
        .post(`${baseUrl}/produtos`)
        .withHeaders('monitor', false)
        .withJson({
          nome: faker.commerce.productName(),
          preco: 500,
          descricao: faker.commerce.productDescription(),
          quantidade: 10
        })
        .expectStatus(StatusCodes.UNAUTHORIZED)
        .expectBodyContains(
          'Token de acesso ausente, inválido, expirado ou usuário do token não existe mais'
        );
    });
  });

  describe('Carrinhos', () => {
    it('Adiciona um novo carrinho', async () => {
      await p
        .spec()
        .post(`${baseUrl}/carrinhos`)
        .withHeaders('Authorization', token)
        .withHeaders('monitor', false)
        .withJson({
          produtos: [
            {
              idProduto: `${idProduto}`,
              quantidade: 10
            }
          ]
        })
        .expectStatus(StatusCodes.CREATED)
        .expectBodyContains('Cadastro realizado com sucesso');
    });
    it('Carrinho inválido', async () => {
      await p
        .spec()
        .get(`${baseUrl}/carrinhos/qbMqntef4iTO1wWgg`)
        .withHeaders('Authorization', token)
        .withHeaders('monitor', false)
        .expectStatus(StatusCodes.BAD_REQUEST)
        .expectBodyContains('Carrinho não encontrado');
    });
    it('Conclui a compra e exclui o carrinho', async () => {
      await p
        .spec()
        .delete(`${baseUrl}/carrinhos/concluir-compra`)
        .withHeaders('Authorization', token)
        .withHeaders('monitor', false)
        .expectStatus(StatusCodes.OK)
        .expectBodyContains('Registro excluído com sucesso');
    });
  });

  afterAll(() => p.reporter.end());
});

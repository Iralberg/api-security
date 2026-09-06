import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
//libs
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { nanoid } from 'nanoid'
import mongoose from 'mongoose'
import bcript from 'bcryptjs'
import jwt from 'jsonwebtoken'
//models
import User from './models/users.js'
import Product from './models/products.js'
import Category from "./models/category.js";
import Client from "./models/clients.js";
import Sale from './models/sale.js'
import counterVenda from "./models/countVenda.js";
//config
dotenv.config()
const app = express()
app.use(cors())
app.use(express.json())


//conexão com o banco de dados
const URI = process.env.URI
mongoose.connect(URI)
  .then(() => console.log('Conectado ao MongoDB'))
  .catch((error) => console.error('Erro ao conectar ao MongoDB:', error))




// fazer Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email })
  if (!user) {
    return res.status(404).json({ message: 'email ou senha incorretos' })
  }
  //check password
  const checkpassword = await bcript.compare(password, user.password)
  if (!checkpassword) {
    return res.status(400).json({ message: 'email ou senha incorretos' })
  }
  //remover password
  const obj = user.toObject()
  delete obj.password
  try {

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.SECRET, { expiresIn: '1h' })
    res.status(200).json({ message: 'Login realizado com sucesso', user: obj, token })

  } catch (erro) {
    res.status(500).json({ message: 'Erro ao gerar token' })
  }
})

//listar users
app.get('/users', checkToken, authorize('admin', 'user'), async (req, res) => {
  try {
    const users = await User.find().select('-password')
    res.status(200).json(users)
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar usuários' })
  }
})


//Perfil
app.get('/perfil', checkToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar perfil' });
  }
});
//editar perfil
app.put('/perfil', checkToken, async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Email é obrigatório' });
    }
    if (!name) {
      return res.status(400).json({ message: 'Nome é obrigatório' });
    }

    const verifyEmail = await User.findOne({ email });
    if (verifyEmail && verifyEmail._id.toString() !== req.userId) {
      return res.status(400).json({ message: 'Email já está em uso' });
    }

    const user = await User.findByIdAndUpdate(req.userId, { name, email }, { new: true }).select('-password');
    res.status(200).json({ message: 'Perfil atualizado com sucesso', user });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar perfil' });
  }
});
//editar password
app.put('/perfil/password', checkToken, async (req, res) => {

  try {
    const { password, newpassword } = req.body;

    if (!password || !newpassword) {
      return res.status(400).json({ message: 'Campos obrigatórios não preenchidos' });
    }
    // busc user
    const user = await User.findById(req.userId);

    // verifica a senha
    const isMatch = await bcript.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Senha atual incorreta' });
    }
    // criar um hash da nova senha
    const hashedPassword = await bcript.hash(newpassword, 12);
    await User.findByIdAndUpdate(req.userId, { password: hashedPassword });

    res.status(200).json({ message: 'Senha atualizada com sucesso' });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar senha' });
  }
});


//cadastro de users
app.post('/auth/register', checkToken, authorize('admin'), async (req, res) => {
  const { name, email, password, confirmpassword, role } = req.body
  const existingUser = await User.findOne({ email })
  if (existingUser) {
    return res.status(400).json({ message: 'Email está em uso, use outro email' })
  }
  if (password !== confirmpassword) {
    return res.status(400).json({ message: 'As senhas não coincidem' })
  }
  if (!name) {
    return res.status(400).json({ message: 'Nome é obrigatório' })
  }
  if (!email) {
    return res.status(400).json({ message: 'Email é obrigatório' })
  }
  if (!password) {
    return res.status(400).json({ message: 'Senha é obrigatória' })
  }
  if (!role) {
    return res.status(400).json({ message: 'Cargo é obrigatório' })
  }
  try {
    const hashedPassword = await bcript.hash(password, 12)
    const newUser = {
      role,
      name,
      email,
      password: hashedPassword
    }
    const user = await User.create(newUser)
    res.status(201).json({ message: 'Usuário cadastrado com sucesso!', user: user })
  } catch (error) {
    res.status(500).json({ message: 'Erro ao cadastrar usuário' })
  }
})
  /
  //editar users
  app.put('/users/:id', checkToken, authorize('admin'), async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, role } = req.body;

      if (!name) {
        return res.status(400).json({ message: 'Nome é obrigatório' });
      }

      if (!email) {
        return res.status(400).json({ message: 'Email é obrigatório' });
      }

      if (!role) {
        return res.status(400).json({ message: 'Cargo é obrigatório' });
      }

      const user = await User.findById(id);

      if (!user) {
        return res.status(404).json({ message: 'Usuário não encontrado' });
      }

      const emailExists = await User.findOne({
        email,
        _id: { $ne: id }
      });

      if (emailExists) {
        return res.status(400).json({
          message: 'Email já está em uso.'
        });
      }

      user.name = name;
      user.email = email;
      user.role = role;

      await user.save();

      res.status(200).json({
        message: 'Usuário atualizado com sucesso',
        user
      });

    } catch (error) {
      res.status(500).json({
        message: 'Erro ao atualizar usuário'
      });
    }
  });
//deletar usuario
app.delete('/users/:id', checkToken, authorize('admin'), async (req, res) => {
  const { id } = req.params
  const user = await User.findById(id)

  if (!user) {
    return res.status(404).json({ message: 'Usuário não encontrado' })
  }
  await User.findByIdAndDelete(id)
  res.status(200).json({ message: 'Usuário deletado com sucesso' })
})

//criar clientes
app.post('/clients', checkToken, authorize('admin'), async (req, res) => {
  const { name, phone, email, address, active } = req.body;

  if (!name || !phone || !email || !address) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
  }
  const ExistName = await Client.findOne({ name });
  if (ExistName) {
    return res.status(400).json({ message: 'nome já esta em uso' });
  }
  try {
    const newClient = { name, phone, email, address, active };
    const client = await Client.create(newClient);
    res.status(201).json({ message: 'Cliente cadastrado com sucesso!', client });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao cadastrar cliente' });
  }
});
//listar clientes
app.get('/clients', checkToken, async (req, res) => {
  try {
    const clients = await Client.find();
    res.status(200).json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar clientes' });
  }
});
//editar clientes
app.put('/clients/:id', checkToken, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address, active } = req.body;

  if (!name || !phone || !email || !address) {
    return res.status(400).json({ message: 'Todos os campos são obrigatórios' });
  }
  const client = await Client.findById(id);
  if (!client) {
    return res.status(404).json({ message: 'Cliente não encontrado' });
  }
  try {


    const existClient = await Client.findOne({ name, _id: { $ne: id } })
    if (existClient) {
      return res.status(400).json({ message: 'Nome já está em uso' });
    }
    const updatedClient = await Client.findByIdAndUpdate(
      id,
      { name, phone, email, address, active },
      { new: true }
    );
    res.status(200).json({ message: 'Cliente atualizado com sucesso!', client: updatedClient });
  } catch (error) {
    res.status(500).json({ message: 'Erro ao atualizar cliente', error: error.message });
  }
});
//criar produtos
app.post('/products', checkToken, authorize('admin'), async (req, res) => {
  const { name, category, price, stock, sku } = req.body
  if (
    name.trim() === '' ||
    category.trim() === '' ||
    sku.trim() === '' ||
    price === undefined ||
    stock === undefined
  ) {
    return res.status(400).json({
      message: 'Todos os campos são obrigatórios'
    })
  }
  try {
    const newProduct = {
      name,
      category,
      price,
      stock,
      sku
    }
    const product = await Product.create(newProduct)
    res.status(201).json({ message: 'Produto cadastrado com sucesso!', product: product })
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: 'Erro ao cadastrar produto',
      error: error.message
    });
  }
})
//listar produtos

app.get('/products', checkToken, async (req, res) => {
  try {
    const products = await Product.find().populate('category');
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar produtos' });
  }
});
//editar produtos

app.put('/products/:id', checkToken, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock, sku } = req.body;

  if (
    name.trim() === '' ||
    category === false ||
    sku.trim() === '' ||
    price === undefined ||
    stock === undefined
  ) {
    return res.status(400).json({
      message: 'Todos os campos são obrigatórios'
    });
  }

  try {
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { name, category, price, stock, sku },
      { new: true }
    );
    res.status(200).json({ message: 'Produto atualizado com sucesso!', product: updatedProduct });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erro ao atualizar produto',
      error: error.message
    });
  }
});

//deleter produtos
app.delete('/products/:id', checkToken, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: 'Produto deletado com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erro ao deletar produto',
      error: error.message
    });
  }
});

//criar categorias
app.post('/categories', checkToken, authorize('admin'), async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
  }

  try {
    const newCategory = await Category.create({ name });
    res.status(201).json({ message: 'Categoria criada com sucesso!', category: newCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erro ao criar categoria',
      error: error.message
    });
  }
});
//listar categorias
app.get("/categories", checkToken, async (req, res) => {
  try {

    const categories = await Category.aggregate([
      {
        $lookup: {
          from: "products",
          let: {
            categoryId: "$_id"
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$category", "$$categoryId"]
                }
              }
            },
            {
              $count: "total"
            }
          ],
          as: "productCount"
        }
      },
      {
        $addFields: {
          totalProducts: {
            $ifNull: [
              {
                $arrayElemAt: ["$productCount.total", 0]
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          productCount: 0
        }
      }
    ]);

    return res.status(200).json(categories);

  } catch (err) {

    return res.status(500).json({
      error: err.message
    });

  }
});
//editar categoria
app.put('/categories/:id', checkToken, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Nome da categoria é obrigatório' });
    }
    const category = Category.findById(id)
    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }
    const existCategory = await Category.findOne({ name, _id: { $ne: id } })
    if (existCategory) {
      return res.status(400).json({ message: 'Nome da categoria já existe' });
    }
    const updatedCategory = await Category.findByIdAndUpdate(
      id,
      { name },
      { new: true }
    );
    res.status(200).json({ message: 'Categoria atualizada com sucesso!', category: updatedCategory });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erro ao atualizar categoria',
      error: error.message
    });
  }
});

// deletar categoria
app.delete('/categories/:id', checkToken, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    await Category.findByIdAndDelete(id);
    res.status(200).json({ message: 'Categoria deletada com sucesso!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erro ao deletar categoria',
      error: error.message
    });
  }
});

// filtro de faturamento
app.get("/sales/summary", async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: "startDate e endDate são obrigatórios"
      });
    }

    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T23:59:59.999`);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        message: "Data inválida"
      });
    }

    if (start > end) {
      return res.status(400).json({
        message: "A data inicial não pode ser maior que a data final"
      });
    }

    const result = await Sale.aggregate([
      {
        $match: {
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      {
        $group: {
          _id: "$status",
          total: {
            $sum: "$total"
          }
        }
      }
    ]);

    let faturamentoTotal = 0;
    let recebido = 0;
    let aReceber = 0;
    let cancelado = 0;

    result.forEach((item) => {
      if (item._id === "Pago") {
        faturamentoTotal += item.total;
        recebido += item.total;
      }

      if (item._id === "Pendente") {
        faturamentoTotal += item.total;
        aReceber += item.total;
      }

      if (item._id === "Cancelado") {
        cancelado += item.total;
      }
    });

    res.json({
      periodo: {
        startDate,
        endDate
      },
      faturamentoTotal,
      recebido,
      aReceber,
      cancelado
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Erro ao buscar resumo financeiro",
      error: error.message
    });
  }
});

//criar sale

app.post('/sales',checkToken,authorize('admin'), async (req, res) => {
    const {
        client,
        products,
        payments = [],
        total
    } = req.body;

    if (!client || !products || total === undefined) {
        return res.status(400).json({
            message: 'Cliente, produtos e total são obrigatórios.'
        });
    }

    try {

        // 1. Verifica estoque
        for (const item of products) {

            const product = await Product.findById(item.product);

            if (!product) {
                return res.status(404).json({
                    message: 'Produto não encontrado.'
                });
            }

            if (product.stock < item.quantity) {
                return res.status(400).json({
                    message: `Estoque insuficiente para ${product.name}.`
                });
            }
        }

        // 2. Calcula o valor já pago
        const paidAmount = payments.reduce(
            (totalPaid, payment) => totalPaid + payment.amount,
            0
        );

        // 3. Impede pagamento maior que o total
        if (paidAmount > total) {
            return res.status(400).json({
                message: 'O valor pago não pode ser maior que o total da venda.'
            });
        }

        // 4. Calcula o valor restante
        const remainingAmount = total - paidAmount;

        // 5. Define o status automaticamente
        let status;

        if (paidAmount === 0) {
            status = 'Pendente';
        } else if (paidAmount < total) {
            status = 'Parcial';
        } else {
            status = 'Pago';
        }

        // 6. Gera número da venda
        const numberVenda = await getNextSequence("sale");

        // 7. Cria a venda
        const sale = await Sale.create({
            client,
            products,
            total,
            payments,
            paidAmount,
            remainingAmount,
            status,
            numberVenda
        });

        // 8. Atualiza o estoque
        for (const item of products) {

            await Product.findByIdAndUpdate(
                item.product,
                {
                    $inc: {
                        stock: -item.quantity
                    }
                }
            );
        }

        // 9. Retorna a venda criada
        return res.status(201).json({
            message: 'Venda cadastrada com sucesso!',
            sale
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: 'Erro ao cadastrar venda',
            error: error.message
        });
    }
});




//listar sales
app.get('/sales',checkToken,authorize('admin'), async (req, res) => {
  try {

    const sales = await Sale.find().sort({ createdAt: -1 }).populate('client').populate('products.product');
    res.status(200).json(sales);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erro ao listar vendas',
      error: error.message
    });
  }
});

//listar sale
app.get('/sale/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sale = await Sale.findById(id).populate('client').populate('products.product');
    if (!sale) {
      return res.status(404).json({ message: 'Venda não encontrada' });
    }
    res.status(200).json(sale);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: 'Erro ao listar venda',
      error: error.message
    });
  }
});

//registrar pagamento
app.post('/sales/:id/payments', async (req, res) => {
    const { id } = req.params;
    const { amount, method } = req.body;

    if (amount === undefined || amount <= 0) {
        return res.status(400).json({
            message: 'O valor do pagamento deve ser maior que zero.'
        });
    }

    if (!method) {
        return res.status(400).json({
            message: 'Método de pagamento é obrigatório.'
        });
    }

    try {
        const sale = await Sale.findById(id);

        if (!sale) {
            return res.status(404).json({
                message: 'Venda não encontrada.'
            });
        }

        if (sale.status === 'Cancelado') {
            return res.status(400).json({
                message: 'Não é possível adicionar pagamento a uma venda cancelada.'
            });
        }
        if(sale.remainingAmount===0){
          return res.status(400).json({
            message: 'Esta venda já está paga.'
          })
        }
        if (amount > sale.remainingAmount) {
            return res.status(400).json({
                message: 'O valor do pagamento é maior que o valor restante da venda.'
            });
        }

        sale.payments.push({
            amount,
            method
        });

        sale.paidAmount += amount;
        sale.remainingAmount = sale.total - sale.paidAmount;

        if (sale.paidAmount === 0) {
            sale.status = 'Pendente';
        } else if (sale.paidAmount < sale.total) {
            sale.status = 'Parcial';
        } else {
            sale.status = 'Pago';
            sale.remainingAmount = 0;
        }

        await sale.save();

        return res.status(200).json({
            message: 'Pagamento registrado com sucesso!',
            sale
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            message: 'Erro ao registrar pagamento.',
            error: error.message
        });
    }
});


//pagamento cancelado

app.patch('/sales/:saleId/payments/:paymentId/refund', async (req, res) => {
    const { saleId, paymentId } = req.params;

    try {
        const sale = await Sale.findById(saleId);

        if (!sale) {
            return res.status(404).json({
                message: 'Venda não encontrada.'
            });
        }

        // Não permite estornar pagamento de venda cancelada
        if (sale.status === 'Cancelado') {
            return res.status(400).json({
                message: 'Não é possível estornar pagamento de uma venda cancelada.'
            });
        }

        // Procura o pagamento
        const payment = sale.payments.id(paymentId);

        if (!payment) {
            return res.status(404).json({
                message: 'Pagamento não encontrado.'
            });
        }

        // Verifica se já foi estornado
        if (payment.status === 'Estornado') {
            return res.status(400).json({
                message: 'Este pagamento já foi estornado.'
            });
        }

        // Marca o pagamento como estornado
        payment.status = 'Estornado';

        // Recalcula os pagamentos confirmados
        const paidAmount = sale.payments
            .filter(payment => payment.status === 'Confirmado')
            .reduce((total, payment) => {
                return total + payment.amount;
            }, 0);

        // Atualiza os valores da venda
        sale.paidAmount = paidAmount;

        sale.remainingAmount = sale.total - paidAmount;

        // Atualiza o status da venda
        if (paidAmount === 0) {
            sale.status = 'Pendente';
        } else if (paidAmount < sale.total) {
            sale.status = 'Parcial';
        } else {
            sale.status = 'Pago';
            sale.remainingAmount = 0;
        }

        await sale.save();

        return res.status(200).json({
            message: 'Pagamento estornado com sucesso!',
            sale
        });

    } catch (error) {

        console.error(error);

        return res.status(500).json({
            message: 'Erro ao estornar pagamento.',
            error: error.message
        });
    }
});


//compra cancelada

app.patch('/sales/:id/cancel', async (req, res) => {
    const { id } = req.params;

    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        // Busca a venda
        const sale = await Sale.findById(id).session(session);

        if (!sale) {
            await session.abortTransaction();

            return res.status(404).json({
                message: 'Venda não encontrada.'
            });
        }

        // Verifica se já está cancelada
        if (sale.status === 'Cancelado') {
            await session.abortTransaction();

            return res.status(400).json({
                message: 'Esta venda já foi cancelada.'
            });
        }

        // Devolve os produtos ao estoque
        for (const item of sale.products) {

            const product = await Product.findById(item.product)
                .session(session);

            if (!product) {
                await session.abortTransaction();

                return res.status(404).json({
                    message: `Produto ${item.product} não encontrado.`
                });
            }

            product.stock += item.quantity;

            await product.save({ session });
        }

        // Cancela a venda
        sale.status = 'Cancelado';

        await sale.save({ session });

        // Confirma todas as alterações
        await session.commitTransaction();

        return res.status(200).json({
            message: 'Venda cancelada com sucesso.',
            sale
        });

    } catch (error) {

        // Desfaz tudo caso alguma operação falhe
        await session.abortTransaction();

        console.error(error);

        return res.status(500).json({
            message: 'Erro ao cancelar venda.',
            error: error.message
        });

    } finally {

        // Encerra a sessão
        await session.endSession();
    }
});



//validar acesso
app.get('/auth/validate', checkToken, async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  res.status(200).json({ authenticated: true, user })
})

//Checar o token
function checkToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ message: 'Acesso não autorizado' })
  }

  try {
    const secret = process.env.SECRET

    const decoded = jwt.verify(token, secret)

    req.userId = decoded.id
    next()
  } catch (error) {

    return res.status(401).json({ message: 'Token inválido' })
  }
}
//validar permissão
function authorize(...roles) {
  return async (req, res, next) => {

    const user = await User.findById(req.userId);

    if (!user) {
      return res.status(404).json({
        message: "Usuário não encontrado."
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        message: "Você não possui permissão."
      });
    }

    next();
  };
}
//proximo numero de evenda
async function getNextSequence(sequenceName) {
  const counter = await counterVenda.findByIdAndUpdate(
    sequenceName,
    { $inc: { sequenceValue: 1 } },
    {
      new: true,
      upsert: true,
    }
  );

  return counter.sequenceValue;
}
app.get('/', (req, res) => {
  res.send('Hello, World!')
})
if (process.env.NODE_ENV !== "production") {
  app.listen(process.env.PORT || 3000, () => {
    console.log("Servidor rodando na porta " + (process.env.PORT || 3000));
  });
}

export default app;
require('dotenv').config();
const express = require('express');
const app = express();

// Configuração para entender JSON no corpo da requisição
app.use(express.json());

// Carregar rotas de autenticação
const authRoutes = require('./routes/auth');
app.use('/', authRoutes); // Exemplo: as rotas de autenticação estarão em /api/login

// Inicia o servidor na porta 4000
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
    console.log(`API rodando na porta ${PORT}`);
});

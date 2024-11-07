const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

// Função de autenticação (exemplo simples)
async function authenticateUser(username, password) {
    // Substitua pela lógica de autenticação real (consultando o banco de dados, etc.)
    return username === 'user' && password === 'password';
}

// Rota de login que gera o token JWT
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (await authenticateUser(username, password)) {
        // Gera o token JWT
        const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRATION });
        res.json({ token });
    } else {
        res.status(401).json({ message: 'Credenciais inválidas' });
    }
});

// Rota protegida de exemplo
const authenticateToken = require('../middlewares/authenticateToken');
router.get('/users', authenticateToken, (req, res) => {
    res.json({ message: 'Este é um endpoint protegido' });
});

module.exports = router;

const jwt = require('jsonwebtoken');

// Middleware de autenticação
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(403); // Acesso negado se o token não estiver presente

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403); // Token inválido

        req.user = user; // Anexa o usuário à requisição para acesso posterior
        next(); // Token é válido; prossiga para a próxima rota
    });
}

module.exports = authenticateToken;

import express, { Request, Response } from "express";
import mysql from "mysql2/promise";
import { ResultSetHeader } from "mysql2";
import bcrypt from "bcrypt";
import session from "express-session";

declare module "express-serve-static-core" {
  interface Request {
    session: session & { userId?: number };
  }
}

const app = express();
const path = require("path");

app.set("view engine", "ejs");
app.set("views", `${__dirname}/views`);

app.use(
  session({
    secret: "segredo",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false },
  })
);

const connection = mysql.createPool({
  host: "localhost",
  port: 3307,
  user: "root",
  password: "root",
  database: "unicesumar",
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "../public")));

function verificarLogin(req: Request, res: Response, next: Function) {
  if (req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
}

// ------------------------ Categories ------------------------
app.get("/categories", verificarLogin, async (req: Request, res: Response) => {
  const [rows] = await connection.query("SELECT * FROM categories");
  res.render("categories/index", { categories: rows });
});

app.get("/categories/form", (req: Request, res: Response) => {
  res.render("categories/form");
});

app.post("/categories/save", async (req: Request, res: Response) => {
  const { name } = req.body;
  await connection.query("INSERT INTO categories (name) VALUES (?)", [name]);
  res.redirect("/categories");
});

app.post("/categories/delete/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await connection.query("DELETE FROM categories WHERE id = ?", [id]);
  res.redirect("/categories");
});

// ------------------------ Users ------------------------
app.get("/users", verificarLogin, async (req: Request, res: Response) => {
  const [rows] = await connection.query("SELECT * FROM users");
  const successMessage = req.query.successMessage;
  const errorMessage = req.query.errorMessage;
  res.render("users/index", { users: rows, successMessage, errorMessage });
});

app.get("/users/add", (req: Request, res: Response) => {
  res.render("users/add", { errorMessage: "" });
});

app.post("/users", async (req: Request, res: Response) => {
  const { name, email, senha, papel, ativo } = req.body;
  const isActive = ativo === "on" ? 1 : 0;
  const hashedPassword = await bcrypt.hash(senha, 10);

  await connection.query(
    "INSERT INTO users (name, email, senha, papel, ativo, created_at) VALUES (?, ?, ?, ?, ?, NOW())",
    [name, email, hashedPassword, papel, isActive]
  );
  res.redirect("/users");
});

app.post("/users/delete/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  await connection.query("DELETE FROM users WHERE id = ?", [id]);
  res.redirect("/users");
});

app.get("/users/edit/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const [rows] = await connection.query("SELECT * FROM users WHERE id = ?", [id]);

  if (Array.isArray(rows) && rows.length > 0) {
    const user = rows[0];
    // Passando a senha sem criptografia para o formulário de edição
    res.render("users/edit", { user, successMessage: req.query.successMessage, errorMessage: req.query.errorMessage });
  } else {
    res.redirect("/users");
  }
});

// Exemplo de atualização de dados no controlador
// Atualização de dados do usuário com verificação de senha
// ------------------------ Atualização de Usuário ------------------------
app.post('/users/update/:id', async (req: Request, res: Response) => {
  const userId = req.params.id;
  const { current_password, new_password, name, email, papel, ativo } = req.body;
  const isActive = ativo === "on" ? 1 : 0;

  try {
    // Obter o usuário do banco de dados
    const [result] = await connection.query("SELECT * FROM users WHERE id = ?", [userId]);
    if (!Array.isArray(result) || result.length === 0) {
      return res.redirect(`/users/edit/${userId}?errorMessage=Usuário não encontrado`);
    }

    const user = result[0];

    // Verificar se a senha atual é válida
    const isMatch = await bcrypt.compare(current_password, user.senha);
    if (!isMatch) {
      return res.redirect(`/users/edit/${userId}?errorMessage=Senha atual incorreta`);
    }

    // Atualizar os dados do usuário, incluindo nova senha, se fornecida
    const updatedFields = [name, email, papel, isActive];
    let query = "UPDATE users SET name = ?, email = ?, papel = ?, ativo = ?";

    if (new_password) {
      const hashedNewPassword = await bcrypt.hash(new_password, 10);
      updatedFields.push(hashedNewPassword);
      query += ", senha = ?";
    }

    query += " WHERE id = ?";
    updatedFields.push(userId);

    await connection.query(query, updatedFields);

    res.redirect(`/users?successMessage=Usuário editado com sucesso`);
  } catch (error) {
    console.error(error);
    res.redirect(`/users/edit/${userId}?errorMessage=Erro ao atualizar o usuário`);
  }
});

// ------------------------ Login ------------------------
app.get("/login", (req: Request, res: Response) => {
  res.render("login/index");
});

app.post("/login", async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  const [result] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

  if (Array.isArray(result) && result.length > 0) {
    const user = result[0];
    const passwordMatch = await bcrypt.compare(senha, user.senha);

    if (passwordMatch) {
      req.session.userId = user.id;
      res.redirect("/users");
      return;
    }
  }
  res.redirect("/login?errorMessage=Email ou senha incorretos!");
});

app.post("/login/search", async (req: Request, res: Response) => {
  const { email, senha } = req.body;
  const [result] = await connection.query("SELECT * FROM users WHERE email = ?", [email]);

  if (Array.isArray(result) && result.length > 0) {
    const user = result[0];
    const passwordMatch = await bcrypt.compare(senha, user.senha);

    if (passwordMatch) {
      req.session.userId = user.id;
      res.redirect("/users");
      return;
    }
  }
  res.render("login/index", { errorMessage: "Email ou senha incorretos!" });
});

// ------------------------ Página Inicial ------------------------
app.get("/", verificarLogin, (req: Request, res: Response) => {
  res.render("blog/index");
});

// ------------------------ Posts Blog -----------------------------
app.get("/blog/posts", async (req: Request, res: Response) => {
  res.render("posts/index");
});

app.get("/blog/posts/:postId", async (req: Request, res: Response) => {
  const { postId } = req.params;
  res.render(`blog/posts/${postId}`);
});

// ------------------------ Salvar Usuários ------------------------
app.post("/users/save", async (req: Request, res: Response) => {
  const { name, email, senha, confirm_senha, papel, ativo } = req.body;

  if (senha !== confirm_senha) {
    return res.render("users/add", {
      errorMessage: "As senhas não coincidem. Tente novamente.",
    });
  }

  const isActive = ativo === "on" ? 1 : 0;
  const hashedPassword = await bcrypt.hash(senha, 10);

  const [result] = await connection.query<ResultSetHeader>(
    "INSERT INTO users (name, email, senha, papel, ativo) VALUES (?, ?, ?, ?, ?)",
    [name, email, hashedPassword, papel, isActive]
  );

  if (result.affectedRows > 0) {
    req.session.userId = result.insertId;
    res.redirect("/users");
  } else {
    res.render("users/add", { errorMessage: "Erro ao salvar usuário." });
  }
});

// ------------------------ Logout de Usuário ------------------------
app.get("/logout", (req: Request, res: Response) => {
  req.session.destroy((err) => {
    if (err) {
      return res.redirect("/users");
    }
    res.redirect("/login");
  });
});

// ------------------------ Inicialização do Servidor ------------------------
app.listen(4000, () => console.log("Server is listening on port 4000"));

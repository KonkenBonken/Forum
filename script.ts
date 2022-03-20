const { Server: socketIo } = require('socket.io'),
  express = require('express'),
  app = express(),
  server = require('http').createServer(app),
  io = new socketIo(server, {
    transports: ['polling'],
    pingInterval: 60e3,
    pingTimeout: 120e3,
  }),
  port = 80;

const Database = require('save-on-change')('database.json', () => console.log('saved'));
['users'].forEach(key => {
  Database[key] ??= {};
});

const getNewId = require('randomnorepeat').createRandomString(10, Object.keys(Database.users));
const tfa = require('2fa-util');

//
// await tfa.verify('<token from authenticator app>', '<secret>');

class User {
  success: boolean;
  id: string;
  username: string;
  age: number;
  mail?: string;
  avatarUrl?: string;
  loggedIn: boolean;
  tfaSecret?: string;
  socket: any;
  static saveKeys = ['username', 'age', 'mail', 'avatarUrl', 'tfaSecret']

  static findByUsername(username: string): User | void {
    // @ts-expect-error
    return Object.values(Database.users).find((user) => user.username == username)
  };


  constructor(options: { username: string, age: number, mail?: string, avatarUrl?: string, tfaSecret?: string }, id?: string, save: boolean = true) {
    this.id = id ?? getNewId();
    this.username = options.username;
    this.age = options.age;
    this.mail = options.mail;
    this.avatarUrl = options.avatarUrl;
    this.success = !save;
    this.loggedIn = false;
    this.socket = null;
    this.tfaSecret = options.tfaSecret;
    if (save && !User.findByUsername(options.username)) {
      this.success = true;
      Database.users[this.id] = this;
    }
  }
  toJSON(/*id:string*/) {
    return Object.fromEntries(
      Object.entries(this).filter(([key]) => User.saveKeys.includes(key))
    )
  }
  remove() {
    delete Database.users[this.id];
  }
  set loggedInAs(socket: any) {
    if (socket) {
      this.socket = socket;
      this.loggedIn = true;
      socket.loggedIn = true;
    } else {
      this.socket = null;
      this.loggedIn = socket.loggedIn = false;
    }
  }
  async genarateTfaSecret(): Promise<string> {
    const secret = await tfa.generateSecret(this.username, 'Forum');
    this.tfaSecret = secret.secret;
    Database._ = () => 0;
    return secret.qrcode;
  }
  async tfaVerify(code: string): Promise<boolean> {
    if (!this.tfaSecret || code.length != 6) return false;
    console.log(code);
    return tfa.verify(code, this.tfaSecret);
  }
}

for (const id in Database.users)
  Database.users[id] = new User(Database.users[id], id, false);

console.log(Database);

io.on('connection', async (socket: any) => {
  const userId = socket.handshake.query.userId;
  if (userId) var user = Database.users[userId];
  console.log(user);

  socket.on('setUsername', async (username: string, fun: (success: Object) => void) => {
    user = User.findByUsername(username);
    fun(user ? Object.assign({}, user, { tfaSecret: undefined }) : null);
  });
  socket.on('login', async (code: string, fun: (success: boolean | null) => void) => {
    if (!user) return fun(null);
    const success = await user.tfaVerify(code);
    console.log([code, success]);
    fun(success);
  });
  socket.on('genarateTfaSecret', async (_: void, fun: (qrcode: string | null) => void) => {
    if (!user) return fun(null);
    const qrcode = await user.genarateTfaSecret();
    console.log([qrcode]);
    fun(qrcode);
  })
});

app.use(require('cookie-parser')());
app.set('view engine', 'ejs');

app.get('/', async (req: any, res: any) => {
  let loggedIn = false,
    { code, username } = req.query;

  if (code || username) console.log({ code, username });


  if (username)
    var user = User.findByUsername(username);

  if (+code && user)
    loggedIn = await user.tfaVerify(code);

  res.render('index', {
    loggedIn,
    user: Object.assign({}, user, { tfaSecret: undefined }),
    userId: user && user.id
  })
});
app.use(express.static('views'));
server.listen(port, () => console.log(`listening on ${port}`));

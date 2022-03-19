const Database = require('save-on-change')('database.json');
['users'].forEach(key => {
  Database[key] ??= {};
});

const getNewId = require('randomnorepeat').createRandomString(10, Object.keys(Database.users));

const findUserByUsername =
  // @ts-expect-error
  (username: string) => Object.values(Database.users).find((user) => user.username == username);

class User {
  success: boolean;
  id: string;
  username: string;
  age: number;
  mail?: string;
  avatarUrl?: string;
  static saveKeys = ['username', 'age', 'mail', 'avatarUrl']


  constructor(options: { username: string, age: number, mail?: string, avatarUrl?: string }, id?: string, save: boolean = true) {
    this.id = id ?? getNewId();
    this.username = options.username;
    this.age = options.age;
    this.mail = options.mail;
    this.avatarUrl = options.avatarUrl;
    this.success = !save;
    if (save && !findUserByUsername(options.username)) {
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
}

for (const id in Database.users)
  Database.users[id] = new User(Database.users[id], id, false);

console.log(Database);

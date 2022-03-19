const Database = require('save-on-change')('database.json');
['users'].forEach(key => {
  Database[key] ??= {};
});

const getNewId = require('randomnorepeat').createRandomString(10, Object.keys(Database.users));

class User {
  id: string;
  username: string;
  age: number;
  mail?: string;
  avatarUrl?: string;
  static saveKeys = ['username', 'age', 'mail', 'avatarUrl']


  constructor(options: { username: string, age: number, mail?: string, avatarUrl?: string }) {
    this.id = getNewId();
    this.username = options.username;
    this.age = options.age;
    this.mail = options.mail;
    this.avatarUrl = options.avatarUrl;
    Database.users[this.id] = this;

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
  Database.users[id] = new User(Database.users[id]);


new User({
  username: 'KonkenBonken',
  age: 17,
  mail: 'konrad05pettersson@gmail.com'
})
console.log(Database);

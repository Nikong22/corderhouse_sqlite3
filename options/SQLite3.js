const optionsSQL = {
    client: 'sqlite3',
    connection: {
        filename: './db/mydb.sqlite'
    },
    useNullAsDefault: true
}

console.log('Conectando a la base de datos sq...');

module.exports = {
    optionsSQL
}
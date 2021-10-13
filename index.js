const express = require('express');
const handlebars = require('express-handlebars');
const { SocketAddress } = require('net');
const fs = require('fs')
const {options} = require('./options/mariaDB');
const knex = require('knex')(options);
const {optionsSQL} = require('./options/SQLite3');
const knexSQL = require('knex')(optionsSQL);

class Funciones {
    getSiguienteId = ( productos ) => {
      let ultimoId = 0
      productos.forEach(producto => {
        if (producto.id > ultimoId){
          ultimoId = producto.id
        }
      });
      return ++ultimoId
    }
}
const funciones = new Funciones()

const app = express();
const PORT = 8080;
const router = express.Router();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use('/api', router);

app.use(express.static('public'));

const server = http.listen(PORT,
  () => console.log('escuchando en puerto 8080'));
server.on('error', error=>console.log('Error en servidor', error));

const productos = [

];

// knex.schema.dropTableIfExists('productos')
// .then(()=>console.log('Tabla borrada...'))
// .catch(e=>{
//     console.log('Error en drop:', e);
//     knex.destroy();
//     process.exit(500);
// });

knex.schema.createTable('productos', table => {
  table.increments('id'),
  table.string('title'),
  table.float('price'),
  table.string('thumbnail')
})

.catch(e=>{
    console.log('Error en proceso:', e);
    // knex.destroy();
});
knex.from('productos').select('*')
    .then((productosDB)=>{
      for (let producto of productosDB) {
          productos.push(producto)
      }
})

router.get('/', (req,res)=>{
  const objRes = 
  {msg: "Sitio principal de productos"};
  res.json(objRes);
});

router.get("/productos/listar", (req, res) => {
    if (productos.length == 0) {
        return res.status(404).json({ error: "no hay productos cargados" });
      }
      knex.from('productos').select('*')
      .then((productos)=>{
        console.log(productos)
        res.json(productos);
    })
   
  });
  
router.get("/productos/listar/:id", (req, res) => {
    const { id } = req.params;
    const producto = productos.find((producto) => producto.id == id);
    if (!producto) {
        return res.status(404).json({ error: "producto no encontrado" });
      }
    res.json(producto);
});
  
router.put("/productos/actualizar/:id", (req, res) => {
  const { id } = req.params;
  let { title, price, thumbnail } = req.body;
  let producto = productos.find((producto) => producto.id == id);
  if (!producto) {
    return res.status(404).json({ msg: "Usuario no encontrado" });
  }
  (producto.title = title), (producto.price = price), (producto.thumbnail = thumbnail);
  knex.from('productos').where('id', '=', id).update(({price: price, title: title, thumbnail: thumbnail}))
  .then(()=>{
    console.log('producto actualizado')
})
  res.status(200).json(producto);
});

router.delete("/productos/borrar/:id", (req, res) => {
  const { id } = req.params;
  const producto = productos.find((producto) => producto.id == id);

  if (!producto) {
    return res.status(404).json({ msg: "Usuario no encontrado" });
  }

  const index = productos.findIndex((producto) => producto.id == id);
  productos.splice(index, 1);
  knex.from('productos').where('id', '=', id).del()
  .then(()=>{
    console.log('producto borrado')
})

  res.status(200).end();
});

app.engine(
    "hbs",
    handlebars({
        extname: ".hbs",
        defaultLayout: "index.hbs",
        layoutsDir: __dirname + "/views/layouts",
        partialsDir: __dirname + "/views/partials"
    })
);

app.set('views', './views'); // especifica el directorio de vistas
app.set('view engine', 'hbs'); // registra el motor de plantillas

app.get('/productos/vista', function(req, res) {
  console.log(productos)
  let tieneDatos;
  if(productos.length > 0){
    tieneDatos = true
  }else{
    tieneDatos = false
  }
  res.render('main', { productos: productos, listExists: tieneDatos });
});

const mensajes = [

];

// knexSQL.schema.dropTableIfExists('mensajes')
// .then(()=>console.log('Tabla borrada mensajes...'))
// .catch(e=>{
//     console.log('Error en drop:', e);
//     knexSQL.destroy();
//     process.exit(500);
// });

knexSQL.schema.createTable('mensajes', table => {
  table.string('autor'),
  table.string('texto'),
  table.float('fecha')
})
.catch(e=>{
  console.log('Error en proceso:', e);
  knexSQL.destroy();
});
knexSQL.from('mensajes').select('*')
    .then((mensajesDB)=>{
      for (let mensaje of mensajesDB) {
        mensajes.push(mensaje)
      }
})

io.on('connection', (socket) => {
    console.log('alguien se está conectado...');
    
    io.sockets.emit('listar', productos);
    
    socket.on('notificacion', (titulo, precio, imagen) => {
      const producto = {
        title: titulo,
        price: precio,
        thumbnail: imagen,
      };

      console.log(producto)

      knex('productos').insert([producto])
        .then((id_insertado)=>{
            producto['id'] = id_insertado[0];
            productos.push(producto)
            io.sockets.emit('listar', productos);
        })
  })
    
    io.sockets.emit('mensajes', mensajes);
    
    socket.on('nuevo', (data)=>{
      knexSQL('mensajes').insert([data])
        .then((id_insertado)=>{
            mensajes['id'] = id_insertado[0];
            mensajes.push(data);

            knexSQL.from('mensajes').select('*')
              .then((mensajes)=>{
                console.log(mensajes)
            })  

            io.sockets.emit('mensajes', mensajes)
        })
    })
});
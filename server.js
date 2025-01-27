const express = require('express');
const https=require('https');
const socketio=require('socket.io');
const fs=require('fs');


const cert = fs.readFileSync("./prod/cert.pem");
const key = fs.readFileSync("./prod/key.pem");
const app = express();
const server = https.createServer({
    key: key,
    cert:cert,
    requestCert: true,
    rejectUnauthorized: false
}, app)
const io = socketio(server);

//TODO: header-Abgleich für socket.handshake.headers


io.on('connection',socket =>{
    console.log('New user connection');

    socket.on('message',(user,msg,room) =>{
        //store data in DB
        if(!msg.includes('spawn') && !msg.includes('ciao')){
            io.emit('message', user,msg,room);
        }
        else {
            io.emit('msgError', msg, 'Keine Macht den Bots!');
        }
    });
    socket.on('disconnect',() =>{
        console.log('user disconnected');
    });
    socket.on('connect_error',(err) =>{
        console.log(err);
    });
});

const PORT=3000||process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

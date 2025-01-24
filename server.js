const express = require('express');
const http=require('http');
const socketio=require('socket.io');

const app=express();
const server = http.createServer(app);
const io = socketio(server);

io.on('connection',socket =>{
    console.log('New user connection');

    socket.on('message',(user,msg,room) =>{
        //store data in DB
        io.emit('message', user,msg,room);
    });

    socket.on('disconnect',() =>{
        console.log('user disconnected');
    });
});

const PORT=3000||process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

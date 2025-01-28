const express = require('express');
const https=require('https');
const socketio=require('socket.io');
const fs=require('fs');
const { roomData, roomDataArray, isValidRoomToJoin, isValidRoomToChat } = require('./roomData');

const cert = fs.readFileSync("./debug/cert.pem");
const key = fs.readFileSync("./debug/key.pem");
const app = express();
const server = https.createServer({
    key: key,
    cert:cert,
    requestCert: true,
    rejectUnauthorized: false,
    secure: true
}, app);

const io = socketio(server);

const validate = (headers) => {
    return (headers.hasOwnProperty(process.env.EXTRA_HEADER_KEY) && headers[process.env.EXTRA_HEADER_KEY] === process.env.EXTRA_HEADER);
}

const getTimestamp = () => {
    const currentDate = new Date();
    return currentDate.toISOString().substring(11,19);
}

/*io.use((socket, next) => { 
    if (validate(socket.request.headers)) {
        next();
    } else {
        next(new Error("invalid Header"));
    }
});*/

io.on('connection',socket =>{
    console.log('New user connection');

    socket.on('joinRoom', (user, room) => {
        if(isValidRoomToJoin(room, socket.rooms)) {
            socket.join(room);
            const joinMessage = user + ' ist beigetreten.';
            io.to(room).emit('message', 'System', joinMessage, getTimestamp(), room);
        }
    });
    socket.on('leaveRoom', (user, room) => {
        if(isValidRoomToChat(room, socket.rooms)) {
            const leaveMessage = user + ' hat den Raum verlassen.';
            io.to(room).emit('message', 'System', leaveMessage, getTimestamp(), room, () => {
                socket.leave(room);
            });
        }
    });
    socket.on('message', (user, msg, room) => {
        if(isValidRoomToChat(room, socket.rooms) && !msg.includes('spawn') && !msg.includes('ciao')) {
            io.to(room).emit('message', user, msg, getTimestamp(), room);
        }
    });
    socket.on('disconnect',() => {
        console.log('user disconnected');
    });
    socket.on('connect_error',(err) => {
        console.log(err);
    });
});

const PORT=3000||process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

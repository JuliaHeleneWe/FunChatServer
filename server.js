const express = require('express');
const https=require('https');
const socketio=require('socket.io');
const fs=require('fs');
const { isValidRoomToJoin, isValidRoomToChat } = require('./roomData');

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

const io = socketio(server, {
    pingInterval: 5 * 60 * 1000,
    pingTimeout: 5 *60 * 1000,
    connectionStateRecovery: {
        maxDisconnectionDuration: 10 * 60 * 1000,
        skipMiddlewares: true
    }
});

const validate = (headers) => {
    return (headers.hasOwnProperty(process.env.EXTRA_HEADER_KEY) && headers[process.env.EXTRA_HEADER_KEY] === process.env.EXTRA_HEADER);
}

const getTimestamp = () => {
    const currentDate = new Date();
    return currentDate.toLocaleString();
}

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
        if(isValidRoomToChat(room, socket.rooms)) {
            io.to(room).emit('message', user, msg, getTimestamp(), room);
        } else {
            socket.join(room);
            io.to(room).emit('message', user, msg, getTimestamp(), room);
        }
    });

    socket.on('fetchMissedMessages', async (room, latestMsg, callback) => {
        let socketsOfRoom = await io.in(room).fetchSockets();
        let foundConSocket = false;
        for(let i = 0; i < socketsOfRoom.length; i++) {
            let otherSocket = socketsOfRoom[i];
            if(otherSocket !== socket && otherSocket.connected) {
                foundConSocket = true;
                socket.join(socket.id);
                io.to(otherSocket.id).emit('sendMessagesAfterTimestamp', room, latestMsg, socket.id, callback);
                break;
            }
        }
        if(foundConSocket === false && callback != null) {
            callback();
        }
    });

    socket.on('sendMissedMessages', (messages, room, socketId, callback) => {
        for(let i = 0; i < messages.length; i++) {
            let message = messages[i];
            io.to(socketId).emit('message', message.user, message.message, message.timestamp, room);
        }
        if(callback != null) {
            callback();
        }
    });
    socket.on('silentJoin', (room) => {
        if(isValidRoomToJoin(room, socket.rooms)) {
            socket.join(room);
        }
    });

    socket.on('botJoin', (room) => {
        if(isValidRoomToJoin(room, socket.rooms)) {
            socket.join(room);
        }
    });
    socket.on('botLeave', (room) => {
        if(isValidRoomToChat(room, socket.rooms)) {
            socket.leave(room);
        }
    });
    socket.on('botMessage', (user, msg, room) => {
        if(isValidRoomToChat(room, socket.rooms)) {
            io.to(room).emit('message', user + ' (BOT)', msg, getTimestamp(), room);
        } else {
            socket.join(room);
            io.to(room).emit('message', user + ' (BOT)', msg, getTimestamp(), room);
        }
    });
    socket.on('botMessageAll', (user, msg, room) => {
        if(isValidRoomToChat(room, socket.rooms)) {
            io.emit('message', user + ' (BOT)', msg, getTimestamp(), room);
        }
    });

    socket.on('disconnect',(error) => {
        console.log('user disconnected', error);
    });
    socket.on('connect_error',(err) => {
        console.log(err);
    });
});

const PORT=3000||process.env.PORT;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

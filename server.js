const express = require('express');
const https=require('https');
const socketio=require('socket.io');
const fs=require('fs');
const pg=require('pg');
const { isValidRoomToJoin, isValidRoomToChat } = require('./roomData');

const cert = fs.readFileSync("./prod/cert.pem");
const key = fs.readFileSync("./prod/key.pem");
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
        maxDisconnectionDuration: 2 * 60 * 1000,
        skipMiddlewares: true
    }
});

const getTimestamp = () => {
    const currentDate = new Date();
    return currentDate.toLocaleString();
}

io.on('connection',socket =>{
    console.log('New user connection');

    socket.on('joinRoom', (user, room, callback) => {
        if(isValidRoomToJoin(room, socket.rooms)) {
            socket.join(room);
            const joinMessage = user + ' ist beigetreten.';
            io.to(room).emit('message', 'System', joinMessage, getTimestamp(), room, 'system');
            callback();
        }
    });
    socket.on('leaveRoom', (user, room, callback) => {
        if(isValidRoomToChat(room, socket.rooms)) {
            const leaveMessage = user + ' hat den Raum verlassen.';
            io.to(room).emit('message', 'System', leaveMessage, getTimestamp(), room, 'system', () => {
                socket.leave(room);
                callback();
            });
        }
    });
    socket.on('message', (user, msg, room, type, callback) => {
        if(user.includes('botbot')){
            user.replace('botbot','gaslightingbot');
        }
        if(isValidRoomToChat(room, socket.rooms)) {
            io.to(room).emit('message', user, msg, getTimestamp(), room, type);
            callback({status: 'ok'});
        }
        else {
            callback({status: 'error'});
        }
        //TODO: send ack on response or error if not
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
            io.to(socketId).emit('message', message.user, message.message, message.timestamp, room, message.type);
        }
        if(callback != null) {
            callback();
        }
    });
    socket.on('silentJoin', (room, callback) => {
        if(isValidRoomToJoin(room, socket.rooms)) {
            socket.join(room);
            callback();
        }
    });

    socket.on('botJoin', (room, callback) => {
        if(isValidRoomToJoin(room, socket.rooms)) {
            socket.join(room);
            if(callback != null) {
                callback();
            }
        }
    });
    socket.on('botLeave', (room, callback) => {
        if(isValidRoomToChat(room, socket.rooms)) {
            socket.leave(room);
            if(callback != null) {
                callback();
            }
        }
    });
    socket.on('botMessage', (user, msg, room, callback) => {
        if(isValidRoomToChat(room, socket.rooms)) {
            if(user.includes('botbot')){
                user.replace('botbot','gaslightingbot');
            }
            io.to(room).emit('message', user + ' (BOT)', msg, getTimestamp(), room, 'bot');
            if(callback != null) {
                callback();
            }
        }
    });
    socket.on('botMessageAll', (user, msg, room, callback) => {
        if(user.includes('botbot')){
            user.replace('botbot','gaslightingbot');
        }
        if(isValidRoomToChat(room, socket.rooms)) {
            io.emit('message', user + ' (BOT)', msg, getTimestamp(), room, 'bot');
            if(callback != null) {
                callback();
            }
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

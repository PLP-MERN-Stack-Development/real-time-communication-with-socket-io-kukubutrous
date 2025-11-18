// Very small in-memory store for demo only.
// Replace with persistent DB (MongoDB) for production.

let users = [];
let idCounter = 1;

function addUser({ username, password }) {
    const user = { id: idCounter++, username, password };
    users.push(user);
    return user;
}

function findUserByUsername(username) {
    return users.find(u => u.username === username);
}

function findUserById(id) {
    return users.find(u => u.id === id);
}

module.exports = { addUser, findUserByUsername, findUserById, _users: users };

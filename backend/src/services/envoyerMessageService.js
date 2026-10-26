function envoyerMessage(io, message, etape) {
    io.emit("deploy:progress", {
        message,
        etape,
        date: new Date().toISOString()
    });
}

module.exports = { envoyerMessage }
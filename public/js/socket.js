const SocketClient = (() => {
  let socket;
  function connect(token){
    socket = io({ auth: { token } });
    return socket;
  }
  return { connect };
})();

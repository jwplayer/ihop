const delay = (time) => new Promise((accept) => setTimeout(accept, time));

class SlowNetwork extends IHop.Network {
  emitMessage_(...args) {
    if (this.slow) {
      return delay(300).then(() => {
        return super.emitMessage_(...args);
      });
    }
    return super.emitMessage_(...args);
  }

  toNodeEncoded_(...args) {
    if (this.slow) {
      return delay(300).then(() => {
        return super.toNodeEncoded_(...args);
      });
    }
    return super.toNodeEncoded_(...args);
  }
}

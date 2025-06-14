'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const { Server, Client } = require('..');
const { Writable, Readable } = require('stream');


describe('@module scarf', function() {

  const rs = new Readable({ read: () => null, objectMode: true });
  let ws = null;

  let sandbox = sinon.createSandbox();
  let api = {
    success: sandbox.stub().callsArgWith(1, null, []),
    error: sandbox.stub().callsArgWith(1, new Error('Failed to join')),
    readable: sandbox.stub().callsArgWith(1, null, rs),
    writable: (a, cb) => cb(null, ws),
    exception: sandbox.stub().throws(new Error('Fatal')),
    nested: {
      method: sandbox.stub().callsArgWith(0, null, true)
    }
  };
  let server = new Server(api);
  let client = new Client();

  before((done) => {
    server.listen(10001);
    setTimeout(() => {
      client.connect(10001);
      done();
    }, 500);
  });

  after(() => server.server.close());

  it('should send command and handle success', function(done) {
    client.invoke('success', ['param'], (err, result) => {
      expect(err).to.equal(null);
      expect(result).to.have.lengthOf(0);
      done();
    });
  });

  it('should send command and handle success (promise)', function(done) {
    client.invoke('success', ['param']).then(result => {
      expect(result).to.have.lengthOf(0);
      done();
    }, done);
  });
  
  it('should send command and handle error', function(done) {
    client.invoke('error', ['param'], (err) => {
      expect(err.message).to.equal('Failed to join');
      done();
    });
  });

  it('should send command and handle error (promise)', function(done) {
    client.invoke('error', ['param']).then(() => done(true), err => {
      expect(err.message).to.equal('Failed to join');
      done();
    });
  });

  it('should send command and handle readable stream (promise)', function(done) {
    client.invoke('readable', ['param']).then((stream) => {
      let events = 0;
      stream.on('data', (data) => {
        expect(data.beep).to.equal('boop');
        events++;
      }).once('end', () => {
        expect(events).to.equal(3);
        done();
      });
      rs.push({ beep: 'boop' });
      rs.push({ beep: 'boop' });
      rs.push({ beep: 'boop' });
      rs.push(null);
    }, done);
  });

  it('should send command and handle writable stream (promise)', function(done) {
    let writes = 0;
    ws = new Writable({
      write: (data, enc, callback) => {
        expect(data.beep).to.equal('boop');
        writes++;
        callback();
      },
      objectMode: true
    });
    ws.on('finish', () => {
      expect(writes).to.equal(3);
      done();
    });
    client.invoke('writable', ['param']).then((stream) => {
      let events = 0;
      stream.write({ beep: 'boop' });
      stream.write({ beep: 'boop' });
      stream.write({ beep: 'boop' });
      stream.end();
    }, done);
  });

  it('should callack with error if exception thrown', function(done) {
    client.invoke('exception', [], (err) => {
      expect(err.message).to.equal('Fatal');
      done();
    });
  });

  it('should error if invalid method', function(done) {
    client.invoke('unknown', [], (err) => {
      expect(err.message).to.equal('Invalid method: "unknown"');
      done();
    });
  });

});


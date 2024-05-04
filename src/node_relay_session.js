//
//  Created by Mingliang Chen on 18/3/16.
//  illuspas[a]gmail.com
//  Copyright (c) 2018 Nodemedia. All rights reserved.
//
const Logger = require('./node_core_logger');
const NodeCoreUtils = require('./node_core_utils');

const EventEmitter = require('events');
const { spawn } = require('child_process');

const RTSP_TRANSPORT = ['udp', 'tcp', 'udp_multicast', 'http'];

class NodeRelaySession extends EventEmitter {
  constructor(conf) {
    super();
    this.conf = conf;
    this.id = NodeCoreUtils.generateNewSessionID();
    this.ts = Date.now() / 1000 | 0;
    this.TAG = 'relay';
  }

  run() {
    let format = this.conf.ouPath.startsWith('rtsp://') ? 'rtsp' : 'flv';
    

    
    // When this is called and a name is specified, but the name is not used
    // in the path, ignore the request.
    if (!this.conf.name || this.conf.name == "") {
      return;
    }
    if (this.conf.name && this.conf.name != "" && this.conf.inPath.indexOf(this.conf.name) < 0) {
      Logger.log(`[Joel] return this stream because path was ${this.conf.inPath} and the whole thing looks like ${JSON.stringify(this.conf)}`);
      return;
    }

    if (this.conf.name.indexOf("_") < 0) {
      this.conf.name = "";
    }

    let argv = ['-re', '-i', this.conf.inPath, '-c', 'copy', '-f', format, this.conf.ouPath];
    if (this.conf.inPath[0] === '/' || this.conf.inPath[1] === ':') {
      argv.unshift('-1');
      argv.unshift('-stream_loop');
    }

    if (this.conf.inPath.startsWith('rtsp://') && this.conf.rtsp_transport) {
      if (RTSP_TRANSPORT.indexOf(this.conf.rtsp_transport) > -1) {
        argv.unshift(this.conf.rtsp_transport);
        argv.unshift('-rtsp_transport');
      }
    }

    Logger.log('[relay task] id=' + this.id, 'cmd=ffmpeg', argv.join(' '));

    this.ffmpeg_exec = spawn(this.conf.ffmpeg, argv);
    this.ffmpeg_exec.on('error', (e) => {
      Logger.ffdebug(e);
    });

    this.ffmpeg_exec.stdout.on('data', (data) => {
      Logger.ffdebug(`FF_LOG:${data}`);
    });

    this.ffmpeg_exec.stderr.on('data', (data) => {
      Logger.ffdebug(`FF_LOG:${data}`);
    });

    this.ffmpeg_exec.on('close', (code) => {
      Logger.log('[relay end] id=' + this.id, 'code=' + code);
      this.emit('end', this.id);
    });
  }

  end() {
    this.ffmpeg_exec.kill();
  }
}

module.exports = NodeRelaySession;

/*
 * Copyright (c) 2020 LG Electronics Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const path = require('path'),
    exec = require('child_process').exec,
    common = require('./common-spec');

const aresCmd = 'ares-push',
    srcPath = path.join(__dirname, "..", "tempFiles/copyFiles");

let cmd,
    options;

beforeAll(function (done) {
    cmd = common.makeCmd(aresCmd);
    common.getOptions()
    .then(function(result){
        options = result;
        done();
    });
});

describe(aresCmd + ' -v', function() {
    it('Print help message with verbose log', function(done) {
        exec(cmd + ' -v', function (error, stdout, stderr) {
            expect(stderr.toString()).toContain("verb argv");
            expect(stdout).toContain("SYNOPSIS");
            expect(error).toBeNull();
            done();
        });
    });
});

describe(aresCmd, function() {
    it("Add device with ares-setup-device", function(done) {
        common.resetDeviceList()
        .then(function(){
            return common.addDeviceInfo();
        }).then(function(result) {
            expect(result).toContain(options.device);
            done();
        }).catch(function(err) {
            expect(err).toContain("The specified value already exist");
            done();
        });
    });
});

describe(aresCmd + ' --device-list(-D)', function() {
    it('Show available device list', function(done) {
        exec(cmd + ' -D', function (error, stdout) {
            expect(stdout).toContain(options.device);
            done();
        });
    });
});

describe(aresCmd, function() {
    it('Remove destination directory', function(done) {
        const shellCmd = common.makeCmd('ares-shell');
        exec(shellCmd + ` -r "rm -rf /tmp/copyFiles"`, function () {
            done();
        });
    });

    it('Copy directory', function(done) {
        exec(cmd + ` ${srcPath} /tmp`, function (error, stdout) {
            expect(stdout).toContain("/tmp/copyFiles/testFile.txt");
            expect(stdout).toContain("/tmp/copyFiles/helloFile.txt");
            expect(stdout).toContain("2 file(s) pushed");
            expect(stdout).toContain("Success");
            done();
        });
    });
});

describe(aresCmd + " --ignore(-i) ", function() {
    it('Remove destination directory', function(done) {
        const shellCmd = common.makeCmd('ares-shell');
        exec(shellCmd + ' -r "rm -rf /tmp/copyFiles"', function () {
            done();
        });
    });

    it('Copy directory with -i', function(done) {
        exec(cmd + ` -i ${srcPath} /tmp`, function (error, stdout) {
            expect(stdout).not.toContain("/tmp/copyFiles/testFile.txt");
            expect(stdout).not.toContain("/tmp/copyFiles/helloFile.txt");
            expect(stdout).toContain("2 file(s) pushed");
            expect(stdout).toContain("Success");
            done();
        });
    });
});

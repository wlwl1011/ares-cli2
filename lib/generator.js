#!/usr/bin/env node

/*
 * Copyright (c) 2020-2023 LG Electronics Inc.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

const { generateKeyPair } = require('crypto');

 
///promise -> object to use async in js when communicate server to db
///bluebird -> module to use promise more easier 
///require -> import extra library

const promise = require('bluebird'),

    //Utility for rendering text tables with javascript
    Table = require('easy-table'),

    ///file I/O
    fs = promise.promisifyAll(require('fs-extra')),
    log = require('npmlog'),

    ///call path library
    path = require('path'),
    errHndl = require('./base/error-handler'),
    copyToDirAsync = require('./util/copy').copyToDirAsync,
    readJsonSync = require('./util/json').readJsonSync,
    merge = require('./util/merge');

///make path for templatePath  
///__dire mean current file path  
const templatePath = path.join(__dirname, '/../files/conf/', 'template.json');
let templates;

log.heading = 'generator';
log.level = 'warn';


/// *** Set file(template file path, cli file path) and read template.json ***
    /// *** Replace ares-cli file Fath ***
function Generator() {
    
    
    if (templatePath) {
        ///Save template json to cliPath
        ///'..' means upper folder
        const cliPath = path.join(__dirname, '..'); ///cliPath = ~/ares-cli
        let contents = fs.readFileSync(templatePath); ///readFileSync -> read file sync !!!
        
        ///replace(A,B) -> Find A and Chage to B
        contents = contents.toString().replace(/\$cli-root/gi, cliPath).replace(/\\/g,'/');
        templates = JSON.parse(contents);
    } else {
        templates = null;
    }
}

/// *** To Render templates to table
    
    /// $ares-generate -l
    
    
    /// print
    /*
    ID             Project Type     Description                               
    -------------  ---------------  ------------------------------------------
    webapp         Web App          (default) web app for webOS               
    hosted_webapp  Web App          hosted web app for webOS                  
    webappinfo     Web App Info     appinfo.json for web app                  
    js_service     JS Service       js service for webOS                      
    jsserviceinfo  JS Service Info  services.json, package.json for JS service
    icon           Icon             app icon files [80x80]                    
    qmlapp         QML App          QML app for webOS                         
    qmlappinfo     QML App Info     appinfo.json for QML app  
    
    */
Generator.prototype.showTemplates = function(listType, next) {
    
    //Tmpl means Templates
    const templateList = this.getTmpl(),
        table = new Table(),
        _displayType = {
            "webapp": "Web App",
            "nativeapp": "Native App",
            "webappinfo": "Web App Info",
            "nativeappinfo": "Native App Info",
            /* I have to add code for airsol */
            "acpservice": "ACP Service",
            "acpserviceinfo" : "ACP Service Info",
            "jsservice": "JS Service",
            "nativeservice": "Native Service",
            "jsserviceinfo": "JS Service Info",
            "nativeserviceinfo": "Native Service Info",
            "icon": "Icon",
            "library": "Library",
            "packageinfo": "Package Info",
            "qmlapp": "QML App",
            "qmlappinfo": "QML App Info"
        };

    

    for (const name in templateList) {
        if (templateList[name].hide === true || !templateList[name].type) {
            continue;
        }
        const isDefault = (templateList[name].default) ? "(default) " : "",
            type = _displayType[templateList[name].type] || templateList[name].type;

        if (listType && ["true", "false", true, false].indexOf(listType) === -1) {
            if (templateList[name].type &&
                (templateList[name].type.match(new RegExp(listType+"$","gi")) === null)) {
                continue;
            }
        }
        table.cell('ID', name);
        table.cell('Project Type', type);
        table.cell('Description', isDefault + templateList[name].description);
        table.newRow();
    }
    return next(null, {msg: table.toString()});
};

Generator.prototype.generate = function(options, next) {
    // For API
    if (!options.tmplName) {
        return next(errHndl.getErrMsg("EMPTY_VALUE", "TEMPLATE"));
    }
    if (!options.out) {
        return next(errHndl.getErrMsg("EMPTY_VALUE", "APP_DIR"));
    }

    /// option means argv
    ///    options example
    ///
    ///    options = {
    ///        tmplName :"jsserviceinfo",
    ///        props : ['id='+`${id}`, 'version='+`${version}`],
    ///        out:sampleAppPath
    ///    };

    const tmplName = options.tmplName,
        pkginfo = options.pkginfo || {},
        svcinfo = options.svcinfo || {},
        svcName = options.svcName,
        out = options.out,
        dest = path.resolve(out),
        existDir = this.existOutDir(dest),
        templateList = this.getTmpl(),
        template = templateList[tmplName];
    let appinfo = options.appinfo || {};

    {
    /*
    console.log("In generator.js code!!!");
    console.log(tmplName);
    console.log("pkginfo: ", pkginfo);
    console.log("svcinfo: ",svcinfo);
    console.log("svcName: ",svcName);
    console.log("out: ",out);
    console.log("dest: ",dest);
    console.log("existDir: ",existDir);
    console.log("templateList: ", templateList);
    console.log("template: ",template);
    console.log("appinfo: ", appinfo);
    */
    }

    /// $ares-generate -t webapp demo

    {/*

    ///print
    /// ? app id (demo_minzzl) 
    /// ? title (demo_title)
    /// version (1.0.0)

    
        In generator.js code!!!
        webapp
        pkginfo:  {}
        svcinfo:  {}
        svcName:  undefined
        out:  demo
        dest:  /home/minzzl/Code/demo
        existDir:  false
        templateList:  {
        webapp: {
            type: 'webapp',
            path: '/usr/lib/node_modules/@webosose/ares-cli/files/templates/ose-sdk-templates/bootplate-web',
            description: 'web app for webOS',
            metadata: { id: 'webappinfo' },
            deps: [ 'icon' ],
            default: true
        },
        hosted_webapp: {
            type: 'webapp',
            path: '/usr/lib/node_modules/@webosose/ares-cli/files/templates/ose-sdk-templates/hosted-webapp',
            description: 'hosted web app for webOS',
            metadata: { id: 'webappinfo' },
            deps: [ 'icon' ]
        },
        ...
        }
        }
        template:  {
        type: 'webapp',
        path: '/usr/lib/node_modules/@webosose/ares-cli/files/templates/ose-sdk-templates/bootplate-web',
        description: 'web app for webOS',
        metadata: { id: 'webappinfo' },
        deps: [ 'icon' ],
        default: true
        }
        appinfo:  { id: 'app_id_demo', title: 'title_demo', version: 'version_demo' }
    */ 
    }
    
    // For API
    if (!template) {
        return next(errHndl.getErrMsg("INVALID_VALUE", "TEMPLATE", options.tmplName));
    }
    if (!options.overwrite && existDir) {
        return next(errHndl.getErrMsg("NOT_OVERWRITE_DIR", dest));
    }

    if (template.metadata && template.metadata.data && typeof template.metadata.data === 'object') {
        appinfo = merge(appinfo, template.metadata.data);
    }

    /// Template means webapp, js_service ...
    /// Promise success
    promise.resolve()
        /// For property input argv
        .then(function() {
            // If props is not exist, this input from query-mode
            // If props is exist, this input from props
            // Check argv.query, argv["no-query"], options.props and conditional statement.
            if (template.type.match(/(app$|appinfo$|acpservice$|acpserviceinfo$)/)) {
                /// I have to add code here!!!
                parsePropArgs(options.props, appinfo);
            } else if (template.type.match(/(service$|serviceinfo$)/)) {
                parsePropArgs(options.props, svcinfo);
            } else if (template.type.match(/(package$|packageinfo$)/)) {
                parsePropArgs(options.props, pkginfo);
            } 
            
        })
        .then(function() {
            if (svcName) {
                svcinfo.id = svcName;
                svcinfo.services = [{
                    "name": svcName
                }];
            } else if (!svcName && svcinfo && !!svcinfo.id) {
                svcinfo.services = [{
                    "name": svcinfo.id
                }];
            }
        });
    
    /// Make template folder
    return promise.resolve()
        .then(function() {
            log.info("generator#generate()", "template name:" + tmplName);
            next(null, {msg: "Generating " + tmplName + " in " + dest});

            let srcs;

            /* !!!! I have to add code for airsol Before hosted code !!! */
            /// -> acp_service/src/main.c
            //console.log("in generate.js tmplName",tmplName);
            if  (tmplName.match(/(^src)/)){
                
                srcs = [].concat(template.path);

                return promise.all(srcs.map(function(src) {
                return copyToDirAsync(src, dest);
                })).then(function() {
                    let metaTmpl;
                    
                    let url;
                    
                    /// Add code for our c project
                    if (options.id) {
                        
                        /// Make file for 
                        ///  api-permissions.d/${id}.api.json
                        /// client-permissions.d/${id}.perm.json
                        /// mainfests.d/${id}.mainfests.json
                        /// roles.d/${id}.role.json
                        /// service.d/${id}.service

                        



                        
                    
                    }

                    if (template.metadata && template.metadata.id) {
                        metaTmpl = templateList[template.metadata.id];
                    }
                    
                    if (metaTmpl) {
                        if (appinfo.url) {
                            url = appinfo.url;
                            delete appinfo.url;
                            //console.log("make c file");
                            const urlTmpl = {"path":path.join(srcs[0],'src/main.c')};
                            _writeURLdata(urlTmpl, url);
                            //const cmakeurlTmpl = {"path":path.join(url,'CMakeLists.txt')};
                            //_writeURLdata(cmakeurlTmpl, url);
                        }
                        return _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo);
                    } else {
                        return;
                    }
                    
                });
            } 
            else if (tmplName.match(/(^hosted)/)) {
                /// hosted_webapp = type : webapp
                /// ! webapp = type : webapp

                /// host app ? Hosted by server 
                /// webapp ? Don't need internet
            

                srcs = [].concat(template.path);
                return promise.all(srcs.map(function(src) {
                    return copyToDirAsync(src, dest);
                })).then(function() {
                    let metaTmpl;
                    let url;
                    if (template.metadata && template.metadata.id) {
                        metaTmpl = templateList[template.metadata.id];
                    }
                    if (metaTmpl) {
                        if (appinfo.url) {
                            url = appinfo.url;
                            delete appinfo.url;
                            const urlTmpl = {"path":path.join(srcs[0],'index.html')};
                            _writeURLdata(urlTmpl, url);
                        }
                        return _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo);
                    } else {
                        return;
                    }
                });
            } else if (tmplName.match(/(^qmlapp$)/)) {
                srcs = [].concat(template.path);
                return promise.all(srcs.map(function(src) {
                    return copyToDirAsync(src, dest);
                })).then(function() {
                    let metaTmpl;
                    if (template.metadata && template.metadata.id) {
                        metaTmpl = templateList[template.metadata.id];
                    }
                    if (metaTmpl) {
                        if (appinfo.id) {
                            const qmlTmpl = {"path":path.join(srcs[0],'main.qml')};
                            _writeAppIDdata(qmlTmpl, appinfo.id);
                        }
                        return _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo);
                    } else {
                        return;
                    }
                });
            } else if (template.type.match(/info$/)) {
                return _writeMetadata(template, appinfo, svcinfo, pkginfo);
            } else {
                srcs = [].concat(template.path);
                return promise.all(srcs.map(function(src) {
                    log.info("generator#generate()", "template src:" + src);
                    return copyToDirAsync(src, dest);
                })).then(function() {
                    let metaTmpl;
                    if (template.metadata && template.metadata.id) {
                        metaTmpl = templateList[template.metadata.id];
                    }
                    if (metaTmpl) {
                        return _writeMetadata(metaTmpl, appinfo, svcinfo, pkginfo);
                    } else {
                        return;
                    }
                });
            }
        })
        /// App icon
        .then(function() {
            /// deps -> App icon.png
            const deps = templateList[tmplName].deps || [];
            return promise.all(deps.map(function(dep) {
                if (!templateList[dep]) {
                    log.warn("generator#generate()", "Invalid template id:" + dep);
                    return;
                } else if (!templateList[dep].path) {
                    log.warn("generator#generate()", "Invalid template path:" + dep);
                    return;
                }
                return copyToDirAsync(templateList[dep].path, dest);
            }));
        })
        .then(function() {
            log.info("generator#generate()", "done");
            return next(null, {
                msg: "Success"
            });
        })
        .catch(function(err) {
            log.silly("generator#generate()", "err:", err);
            throw err;
        });

    function _writeAppIDdata(qmlTmpl, appId) {
        const filePaths = [].concat(qmlTmpl.path);
        return promise.all(filePaths.map(function(file) {
            return fs.lstatAsync(file)
                .then(function(stats) {
                    if (!stats.isFile()) {
                        throw errHndl.getErrMsg("INVALID_PATH", "meta template", file);
                    }
                    // eslint-disable-next-line no-useless-escape
                    const exp = /appId\s*:\s*[\'\"][\w.]*[\'\"]/g;
                    const destFile = path.join(dest, path.basename(file));
                    let qmlFile = fs.readFileSync(file, 'utf8');
                    qmlFile = qmlFile.replace(exp, "appId: \"" + appId + "\"");

                    fs.writeFileSync(destFile, qmlFile, {encoding: 'utf8'});
                });
        }))
        .then(function() {
            log.info("generator#generate()#_writeAppIDdata()", "done");
            return;
        })
        .catch(function(err) {
            log.silly("generator#generate()#_writeAppIDdata()", "err:", err);
            throw err;
        });
    }

    function _writeURLdata(urlTmpl, url) {
        const filePaths = [].concat(urlTmpl.path);
        return promise.all(filePaths.map(function(file) {
            return fs.lstatAsync(file)
                .then(function(stats) {
                    if (!stats.isFile()) {
                        throw errHndl.getErrMsg("INVALID_PATH", "meta template", file);
                    }
                    let html = fs.readFileSync(file, 'utf8');
                    // eslint-disable-next-line no-useless-escape
                    const exp = new RegExp("(?:[\'\"])([\:/.A-z?<_&\s=>0-9;-]+\')");
                    // eslint-disable-next-line no-useless-escape
                    html=html.replace(exp, "\'" + url + "\'");
                    const destFile = path.join(dest, path.basename(file));

                    fs.writeFileSync(destFile, html, {encoding: 'utf8'});
                });
        }))
        .then(function() {
            log.info("generator#generate()#_writeURLdata()", "done");
            return;
        })
        .catch(function(err) {
            log.silly("generator#generate()#_writeURLdata()", "err:", err);
            throw err;
        });
    }

    /// appid title so and on ..
    function _writeMetadata(metaTmpl, _appinfo, _svcinfo, _pkginfo) {

        // console.log("metaTmpl: ", metaTmpl);
        // console.log("_appinfo: ",_appinfo);
        // console.log("_svcinfo: ",_svcinfo);
        // console.log("_pkginfo: ",_pkginfo);

        const metaPaths = [].concat(metaTmpl.path),
            appInfo = _appinfo || {},
            svcInfo = _svcinfo || {},
            pkgInfo = _pkginfo || {};

           
        
        return promise.all(metaPaths.map(function(file) {
            return fs.lstatAsync(file)
                .then(function(stats) {
                    if (!stats.isFile()) {
                        throw errHndl.getErrMsg("INVALID_PATH", "meta template", file);
                    }
                    const fileName = path.basename(file);
                    let info = readJsonSync(file);

                    if (fileName === 'appinfo.json') {
                        info = merge(info, appInfo);
                    } 
                    /// make cmake file too...
                    // else if (fileName === "CMakeLists.txt") {
                    //     info = merge(info, appInfo);
                    // }
                    else if (fileName === "services.json") {
                        info = merge(info, svcInfo);
                    } else if (fileName === "package.json" &&
                            (metaTmpl.type === "jsserviceinfo" || metaTmpl.type === "nativeserviceinfo")) {
                        info.name = svcInfo.id || info.name;
                    } else if (fileName === "packageinfo.json") {
                        info = merge(info, pkgInfo);
                    }

                    return info;
                })
                .then(function(info) {
                    const destFile = path.join(dest, path.basename(file));
                    return fs.mkdirsAsync(dest)
                        .then(function() {
                            return fs.writeFileSync(destFile, JSON.stringify(info, null, 2), {
                                encoding: 'utf8'
                            });
                        });
                });
        }))
        .then(function() {
            log.info("generator#generate()#_writeMetadata()", "done");
            return;
        })
        .catch(function(err) {
            log.silly("generator#generate()#_writeMetadata()", "err:", err);
            throw err;
        });
    }
};

Generator.prototype.getTmpl = function() {
    return templates;
};

Generator.prototype.existOutDir = function(outDir) {
    log.verbose("generator#existOutDir()", outDir);
    try {
        const files = fs.readdirSync(outDir);
        if (files.length > 0)
            return true;
    } catch (err) {
        if (err && err.code === 'ENOTDIR') {
            throw errHndl.getErrMsg("NOT_DIRTYPE_PATH", outDir);
        }
        if (err && err.code === 'ENOENT') {
            log.verbose("generator#generate()", "The directory does not exist.");
            return false;
        }
        throw err;
    }
};

// Internal functions
function parsePropArgs(property, targetInfo) {
    const props = property || [],
        info = targetInfo || {};
    if (props.length === 1 && props[0].indexOf('{') !== -1 && props[0].indexOf('}') !== -1 &&
        ( (props[0].split("'").length - 1) % 2) === 0)
    {
        // eslint-disable-next-line no-useless-escape
        props[0] = props[0].replace(/\'/g,'"');
    }
    props.forEach(function(prop) {
        try {
            const data = JSON.parse(prop);
            for (const k in data) {
                info[k] = data[k];
            }
        } catch (err) {
            const tokens = prop.split('=');
            if (tokens.length === 2) {
                info[tokens[0]] = tokens[1];
            } else {
                log.warn('Ignoring invalid arguments:', prop);
            }
        }
    });
}

module.exports = Generator;

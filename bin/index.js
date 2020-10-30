#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const colors = require("colors");
const nw = require("node-watch");
const terser = require("terser");
const sass = require("node-sass");
const ncp = require("ncp").ncp;

const message = (msg, level) => {
    const msgHead = "[Web-Dev]";
    level = level || "info";

    let head;

    switch (level) {
        case "warn": head = msgHead.yellow; break;
        case "error": head = msgHead.red; break;
        default: head = msgHead.green; break;
    }

    console.log(head + " - " + msg);
}

const loadConfig = () => {
    return JSON.parse(fs.readFileSync("./web-dev.config.json"));
}

const listFiles = (fileOrDir, ext) => {
    const result = [];
    const p = path.resolve(fileOrDir);
    const stats = fs.lstatSync(p);
    ext = ext || "";
    if (stats.isFile() && p.endsWith(ext)) {
        result.push(p);
    } else if (stats.isDirectory()) {
        for (let f of fs.readdirSync(p))
            result.push(...listFiles(path.resolve(p, f)));
    }
    return result;
}

const taskRunners = {
    js: (jsTask) => {
        message(`Starting JS task: ${jsTask.src.yellow}`)
        nw(jsTask.src, { recursive: true }, () => {
            for (let f of listFiles(jsTask.src, ".js")) {
                const dstFile = path.resolve(jsTask.dst, path.basename(f));
                const code = fs.readFileSync(f, { encoding: "utf-8" });
                terser.minify(code).then((result) => fs.writeFileSync(dstFile, result.code, { encoding: "utf-8" }));
            }

        });
    },
    scss: (scssTask) => {
        message(`Starting SCSS task: ${scssTask.src.yellow}`);
        nw(scssTask.src, { recursive: true }, () => {
            for (let f of listFiles(scssTask.src, ".scss")) {
                if (path.basename(f).startsWith("_"))
                    continue;
                sass.render({ file: f }, (err, result) => {
                    if (err) {
                        message(`SCSS Error ${err.file}:${err.line}`, "error")
                    } else {
                        const dstFile = path.resolve(scssTask.dst, path.basename(f));
                        fs.writeFileSync(dstFile, result.css);
                    }
                });
            }
        });
    },
    ncp: (copyTask) => {
        message(`Starting copy task: ${scssTask.src.yellow}`);
        nw(copyTask.src, { recursive: true }, (evt, name) => {
            ncp(copyTask.src, copyTask.dst)
        });
    }
}


message("Loading configuration...");
const config = loadConfig();

for (let t of config.tasks)
    taskRunners[t.type](t);



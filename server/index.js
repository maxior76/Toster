#!/usr/bin/env node

import { readFile } from "fs"
import path from "path"
import { join } from "path"
import pws from "ws"
const { Server } = pws;

import express from 'express'
const app = express()

import Program from "./program.js"

const programsList = [];

const __dirname = path.resolve();

readFile(join(__dirname, "programs/index.json"), (err, data) => {
    if (err) {
        console.error("No programs were provided to the server:");
        console.error(err);
        return;
    }

    const str = Buffer.from(data);
    try {
        const programsData = JSON.parse(str);
        for (const individualProgram of programsData) {
            const p = new Program(individualProgram.Name, 
                                  individualProgram.Program, 
                                  [ join(__dirname, "programs", individualProgram.Path) ]); 
            
            p.run();
            // TODO: Handle on data

            programsList.push(p);
        }
    }
    catch (err) {
        console.error("Invalid file format, no programs were loaded");
        console.error(err);
        return;
    }
});

const staticApp = express.static("public", {
    extensions: [ "html", "js", "css" ]
})

// Serve static content
app.use("/public", staticApp)

app.get("/", (req, res, next) => {
    res.sendFile(join(__dirname, "public/index.html"))
})

const wsServer = new Server({
    port: 8000
})

let socketsList = []

wsServer.on("connection", (currentSocket) => {
    socketsList.push(currentSocket);

    currentSocket.on("message", (msg) => {
        msg = JSON.parse(msg);
        const pName = msg.program;
        const p = programsList.filter((v) => { return v.getName() === pName; });
        if (p.length !== 1) currentSocket.send("Nah");
        else {
            const prog = p[0];
            prog.once("data", (d) => {
                console.log(d);
                prog.clearData();
                currentSocket.send(JSON.stringify(d));
            })        
            prog.send(msg.msg);
        }
    });

    currentSocket.on("close", () => {
        // Removes closed socket
        socketsList = socketsList.filter((s) => { return s !== currentSocket });
    });
})

app.listen(3000)

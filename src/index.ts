#!/usr/bin/env node
import config from "./lib/entry";
import { Watcher } from "./lib/watcher";
import { Starter } from "./lib/starter";
import * as fs from "fs";
import { resolve } from "path";
import chalk from "chalk";

type TKeys = {
    [key: string]: string
}

type TWatcherTarget = {
    destination: string
    target: string
}

type TWatcherConfig = {
    repository: string
    branch: string
    targets: {
        [key: string]: TWatcherTarget
    }
}

type TWatchersConfigsList = {
    [key: string]: TWatcherConfig
}

type TWatchersList = {
    [key: string]: Watcher
}

const watchers: TWatchersList = {};
const watchers_configs: TWatchersConfigsList = {};
const app = new Starter(config.cwd, config.exec, config.webhook);
const keys: TKeys = {};

for (const item of config.keys) {

    const full_file_path = resolve(process.cwd(), item);

    try {

        let keys_file_text = fs.readFileSync(full_file_path).toString();

        for (const env_name in process.env) {

            const env_arg = process.env[env_name];
            const reg = new RegExp("\\${"+env_name+"}", "gi");

            keys_file_text = keys_file_text.replace(reg, env_arg);
        }
        
        const keys_file_json = JSON.parse(keys_file_text);

        for (const key_name in keys_file_json) {

            let key = keys_file_json[key_name];

            if (typeof key === "object") {
                key = JSON.stringify(key);
            }

            keys[key_name] = key;
        }


    } catch (error) {
        console.error(`Error parsing keys file ${full_file_path}. ${error.message}`);
        console.error(chalk.red(error.stack));
        process.exit(1);
    }

}

for (const item of config.target) {

    const args = item.match(/^(http(s|)\:\/\/(.*\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\:[0-9]{1,5}|)\/.*\.git)\:([-a-z0-9._]*)\:(\/[-a-z0-9._\/]*)\:([-a-z0-9._\/]*)$/i);

    if (args) {

        const repository = args[1];
        const branch = args[5];
        const target = args[6].replace(/(^\/|\/$)/gi, "");
        const destination = args[7].replace(/\/$/gi, "");

        if (watchers_configs[repository] === undefined) {
            watchers_configs[repository] = {
                repository: repository,
                branch: branch,
                targets: {}
            };
        }

        const watcher_config = watchers_configs[repository];

        if (watcher_config.targets[target] === undefined) {
            watcher_config.targets[target] = {
                target: target,
                destination: destination
            };
        }

    }

}

for (const watcher_name in watchers_configs) {

    const watcher_config = watchers_configs[watcher_name];
    const watcher = new Watcher(watcher_config.repository, watcher_config.branch, config.tmp, watcher_config.targets, keys);
    
    watchers[watcher_config.repository] = watcher;

    if (config.update === true) {

        watcher.on("update", () => {
            app.update();
        });

        console.log("Watcher activated");

        watcher.watch(config.interval);
    }

}

const closeApp = () => {

    app.close();

    for (const watcher_name in watchers) {
        const watcher = watchers[watcher_name];
        watcher.close();
    }

    process.exit();

};

app.start();

app.on("close", () => {
    closeApp();
});

process.on("SIGTERM", () => {
    console.log("💀 Termination signal received 💀");
    closeApp();
});
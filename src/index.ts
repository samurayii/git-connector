#!/usr/bin/env node
import config from "./lib/entry";
import { Watcher } from "./lib/watcher";
import { Starter } from "./lib/starter";

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
    const watcher = new Watcher(watcher_config.repository, watcher_config.branch, config.tmp, watcher_config.targets, config.keys, config.scan_hidden);
    
    watchers[watcher_config.repository] = watcher;

    if (config.update === true) {

        if (config.exec !== undefined) {

            const app = new Starter(config.app, config.cwd, config.exec, config.webhook);

            app.start();

            app.on("close", () => {

                app.close();
            
                for (const watcher_name in watchers) {
                    const watcher = watchers[watcher_name];
                    watcher.close();
                }
            
                process.exit();
            
            });

            watcher.on("update", () => {
                app.update();
            });

        }      

        console.log("Watcher activated");

        watcher.watch(config.interval);
    }

}

process.on("SIGTERM", () => {
    console.log("Termination signal received");
});
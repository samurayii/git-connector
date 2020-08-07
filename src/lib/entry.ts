import { program } from "commander";
import * as chalk from "chalk";
import { execSync } from "child_process";
import * as finder from "find-package-json";
import { IAppConfig } from "./interfaces";
import * as fs from "fs";
import { resolve } from "path";

const pkg = finder(__dirname).next().value;

program.version(`version: ${pkg.version}`, "-v, --version", "output the current version.");
program.name(pkg.name);
program.option("-w, --webhook <type>", "Url to webhook application (Environment variable: GIT_CONNECTOR_WEBHOOK=<type>). Example: --webhook http://myapp:5000/webhook");
program.option("-i, --interval <number>", "Interval checking repositories in seconds (Environment variable: GIT_CONNECTOR_INTERVAL=<number>). Example: --interval 500", "600");
program.option("-k, --keys [letters...]", "Path to files with keys (Environment variable: GIT_CONNECTOR_KEYS=<string[]>). Example: --keys /keys.json");
program.requiredOption("-e, --exec <type>", "Start command application (Environment variable: GIT_CONNECTOR_EXEC=<type>). Example: node ./app.js");
program.requiredOption("-t, --target [letters...]", "Watching string/array of string git repository (Environment variable: GIT_CONNECTOR_TARGET=<string[]>). Example: --target https://user:password@mygit.ru/repository.git:master:/path_repository:/path_target");
program.option("-u, --update", "Flag for watch target update (Environment variable: GIT_CONNECTOR_UPDATE=(true|false)).", false);
program.option("-tmp, --tmp <type>", "Path to tmp folder (Environment variable: GIT_CONNECTOR_TMP=<type>). Example: --tmp /my_tmp", "tmp");
program.option("-c, --cwd <type>", "Path to workdir (Environment variable: GIT_CONNECTOR_CWD=<type>). Example: --tmp /my_cwd", `${process.cwd()}`);

program.parse(process.argv);

const config: IAppConfig = {
    webhook: program.webhook,
    interval: parseInt(program.interval),
    exec: program.exec,
    target: program.target,
    update: program.update,
    tmp: program.tmp,
    cwd: program.cwd,
    keys: program.keys
};

if (process.env["GIT_CONNECTOR_WEBHOOK"] !== undefined) {
    config.webhook = process.env["GIT_CONNECTOR_WEBHOOK"];
}
if (process.env["GIT_CONNECTOR_INTERVAL"] !== undefined) {
    config.interval = parseInt(process.env["GIT_CONNECTOR_INTERVAL"]);
}
if (process.env["GIT_CONNECTOR_EXEC"] !== undefined) {
    config.exec = process.env["GIT_CONNECTOR_EXEC"];
}
if (process.env["GIT_CONNECTOR_TARGET"] !== undefined) {
    config.target = JSON.parse(process.env["GIT_CONNECTOR_TARGET"]);
}
if (process.env["GIT_CONNECTOR_KEYS"] !== undefined) {
    config.keys = JSON.parse(process.env["GIT_CONNECTOR_KEYS"]);
}
if (process.env["GIT_CONNECTOR_UPDATE"] !== undefined) {
    if (process.env["GIT_CONNECTOR_UPDATE"] === "true") {
        config.update = true;
    } else {
        config.update = false;
    }
}
if (process.env["GIT_CONNECTOR_TMP"] !== undefined) {
    config.tmp = process.env["GIT_CONNECTOR_TMP"];
}
if (process.env["GIT_CONNECTOR_CWD"] !== undefined) {
    config.cwd = process.env["GIT_CONNECTOR_CWD"];
}

if (config.webhook !== undefined) {
    config.webhook = config.webhook.trim();
    if (!/^http(s|)\:\/\/(.*\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\:[0-9]{1,5}|)(\/|)(.*|)$/gi.test(config.webhook)) {
        console.error(chalk.red("Error. Webhook key not correspond regexp /^http(s|)\\:\\/\\/(.*\\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\\:[0-9]{1,5}|)(\\/|)(.*|)$/gi"));
        process.exit(1);
    }
}

if (config.interval <= 0) {
    console.error(chalk.red("Error. Interval key must be more than 0"));
    process.exit(1);
}

config.exec = config.exec.trim();
config.tmp = config.tmp.trim();
config.cwd = config.cwd.trim();

if (config.exec.length <= 0) {
    console.error(chalk.red("Error. Exec key is empty"));
    process.exit(1);
}

if (config.tmp.length <= 0) {
    console.error(chalk.red("Error. Tmp key is empty"));
    process.exit(1);
}

if (config.cwd.length <= 0) {
    console.error(chalk.red("Error. Cwd key is empty"));
    process.exit(1);
}

if (!fs.existsSync(config.cwd)) {
    console.error(chalk.red(`Error. Cwd folder ${config.cwd} not found`));
    process.exit(1);
}

if (Array.isArray(config.target)) {

    for (let item of config.target) {
        item = item.trim();
        if (!/^http(s|)\:\/\/(.*\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\:[0-9]{1,5}|)\/.*\.git\:[-a-z0-9._]*\:\/[-a-z0-9._\/]*\:[-a-z0-9._\/]*$/gi.test(item)) {
            console.error(chalk.red("Error. Target item not correspond regexp /^http(s|)\\:\\/\\/(.*\\:.*@|)[a-z0-9]{1}[-a-z0-9.]{0,128}(\\:[0-9]{1,5}|)\\/.*\\.git\\:[-a-z0-9._]*\\:\\/[-a-z0-9_\\/]*\\:[-a-z0-9_\\/]*$/gi"));
            process.exit(1);
        }
    }

} else {
    config.target = [];
}

if (Array.isArray(config.keys)) {

    for (let item of config.keys) {
    
        item = item.trim();
        
        const full_file_path = resolve(process.cwd(), item);
    
        if (!fs.existsSync(full_file_path)) {
            console.error(chalk.red(`Error. Keys file ${item} not found`));
            process.exit(1);
        }
    
        const stat = fs.statSync(full_file_path);
    
        if (!stat.isFile()) {
            console.error(chalk.red(`Error. Keys path ${item} not a file`));
            process.exit(1);
        }
    
    }

} else {
    config.keys = [];
}

if (typeof program.update !== "boolean") {
    console.error(chalk.red("Error. Target key is empty"));
    process.exit(1);
}

try {
    execSync("git --version");
} catch (error) {
    console.error(chalk.red("Git exec error."));
    console.error(chalk.red(error.message));
}

export default config;